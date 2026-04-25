import { Suspense } from "react";
import { SamplePageSkeleton } from "../ui/SamplePageSkeleton";
import { SamplePageContent } from "../ui/SamplePageContent";

/**
 * 샘플 페이지
 * Suspense를 사용하여 로딩 중 스켈레톤 UI를 표시합니다.
 */
export function SamplePage() {
  return (
    <Suspense fallback={<SamplePageSkeleton />}>
      <SamplePageContent />
    </Suspense>
  );
}
