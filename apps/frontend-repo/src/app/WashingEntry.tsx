import { useAppStore } from "@/app/store/useAppStore";
import { WashingPage } from "@/features/washing/routes/WashingPage";
import { GoalWashingContext } from "@/features/goals/ui/GoalWashingContext";
import type { GoalUploadReceipt } from "@/features/goals/ui/GoalWashingContext";
import { goalKeys, goalQueries } from "@/features/goals/api/queries";
import type { GoalView } from "@/features/goals/model/contract";
import { washingQueries } from "@/features/washing/api/queries";
import type { WashingOverview } from "@/features/washing/model/types";
import type { GoalUpdateJourney } from "@/features/washing/ui/WashingPageContent";
import { useIsMutating, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate, useNavigation, useSearchParams } from "react-router";

interface UpdateBaseline { signature: string; revision: string }
interface UpdateCheck { updatedAt: number; changed: boolean; needsOrganization: boolean; error: boolean }

function persistedGoalRecords(overview: WashingOverview, goal: GoalView) {
  const { period } = goal.tracking.snapshot;
  return overview.transactions.filter((transaction) => {
    if (!goal.cycle.baseline.snapshot.sourceScope.cardNames.includes(transaction.cardLabel)) return false;
    const date = transaction.foundation?.occurredOn;
    return !date || Boolean(period.start && period.endExclusive && date >= period.start && date < period.endExclusive);
  }).sort((a, b) => a.id - b.id);
}

export function WashingEntry() {
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const namespace = useAppStore((state) => state.analysisNamespace);
  const [params] = useSearchParams();
  const goalId = params.get("flow") === "goal-update" ? params.get("goalId") : null;
  return <WashingWithGoal key={`${namespace}:${goalId}`} goalId={goalId} isAuthenticated={isAuthenticated} userScope={namespace} />;
}

function WashingWithGoal({ goalId, isAuthenticated, userScope }: { goalId: string | null; isAuthenticated: boolean; userScope: string | null }) {
  const [receipt, setReceipt] = useState<GoalUploadReceipt | null>(null);
  const [failed, setFailed] = useState(false);
  const client = useQueryClient();
  const navigate = useNavigate();
  const navigation = useNavigation();
  const mutations = useIsMutating();
  const overview = useQuery({ ...washingQueries.overview(), enabled: isAuthenticated && Boolean(goalId), refetchOnMount: "always" });
  const [check, setCheck] = useState<UpdateCheck | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !goalId || !overview.data || !overview.isFetchedAfterMount || overview.isFetching || overview.isError) return;
    let cancelled = false;
    const updatedAt = overview.dataUpdatedAt;
    const persistedOverview = overview.data;
    const baselineKey = ["goal-update-baseline", userScope, goalId] as const;
    // Keep the entry baseline across the rules workbench, until the flow is left.
    client.setQueryDefaults(baselineKey, { gcTime: Infinity });
    void client.fetchQuery({ ...goalQueries.view(userScope, goalId), staleTime: 0 }).then((goal) => {
      if (cancelled) return;
      const records = persistedGoalRecords(persistedOverview, goal);
      const signature = JSON.stringify(records.map((record) => [record.id, record.cardLabel, record.foundation ?? null]));
      const revision = goal.tracking.snapshot.dataRevision;
      const initial = client.getQueryData<UpdateBaseline>(baselineKey);
      if (!initial) client.setQueryData<UpdateBaseline>(baselineKey, { signature, revision });
      const needsOrganization = goal.tracking.sourceRisk || records.some((record) => record.foundation?.persisted !== true || record.foundation.classification !== "CLASSIFIED" || record.foundation.canonicalStatus === "UNKNOWN");
      setCheck({ updatedAt, changed: Boolean(initial && initial.signature !== signature && initial.revision !== revision), needsOrganization, error: false });
    }).catch(() => {
      if (!cancelled) setCheck({ updatedAt, changed: false, needsOrganization: false, error: true });
    });
    return () => { cancelled = true; };
  }, [client, goalId, isAuthenticated, overview.data, overview.dataUpdatedAt, overview.isError, overview.isFetchedAfterMount, overview.isFetching, userScope]);

  const checking = overview.isFetching || !overview.isFetchedAfterMount || check?.updatedAt !== overview.dataUpdatedAt || navigation.state !== "idle" || mutations > 0;
  const state: GoalUpdateJourney["state"] = overview.isError || failed ? "error" : checking ? "checking" : check?.error ? "error" : check?.needsOrganization ? "needs-organization" : check?.changed ? "ready" : "unchanged";
  const supportingContext = state === "checking" ? "저장된 이용내역과 최신 목표 관측값을 확인하고 있어요."
    : state === "error" ? "반영 상태를 확인하지 못했어요. 다시 확인한 뒤 이어가세요."
      : state === "needs-organization" ? "대상 카드·기간에 정리가 필요한 내역이 있어요. 분류·상태를 확인해 주세요."
        : state === "ready" ? "저장된 내역과 필요한 정리를 확인했어요. 같은 목표에서 최신 관측값을 살펴보세요."
          : receipt ? receipt.addedCount === 0 ? "새로 반영할 이용내역이 없어요. 필요한 내역이 더 있다면 추가해 주세요."
            : "저장한 내역 중 이 목표에 새롭게 반영된 내역은 확인되지 않았어요. 대상 카드·기간을 확인해 주세요."
            : "새 이용내역을 저장하고 필요한 분류를 정리하면 같은 목표로 돌아갈 수 있어요.";
  return <WashingPage isAuthenticated={isAuthenticated}
    goalUpdate={goalId && isAuthenticated ? { state, supportingContext,
      onReview: () => navigate(`/goals?goalId=${encodeURIComponent(goalId)}`),
      onRetry: () => { setFailed(false); void overview.refetch(); },
    } : undefined}
    goalContext={goalId ? <GoalWashingContext goalId={goalId} isAuthenticated={isAuthenticated} userScope={userScope} receipt={receipt} failed={failed} /> : undefined}
    onUploadSaved={(saved) => {
      setReceipt(saved); setFailed(false); void client.invalidateQueries({ queryKey: goalKeys.all });
    }} onUploadFailed={() => { setReceipt(null); setFailed(true); }} />;
}
