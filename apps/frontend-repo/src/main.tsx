import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { AppProvider } from "./app/AppProvider";
import { router } from "./app/router";

const rootElement = document.getElementById("root");

if (!rootElement) throw new Error("Failed to find the root element");

/**
 * 개발 환경에서 MSW 모킹을 활성화합니다.
 */
async function enableMocking() {
  if (import.meta.env.DEV) {
    const { worker } = await import("./mocks/browser");
    return worker.start();
  }
}

enableMocking().then(() => {
  createRoot(rootElement).render(
    <StrictMode>
      <AppProvider>
        <RouterProvider router={router} />
      </AppProvider>
    </StrictMode>,
  );
});
