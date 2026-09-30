import { queryOptions } from "@tanstack/react-query";
import { api } from "@/shared/api/axios";
import { AnalysisResponseSchema, SnapshotResponseSchema, HandoffResponseSchema } from "../model/analytics";
import type { AnalyticsQuery } from "../model/analytics";

export const analysisKeys = {
  snapshot: (user: string | null, query: AnalyticsQuery) => ["vnext-analytics", user, query] as const,
  run: (user: string | null, id: string | null) => ["vnext-analysis", user, id] as const,
  handoff: (user: string | null, runId: string, opportunityId: string) => ["vnext-handoff", user, runId, opportunityId] as const,
};
export const analysisQueries = {
  handoff: (user: string | null, runId: string, opportunityId: string) => queryOptions({
    queryKey: analysisKeys.handoff(user, runId, opportunityId),
    queryFn: async () => {
      const { data } = await api.get(`/api/v2/analyses/${encodeURIComponent(runId)}/opportunities/${encodeURIComponent(opportunityId)}`);
      return HandoffResponseSchema.parse(data).handoff;
    },
    refetchOnMount: "always", retry: false,
  }),
  snapshot: (user: string | null, query: AnalyticsQuery) => queryOptions({
    queryKey: analysisKeys.snapshot(user, query),
    queryFn: async () => {
      const params = new URLSearchParams({ period: query.period });
      if (query.start) params.set("start", query.start);
      if (query.endExclusive) params.set("endExclusive", query.endExclusive);
      query.categoryIds.forEach((id) => params.append("categoryIds", String(id)));
      query.cardNames.forEach((name) => params.append("cardNames", name));
      const { data } = await api.get("/api/v2/analytics", { params });
      return SnapshotResponseSchema.parse(data).snapshot;
    },
    refetchOnMount: "always", retry: false,
  }),
  run: (user: string | null, id: string | null) => queryOptions({
    queryKey: analysisKeys.run(user, id),
    queryFn: async () => {
      const { data } = await api.get(id ? `/api/v2/analyses/${encodeURIComponent(id)}` : "/api/v2/analyses");
      return AnalysisResponseSchema.parse(data);
    },
    refetchOnMount: "always", retry: false,
  }),
};
export async function createAnalysis(query: AnalyticsQuery, expectedDataRevision: string) {
  const { data } = await api.post("/api/v2/analyses", { ...query, expectedDataRevision });
  return AnalysisResponseSchema.parse(data);
}
