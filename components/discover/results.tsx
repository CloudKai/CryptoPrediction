"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ensureFresh, issue, parseAnalysis, type AnalysisResponse, type CompleteAnalysis } from "@/lib/discover/contract";
import { draftToInput, money } from "@/lib/discover/profile";
import { followAsset, saveDraft, saveProposal, saveResult, useFollowedAssets, useResultSnapshot, useSavedProposals, type ResultRecord } from "@/lib/discover/storage";
import { Icon } from "./icons";
import { RequestSummary } from "./request-summary";
import styles from "./discover.module.css";

const noSubscription = () => () => {};
const clientReady = () => true;
const serverReady = () => false;
function time(value: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(value)) + " UTC";
}

function AllocationList({ analysis }: { analysis: CompleteAnalysis }) {
  const watched = useFollowedAssets();
  const [notice, setNotice] = useState("");
  return <>
    <section className={styles.resultPanel} aria-labelledby="allocation-heading">
      <div className={styles.resultPanelHeader}><h2 id="allocation-heading">Suggested allocation</h2><span>{analysis.allocations.length} {analysis.allocations.length === 1 ? "asset" : "assets"} · USD</span></div>
      <div className={styles.allocationHeader} aria-hidden="true"><span>Asset &amp; reasoning</span><span>Allocation</span></div>
      {analysis.allocations.map((asset) => {
        const isWatched = watched.some((item) => item.assetId === asset.assetId);
        return <article key={asset.assetId} className={styles.allocationItem}>
          <div className={styles.allocationOverview}><div className={styles.assetIdentity}><span className={styles.assetInitial} aria-hidden="true">{asset.symbol.slice(0, 1)}</span><div><h3>{asset.name}</h3><span>{asset.symbol}</span></div></div><div className={styles.assetAmount}><strong>{money(asset.amountCents)}</strong><span>{(asset.weightBps / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}% of budget</span></div></div>
          <p className={styles.assetReason}>{asset.rationale}</p>
          <div className={styles.assetActions}><details className={styles.evidenceDetails}><summary>Risks &amp; supporting evidence<Icon name="chevron" size={15} /></summary><div><h4>Key risks</h4><ul>{asset.risks.map((risk, index) => <li key={index}>{risk}</li>)}</ul><h4>Sources</h4><ul className={styles.sourceList}>{asset.evidence.map((source, index) => <li key={`${source.url}-${index}`}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}<Icon name="external" size={13} /></a><span>Observed {time(source.observedAt)}</span></li>)}</ul></div></details><button type="button" className={styles.textButton} disabled={isWatched} onClick={() => setNotice(followAsset(asset) ? `${asset.name} added to your watchlist on this device.` : "Your browser couldn’t save this asset. Check local storage permissions and try again.")}>{isWatched ? <><Icon name="check" size={14} />Following</> : <><Icon name="watchlist" size={14} />Follow asset</>}</button></div>
        </article>;
      })}
      <div className={styles.allocationTotal}><span>Total allocated</span><div><strong>{money(analysis.allocations.reduce((sum, asset) => sum + asset.amountCents, 0))}</strong><span>100% of your entered budget</span></div></div>
    </section>
    {notice ? <p className={styles.inlineNotice} role="status">{notice}</p> : null}
    <section className={styles.riskPanel} aria-labelledby="risk-heading"><div className={styles.sectionHeader}><h2 id="risk-heading">Portfolio risk review</h2><Icon name="info" size={18} /></div><p>{analysis.riskSummary}</p><details className={styles.evidenceDetails}><summary>Methodology &amp; limitations<Icon name="chevron" size={15} /></summary><div><p>{analysis.methodology}</p><ul>{analysis.limitations.map((item, index) => <li key={index}>{item}</li>)}</ul></div></details></section>
  </>;
}

