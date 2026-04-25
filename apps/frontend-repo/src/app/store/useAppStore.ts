import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AppState {
  colorScheme: "light" | "dark";
  setColorScheme: (colorScheme: "light" | "dark") => void;
  toggleColorScheme: () => void;
}

/**
 * Global UI State Store
 * Strictly for client-side UI states (theme mode, etc.)
 * Server data should be managed by TanStack Query.
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
