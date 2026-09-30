import { create } from "zustand";
import { persist } from "zustand/middleware";
import { clearAnalysisExperienceCaches, createAnalysisNamespace } from "@/shared/model/analysisCacheStorage";
import { queryClient } from "@/app/queryClient";

interface AppState {
  // 인증(Auth) 관련 전역 상태 추가
  accessToken: string | null;
  nickname: string | null;
  isAuthenticated: boolean;
  analysisNamespace: string | null;
  setSession: (accessToken: string, nickname: string) => void;
  clearSession: () => void;
}

/**
 * 전역 UI 및 인증 상태 스토어
 * 사용자 인증 세션을 로컬 스토리지에 영속화합니다.
 */
export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // 인증 초기 상태 및 액션 구현
      accessToken: null,
      nickname: null,
      isAuthenticated: false,
      analysisNamespace: null,
      setSession: (accessToken, nickname) => {
        const sameSession = get().accessToken === accessToken && get().isAuthenticated;
        if (!sameSession) {
          clearAnalysisExperienceCaches();
          queryClient.clear();
        }
        set({ accessToken, nickname, isAuthenticated: true, analysisNamespace: sameSession ? get().analysisNamespace : createAnalysisNamespace() });
      },
      clearSession: () => {
        clearAnalysisExperienceCaches();
        queryClient.clear();
        set({ accessToken: null, nickname: null, isAuthenticated: false, analysisNamespace: null });
      },
    }),
    {
      name: "app-storage",
      version: 2,
      // 이전 저장값의 dark 설정만 버리고 로그인 세션은 그대로 가져옵니다.
      migrate: (saved) => {
        const state = saved as Partial<AppState> | null;
        return {
          accessToken: state?.accessToken ?? null,
          nickname: state?.nickname ?? null,
          isAuthenticated: state?.isAuthenticated ?? false,
          analysisNamespace: state?.isAuthenticated && state.accessToken ? createAnalysisNamespace() : null,
        };
      },
      partialize: ({ accessToken, nickname, isAuthenticated, analysisNamespace }) => ({
        accessToken,
        nickname,
        isAuthenticated,
        analysisNamespace,
      }),
    }
  )
);
