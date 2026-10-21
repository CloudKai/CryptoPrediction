export const PROFILE_QUESTIONS = [
  { key: "horizon", label: "When might you need this money?", options: [
    ["under_1", "Under 1 year"], ["1_3", "1–3 years"], ["3_5", "3–5 years"], ["over_5", "Over 5 years"], ["unsure", "Unsure"],
  ] },
  { key: "capacity", label: "Would losing this amount affect essential expenses or emergency savings?", options: [
    ["yes", "Yes"], ["no", "No"], ["unsure", "Unsure"],
  ] },
  { key: "reaction", label: "If $1,000 fell to $800, what would you most likely do?", options: [
    ["sell_all", "Sell all"], ["sell_some", "Sell some"], ["hold", "Hold and reassess"], ["unsure", "Unsure"],
  ] },
  { key: "experience", label: "What is your investment experience?", options: [
    ["none", "None"], ["basic", "Basic"], ["experienced", "Experienced"],
  ] },
  { key: "holdings", label: "What investments do you already hold?", options: [
    ["none", "None"], ["crypto", "Crypto"], ["stocks", "Stocks or funds"], ["both", "Both"], ["other", "Other"], ["undisclosed", "Prefer not to say"],
  ] },
] as const;

export type ProfileKey = (typeof PROFILE_QUESTIONS)[number]["key"];
export const ASSET_CLASSES = { crypto: "Crypto", stocks: "Stocks", both: "Crypto + stocks" } as const;
export const STOCK_MARKETS = { us: "US", sg: "Singapore", both: "US + Singapore" } as const;
export type AssetClassSelection = keyof typeof ASSET_CLASSES;
export type StockMarket = keyof typeof STOCK_MARKETS;
export type DiscoverDraft = Record<ProfileKey, string> & { amount: string; preferences: string; assetClass?: string; stockMarket?: string };
export type DiscoverInput = { budgetCents: number; currency: "USD"; preferences: string; profile: Record<ProfileKey, string>; assetClass?: AssetClassSelection; stockMarket?: StockMarket };
export type FormErrors = Partial<Record<ProfileKey | "amount" | "preferences" | "assetClass" | "stockMarket", string>>;

export const EMPTY_DRAFT: DiscoverDraft = { amount: "", preferences: "", horizon: "", capacity: "", reaction: "", experience: "", holdings: "", assetClass: "crypto", stockMarket: "both" };
export const MAX_BUDGET_CENTS = 99_999_999_999;
export const MAX_PREFERENCES_LENGTH = 1_000;
export const ANALYSIS_LIMITS = { totalTokens: 15_000, explanationTokens: 1_500 } as const;

export function money(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(cents / 100);
}

export function parseAmount(value: string): number | null {
  const normalized = value.trim();
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, fraction = ""] = normalized.replaceAll(",", "").split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(cents) && cents > 0 && cents <= MAX_BUDGET_CENTS ? cents : null;
}

export function validateDraft(draft: DiscoverDraft): FormErrors {
  const errors: FormErrors = {};
  if (draft.assetClass !== undefined && !Object.hasOwn(ASSET_CLASSES, draft.assetClass)) errors.assetClass = "Choose Crypto, Stocks, or Crypto + stocks.";
  if (draft.stockMarket !== undefined && !Object.hasOwn(STOCK_MARKETS, draft.stockMarket)) errors.stockMarket = "Choose US, Singapore, or US + Singapore.";
  if (parseAmount(draft.amount) === null) errors.amount = `Enter a USD amount from $0.01 to ${money(MAX_BUDGET_CENTS)}, with at most two decimal places.`;
  if (draft.preferences.length > MAX_PREFERENCES_LENGTH) errors.preferences = `Keep additional preferences to ${MAX_PREFERENCES_LENGTH.toLocaleString()} characters.`;
  for (const question of PROFILE_QUESTIONS) {
    if (!question.options.some(([value]) => value === draft[question.key])) errors[question.key] = "Choose one answer.";
  }
  return errors;
}

export function draftToInput(draft: DiscoverDraft): DiscoverInput | null {
  const budgetCents = parseAmount(draft.amount);
  if (budgetCents === null || Object.keys(validateDraft(draft)).length) return null;
  return { budgetCents, currency: "USD", preferences: draft.preferences.trim(), profile: Object.fromEntries(PROFILE_QUESTIONS.map(({ key }) => [key, draft[key]])) as Record<ProfileKey, string>, ...(draft.assetClass !== undefined ? { assetClass: draft.assetClass as AssetClassSelection } : {}), ...(draft.stockMarket !== undefined ? { stockMarket: draft.stockMarket as StockMarket } : {}) };
}

export function parseDraft(value: unknown): DiscoverDraft | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const keys = ["amount", "preferences", ...PROFILE_QUESTIONS.map(({ key }) => key)] as const;
  if (keys.some((key) => typeof record[key] !== "string")) return null;
  if ((record.amount as string).length > 40 || (record.preferences as string).length > MAX_PREFERENCES_LENGTH) return null;
  if (record.assetClass !== undefined && (typeof record.assetClass !== "string" || !Object.hasOwn(ASSET_CLASSES, record.assetClass))) return null;
  if (record.stockMarket !== undefined && (typeof record.stockMarket !== "string" || !Object.hasOwn(STOCK_MARKETS, record.stockMarket))) return null;
  return { ...Object.fromEntries(keys.map((key) => [key, record[key]])), ...(record.assetClass !== undefined ? { assetClass: record.assetClass } : {}), ...(record.stockMarket !== undefined ? { stockMarket: record.stockMarket } : {}) } as DiscoverDraft;
}

export function parseInput(value: unknown): DiscoverInput | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Partial<DiscoverInput>;
  if (record.currency !== "USD" || !Number.isSafeInteger(record.budgetCents) || !record.budgetCents || record.budgetCents > MAX_BUDGET_CENTS || record.budgetCents < 1 || typeof record.preferences !== "string" || !record.profile) return null;
  const draft = { ...record.profile, amount: (record.budgetCents / 100).toFixed(2), preferences: record.preferences, assetClass: record.assetClass, stockMarket: record.stockMarket };
  const parsed = parseDraft(draft);
  return parsed ? draftToInput(parsed) : null;
}

export function answerLabel(key: ProfileKey, value: string) {
  const question = PROFILE_QUESTIONS.find((item) => item.key === key);
  return question?.options.find(([id]) => id === value)?.[1] ?? "Not answered";
}
