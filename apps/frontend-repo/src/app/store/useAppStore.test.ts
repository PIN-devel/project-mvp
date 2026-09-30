import { beforeEach, describe, expect, it } from "vitest";
import { useAppStore } from "./useAppStore";

describe("light-only app storage migration", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useAppStore.getState().clearSession();
  });

  it("preserves the session while discarding a previously saved dark preference", async () => {
    window.localStorage.setItem("app-storage", JSON.stringify({
      state: {
        colorScheme: "dark",
        accessToken: "existing-session-token",
        nickname: "사용자",
        isAuthenticated: true,
      },
      version: 0,
    }));

    await useAppStore.persist.rehydrate();

    const session = useAppStore.getState();
    expect(session.accessToken).toBe("existing-session-token");
    expect(session.nickname).toBe("사용자");
    expect(session.isAuthenticated).toBe(true);
    expect(window.localStorage.getItem("app-storage")).not.toContain("dark");
  });
  it("isolates login sessions and clears only analysis caches on logout", () => {
    useAppStore.getState().setSession("token-A", "사용자 A");
    const first = useAppStore.getState().analysisNamespace;
    expect(first).toBeTruthy();
    window.localStorage.setItem(`motifin:analysis:v1:${first}`, "analysis");
    window.localStorage.setItem("unrelated-preference", "keep");
    useAppStore.getState().setSession("token-A", "사용자 A");
    expect(useAppStore.getState().analysisNamespace).toBe(first);
    useAppStore.getState().setSession("token-B", "사용자 B");
    expect(useAppStore.getState().analysisNamespace).not.toBe(first);
    expect(window.localStorage.getItem(`motifin:analysis:v1:${first}`)).toBeNull();
    window.localStorage.setItem(`motifin:analysis:v1:${useAppStore.getState().analysisNamespace}`, "analysis");
    useAppStore.getState().clearSession();
    expect(useAppStore.getState().analysisNamespace).toBeNull();
    expect(Object.keys(window.localStorage).filter((key) => key.startsWith("motifin:analysis:v1:"))).toHaveLength(0);
    expect(window.localStorage.getItem("unrelated-preference")).toBe("keep");
  });

});