export function DiscoverResults({ requestId, savedId }: { requestId?: string; savedId?: string }) {
  const ready = useSyncExternalStore(noSubscription, clientReady, serverReady);
  const session = useResultSnapshot();
  const proposals = useSavedProposals();
  const record = savedId ? proposals.find((item) => item.requestId === savedId) : session && session.requestId === requestId ? session : null;
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const controllerRef = useRef<AbortController | null>(null);
  const router = useRouter();
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 30_000); return () => { window.clearInterval(timer); controllerRef.current?.abort(); }; }, []);

  function edit(item: ResultRecord) {
    if (saveDraft(item.draft)) router.push("/");
    else setNotice("Your browser couldn’t restore the form. Allow session storage and try again.");
  }
  async function retry(item: ResultRecord) {
    if (controllerRef.current) return;
    const input = draftToInput(item.draft); if (!input) return;
    const controller = new AbortController(); controllerRef.current = controller; setBusy(true); setNotice("");
    try {
      let analysis: AnalysisResponse;
      try {
        const response = await fetch("/api/allocation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input), cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(65_000)]) });
        const parsed = parseAnalysis(await response.json(), input);
        analysis = parsed && (response.ok || parsed.status !== "complete") ? parsed : issue("invalid_analysis", "This analysis could not be verified. Please try again.", true, "incomplete");
      } catch { if (controller.signal.aborted) return; analysis = issue("connection_failed", "We couldn’t complete the analysis. Check your connection and try again."); }
      if (controller.signal.aborted) return;
      const nextId = crypto.randomUUID();
      if (!saveResult({ ...item, requestId: nextId, requestedAt: new Date().toISOString(), response: analysis })) { setNotice("The result couldn’t be preserved. Allow session storage and try again."); return; }
      setNow(Date.now()); router.replace(`/discover/results?request=${encodeURIComponent(nextId)}`);
    } finally { if (controllerRef.current === controller) { controllerRef.current = null; setBusy(false); } }
  }

  if (!ready) return <div className={styles.emptyState} role="status"><span className={styles.loadingDot} /><h1>Opening your request</h1></div>;
  if (!record) return <section className={styles.emptyState}><span className={styles.emptyIcon}><Icon name="discover" size={29} /></span><h1>No request in this tab yet.</h1><p>Start with your amount and investment profile. Requests stay in the tab where you create them.</p><Link href="/" className={styles.primaryButton}>Build an allocation<Icon name="arrow" size={17} /></Link><Link href="/discover/saved" className={styles.quietLink}>Or view proposals saved on this device</Link></section>;

  const analysis = ensureFresh(record.response, now);
  const alreadySaved = proposals.some((item) => item.requestId === record.requestId);
  return <>
    <button type="button" className={styles.backButton} onClick={() => edit(record)}><Icon name="back" size={16} />Edit inputs</button>
    <div className={styles.resultsHeading}><div><h1>{analysis.status === "complete" ? "Your allocation proposal" : "Your allocation request"}</h1><p>{analysis.status === "complete" ? "Review the distribution, understand the reasons, and explore the evidence." : "Your inputs are preserved. No investments have been made."}</p></div>{analysis.status === "complete" ? <button className={styles.secondaryButton} type="button" disabled={alreadySaved} onClick={() => setNotice(saveProposal(record) ? "Proposal saved on this device. It has not been added to Invested." : "Your browser couldn’t save the proposal. Check local storage permissions.")}>{alreadySaved ? <><Icon name="check" size={16} />Saved on this device</> : "Save proposal on this device"}</button> : null}</div>
    <div className={styles.formLayout}><div className={styles.resultsColumn}>
      {analysis.status === "complete" ? <><div className={styles.analysisMeta}><span>Generated {time(analysis.generatedAt)}</span><span>Market evidence {time(analysis.dataAsOf)}</span></div><AllocationList analysis={analysis} /><button className={styles.secondaryButton} onClick={() => retry(record)} disabled={busy} type="button">{busy ? "Requesting updated analysis…" : "Refresh analysis"}</button></> : <section className={styles.unavailablePanel} role="status"><span className={styles.emptyIcon}><Icon name="info" size={28} /></span><h2>{analysis.code === "analysis_not_connected" ? "Your request is ready. Analysis isn’t available yet." : analysis.status === "incomplete" ? "Your analysis is incomplete." : analysis.status === "unsupported" ? "This request isn’t supported yet." : "An allocation couldn’t be completed."}</h2><p>{analysis.message}</p><div className={styles.resultActions}>{analysis.retryable ? <button type="button" className={styles.primaryButton} disabled={busy} onClick={() => retry(record)}>{busy ? "Requesting analysis…" : "Try again"}<Icon name="arrow" size={17} /></button> : null}<button type="button" className={styles.secondaryButton} onClick={() => edit(record)}>Edit inputs</button><Link href="/markets" className={styles.quietLink}>Explore markets<Icon name="arrow" size={15} /></Link></div><div className={styles.unavailableFootnote}>No asset choices or amounts are shown without a verified analysis.</div></section>}
      {busy ? <div className={styles.loadingNotice} role="status"><span className={styles.loadingDot} /><span>Waiting for a verified analysis.</span><button type="button" className={styles.textButton} onClick={() => { controllerRef.current?.abort(); controllerRef.current = null; setBusy(false); setNotice("Request cancelled. Your previous request is unchanged."); }}>Cancel</button></div> : null}
      {notice ? <p className={styles.inlineNotice} role="status">{notice}</p> : null}
    </div><RequestSummary draft={record.draft} expanded /></div>
  </>;
}
