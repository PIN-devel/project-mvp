import type {
  CategoryDto,
  InsightFilters,
  InsightRequest,
  InsightTransaction,
  MonthlyGoal,
  TransactionDto,
} from "@/features/ai-insights/model/types";

export const formatAmount = (amount: number) =>
  new Intl.NumberFormat("ko-KR").format(amount);

export const formatGeneratedAt = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

export const isTransactionClassified = (transaction: TransactionDto) =>
  transaction.isClassified ??
  (transaction.categoryId != null || !!transaction.categoryName);

export const filterTransactionsForInsight = (
  transactions: TransactionDto[],
  filters: InsightFilters,
) => {
  const latestDate = transactions
    .map((transaction) => transaction.transactionDate)
    .sort()
    .at(-1);
  const since = latestDate
    ? getPeriodStart(latestDate, filters.period)
    : null;

  return transactions.filter((transaction) => {
    const periodMatched =
      filters.period === "ALL" ||
      since == null ||
      transaction.transactionDate >= since;
    const categoryMatched =
      filters.categoryId == null || transaction.categoryId === filters.categoryId;
    return periodMatched && categoryMatched;
  });
};

export const buildInsightRequest = (
  transactions: TransactionDto[],
  filters: InsightFilters,
): InsightRequest => ({
  period: filters.period,
  categoryId: filters.categoryId,
  transactions: transactions.map(toInsightTransaction),
});

export const buildPromptPreview = (
  transactions: TransactionDto[],
  categories: CategoryDto[],
  filters: InsightFilters,
) => {
  const selectedCategory =
    filters.categoryId == null
      ? "전체 카테고리"
      : categories.find((category) => category.id === filters.categoryId)?.name ??
        "선택 카테고리";
  const totalAmount = transactions.reduce(
    (sum, transaction) => sum + transaction.amount,
    0,
  );
  const unclassifiedCount = transactions.filter(
    (transaction) => !isTransactionClassified(transaction),
  ).length;

  return [
    "사용자의 카드 이용 내역을 분석해 주세요.",
    `기간 조건: ${getPeriodLabel(filters.period)}`,
    `카테고리 조건: ${selectedCategory}`,
    `거래 수: ${transactions.length}건`,
    `총 지출: ${formatAmount(totalAmount)}원`,
    `미분류 거래: ${unclassifiedCount}건`,
    "",
    "응답 형식:",
    "- summary: 자연어 요약",
    "- cards: 핵심 포인트 카드 목록",
  ].join("\n");
};

export const getPeriodLabel = (period: InsightFilters["period"]) => {
  switch (period) {
    case "LAST_1_MONTH":
      return "최근 1개월";
    case "LAST_3_MONTHS":
      return "최근 3개월";
    case "ALL":
      return "전체 기간";
  }
};

export const calculateCategoryStats = (transactions: TransactionDto[]) => {
  const amountByCategory = new Map<string, number>();
  transactions.forEach((transaction) => {
    const key = transaction.categoryName || "미분류";
    amountByCategory.set(key, (amountByCategory.get(key) ?? 0) + transaction.amount);
  });

  return [...amountByCategory.entries()]
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);
};

export const getLatestTransactionMonth = (transactions: TransactionDto[]) =>
  transactions
    .map((transaction) => transaction.transactionDate.slice(0, 7))
    .sort()
    .at(-1) ?? new Date().toISOString().slice(0, 7);

export const buildRecommendedGoals = (
  transactions: TransactionDto[],
  goalMonth: string,
) => {
  const stats = calculateCategoryStats(transactions).filter(
    (category) => category.name !== "미분류",
  );
  const baseStats = stats.length > 0 ? stats : [{ name: "생활비", amount: 120000 }];
  const ratios = [0.3, 0.4, 0.5];

  return ratios.map((ratio, index) => {
    const category = baseStats[index % baseStats.length];
    const monthlySave = Math.round(category.amount * ratio);
    return {
      id: `${goalMonth}-${category.name}-${ratio}`,
      month: goalMonth,
      title: `${category.name} ${Math.round(ratio * 100)}% 줄이기`,
      targetCategory: category.name,
      reductionRatio: ratio,
      baselineAmount: category.amount,
      targetAmount: category.amount - monthlySave,
      monthlySave,
      status: "active" as const,
      savedAtLabel: new Intl.DateTimeFormat("ko-KR", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date()),
      actualSaved: null,
    };
  });
};

