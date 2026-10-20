import { answerLabel, money, parseAmount, PROFILE_QUESTIONS, type DiscoverDraft } from "@/lib/discover/profile";
import styles from "./discover.module.css";

export function RequestSummary({ draft, expanded = false }: { draft: DiscoverDraft; expanded?: boolean }) {
  const amount = parseAmount(draft.amount);
  const answered = PROFILE_QUESTIONS.filter(({ key, options }) => options.some(([id]) => id === draft[key])).length;
  return <aside className={styles.summary} aria-label="Your request">
    <div className={styles.summaryHeading}><h2>Your request</h2><p>A reflection of your inputs.</p></div>
    <dl className={styles.summaryList}>
      <div><dt>Market</dt><dd>Cryptocurrency</dd></div>
      <div><dt>Budget</dt><dd className={styles.numbers}>{amount === null ? <span className={styles.muted}>Not entered</span> : <>{money(amount)} <span className={styles.unit}>USD</span></>}</dd></div>
      <div><dt>Investment profile</dt><dd>{answered === 5 ? "5 of 5 answered" : <span className={styles.muted}>{answered ? `${answered} of 5 answered` : "Not completed"}</span>}</dd></div>
      {expanded ? PROFILE_QUESTIONS.map(({ key, label }) => <div key={key}><dt>{label}</dt><dd>{answerLabel(key, draft[key])}</dd></div>) : null}
      <div className={styles.preferenceRow}><dt>Additional preferences</dt><dd>{draft.preferences.trim() || <span className={styles.muted}>None added</span>}</dd></div>
    </dl>
    {!expanded ? <div className={styles.summaryNext}><strong>What happens next</strong><p>Your allocation opens on a separate page, with amounts, reasoning, and risks.</p></div> : null}
    <p className={styles.summaryFootnote}>This is a request for suggestions. No purchases are made here.</p>
  </aside>;
}
