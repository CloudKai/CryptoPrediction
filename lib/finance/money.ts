/** Exact decimal multiplication. Inputs are decimal strings, never IEEE-754 quantities. */
export function decimal(value: string): {
  units: bigint;
  scale: bigint;
} {
  if (typeof value !== "string" || !/^(?:0|[1-9]\d{0,17})(?:\.\d{1,18})?$/.test(value))
    throw new Error("Use a non-negative decimal with at most 18 fractional digits.");
  const [whole, fraction = ""] = value.split(".");
  return { units: BigInt(whole + fraction), scale: BigInt(10) ** BigInt(fraction.length) };
}
export function cents(value: unknown, allowZero = true): number {
  if (!Number.isSafeInteger(value) || Number(value) < (allowZero ? 0 : 1))
    throw new Error("Money must be a non-negative safe integer in cents.");
  return Number(value);
}
export function safeNumber(value: bigint): number {
  const result = Number(value);
  if (!Number.isSafeInteger(result))
    throw new Error("Value exceeds supported monetary precision.");
  return result;
}
export function valueInCents(quantity: string, usdPrice: string): number {
  const q = decimal(quantity), p = decimal(usdPrice);
  if (q.units === BigInt(0))
    throw new Error("Quantity must be positive; price may be zero for a total loss.");
  const numerator = q.units * p.units * BigInt(100), denominator = q.scale * p.scale;
  return safeNumber((numerator * BigInt(2) + denominator) / (denominator * BigInt(2)));
}
export function sumCents(values: number[]) { return safeNumber(values.reduce((sum, value) => sum + BigInt(cents(value)), BigInt(0))); }
export function changePercent(current: number, baseline: number): number | null {
  return baseline === 0 ? null : Math.round(((current - baseline) / baseline) * 1000000) / 10000;
}
