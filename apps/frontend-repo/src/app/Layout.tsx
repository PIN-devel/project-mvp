import { useAppStore } from "@/app/store/useAppStore";
import { AppHeader } from "@/shared/ui/AppHeader";
import { AppShell, Box, LoadingOverlay } from "@mantine/core";
import { NavigationProgress, nprogress } from "@mantine/nprogress";
import { useEffect } from "react";
import { Outlet, useLocation, useNavigate, useNavigation } from "react-router";
import { toast } from "@/shared/ui/toast";
import { brandTokens } from "@/app/theme";

/**
 * 애플리케이션 기본 레이아웃
 * 공통 헤더를 포함하며, 자식 라우트를 Outlet으로 렌더링합니다.
 */
export function Layout() {
  const navigation = useNavigation();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, nickname, clearSession } = useAppStore();
  const isNavigating = navigation.state === "loading";

  useEffect(() => {
    if (isNavigating) {
      nprogress.start();
    } else {
      nprogress.complete();
    }
  }, [isNavigating]);

  const handleLogout = () => {
    clearSession();
    toast.success("로그아웃되었습니다.");
    navigate("/login");
  };

  return (
    <AppShell
      header={{ height: { base: 60, sm: 112 } }}
      padding="md"
      bg={brandTokens.lightBackground}
    >
      <NavigationProgress color="brandMint" />

      <AppShell.Header
        bg={brandTokens.cardSurface}
        withBorder={false}
      >
        <AppHeader
          activeTab={location.pathname}
          onTabChange={(value) => navigate(value)}
          isAuthenticated={isAuthenticated}
          nickname={nickname}
          onLogout={handleLogout}
        />
      </AppShell.Header>


      <AppShell.Main bg={brandTokens.lightBackground}>
        <Box
          pos="relative"
          mih={{ base: "calc(100vh - 60px)", sm: "calc(100vh - 112px)" }}
          mx="auto"
          maw={1400}
        >
          <LoadingOverlay
            visible={isNavigating}
            zIndex={1000}
            overlayProps={{ radius: "sm", blur: 2 }}
            loaderProps={{ color: "brandMint", size: "xl" }}
          />
          <Outlet />
        </Box>
      </AppShell.Main>
    </AppShell>
  );
}
