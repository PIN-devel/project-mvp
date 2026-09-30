import { getActiveAnalysisNamespace } from "@/shared/model/analysisCacheStorage";
import { useEffect } from "react";
import { queryClient } from "./queryClient";
import { AiInsightsPage } from "@/features/ai-insights/routes/AiInsightsPage";
import { useAppStore } from "./store/useAppStore";

export function AiInsightsEntry() {
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
  return <AiInsightsPage key={namespace ?? "anonymous"} userScope={namespace} />;
}
