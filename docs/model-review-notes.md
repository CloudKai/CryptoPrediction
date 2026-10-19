# Prediction pipeline and portfolio review

Reviewed from the current working tree on 2026-10-19. This document describes source behavior, not a live deployment audit. No exchange requests or model retraining were performed. The working tree already contains substantial uncommitted work. Local artifacts discussed below are ignored by Git and are not guaranteed to exist in another checkout.

## What the backend actually implements

- **Market ingestion:** `backend/app/binance.py` wraps Binance Spot REST klines and a combined WebSocket kline connection. Historical pagination walks backwards using `endTime`, deduplicates candle open timestamps, and sorts the result. WebSocket updates expose the candle closure flag separately from OHLCV values.
- **Tracked scope:** `backend/app/constants.py` defines ten USDT markets and six intervals: 1m, 5m, 15m, 1h, 4h, and 1d. These are configured defaults, not proof every symbol remains available upstream. Range selection maps chart windows to five intervals; the public prediction endpoints independently force the 15m track (`backend/app/main.py`).
- **Features:** `backend/app/features.py` builds ten interpretable features using a 24-candle lookback: 1/3/6-candle returns, candle range/body/wicks, relative 20-candle volume, and 12/24-candle trends. It does not use news, on-chain data, sentiment, order books, or deep learning.
- **Model:** `backend/app/modeling.py` implements binary logistic regression directly in NumPy, using full-batch gradient descent, L2 regularization, and z-score normalization fitted exclusively on the training slice. The training code applies these fitted statistics to validation and runtime inference, which is a sound starting point.
- **Training:** `backend/scripts/train_offline.py` fetches each symbol/interval sequentially, constructs next-close labels, uses a chronological 80/20 split, trains one artifact per pair, and saves accuracy, positive-class precision, and positive-class recall. Default settings fetch 1,200 candles, require 250 usable samples, and run 600 optimization epochs (`backend/app/config.py`). With exactly 1,200 candles, the 24-candle lookback yields 1,175 rows: 940 training and 235 validation rows.
- **Serving:** `backend/app/model_store.py` loads available JSON artifacts at startup. Missing models return no probability; the runtime then emits the current candle's observed direction and 50% confidence with an OFFLINE status. This fallback is not a trained prediction (`backend/app/runtime.py:265`).
- **Runtime:** `backend/app/runtime.py` bootstraps candles, keeps bounded in-memory buffers, overwrites updates for the same candle, computes predictions, maintains bounded prediction history, and broadcasts market events to filtered WebSocket clients. Connections retry with exponential backoff after errors.
- **Locked forecasts:** A 15m prediction is locked when the runtime first observes that candle and keeps its direction/confidence until that candle closes. It records actual direction only upon receiving the corresponding closed-candle event. Public REST prediction queries always return this 15m track, even if interval/range query arguments are supplied (`backend/app/main.py`). WebSocket events carry chart-interval candles alongside the 15m prediction.

## Most important correctness issue: target and timing disagree

`backend/app/features.py:87` trains features from candle t to predict whether **close(t+1) > close(t)**. Those features contain the full current candle's high, low, close, body, wick, and volume.

`backend/app/runtime.py:260` instead feeds the newest, potentially incomplete candle into that model. For the locked 15m track, `runtime.py:281` locks that output for the **same** current candle and `runtime.py:302` resolves whether **close(t) >= open(t)**. Thus the training target, feature availability time, and scored live event are different. The treatment of a flat outcome differs too: training assigns equal closes DOWN; runtime resolves equal open/close UP.

This is a source-confirmed semantic mismatch. It does not prove a particular live prediction was wrong, but it means the offline validation metrics do not validate the live locked forecast behavior.

Recommended contract: when candle t closes, generate an immutable forecast using only finalized candles through t; forecast the close-to-close direction of candle t+1; resolve against exactly that label. Store `issuedAt`, input cutoff, target start/end, anchor price, feature schema, and model version. Define flat/tie behavior once. Display actual issue time separately from forecast window start.

Startup needs explicit handling: current code sets `created_at` to the candle opening timestamp even when the process starts later in the candle (`runtime.py:276-288`). A forecast first created several minutes into a window therefore appears issued at its start. Either skip that partial window, label it as a late entry with the actual issue time, or use a separately evaluated partial-window model.

## What the existing numbers do and do not show

Local `backend/artifacts/training_report.json` is dated 2026-04-19 and contains 50 models across 1m/5m/1h/4h/1d. It excludes the 15m track that the API currently serves.

Ten separate local `backend/artifacts/*/15m.json` files exist, also dated 2026-04-19. Their metrics are historical stored results, not independently reproduced results, current live hit rates, or evidence of profitable trading. The artifact folder is ignored in `.gitignore`; a fresh clone requires training or a separate reproducible artifact-download path.

