import { useAppStore } from "@/app/store/useAppStore";
import { Navigate } from "react-router";
import { Container, Center, Box } from "@mantine/core";
import { LoginForm } from "../ui/LoginForm";

/**
 * 로그인 페이지 라우트 컴포넌트
 * 이미 인증 상태일 시 홈(/)으로 UX 리다이렉션을 처리하며,
 * 프리미엄 HSL 그라데이션 스타일의 깔끔한 중앙 카드 레이아웃을 구현합니다.
 */
export function LoginPage() {
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);

  // 이미 로그인된 사용자가 접근할 경우 홈(/)으로 리다이렉트
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <Box
      mih="100vh"
      w="100%"
      bg="linear-gradient(135deg, #F4F8F8 0%, var(--mantine-color-brandMint-0) 100%)"
      darkHidden
    >
      <Center mih="calc(100vh - 120px)">
        <Container size="xs" w="100%">
          <LoginForm />
        </Container>
      </Center>
    </Box>
  );
}

/**
 * 다크모드를 지원하는 동일 페이지의 래퍼 컴포넌트
 * 다크모드/라이트모드 환경에 따른 세련된 대비 효과를 보장합니다.
 */
export function LoginPageDark() {
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <Box
      mih="100vh"
      w="100%"
      bg="linear-gradient(135deg, var(--mantine-color-dark-8) 0%, var(--mantine-color-dark-9) 100%)"
    >
      <Center mih="calc(100vh - 120px)">
        <Container size="xs" w="100%">
          <LoginForm />
        </Container>
      </Center>
    </Box>
  );
}

// 최종 렌더링에 적합한 반응형 다형성 내보내기
export default function LoginPageWrapper() {
  const colorScheme = useAppStore((state) => state.colorScheme);
  return colorScheme === "dark" ? <LoginPageDark /> : <LoginPage />;
}
