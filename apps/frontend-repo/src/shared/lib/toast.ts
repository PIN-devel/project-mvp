import { notifications, type NotificationData } from "@mantine/notifications";

/**
 * Mantine Notifications를 래핑한 토스트 유틸리티
 * 전역 알림 스타일의 일관성을 위해 사용합니다.
 */
export const toast = {
  success: (message: string, options?: Partial<NotificationData>) => {
    notifications.show({
      title: "Success",
      message,
      color: "green",
      ...options,
    });
  },
  error: (message: string, options?: Partial<NotificationData>) => {
    notifications.show({
      title: "Error",
      message,
      color: "red",
      ...options,
    });
  },
  info: (message: string, options?: Partial<NotificationData>) => {
    notifications.show({
      title: "Info",
      message,
      color: "blue",
      ...options,
    });
  },
  warning: (message: string, options?: Partial<NotificationData>) => {
    notifications.show({
      title: "Warning",
      message,
      color: "yellow",
      ...options,
    });
  },
};
