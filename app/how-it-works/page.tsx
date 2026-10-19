import { HowItWorksSection } from "@/components/dashboard/dashboard-home-sections";
import { InfoPageShell } from "@/components/dashboard/info-page-shell";

export default function HowItWorksPage() {
  return (
    <InfoPageShell activeTab="how-it-works">
      <HowItWorksSection />
    </InfoPageShell>
  );
}
