import { useEffect } from "react";

interface ToastProps {
  message?: string;
  type?: 'success' | 'error' | 'info';
  onClose?: () => void;
}

export function Toast({ message, type = 'info', onClose }: ToastProps) {
  useEffect(() => {
    if (message && onClose) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  if (!message) return null;

  const backgroundColor = {
    success: "#4caf50",
    error: "#f44336",
    info: "#2196f3",
  }[type];

  return (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        padding: "1rem 2rem",
        backgroundColor,
        color: "white",
        borderRadius: "4px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
        zIndex: 1000,
        transition: "all 0.3s ease",
      }}
    >
      {message}
    </div>
  );
}
