import { api } from "@/shared/api/axios";
import {
  CategoryDtoListSchema,
  TransactionDtoListSchema,
  TransactionDtoSchema,
  WashingOverviewSchema,
} from "@/features/washing/model/schemas";
import type {
  CategoryDto,
  TransactionDto,
  WashingOverview,
} from "@/features/washing/model/types";
import { isTransactionClassified } from "@/features/washing/model/core";

export const fetchWashingOverview = async (): Promise<WashingOverview> => {
  const [transactionsResponse, categoriesResponse] = await Promise.all([
    api.get("/api/transactions"),
    api.get("/api/categories"),
  ]);
  const transactions = TransactionDtoListSchema.parse(transactionsResponse.data);
  const categories = CategoryDtoListSchema.parse(categoriesResponse.data);

  return WashingOverviewSchema.parse({
    categories: categories.map((category) => category.name),
    transactions: transactions.map((transaction) => ({
      id: transaction.id,
      foundation: transaction.foundation,
      occurredAt: transaction.transactionDate,
      merchantName: transaction.merchant,
      description: transaction.memo ?? "",
      cardLabel: transaction.cardName,
      amount: transaction.amount,
      category: transaction.foundation?.categoryLabel ?? null,
      isClassified: isTransactionClassified(transaction),
      matchedRuleLabel: transaction.foundation?.appliedRuleId == null ? null : `규칙 #${transaction.foundation.appliedRuleId}`,
      tag: transaction.tag ?? "",
      source: "CARD",
    })),
    lastImportedAt: new Date().toISOString(),
  });
};

export const fetchTransactions = async (): Promise<TransactionDto[]> => {
  const { data } = await api.get("/api/transactions");
  return TransactionDtoListSchema.parse(data);
};

export const fetchTransactionById = async (id: number): Promise<TransactionDto> => {
  const { data } = await api.get(`/api/transactions/${id}`);
  return TransactionDtoSchema.parse(data);
};

export const fetchCategories = async (): Promise<CategoryDto[]> => {
  const { data } = await api.get("/api/categories");
  return CategoryDtoListSchema.parse(data);
};
