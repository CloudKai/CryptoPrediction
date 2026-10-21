import unittest

import numpy as np

from backend.app.hourly_outlook import HOUR, LOOKBACK, _features, _fit_predict, outlook
from backend.app.schemas import Candle

NOW = 2_000_000_000_000 // HOUR * HOUR


def candles_for(prices):
    return [Candle(time=NOW - (len(prices) - i) * HOUR, open=p, high=p, low=p, close=p, volume=1)
            for i, p in enumerate(prices)]


class HourlyOutlookTests(unittest.TestCase):
    def test_never_fabricates_estimates_for_flat_or_short_history(self):
        for prices in ([100.] * 2000, [100.] * 100):
            result = outlook(candles_for(prices), NOW + 1000)
            self.assertEqual([r['hours'] for r in result], [1, 5, 10])
            for row in result:
                self.assertEqual(row['status'], 'unavailable')
                self.assertNotIn('estimatedPrice', row)

    def test_rejects_gaps_duplicates_invalid_future_and_stale_prices(self):
        candles = candles_for([100.] * 2000)
        variants = [candles[:800] + candles[801:], candles + [candles[-1]],
                    candles[:-1], [candles[-1].model_copy(update={'time': NOW + HOUR})],
                    [candles[-1].model_copy(update={'close': float('nan')})]]
        for variant in variants:
            with self.subTest(length=len(variant)):
                self.assertTrue(all(r['status'] == 'unavailable' for r in outlook(variant, NOW + 1000)))

    def test_fit_never_uses_unresolved_training_targets(self):
        logs = np.cumsum(np.random.default_rng(12).normal(0, .002, 1000))
        def features(values):
            result = np.zeros((len(values), 6))
            for i in range(LOOKBACK, len(values)):
                result[i] = _features(values, i)
            return result
        before = _fit_predict(logs, features(logs), 800, 10)
        changed = logs.copy()
        changed[801:] += 10  # outcomes unavailable at origin must not change its fit
        after = _fit_predict(changed, features(changed), 800, 10)
        self.assertEqual(before, after)

    def test_forming_hour_is_excluded(self):
        candles = candles_for([100.] * 2000)
        partial = Candle(time=NOW, open=100, high=100000, low=1, close=99999, volume=1)
        self.assertEqual(outlook(candles, NOW + 1000), outlook(candles + [partial], NOW + 1000))

    def test_predictable_synthetic_series_has_positive_ordered_price_ranges(self):
        rng = np.random.default_rng(83)
        returns = .003 * np.sin(np.arange(2000) * .3) + rng.normal(0, .0003, 2000)
        prices = 100 * np.exp(np.cumsum(returns))
        result = outlook(candles_for(prices), NOW + 1000)
        available = [r for r in result if r['status'] == 'available']
        self.assertTrue(available, 'Synthetic learnable signal should exercise the available path')
        for row in available:
            self.assertGreater(row['lowerPrice'], 0)
            self.assertLessEqual(row['lowerPrice'], row['estimatedPrice'])
            self.assertLessEqual(row['estimatedPrice'], row['upperPrice'])
            self.assertEqual(row['evaluation']['origins'], 40)
            self.assertEqual(row['direction'], 'UP' if row['estimatedPrice'] > row['referencePrice'] else 'DOWN')


if __name__ == '__main__':
    unittest.main()
