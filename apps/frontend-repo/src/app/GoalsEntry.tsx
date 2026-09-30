import { GoalsPage } from "@/features/goals/ui/GoalsPage";
import { useAppStore } from "./store/useAppStore";
import { getActiveAnalysisNamespace } from "@/shared/model/analysisCacheStorage";
import { useEffect } from "react";
import { queryClient } from "./queryClient";

export function GoalsEntry() {
  const namespace = useAppStore((state) => state.analysisNamespace);
  useEffect(() => {
    const synchronizeSession = (event: StorageEvent) => {
      if (event.key !== "app-storage" && event.key !== null) return;
      queryClient.clear();
      if (getActiveAnalysisNamespace() === null) useAppStore.getState().clearSession();
      else void useAppStore.persist.rehydrate();
    };
    window.addEventListener("storage", synchronizeSession);
    return () => window.removeEventListener("storage", synchronizeSession);
  }, []);
  return <GoalsPage key={namespace ?? "anonymous"} userScope={namespace} />;
}
