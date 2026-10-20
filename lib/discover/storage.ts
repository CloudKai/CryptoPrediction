import { useMemo, useSyncExternalStore } from "react";
import { type AnalysisResponse, parseAnalysis } from "./contract";
import { draftToInput, parseDraft, type DiscoverDraft } from "./profile";

const DRAFT_KEY = "crypto-discover:draft:v1";
const RESULT_KEY = "crypto-discover:result:v1";
const SAVED_KEY = "crypto-discover:saved:v1";
const WATCHLIST_KEY = "crypto-discover:watchlist:v1";
const CHANGE_EVENT = "crypto-discover-change";
export type ResultRecord = { version: 1; requestId: string; draft: DiscoverDraft; requestedAt: string; response: AnalysisResponse };
export type FollowedAsset = { assetId: string; name: string; symbol: string };

function read(key: string, persistent = false): string | null {
  if (typeof window === "undefined") return null;
  try { return (persistent ? localStorage : sessionStorage).getItem(key); } catch { return null; }
}
function write(key: string, value: unknown, persistent = false) {
  try {
    (persistent ? localStorage : sessionStorage).setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event(CHANGE_EVENT)); return true;
  } catch { return false; }
}
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback); window.addEventListener(CHANGE_EVENT, callback);
  return () => { window.removeEventListener("storage", callback); window.removeEventListener(CHANGE_EVENT, callback); };
}
function decode(raw: string | null): unknown { try { return raw ? JSON.parse(raw) : null; } catch { return null; } }
export function saveDraft(draft: DiscoverDraft) { return write(DRAFT_KEY, draft); }
export function useDraftSnapshot() {
  const raw = useSyncExternalStore(subscribe, () => read(DRAFT_KEY), () => null);
  return useMemo(() => parseDraft(decode(raw)), [raw]);
}
export function saveResult(record: ResultRecord) { return write(RESULT_KEY, record); }
export function parseResultRecord(value: unknown): ResultRecord | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Partial<ResultRecord>;
  const draft = parseDraft(record.draft);
  const input = draft && draftToInput(draft);
  if (record.version !== 1 || typeof record.requestId !== "string" || record.requestId.length > 100 || typeof record.requestedAt !== "string" || !Number.isFinite(Date.parse(record.requestedAt)) || !draft || !input) return null;
  const response = parseAnalysis(record.response, input);
  return response ? { version: 1, requestId: record.requestId, requestedAt: record.requestedAt, draft, response } : null;
}
export function useResultSnapshot() {
  const raw = useSyncExternalStore(subscribe, () => read(RESULT_KEY), () => null);
  return useMemo(() => parseResultRecord(decode(raw)), [raw]);
}
export function saveProposal(record: ResultRecord) {
  const raw = decode(read(SAVED_KEY, true));
  const existing = Array.isArray(raw) ? raw.map(parseResultRecord).filter((value): value is ResultRecord => Boolean(value)) : [];
  return write(SAVED_KEY, [record, ...existing.filter((item) => item.requestId !== record.requestId)].slice(0, 10), true);
}
export function useSavedProposals() {
  const raw = useSyncExternalStore(subscribe, () => read(SAVED_KEY, true), () => null);
  return useMemo(() => { const value = decode(raw); return Array.isArray(value) ? value.map(parseResultRecord).filter((item): item is ResultRecord => Boolean(item)) : []; }, [raw]);
}
export function removeProposal(id: string) {
  const raw = decode(read(SAVED_KEY, true));
  return write(SAVED_KEY, Array.isArray(raw) ? raw.filter((item) => item?.requestId !== id) : [], true);
}
function parseWatchlist(value: unknown): FollowedAsset[] {
  return Array.isArray(value) ? value.filter((item): item is FollowedAsset => Boolean(item && typeof item === "object" && typeof item.assetId === "string" && item.assetId.length <= 150 && typeof item.name === "string" && item.name.length <= 120 && typeof item.symbol === "string" && item.symbol.length <= 20)).slice(0, 100) : [];
}
export function useFollowedAssets() {
  const raw = useSyncExternalStore(subscribe, () => read(WATCHLIST_KEY, true), () => null);
  return useMemo(() => parseWatchlist(decode(raw)), [raw]);
}
export function followAsset(asset: FollowedAsset) {
  const existing = parseWatchlist(decode(read(WATCHLIST_KEY, true)));
  return write(WATCHLIST_KEY, [...existing.filter((item) => item.assetId !== asset.assetId), asset].slice(-100), true);
}
export function unfollowAsset(id: string) {
  return write(WATCHLIST_KEY, parseWatchlist(decode(read(WATCHLIST_KEY, true))).filter((item) => item.assetId !== id), true);
}
