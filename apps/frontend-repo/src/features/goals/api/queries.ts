import { z } from "zod";
import { queryOptions } from "@tanstack/react-query";
import { api } from "@/shared/api/axios";
import { GoalResponseSchema, GoalSummarySchema, PreparationResponseSchema } from "../model/contract";
import type { GoalCreate } from "../model/contract";

export const goalKeys = {
  all: ["goal-cycles"] as const,
  list: (user: string | null) => ["goal-cycles", user, "list"] as const,
  view: (user: string | null, id: string) => ["goal-cycles", user, "view", id] as const,
  preparation: (user: string | null, run: string, opportunity: string, previous: string, month: string | null) => ["goal-cycles", user, "prepare", run, opportunity, previous, month] as const,
};
export const goalQueries = {
  list: (user: string | null) => queryOptions({ queryKey: goalKeys.list(user), queryFn: async () => {
    const { data } = await api.get("/api/v2/goal-cycles"); return z.array(GoalSummarySchema).parse(data);
  }, refetchOnMount: "always", retry: false }),
  view: (user: string | null, id: string) => queryOptions({ queryKey: goalKeys.view(user, id), queryFn: async () => {
    const { data } = await api.get(`/api/v2/goal-cycles/${encodeURIComponent(id)}`); return GoalResponseSchema.parse(data).goal;
  }, refetchOnMount: "always", retry: false }),
  prepare: (user: string | null, run: string, opportunity: string, previous: string, month: string | null) => queryOptions({
    queryKey: goalKeys.preparation(user, run, opportunity, previous, month), queryFn: async () => {
      const params = new URLSearchParams();
      if (month) params.set("baselineMonth", month);
      if (!previous) { params.set("analysisRunId", run); params.set("opportunityId", opportunity); }
      const { data } = await api.get(previous ? `/api/v2/goal-cycles/${encodeURIComponent(previous)}/prepare-next` : "/api/v2/goal-cycles/prepare", { params });
      return PreparationResponseSchema.parse(data).preparation;
    }, refetchOnMount: "always", retry: false,
  }),
};
export async function createGoal(payload: GoalCreate) {
  const { data } = await api.post("/api/v2/goal-cycles", payload); return GoalResponseSchema.parse(data).goal;
}
export async function evaluateGoal(id: string, revision: string, sourceConfirmed: boolean, idempotencyKey: string) {
  await api.post(`/api/v2/goal-cycles/${encodeURIComponent(id)}/evaluations`, { expectedDataRevision: revision, sourceConfirmed, idempotencyKey });
}
export async function stopGoal(id: string) { await api.post(`/api/v2/goal-cycles/${encodeURIComponent(id)}/stop`); }
