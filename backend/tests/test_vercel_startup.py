import os
import unittest
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient
from backend.app.main import app, runtime


class VercelStartupTests(unittest.TestCase):
    def test_health_does_not_bootstrap_all_markets_or_start_a_background_worker(self):
        with patch.dict(os.environ, {"VERCEL": "1"}), \
             patch.object(runtime, "startup", new_callable=AsyncMock) as startup, \
             patch.object(runtime, "shutdown", new_callable=AsyncMock), \
             patch.object(runtime.model_store, "load") as load:
            with TestClient(app) as client:
                self.assertEqual(client.get("/health").json(), {"ok": True})
            startup.assert_not_awaited()
            load.assert_called_once()


if __name__ == "__main__":
    unittest.main()
