import { Suspense } from "react";
import { AiInsightsPageContent } from "@/features/ai-insights/ui/AiInsightsPageContent";
import { AiInsightsPageSkeleton } from "@/features/ai-insights/ui/AiInsightsPageSkeleton";

export function AiInsightsPage({ userScope = null }: { userScope?: string | null }) {
  return (
    <Suspense fallback={<AiInsightsPageSkeleton />}>
      <AiInsightsPageContent key={userScope ?? "anonymous"} userScope={userScope} />
    </Suspense>
  );
}
