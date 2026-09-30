import type { QueryClient } from "@tanstack/react-query";
import { fetchTransactionById } from "@/features/washing/api/fetchers";
import {
  applyBulkWash,
  deleteTransaction,
  updateTransaction,
  updateTransactionCategory,
  updateTransactionTag,
} from "@/features/washing/api/mutations";
import { washingKeys } from "@/features/washing/api/queries";
import { parseWashingCommand } from "@/features/washing/model/core";
import type { ActionResult } from "@/features/washing/model/types";

export type { ActionResult };

export const action =
  (queryClient: QueryClient) =>
  async ({ request }: { request: Request }): Promise<ActionResult> => {
    const formData = await request.formData();
    const command = parseWashingCommand(formData);

    try {
      switch (command.type) {
        case "bulk_wash":
          await applyBulkWash(command.payload);
          await queryClient.invalidateQueries({ queryKey: washingKeys.all });
          return { intent: "bulk_wash", count: command.payload.ids.length };
        case "update_category": {
          const tx = await fetchTransactionById(command.id);
          if (command.categoryId == null) {
            await updateTransaction(command.id, {
              ...tx,
              categoryId: null,
              categoryName: null,
              isClassified: false,
            });
          } else if (tx.categoryId !== command.categoryId || tx.isClassified === false) {
            await updateTransactionCategory(command.id, command.categoryId);
          }
          if ((tx.tag ?? null) !== command.tag) {
            await updateTransactionTag(command.id, command.tag);
          }
          await queryClient.invalidateQueries({ queryKey: washingKeys.all });
          return { intent: "update_category" };
        }
        case "delete_transaction":
          await deleteTransaction(command.id);
          await queryClient.invalidateQueries({ queryKey: washingKeys.all });
          return { intent: "delete_transaction" };
        default:
          await queryClient.invalidateQueries({ queryKey: washingKeys.all });
          return { intent: command.type, error: true };
      }
    } catch (error) {
      console.error("Washing action error:", error);
      return { intent: command.type, error: true };
    }
  };
