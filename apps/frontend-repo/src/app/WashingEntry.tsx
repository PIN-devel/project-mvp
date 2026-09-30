import { useAppStore } from "@/app/store/useAppStore";
import { WashingPage } from "@/features/washing/routes/WashingPage";

export function WashingEntry() {
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  return <WashingPage isAuthenticated={isAuthenticated} />;
}
