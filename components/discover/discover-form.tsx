"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { issue, parseAnalysis } from "@/lib/discover/contract";
import { ASSET_CLASSES, STOCK_MARKETS, draftToInput, EMPTY_DRAFT, MAX_PREFERENCES_LENGTH, money, parseAmount, PROFILE_QUESTIONS, validateDraft, type DiscoverDraft, type FormErrors } from "@/lib/discover/profile";
import { saveDraft, saveResult, useDraftSnapshot } from "@/lib/discover/storage";
import { Icon } from "./icons";
import { RequestSummary } from "./request-summary";
import styles from "./discover.module.css";

const noSubscription = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

export function DiscoverForm() {
  const stored = useDraftSnapshot();
  const [edits, setEdits] = useState<DiscoverDraft | null>(null);
  const draft = edits ?? stored ?? EMPTY_DRAFT;
  const [errors, setErrors] = useState<FormErrors>({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [storageNotice, setStorageNotice] = useState("");
  const errorRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const submitRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const ready = useSyncExternalStore(noSubscription, clientReady, serverReady);
  useEffect(() => () => { controllerRef.current?.abort(); }, []);
  const budget = parseAmount(draft.amount);
  const hypothetical = budget ?? 100_000;
  const errorEntries = Object.entries(errors);

  function update(key: keyof DiscoverDraft, value: string) {
    const next = { ...draft, [key]: value };
    setEdits(next);
    setErrors((previous) => { const rest = { ...previous }; delete rest[key]; return rest; });
    if (!saveDraft(next)) setStorageNotice("This browser can’t preserve your inputs between pages. Allow session storage before generating an allocation.");
    else setStorageNotice("");
  }
  function cancel() {
    controllerRef.current?.abort(); controllerRef.current = null; setBusy(false);
    setNotice("Request cancelled. Your inputs are unchanged."); submitRef.current?.focus();
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (controllerRef.current) return;
    const nextErrors = validateDraft(draft);
    setErrors(nextErrors); setNotice("");
    if (Object.keys(nextErrors).length) { requestAnimationFrame(() => errorRef.current?.focus()); return; }
    const input = draftToInput(draft);
    if (!input) return;
    if (!saveDraft(draft)) { setStorageNotice("This browser can’t preserve your request. Allow session storage and try again."); return; }
    const controller = new AbortController(); controllerRef.current = controller; setBusy(true);
    try {
      let analysis;
      try {
        const response = await fetch("/api/allocation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input), signal: AbortSignal.any([controller.signal, AbortSignal.timeout(65_000)]), cache: "no-store" });
        const raw = await response.json();
        analysis = parseAnalysis(raw, input);
        if (!analysis || (!response.ok && analysis.status === "complete")) analysis = issue("invalid_analysis", "We couldn’t verify this analysis. No allocation has been shown. Please try again.", true, "incomplete");
      } catch {
        if (controller.signal.aborted) return;
        analysis = issue("connection_failed", "We couldn’t complete your request. Check your connection and try again; your inputs are preserved.");
      }
      if (controller.signal.aborted) return;
      const requestId = crypto.randomUUID();
      const storedResult = saveResult({ version: 1, requestId, draft, requestedAt: new Date().toISOString(), response: analysis });
      if (!storedResult) { setStorageNotice("Your browser couldn’t preserve the result. Allow session storage, then try again."); return; }
      router.push(`/discover/results?request=${encodeURIComponent(requestId)}`);
    } finally {
      if (controllerRef.current === controller) { controllerRef.current = null; setBusy(false); }
    }
  }

  return <>
    <div className={styles.pageHeading}><h1>Find an allocation that fits you.</h1><p>Share your budget and preferences. Review the suggested assets, evidence, and risks.</p></div>
    <div className={styles.formLayout}>
      <form className={styles.formPanel} onSubmit={submit} method="post" noValidate aria-busy={busy}>
        <noscript><p className={styles.inlineNotice}>Enable JavaScript to complete this form. Your budget and profile are never submitted in a page URL.</p></noscript>
        {errorEntries.length ? <div ref={errorRef} tabIndex={-1} className={styles.errorSummary} role="alert"><h2>Check {errorEntries.length === 1 ? "one answer" : `${errorEntries.length} answers`} before continuing.</h2><ul>{errorEntries.map(([key, message]) => <li key={key}><a href={`#${key}`}>{key === "amount" ? "Amount" : key === "preferences" ? "Additional preferences" : PROFILE_QUESTIONS.find((q) => q.key === key)?.label}: {message}</a></li>)}</ul></div> : null}
        <fieldset disabled={busy || !ready} className={styles.formFields}>
          <section aria-labelledby="plan-heading" className={styles.formSection}>
            <div className={styles.sectionHeader}><h2 id="plan-heading">Your investment plan</h2><span>USD budget</span></div>
            <fieldset className={styles.question} id="assetClass"><legend>What would you like to explore?</legend><div className={styles.radioOptions}>{Object.entries(ASSET_CLASSES).map(([value,label]) => <label key={value} className={`${styles.radioOption} ${(draft.assetClass ?? "crypto") === value ? styles.radioSelected : ""}`}><input type="radio" name="assetClass" value={value} checked={(draft.assetClass ?? "crypto") === value} onChange={() => update("assetClass",value)}/><span>{label}</span></label>)}</div></fieldset>
            {(draft.assetClass ?? "crypto") !== "crypto" ? <fieldset className={styles.question} id="stockMarket"><legend>Stock markets</legend><div className={styles.radioOptions}>{Object.entries(STOCK_MARKETS).map(([value,label]) => <label key={value} className={`${styles.radioOption} ${(draft.stockMarket ?? "both") === value ? styles.radioSelected : ""}`}><input type="radio" name="stockMarket" value={value} checked={(draft.stockMarket ?? "both") === value} onChange={() => update("stockMarket",value)}/><span>{label}</span></label>)}</div><p className={styles.fieldHelp}>Budget amounts stay in USD. Singapore stock prices are quoted in SGD. Suggestions do not execute trades.</p></fieldset> : null}
            <label className={styles.fieldLabel} htmlFor="amount">Amount to allocate <span className={styles.requiredText}>(required)</span></label>
            <div className={`${styles.amountField} ${errors.amount ? styles.invalidField : ""}`}><span aria-hidden="true">USD</span><input id="amount" name="amount" inputMode="decimal" autoComplete="off" placeholder="1,000.00" value={draft.amount} onChange={(event) => update("amount", event.target.value)} aria-invalid={Boolean(errors.amount)} aria-describedby={`amount-help${errors.amount ? " amount-error" : ""}`} maxLength={30} /></div>
            <p id="amount-help" className={styles.fieldHelp}>Guests use USD. Sign-in and currency settings are not available yet.</p>
            {errors.amount ? <p id="amount-error" className={styles.fieldError}>{errors.amount}</p> : null}
            <div className={styles.preferencesField}><label className={styles.fieldLabel} htmlFor="preferences">Additional preferences <span className={styles.optionalText}>Optional</span></label><textarea id="preferences" name="preferences" rows={3} placeholder="For example: focus on infrastructure projects and explain the fundamentals." value={draft.preferences} onChange={(event) => update("preferences", event.target.value)} maxLength={MAX_PREFERENCES_LENGTH} aria-invalid={Boolean(errors.preferences)} aria-describedby={`preferences-help${errors.preferences ? " preferences-error" : ""}`} /><div className={styles.fieldHintRow}><p id="preferences-help" className={styles.fieldHelp}>Share interests, exclusions, or details you want considered.</p><span className={styles.fieldHelp}>{draft.preferences.length.toLocaleString()}/{MAX_PREFERENCES_LENGTH.toLocaleString()}</span></div>{errors.preferences ? <p id="preferences-error" className={styles.fieldError}>{errors.preferences}</p> : null}</div>
          </section>
          <section className={styles.profileSection} aria-labelledby="profile-heading"><div className={styles.sectionHeader}><h2 id="profile-heading">Your investment profile</h2><span>One answer per question</span></div><p className={styles.sectionDescription}>These answers help set context. They do not determine a risk score on their own.</p>
            {PROFILE_QUESTIONS.map((question) => <fieldset key={question.key} id={question.key} className={styles.question} aria-describedby={errors[question.key] ? `${question.key}-error` : question.key === "reaction" ? "reaction-help" : undefined} aria-invalid={Boolean(errors[question.key])}>
              <legend>{question.key === "reaction" ? `If ${money(hypothetical)} fell to ${money(Math.round(hypothetical * 0.8))}, what would you most likely do?` : question.label} <span className={styles.requiredText}>(required)</span></legend>
              <div className={styles.radioOptions}>{question.options.map(([value, label]) => <label key={value} className={`${styles.radioOption} ${draft[question.key] === value ? styles.radioSelected : ""}`}><input type="radio" name={question.key} value={value} checked={draft[question.key] === value} onChange={() => update(question.key, value)} required /><span>{label}</span></label>)}</div>
              {question.key === "reaction" ? <p id="reaction-help" className={styles.fieldHelp}>A hypothetical decline, not the maximum possible loss.</p> : null}
              {errors[question.key] ? <p id={`${question.key}-error`} className={styles.fieldError}>{errors[question.key]}</p> : null}
            </fieldset>)}
          </section>
        </fieldset>
        {storageNotice ? <p className={styles.inlineNotice} role="alert">{storageNotice}</p> : null}
        {busy ? <div className={styles.loadingNotice} role="status"><span className={styles.loadingDot} /><div><strong>Requesting your allocation</strong><p>Waiting for a verified analysis. Your inputs are preserved.</p></div><button type="button" className={styles.textButton} onClick={cancel}>Cancel</button></div> : null}
        {notice ? <p className={styles.inlineNotice} role="status">{notice}</p> : null}
        <div className={styles.submitArea}><button ref={submitRef} type="submit" className={styles.primaryButton} disabled={busy || !ready}>{busy ? "Request in progress" : "Generate allocation"}<Icon name="arrow" size={18} /></button><p>Suggestions only. You’ll review the allocation on the next page.</p></div>
      </form>
      <div className={styles.summaryColumn}><RequestSummary draft={draft} /><Link href="/discover/saved" className={styles.quietLink}>View saved proposals<Icon name="chevron" size={15} /></Link></div>
    </div>
  </>;
}
