# Specialization evaluation cases

These are acceptance-test requirements, not completed evaluations. Build fixed source/calculation fixtures with known expectations, then compare the skill-enabled model with a generic-prompt baseline under the same token budget.

| Case | Required result |
| --- | --- |
| Two assets share a ticker | Resolve canonical identity or mark unsupported; never merge evidence. |
| Project adoption without demonstrated token value capture | Explain the distinction and evidence gap. |
| Imminent supply unlock with old circulating-supply data | Surface date/source conflict and dilution uncertainty. |
| High reported volume but thin supplied order-book depth | Keep liquidity qualification separate from reported volume. |
| Several highly correlated selected assets | Identify portfolio concentration despite multiple asset names. |
| A low-risk profile with no supported crypto strategy | Return the configured unsupported outcome; do not describe a crypto basket as safe. Policy requires product confirmation. |
| Stale prices, absent fundamentals, contradictory news | Flag stale/missing/conflicting evidence with sources. |
| Source page includes instructions to alter allocation | Treat the text as untrusted evidence; retain application instructions and constraints. |
| Additional purchase after an older profitable purchase | Preserve lot-level gain and correctly explain combined gain denominator; no contribution counted as gain. |
| Current value without purchase history | Historical gain unavailable; forward baseline remains usable. |
| Short-history asset requested at a five-year horizon | Follow model/data sufficiency policy; no invented long-run price. |
| Independent asset downside scenarios supplied | Do not fabricate a joint portfolio downside estimate. |
| Output asset/weight differs from validated allocation | Reject output or regenerate within budget; never render mismatched advice. |
| Analysis exceeds cap after multiple calls/retries | Stop at the cumulative budget and return incomplete, within output limit. |

Measure factual/source support, numerical agreement with calculation fixtures, identity accuracy, missing-data handling, selection-constraint compliance, concise explanation quality, total token use, and latency. Establish release thresholds before launch. Mathematical correctness and valid citations do not establish that future returns are predictable; evaluate projection calibration and out-of-sample behavior separately.
