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
});
