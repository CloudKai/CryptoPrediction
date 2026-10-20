"use client";

import Link from "next/link";
import { useState } from "react";
import { money, parseAmount } from "@/lib/discover/profile";
import { removeProposal, unfollowAsset, useFollowedAssets, useSavedProposals } from "@/lib/discover/storage";
import { Icon } from "./icons";
import styles from "./discover.module.css";

export function SavedProposals() {
  const saved = useSavedProposals();
  const [notice, setNotice] = useState("");
  return <><div className={styles.pageHeading}><h1>Saved proposals</h1><p>Stored on this device. These suggestions are separate from recorded investments.</p></div>{saved.length ? <div className={styles.simpleList}>{saved.map((item) => <article key={item.requestId}><div><h2>{money(parseAmount(item.draft.amount) ?? 0)} allocation request</h2><p>{item.response.status === "complete" ? `${item.response.allocations.length} suggested assets` : "Analysis unavailable"} · Saved from {new Date(item.requestedAt).toLocaleDateString("en-US", { timeZone: "UTC" })}</p></div><div className={styles.resultActions}><Link className={styles.secondaryButton} href={`/discover/results?saved=${encodeURIComponent(item.requestId)}`}>View proposal<Icon name="arrow" size={15} /></Link><button type="button" className={styles.textButton} onClick={() => setNotice(removeProposal(item.requestId) ? "Proposal removed from this device." : "Your browser couldn’t remove the saved proposal.")}>Remove</button></div></article>)}</div> : <section className={styles.emptyState}><span className={styles.emptyIcon}><Icon name="discover" size={28} /></span><h2>No saved proposals yet.</h2><p>After a completed analysis, you can save the proposal here without creating an account.</p><Link href="/" className={styles.primaryButton}>Build an allocation<Icon name="arrow" size={16} /></Link></section>}{notice ? <p className={styles.inlineNotice} role="status">{notice}</p> : null}</>;
}

export function LocalWatchlist() {
  const assets = useFollowedAssets();
  const [notice, setNotice] = useState("");
  return <><div className={styles.pageHeading}><h1>Your watchlist</h1><p>Assets you follow on this device. Following an asset does not record an investment.</p></div>{assets.length ? <div className={styles.simpleList}>{assets.map((asset) => <article key={asset.assetId}><div className={styles.assetIdentity}><span className={styles.assetInitial}>{asset.symbol.slice(0, 1)}</span><div><h2>{asset.name}</h2><p>{asset.symbol}</p></div></div><button type="button" className={styles.textButton} onClick={() => setNotice(unfollowAsset(asset.assetId) ? `${asset.name} removed from your watchlist.` : "Your browser couldn’t update the watchlist.")}>Unfollow</button></article>)}</div> : <section className={styles.emptyState}><span className={styles.emptyIcon}><Icon name="watchlist" size={28} /></span><h2>A little space for your research.</h2><p>Follow assets from a completed allocation to keep them here. You can also browse the existing markets view.</p><div className={styles.resultActions}><Link href="/" className={styles.primaryButton}>Build an allocation<Icon name="arrow" size={16} /></Link><Link href="/markets" className={styles.secondaryButton}>Explore markets</Link></div></section>}{notice ? <p className={styles.inlineNotice} role="status">{notice}</p> : null}</>;
}
