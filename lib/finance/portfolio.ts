import { cents, changePercent, sumCents, valueInCents } from "./money";
export type Purchase = {
  id: string;
  date: string;
  quantity: string;
  costCents: number;
};
export type PositionInput = {
  assetId: string;
} & ({
  purchases: Purchase[];
  price: {
    usd: string;
    observedAt: string;
  };
  currentValueCents?: never;
} | {
  currentValueCents: number;
  purchases?: never;
  price?: never;
});
function identity(value: unknown): asserts value is string {
  if (typeof value !== "string" || !value.trim() || value.length > 150)
    throw new Error("An asset or purchase identifier is invalid.");
}
export function calculatePortfolio(positions: PositionInput[]) {
  if (!Array.isArray(positions) || positions.length > 100)
    throw new Error("Supply at most 100 positions.");
  const ids = new Set<string>();
  const results = positions.map((position) => {
    if (!position || typeof position !== "object")
      throw new Error("Invalid position.");
    identity(position.assetId);
    if (ids.has(position.assetId))
      throw new Error("Combine purchases of the same asset into one position.");
    ids.add(position.assetId);
    if ("currentValueCents" in position && position.currentValueCents !== undefined) {
      if (position.purchases || position.price)
        throw new Error("Choose purchases or a current-value baseline, not both.");
      return { assetId: position.assetId, currentValueCents: cents(position.currentValueCents), costCents: null, gainCents: null, gainPercent: null, purchases: null };
    }
    if (!Array.isArray(position.purchases) || !position.purchases.length || position.purchases.length > 1000 || !position.price || !Number.isFinite(Date.parse(position.price.observedAt)))
      throw new Error("Purchase positions require lots and a dated USD price.");
    const purchaseIds = new Set<string>();
    const purchases = position.purchases.map((lot) => {
      identity(lot.id);
      if (purchaseIds.has(lot.id))
        throw new Error("Duplicate purchase identifier.");
      purchaseIds.add(lot.id);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(lot.date) || new Date(lot.date).toISOString().slice(0, 10) !== lot.date || Date.parse(lot.date) > Date.parse(position.price!.observedAt))
        throw new Error("Purchase date must be valid and precede the valuation.");
      const costCents = cents(lot.costCents), currentValueCents = valueInCents(lot.quantity, position.price!.usd);
      return { ...lot, costCents, currentValueCents, gainCents: currentValueCents - costCents, gainPercent: changePercent(currentValueCents, costCents) };
    });
    const costCents = sumCents(purchases.map((lot) => lot.costCents)), currentValueCents = sumCents(purchases.map((lot) => lot.currentValueCents));
    return { assetId: position.assetId, currentValueCents, costCents, gainCents: currentValueCents - costCents, gainPercent: changePercent(currentValueCents, costCents), purchases, priceObservedAt: position.price.observedAt };
  });
  const currentValueCents = sumCents(results.map((position) => position.currentValueCents));
  const completeCostHistory = results.every((position) => position.costCents !== null);
  const costCents = completeCostHistory ? sumCents(results.map((position) => position.costCents!)) : null;
  return { currency: "USD" as const, currentValueCents, completeCostHistory, costCents, gainCents: costCents === null ? null : currentValueCents - costCents, gainPercent: costCents === null ? null : changePercent(currentValueCents, costCents), positions: results };
}
/** Current endpoints reject stale/future marks; pure calculatePortfolio also supports dated snapshots. */
export function calculateCurrentPortfolio(positions: PositionInput[], now = Date.now()) {
  const result = calculatePortfolio(positions);
  for (const position of result.positions) {
    if (position.priceObservedAt) {
      const time = Date.parse(position.priceObservedAt);
      if (time > now + 60000 || now - time > 900000)
        throw new Error("Current valuation requires fresh USD marks.");
    }
  }
  return result;
}
