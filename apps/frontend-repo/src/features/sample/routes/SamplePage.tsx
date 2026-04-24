import { useQuery } from "@tanstack/react-query";
import { sampleQueries } from "../api/queries";
import { SampleList } from "../ui/SampleList";
import { Toast } from "../../../shared/ui/Toast";
import { useAppStore } from "../../../app/store/useAppStore";

export function SamplePage() {
  const { data: samples, isLoading, isError } = useQuery(sampleQueries.list());
  const { isSidebarOpen, toggleSidebar, showToast } = useAppStore();

  if (isLoading) return <div style={{ padding: "2rem" }}>Loading samples...</div>;
  if (isError) return <div style={{ padding: "2rem", color: "red" }}>Error loading samples</div>;

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar Example */}
      {isSidebarOpen && (
        <aside style={{ width: "250px", borderRight: "1px solid #ddd", padding: "1rem", backgroundColor: "#f4f4f4" }}>
          <h3>App Sidebar</h3>
          <p>Zustand Global State</p>
        </aside>
      )}

      <main style={{ flex: 1 }}>
        <header style={{ padding: "1rem", borderBottom: "1px solid #ddd", display: "flex", gap: "1rem" }}>
          <button onClick={toggleSidebar}>
            {isSidebarOpen ? "Hide Sidebar" : "Show Sidebar"}
          </button>
          <button onClick={() => showToast("Welcome to the App!", "success")}>
            Show Welcome Toast
          </button>
        </header>
        
        <SampleList samples={samples ?? []} />
        <Toast />
      </main>
    </div>
  );
}
