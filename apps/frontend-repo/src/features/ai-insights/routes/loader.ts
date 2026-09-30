import type { QueryClient } from "@tanstack/react-query";
import { aiInsightQueries } from "@/features/ai-insights/api/queries";

export const loader = (queryClient: QueryClient) => async () => {
  queryClient.prefetchQuery(aiInsightQueries.categories());
  return null;
};
