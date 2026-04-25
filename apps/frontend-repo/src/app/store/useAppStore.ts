import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AppState {
  colorScheme: "light" | "dark";
  setColorScheme: (colorScheme: "light" | "dark") => void;
  toggleColorScheme: () => void;
}

/**
 * 전역 UI 상태 스토어
 * 테마 모드 등 클라이언트 전용 UI 상태를 관리합니다.
 */
export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      colorScheme: "light",
      setColorScheme: (colorScheme) => set({ colorScheme }),
      toggleColorScheme: () =>
        set((state) => ({
          colorScheme: state.colorScheme === "dark" ? "light" : "dark",
        })),
    }),
    {
      name: "app-storage",
    }
  )
);
