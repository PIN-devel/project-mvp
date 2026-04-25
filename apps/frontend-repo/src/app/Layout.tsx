import { useAppStore } from "@/app/store/useAppStore";
import { AppHeader } from "@/shared/ui/AppHeader";
import { AppShell, Box, LoadingOverlay } from "@mantine/core";
import { NavigationProgress, nprogress } from "@mantine/nprogress";
import { useEffect } from "react";
import { Outlet, useLocation, useNavigate, useNavigation } from "react-router";

/**
 * 애플리케이션 기본 레이아웃
 * 공통 헤더를 포함하며, 자식 라우트를 Outlet으로 렌더링합니다.
 */
export function Layout() {
  const navigation = useNavigation();
  const navigate = useNavigate();
  const location = useLocation();
  const { colorScheme, toggleColorScheme } = useAppStore();
  const isNavigating = navigation.state === "loading";

  useEffect(() => {
    if (isNavigating) {
      nprogress.start();
    } else {
      nprogress.complete();
    }
  }, [isNavigating]);

  return (
    <AppShell header={{ height: { base: 60, sm: 100 } }} padding="md">
      <NavigationProgress color="brandYellow" />

      <AppShell.Header
        bg={colorScheme === "dark" ? "dark.7" : "gray.0"}
        withBorder={false}
      >
        <AppHeader
          colorScheme={colorScheme}
          onToggleColorScheme={toggleColorScheme}
          activeTab={location.pathname}
          onTabChange={(value) => navigate(value)}
        />
      </AppShell.Header>

      <AppShell.Main>
        <Box pos="relative" mih="calc(100vh - 100px)" mx="auto" maw={1400}>
          <LoadingOverlay
            visible={isNavigating}
            zIndex={1000}
            overlayProps={{ radius: "sm", blur: 2 }}
            loaderProps={{ color: "brandYellow", size: "xl" }}
          />
          <Outlet />
        </Box>
      </AppShell.Main>
    </AppShell>
  );
}
