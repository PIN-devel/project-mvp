import { useAppStore } from "@/app/store/useAppStore";
import { Navigate } from "react-router";
import { Container, Center, Box } from "@mantine/core";
import { RegisterForm } from "../ui/RegisterForm";

/**
 * 회원가입 페이지 라우트 컴포넌트
 * 로그인 완료 세션 상태일 때 홈(/) 차단 가드 처리를 제공하며,
 * 눈이 편안한 그라데이션 테두리 및 폼 레이아웃을 형성합니다.
 */
export function RegisterPage() {
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <Box
      mih="100vh"
      w="100%"
      bg="linear-gradient(135deg, #F4F8F8 0%, var(--mantine-color-brandMint-0) 100%)"
    >
      <Center mih="calc(100vh - 120px)">
        <Container size="xs" w="100%">
          <RegisterForm />
        </Container>
      </Center>
    </Box>
  );
}

export default RegisterPage;
