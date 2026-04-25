import { notifications, type NotificationData } from "@mantine/notifications";

/**
 * Toast utility wrapping Mantine Notifications
 * Centralized for project-wide notification style consistency
 * Moved to shared/lib to allow usage in shared/api without boundary violations
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
