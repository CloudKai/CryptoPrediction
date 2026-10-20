import Link from "next/link";
import type { Metadata } from "next";
import { DiscoverShell } from "@/components/discover/shell";
import { Icon } from "@/components/discover/icons";
import styles from "@/components/discover/discover.module.css";
export const metadata: Metadata = { title: "Invested" };
export default function InvestedPage() {
  return <DiscoverShell title="Invested"><section className={styles.emptyState}><span className={styles.emptyIcon}><Icon name="lock" size={28} /></span><h1>Your investments, kept separate.</h1><p>Invested will be a signed-in workspace for purchase history, growth scenarios, and risk reviews. Accounts and investment tracking are not available yet.</p><p>Discover remains available to guests. Generating a suggestion never adds it to your investments.</p><Link href="/" className={styles.primaryButton}>Explore Discover<Icon name="arrow" size={16} /></Link></section></DiscoverShell>;
}
