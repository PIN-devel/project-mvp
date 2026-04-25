import { useAppStore } from "@/app/store/useAppStore";
import { MantineProvider } from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import type { ReactNode } from "react";
import { queryClient } from "./queryClient";
import { theme } from "./theme";

import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/nprogress/styles.css";
import "./fonts.css";

interface AppProviderProps {
  children: ReactNode;
}

/**
 * 전역 컨텍스트 프로바이더 통합 관리
 */
export function AppProvider({ children }: AppProviderProps) {
  const { colorScheme } = useAppStore();

  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={theme} forceColorScheme={colorScheme}>
        <ModalsProvider>
          <Notifications position="top-right" zIndex={2000} />
          {children}
        </ModalsProvider>
      </MantineProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
