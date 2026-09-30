import { useAppStore } from "@/app/store/useAppStore";
import { WashingPage } from "@/features/washing/routes/WashingPage";
import { GoalWashingContext } from "@/features/goals/ui/GoalWashingContext";
import type { GoalUploadReceipt } from "@/features/goals/ui/GoalWashingContext";
import { goalKeys } from "@/features/goals/api/queries";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useSearchParams } from "react-router";

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
  return <>
    {goalId && <GoalWashingContext goalId={goalId} isAuthenticated={isAuthenticated} userScope={userScope} receipt={receipt} failed={failed} />}
    <WashingPage isAuthenticated={isAuthenticated} onUploadSaved={(saved) => {
      setReceipt(saved); setFailed(false); void client.invalidateQueries({ queryKey: goalKeys.all });
    }} onUploadFailed={() => { setReceipt(null); setFailed(true); }} />
  </>;
}
