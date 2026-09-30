import { redirect } from "react-router";
import { loginUser, registerUser } from "../api/mutations";
import { useAppStore } from "@/app/store/useAppStore";
import { toast } from "@/shared/ui/toast";
import type { LoginRequest, RegisterRequest } from "../model/types";
import { goalReturnPath } from "@/shared/model/goalReturnPath";

/**
 * 로그인 라우트 Action
 * RHF에서 완전히 검증된 정보를 전달받아 로그인 API를 태우고,
 * 성공 시 Zustand 전역 스토어 세션을 갱신한 후 메인으로 리다이렉트합니다.
 */
export const loginAction = () => async ({ request }: { request: Request }) => {
  const formData = await request.formData();
  const loginId = formData.get("loginId") as string;
  const password = formData.get("password") as string;

  const payload: LoginRequest = { loginId, password };

  try {
    const response = await loginUser(payload);
    if (response.accessToken && response.nickname) {
      // Zustand 스토어 세션 상태 업데이트 (영속화)
      useAppStore.getState().setSession(response.accessToken, response.nickname);
      toast.success(`${response.nickname}님, 환영합니다!`);
      return redirect(goalReturnPath(new URL(request.url).search));
    }
  } catch (error) {
    console.error("Login action error:", error);
    throw error; // 전역 IoC 에러 핸들러로 위임
  }
  return null;
};

/**
 * 회원가입 라우트 Action
 * RHF가 검증 완료한 데이터를 기반으로 회원가입 API를 호출한 뒤
 * 성공 시 안내 토스트를 출력하고 로그인 화면으로 라우팅을 리다이렉트합니다.
 */
export const registerAction = () => async ({ request }: { request: Request }) => {
  const formData = await request.formData();
  const loginId = formData.get("loginId") as string;
  const nickname = formData.get("nickname") as string;
  const password = formData.get("password") as string;

  const payload: RegisterRequest = { loginId, nickname, password };

  try {
    await registerUser(payload);
    toast.success("회원가입이 완료되었습니다. 로그인해 주세요.");
    return redirect("/login");
  } catch (error) {
    console.error("Register action error:", error);
    throw error; // 전역 IoC 에러 핸들러로 위임
  }
};
