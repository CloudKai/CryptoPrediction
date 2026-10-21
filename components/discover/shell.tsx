"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { Icon } from "./icons";
import styles from "./discover.module.css";

const navigation = [
  { label: "Discover", href: "/", icon: "discover" },
  { label: "Crypto", href: "/markets", icon: "markets" },
  { label: "Stocks", href: "/stocks", icon: "stocks" },
  { label: "Watchlist", href: "/watchlist", icon: "watchlist" },
  { label: "Invested", href: "/invested", icon: "invested" },
] as const;

export function DiscoverShell({ children, title = "Discover" }: { children: ReactNode; title?: string }) {
  const pathname = usePathname();
  const profileRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    function close(event: KeyboardEvent) {
      if (event.key === "Escape" && profileRef.current?.open) {
        profileRef.current.open = false;
        profileRef.current.querySelector("summary")?.focus();
      }
    }
    function outside(event: PointerEvent) {
      if (event.target instanceof Node && !profileRef.current?.contains(event.target) && profileRef.current) profileRef.current.open = false;
    }
    document.addEventListener("keydown", close); document.addEventListener("pointerdown", outside);
    return () => { document.removeEventListener("keydown", close); document.removeEventListener("pointerdown", outside); };
  }, []);
  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href="#discover-main">Skip to content</a>
      <aside className={styles.sidebar}>
        <Link href="/" className={styles.brand}><span className={styles.brandMark}><Icon name="discover" size={25} /></span><span>Crypto Prediction<span className={styles.brandSub}>Research &amp; allocation</span></span></Link>
        <nav className={styles.navigation} aria-label="Main navigation">
          {navigation.map((item) => {
            const active = item.href === "/" ? pathname === "/" || pathname.startsWith("/discover") : pathname.startsWith(item.href);
            return <Link key={item.href} href={item.href} className={`${styles.navLink} ${active ? styles.navActive : ""}`} aria-current={active ? "page" : undefined}><Icon name={item.icon} /><span>{item.label}</span>{item.href === "/invested" ? <Icon name="lock" size={13} style={{ marginLeft: "auto" }} /> : null}</Link>;
          })}
        </nav>
        <div className={styles.sidebarFooter}><span className={styles.smallAvatar}><Icon name="user" size={17} /></span><div><strong>Guest workspace</strong><span>Explore at your own pace</span></div></div>
      </aside>
      <div className={styles.workspace}>
        <header className={styles.topbar}><div className={styles.breadcrumb}><span>Workspace</span><span aria-hidden="true">/</span><strong>{title}</strong></div><div className={styles.accountArea}><span className={styles.currencyLabel}>USD</span><details className={styles.profile} ref={profileRef}><summary aria-label="Open profile menu"><Icon name="user" size={19} /></summary><div className={styles.profileMenu}><strong>Guest workspace</strong><p>You can generate suggestions without an account.</p><div className={styles.menuRow}><span>Currency</span><strong>USD</strong></div><p>Currency settings will be available after sign-in. Accounts are not available yet.</p><Link href="/discover/saved" onClick={() => { if (profileRef.current) profileRef.current.open = false; }}>Saved on this device<Icon name="chevron" size={15} /></Link></div></details></div></header>
        <main id="discover-main" className={styles.content} tabIndex={-1}>{children}</main>
        <footer className={styles.footer}><span>Research thoughtfully. Understand the risks.</span><span>Suggestions are separate from your recorded investments.</span></footer>
      </div>
    </div>
  );
}
