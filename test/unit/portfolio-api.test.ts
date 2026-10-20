// @vitest-environment node
import { expect, test } from "vitest";
import { POST } from "@/app/api/portfolio/calculate/route";
test("portfolio calculation API returns totals but does not infer cost from a current-value baseline", async () => {
  const response = await POST(new Request("http://localhost/api/portfolio/calculate", { method: "POST", body: JSON.stringify({ positions: [{ assetId: "bitcoin", currentValueCents: 12000 }, { assetId: "ethereum", currentValueCents: 8000 }] }) }));
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(await response.json()).toMatchObject({ currentValueCents: 20000, gainCents: null });
});
test("calculation API refuses future marks", async () => {
  const positions = [{ assetId: "bitcoin", purchases: [{ id: "1", date: "2020-01-01", quantity: "1", costCents: 10000 }], price: { usd: "120", observedAt: "2099-01-01T00:00:00Z" } }];
  const response = await POST(new Request("http://localhost/api/portfolio/calculate", { method: "POST", body: JSON.stringify({ positions }) }));
  expect(response.status).toBe(400);
});
test("mixed baseline and purchase values are rejected rather than double-counted", async () => {
  const response = await POST(new Request("http://localhost/api/portfolio/calculate", { method: "POST", body: JSON.stringify({ positions: [{ assetId: "bitcoin", currentValueCents: 10000, purchases: [{ id: "1", date: "2020-01-01", quantity: "1", costCents: 10000 }], price: { usd: "120", observedAt: new Date().toISOString() } }] }) }));
  expect(response.status).toBe(400);
});
