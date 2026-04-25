import { useSuspenseQuery } from "@tanstack/react-query";
import { Container } from "@mantine/core";
import { sampleQueries } from "@/features/sample/api/queries";
import { SampleList } from "@/features/sample/ui/SampleList";

/**
 * 샘플 페이지 콘텐츠 영역
 * useSuspenseQuery를 통해 데이터를 로드합니다.
 */
export function SamplePageContent() {
  const { data: samples } = useSuspenseQuery(sampleQueries.list());

  return (
    <Container size="lg">
      <SampleList samples={samples} />
    </Container>
  );
}
