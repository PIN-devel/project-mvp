import { api } from "@/shared/api/axios";
import { toTransactionWriteRequest } from "@/shared/model/transaction";
import {
  BulkAddResponseSchema,
  TransactionDtoListSchema,
} from "@/features/washing/model/schemas";
import type {
  BulkAddResponse,
  BulkWashRequest,
  TransactionDto,
} from "@/features/washing/model/types";

export const applyBulkWash = async (payload: BulkWashRequest) => {
  const results = await Promise.all(
    payload.ids.map((id) =>
      api.patch(`/api/transactions/${id}/category`, {
        categoryId: payload.categoryId,
      }),
    ),
  );

  return results.map((result) => result.data);
};

export const updateTransaction = async (id: number, payload: TransactionDto) => {
  const { data } = await api.put(`/api/transactions/${id}`, toTransactionWriteRequest(payload));
  return data;
};

export const updateTransactionCategory = async (
  id: number,
  categoryId: number,
) => {
  const { data } = await api.patch(`/api/transactions/${id}/category`, {
    categoryId,
  });
  return data;
};

export const updateTransactionTag = async (
  id: number,
  tag: string | null,
) => {
  const { data } = await api.patch(`/api/transactions/${id}/tag`, {
    tag,
  });
  return data;
};

export const uploadExcel = async (file: File): Promise<TransactionDto[]> => {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post("/api/excel/upload", formData, {
    headers: {
      "Content-Type": undefined,
    },
    timeout: 60_000,
  });
  return TransactionDtoListSchema.parse(data);
};

export const deleteTransaction = async (id: number) => {
  await api.delete(`/api/transactions/${id}`);
};

export const bulkAddTransactions = async (
  items: TransactionDto[],
): Promise<BulkAddResponse> => {
  const { data } = await api.post("/api/transactions/bulk", items.map(toTransactionWriteRequest));
  return BulkAddResponseSchema.parse(data);
};
