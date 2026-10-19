"use client";

import { LatestNewsSection } from "@/components/dashboard/dashboard-home-sections";
import { InfoPageShell } from "@/components/dashboard/info-page-shell";
import { useCryptoNews } from "@/hooks/use-crypto-news";

export default function LatestNewsPage() {
  const news = useCryptoNews(10);

  return (
    <InfoPageShell activeTab="news">
      <LatestNewsSection
        marketNews={news.market}
        cryptoNews={news.crypto}
        techNews={news.tech}
        newsLoading={news.loading}
        newsError={news.error}
        newsWarning={news.warning}
      />
    </InfoPageShell>
  );
}
