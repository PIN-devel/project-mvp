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
    refetchInterval: (query) => query.state.data?.run?.status === "PENDING" ? 1500 : false,
  }),
};
export async function createAnalysis(query: AnalyticsQuery, expectedDataRevision: string, signal?: AbortSignal) {
  const { data } = await api.post("/api/v2/analyses", { ...query, expectedDataRevision }, { signal });
  let response = AnalysisResponseSchema.parse(data);
  // The current server waits for AI. Also tolerate an explicitly pending saved run.
  while (response.run?.status === "PENDING" && !response.stale) {
    await new Promise<void>((resolve, reject) => {
      if (signal?.aborted) { reject(signal.reason); return; }
      const abort = () => { clearTimeout(timer); reject(signal?.reason); };
      const timer = setTimeout(() => { signal?.removeEventListener("abort", abort); resolve(); }, 1500);
      signal?.addEventListener("abort", abort, { once: true });
    });
    const { data: completed } = await api.get(`/api/v2/analyses/${encodeURIComponent(response.run.id)}`, { signal });
    response = AnalysisResponseSchema.parse(completed);
  }
  if (!response.run) throw new Error("분석 결과를 확인하지 못했어요.");
  return response;
}
