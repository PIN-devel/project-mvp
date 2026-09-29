import { api } from "@/shared/api/axios";
import {
  CategoryDtoListSchema,
  InsightResponseSchema,
  MonthlyGoalListSchema,
  MonthlyGoalSchema,
  TransactionDtoListSchema,
} from "@/features/ai-insights/model/schemas";
import type {
  CategoryDto,
  InsightRequest,
  InsightResponse,
  MonthlyGoal,
  MonthlyGoalUpsertRequest,
  TransactionDto,
} from "@/features/ai-insights/model/types";

export const fetchInsightTransactions = async (): Promise<TransactionDto[]> => {
  const { data } = await api.get("/api/transactions");
  return TransactionDtoListSchema.parse(data);
};

export const fetchInsightCategories = async (): Promise<CategoryDto[]> => {
  const { data } = await api.get("/api/categories");
  return CategoryDtoListSchema.parse(data);
};

export const generateInsight = async (
  payload: InsightRequest,
): Promise<InsightResponse> => {
  const { data } = await api.post("/api/insights", payload);
  return InsightResponseSchema.parse(data);
};

export const fetchMonthlyGoals = async (): Promise<MonthlyGoal[]> => {
  const { data } = await api.get("/api/monthly-goals");
  return MonthlyGoalListSchema.parse(data);
};

export const upsertMonthlyGoal = async (
  goalMonth: string,
  payload: MonthlyGoalUpsertRequest,
): Promise<MonthlyGoal> => {
  const { data } = await api.put(`/api/monthly-goals/${goalMonth}`, payload);
  return MonthlyGoalSchema.parse(data);
};

export const updateMonthlyGoalStatus = async (
  goalId: number,
  status: MonthlyGoal["status"],
  actualSaved?: number,
): Promise<MonthlyGoal> => {
  const { data } = await api.patch(`/api/monthly-goals/${goalId}/status`, {
    status,
    actualSaved,
  });
  return MonthlyGoalSchema.parse(data);
};