export const seedMonthlyGoals = () => [
  {
    id: "goal-2026-04",
    month: "2026-04",
    title: "카페인 지출 30% 줄이기",
    targetCategory: "음식료",
    reductionRatio: 0.3,
    baselineAmount: 18000,
    targetAmount: 12600,
    monthlySave: 5400,
    status: "completed",
    savedAtLabel: "2026. 4. 1. 오전 10:00",
    actualSaved: 6200,
  },
  {
    id: "goal-2026-05",
    month: "2026-05",
    title: "충동 지출 40% 줄이기",
    targetCategory: "생활",
    reductionRatio: 0.4,
    baselineAmount: 52500,
    targetAmount: 31500,
    monthlySave: 21000,
    status: "active",
    savedAtLabel: "2026. 5. 3. 오후 2:15",
    actualSaved: null,
  },
];

export const calculateTotalSaved = (
  goals: MonthlyGoal[],
  transactions: TransactionDto[],
) => {
  const categoryStats = calculateCategoryStats(transactions);

  return goals.reduce((sum, goal) => {
    if (goal.status === "completed") {
      return sum + (goal.actualSaved ?? goal.monthlySave);
    }
    if (goal.status !== "active") {
      return sum;
    }

    const currentAmount =
      categoryStats.find((category) => category.name === goal.targetCategory)
        ?.amount ?? goal.baselineAmount;
    return sum + Math.max(goal.monthlySave * 0.5, goal.baselineAmount - currentAmount);
  }, 0);
};

export const hasCurrentMonthGoal = (goals: MonthlyGoal[], currentGoalMonth: string) =>
  goals.some((goal) => goal.month === currentGoalMonth && goal.status !== "stopped");

export const buildDataSignature = (transactions: TransactionDto[]) =>
  transactions
    .map((transaction) =>
      [
        transaction.id,
        transaction.transactionDate,
        transaction.merchant,
        transaction.categoryId ?? "",
        transaction.categoryName ?? "",
        transaction.amount,
        transaction.tag ?? "",
        transaction.status ?? "",
        transaction.isClassified ?? "",
      ].join(":"),
    )
    .join("|");

export const buildTrajectoryRows = (
  goals: MonthlyGoal[],
  currentGoalMonth: string,
) => {
  const months = buildTrajectoryMonths(goals, currentGoalMonth);
  let running = 0;
  let target = 0;

  return months.map((month) => {
    const monthGoals = goals.filter(
      (goal) => goal.month <= month && goal.status !== "stopped",
    );
    const monthlySave = monthGoals.reduce(
      (sum, goal) =>
        sum +
        (goal.status === "completed"
          ? goal.actualSaved ?? goal.monthlySave
          : goal.monthlySave),
      0,
    );
    running += monthlySave;
    target += Math.max(12000, monthlySave);
    return {
      month,
      saved: Math.round(running),
      target: Math.round(target),
      isCurrent: month === currentGoalMonth,
    };
  });
};

const buildTrajectoryMonths = (
  goals: MonthlyGoal[],
  currentGoalMonth: string,
) => {
  const goalMonths = goals.map((goal) => goal.month);
  const startMonth = [...goalMonths, currentGoalMonth].sort()[0] ?? currentGoalMonth;
  const endMonth = addMonths(currentGoalMonth, 3);
  const months: string[] = [];
  let cursor = startMonth;

  while (cursor <= endMonth) {
    months.push(cursor);
    cursor = addMonths(cursor, 1);
  }

  return months;
};

const addMonths = (month: string, amount: number) => {
  const [year, monthIndex] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthIndex - 1 + amount, 1));
  return date.toISOString().slice(0, 7);
};

const toInsightTransaction = (
  transaction: TransactionDto,
): InsightTransaction => ({
  transactionDate: transaction.transactionDate,
  merchant: transaction.merchant,
  categoryId: transaction.categoryId ?? null,
  categoryName: transaction.categoryName ?? null,
  amount: transaction.amount,
  tag: transaction.tag ?? null,
  status: transaction.status,
  isClassified: isTransactionClassified(transaction),
});

const getPeriodStart = (
  latestTransactionDate: string,
  period: InsightFilters["period"],
) => {
  if (period === "ALL") return null;
  const date = new Date(`${latestTransactionDate}T00:00:00`);
  date.setMonth(date.getMonth() - (period === "LAST_1_MONTH" ? 1 : 3));
  return date.toISOString().slice(0, 10);
};
