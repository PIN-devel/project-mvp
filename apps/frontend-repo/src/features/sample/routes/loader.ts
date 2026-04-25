import type { QueryClient } from "@tanstack/react-query";
import { sampleQueries } from "@/features/sample/api/queries";

export const loader = (queryClient: QueryClient) => async () => {
  // 즉시 렌더링을 위해 await 하지 않고 백그라운드에서 데이터를 미리 로드(prefetch)합니다.
  queryClient.prefetchQuery(sampleQueries.list());
  return null;
};