The setup example `backend/.env.example:9` lists `TRACKED_INTERVALS=1m,5m,1h,4h,1d`, omitting 15m, while `backend/app/main.py` forces the prediction endpoints to 15m. If that setting is exported into the process, the runtime does not bootstrap/load/subscribe to the prediction interval. Non-15m ingestion also attempts to retrieve a 15m prediction, which can raise when its candle buffer is missing. Update the example and validate that the prediction interval is included at startup. Settings use `os.getenv`; this code does not itself load a copied `.env` file.

No majority-class, always-UP, momentum, or random baseline is saved. Accuracy therefore cannot establish an improvement over a trivial predictor. There is no separate untouched test split, walk-forward evaluation, confidence calibration report, transaction-cost simulation, or uncertainty interval in the inspected training code. Different candle intervals cover dramatically different calendar spans: 1,200 one-minute candles span about 20 hours, whereas 1,200 daily candles span about 3.3 years. One mean across them conceals different regimes and sample coverage.

`max(p, 1-p) * 100` is presented as confidence (`runtime.py:273`). It is a raw model probability transformed to the selected class; it has not been shown to correspond to observed success frequency. A displayed 70% should not be described as a verified 70% chance of being correct.

## Prioritized improvements

### P0: establish a defensible prediction contract

1. Align training labels, closed-candle inputs, issued time, target window, and resolution as described above. Add focused deterministic tests covering window transitions, restarts during a window, ties, and duplicate closure events.
2. Prevent partial final candles from becoming training outcomes. REST conversion discards the kline close timestamp and `train_offline.py` does not filter incomplete candles (`backend/app/binance.py`, `backend/scripts/train_offline.py`). Preserve close-time/finality information or explicitly request historical windows that have ended.
3. Make unavailable-model output unambiguous. Return an unavailable state rather than a direction inferred from the current candle, or expose a separate `signalSource` field that the UI clearly labels.
4. Persist immutable forecast events and later resolutions. Current history and locks are process-local deques/dictionaries and disappear on restart; there is no auditable live score ledger. Do not reconstruct historical issue timestamps after the fact.

### P1: turn the model into a credible experiment

1. Add chronological walk-forward folds across multiple market regimes and reserve a final test period. Fit scalers within each training fold. Keep an explicit gap if the chosen horizon or target overlap requires it; overlapping trailing features alone are not proof of future leakage.
2. Report per-symbol/per-horizon class balance, majority and always-UP baselines, balanced accuracy, confusion matrices, log loss, and Brier score. Compare the same date windows and add sample counts and confidence intervals. If trading returns are presented, use a separate documented simulation including fees, spread, slippage, and an executable entry-time assumption.
3. Add calibration curves and held-out calibration before treating confidence as a success probability. Optionally add a low-confidence abstain state and evaluate the resulting coverage/accuracy tradeoff.
4. Version artifacts with schema, feature names/order, data time bounds, dataset hash, code revision, hyperparameters, fold boundaries, per-split sample counts, baseline metrics, and model ID. Current artifacts lack most provenance. `load_artifact` checks only that JSON is a dictionary; validate required keys, vector lengths, finite numbers, symbol/interval match, and supported feature schema before serving.
5. Add narrowly targeted backend tests for feature math, target timing, train-only normalization, artifact validation, missing models, and stream gap recovery. The inspected backend project declares no Python test dependency; existing repo tests are frontend tests.

### P1: improve live reliability

1. Detect gaps and out-of-order candles, backfill REST history after reconnect, and make ingestion idempotent. Current ingest appends any timestamp different from the newest one and reconnects without gap reconciliation (`runtime.py:376`). Missing a 15m close can leave an old forecast unresolved when the next window replaces the single lock.
2. Track upstream freshness per symbol/interval and expose readiness separately from liveness. Current `_connected_to_binance` is global and `/health` always returns `ok: true`; a connected stream or healthy process does not show that each market has current data or a valid model.
3. Emit structured logs and counters for startup fetch failures, reconnects, model load failures, forecast creation/resolution, and last successful timestamps. Current bootstrap and stream paths suppress exceptions without exposing their cause.
4. Avoid slow subscribers blocking all ingestion: `WebSocketHub.broadcast` sends to clients sequentially in the stream loop. Add bounded per-client queues or send timeouts and explicit slow-consumer policy.
5. Avoid overwriting newer live cache data with older REST responses. `get_market_history` reads state, fetches outside its lock, and later replaces the whole buffer; merge fetched/live candles by timestamp under the lock instead.

### P2: make the ML work visible in the portfolio

Publish a concise model card and a reproducible evaluation report. Show the simple NumPy baseline, its strengths, failure modes, and comparison with simple alternatives before adding complex models. Add a UI panel with model version, trained date, last input timestamp, forecast horizon, evaluation period, baseline comparison, and a link to the experiment. A replay mode based on immutable saved events would let interviewers inspect correct and incorrect predictions without relying on exchange uptime.

Keep the portfolio claim specific: an end-to-end real-time market dashboard with an interpretable experimental classifier and a measurable forecast lifecycle. The source supports that engineering story; it does not establish investment performance. News is a display feature today and should not be described as a model input unless the feature pipeline actually changes.
