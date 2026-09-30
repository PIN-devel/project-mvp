import { isTransactionClassified, isSpendingEligible } from "@/shared/model/transaction";
export { isTransactionClassified } from "@/shared/model/transaction";
import type {
  BulkWashRequest,
  WashingFilters,
  WashingOverview,
  WashingTransaction,
} from "@/features/washing/model/types";

export type WashingCommand =
  | { type: "bulk_wash"; payload: BulkWashRequest }
  | {
      type: "update_category";
      id: number;
      categoryId: number | null;
      categoryName: string | null;
    }
  | { type: "delete_transaction"; id: number }
  | { type: "unknown" };

export const DEFAULT_WASHING_FILTERS: WashingFilters = {
  merchantKeyword: "",
  category: "all",
  status: "all",
};

export const parseWashingCommand = (formData: FormData): WashingCommand => {
  const intent = formData.get("intent");

  switch (intent) {
    case "bulk_wash":
      {
        const category = parseCategoryValue(extractString(formData, "category"));
        return {
          type: "bulk_wash",
          payload: {
            ids: extractNumberList(formData, "ids"),
            categoryId: category.id ?? 0,
            categoryName: category.name ?? "",
          },
        };
      }
    case "update_category": {
      const category = parseCategoryValue(extractString(formData, "category"));
      return {
        type: "update_category",
        id: extractNumber(formData, "id"),
        categoryId: category.id,
        categoryName: category.name,
      };
    }
    case "delete_transaction":
      return { type: "delete_transaction", id: extractNumber(formData, "id") };
    default:
      return { type: "unknown" };
  }
};

export const getUnclassifiedTransactions = (
  transactions: WashingTransaction[],
): WashingTransaction[] =>
  transactions.filter((transaction) => !isTransactionClassified(transaction));

export const filterTransactions = (
  transactions: WashingTransaction[],
  filters: WashingFilters,
): WashingTransaction[] =>
  transactions.filter((transaction) => {
    const matchesMerchant =
      filters.merchantKeyword.trim() === "" ||
      transaction.merchantName
        .toLocaleLowerCase()
        .includes(filters.merchantKeyword.trim().toLocaleLowerCase()) ||
      transaction.description
        .toLocaleLowerCase()
        .includes(filters.merchantKeyword.trim().toLocaleLowerCase());

    const matchesCategory =
      filters.category === "all" ||
      (filters.category === "unclassified"
        ? !isTransactionClassified(transaction)
        : String(transaction.foundation?.categoryId) === filters.category);

    const matchesStatus =
      filters.status === "all" ||
      (filters.status === "classified" && isTransactionClassified(transaction)) ||
      (filters.status === "unclassified" && !isTransactionClassified(transaction));

    return matchesMerchant && matchesCategory && matchesStatus;
  });

export const getWashingMetrics = (overview: WashingOverview) => {
  const totalCount = overview.transactions.length;
  const unclassifiedCount = getUnclassifiedTransactions(
    overview.transactions,
  ).length;
  const classifiedCount = totalCount - unclassifiedCount;
  const totalAmount = overview.transactions.reduce(
    (sum, transaction) => sum + (isSpendingEligible(transaction) ? transaction.amount : 0),
    0,
  );

  return {
    totalCount,
    unclassifiedCount,
    classifiedCount,
    classificationRate:
      totalCount === 0 ? 0 : Math.round((classifiedCount / totalCount) * 100),
    totalAmount,
  };
};

export const formatAmount = (amount: number) =>
  new Intl.NumberFormat("ko-KR").format(amount);

export const normalizeCategory = (value: FormDataEntryValue | null) => {
  const normalized = String(value || "").trim();
  return normalized === "" ? null : normalized;
};

const extractString = (formData: FormData, key: string) =>
  String(formData.get(key) || "");

const extractNumber = (formData: FormData, key: string) =>
  Number(formData.get(key));

const extractNumberList = (formData: FormData, key: string) =>
  String(formData.get(key) || "")
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isFinite(value));

const parseCategoryValue = (value: string) => {
  const normalized = value.trim();
  if (!normalized) {
    return { id: null, name: null };
  }

  const colonIndex = normalized.indexOf(":");
  if (colonIndex === -1) {
    const id = Number(normalized);
    return { id: Number.isSafeInteger(id) && id > 0 ? id : null, name: null };
  }

  const parsedId = Number(normalized.slice(0, colonIndex));
  const parsedName = normalized.slice(colonIndex + 1).trim();

  return {
    id: parsedId === 0 || !Number.isFinite(parsedId) ? null : parsedId,
    name: parsedName || null,
  };
};
