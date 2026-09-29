import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AppState {
  // 인증(Auth) 관련 전역 상태 추가
  accessToken: string | null;
  nickname: string | null;
  isAuthenticated: boolean;
  setSession: (accessToken: string, nickname: string) => void;
  clearSession: () => void;
}

/**
 * 전역 UI 및 인증 상태 스토어
 * 사용자 인증 세션을 로컬 스토리지에 영속화합니다.
 */
export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // 인증 초기 상태 및 액션 구현
      accessToken: null,
      nickname: null,
      isAuthenticated: false,
      setSession: (accessToken, nickname) =>
        set({ accessToken, nickname, isAuthenticated: true }),
      clearSession: () =>
        set({ accessToken: null, nickname: null, isAuthenticated: false }),
    }),
    {
      name: "app-storage",
      version: 1,
      // 이전 저장값의 dark 설정만 버리고 로그인 세션은 그대로 가져옵니다.
      migrate: (saved) => {
        const state = saved as Partial<AppState> | null;
        return {
          accessToken: state?.accessToken ?? null,
          nickname: state?.nickname ?? null,
          isAuthenticated: state?.isAuthenticated ?? false,
        };
      },
      partialize: ({ accessToken, nickname, isAuthenticated }) => ({
        accessToken,
        nickname,
        isAuthenticated,
      }),
    }
  )
);
