import { queryOptions } from "@tanstack/react-query";
import {
  fetchInsightCategories,
  fetchInsightTransactions,
} from "@/features/ai-insights/api/fetchers";

export const aiInsightKeys = {
  all: ["ai-insights"] as const,
  transactions: () => [...aiInsightKeys.all, "transactions"] as const,
  categories: () => [...aiInsightKeys.all, "categories"] as const,
  monthlyGoals: () => [...aiInsightKeys.all, "monthly-goals"] as const,
};

export const aiInsightQueries = {
  transactions: () =>
    queryOptions({
      queryKey: aiInsightKeys.transactions(),
      queryFn: fetchInsightTransactions,
      refetchOnMount: "always",
    }),
  categories: () =>
    queryOptions({
      queryKey: aiInsightKeys.categories(),
      queryFn: fetchInsightCategories,
      refetchOnMount: "always",
    }),
};
