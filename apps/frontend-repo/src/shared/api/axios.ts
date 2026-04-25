import axios from "axios";
import { ProblemDetailSchema } from "@/shared/model/problemDetail";
import { toast } from "@/shared/lib/toast";

export const api = axios.create({
  baseURL: "/",
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.data) {
      // RFC 9457 표준 에러 처리
      const parsed = ProblemDetailSchema.safeParse(error.response.data);
      if (parsed.success) {
        const { detail, title } = parsed.data;
        toast.error(detail || title || "An unexpected error occurred");
        return Promise.reject(parsed.data);
      }
    }
    
    toast.error(error.message || "Network Error");
    return Promise.reject(error);
  }
);
