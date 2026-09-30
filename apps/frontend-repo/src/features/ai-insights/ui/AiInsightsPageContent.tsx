import {
  Alert,
  Button,
  Container,
  Group,
  NativeSelect,
  Paper,
  Progress,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconArrowDownRight,
  IconCircleCheck,
  IconPlayerPause,
  IconRefresh,
  IconTargetArrow,
} from "@tabler/icons-react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQueries,
} from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
  generateInsight,
  updateMonthlyGoalStatus,
  upsertMonthlyGoal,
} from "@/features/ai-insights/api/fetchers";
import { aiInsightKeys, aiInsightQueries } from "@/features/ai-insights/api/queries";
import {
  buildDataSignature,
  buildInsightRequest,
  buildRecommendedGoals,
  filterTransactionsForInsight,
  formatAmount,
  formatGeneratedAt,
  getGoalReferenceTransactions,
  getLatestTransactionMonth,
  getPeriodLabel,
  isTransactionClassified,
} from "@/features/ai-insights/model/core";
import type {
  InsightFilters,
  InsightRequest,
  InsightResponse,
  MonthlyGoal,
  MonthlyGoalDraft,
} from "@/features/ai-insights/model/types";
import { toast } from "@/shared/ui/toast";
import { canAnalyzeTransactions, MIN_ANALYSIS_TRANSACTION_COUNT } from "@/shared/model/analysisEligibility";
import styles from "./AiInsightsPageContent.module.css";

const periodOptions = [
  { value: "ALL", label: "전체 기간" },
  { value: "LAST_1_MONTH", label: "최근 1개월" },
  { value: "LAST_3_MONTHS", label: "최근 3개월" },
];

interface ResultScope {
  signature: string;
  filters: InsightFilters;
  transactionCount: number;
  categoryLabel: string;
}

interface InsightMutationVariables {
  request: InsightRequest;
  scope: ResultScope;
}

interface SelectedGoalPlan {
  goal: MonthlyGoalDraft;
  sourcePeriod: string;
  sourceTransactionCount: number;
}

interface GoalFeedback {
  type: "success" | "error";
  message: string;
}

function GoalAmountComparison({ baseline, target }: { baseline: number; target: number }) {
  const targetShare = baseline > 0 ? (target / baseline) * 100 : 0;

  return (
    <Stack gap="sm" className={styles.amountComparison}>
      <Group justify="space-between" gap="sm">
        <Text size="xs" c="gray.3">기준 금액</Text>
        <Text size="sm" fw={800} c="white">{formatAmount(baseline)}원</Text>
      </Group>
      <Progress value={100} color="gray.5" size="sm" radius="xl" aria-label={`기준 금액 ${formatAmount(baseline)}원`} />
      <Group justify="space-between" gap="sm">
        <Text size="xs" c="brandMint.4">목표 금액</Text>
        <Text size="sm" fw={800} c="brandMint.4">{formatAmount(target)}원</Text>
      </Group>
      <Progress value={targetShare} color="brandMint" size="sm" radius="xl" aria-label={`목표 금액 ${formatAmount(target)}원`} />
      <Text size="xs" c="gray.4">기준 대비 계획상 차이 {formatAmount(Math.max(0, baseline - target))}원 · 실제 절감액이 아닙니다.</Text>
    </Stack>
  );
}

const getInsightErrorMessage = (error: unknown) => {
  const apiError = error as {
    type?: string;
    response?: { data?: { type?: string; title?: string; detail?: string } };
  };
  const problem = apiError.response?.data;
  const type = apiError.type ?? problem?.type ?? "";

  if (type.endsWith("INS001")) {
    return "분석 시간이 길어져 이번 결과를 가져오지 못했어요. 같은 조건으로 다시 시도할 수 있어요.";
  }
  if (type.endsWith("INS002")) {
    return "분석 서비스를 잠시 이용할 수 없어요. 잠시 후 다시 시도해 주세요.";
  }
  if (type.endsWith("INS003")) {
    return "분석 결과를 안전하게 읽지 못했어요. 같은 조건으로 다시 시도해 주세요.";
  }
  return "이번 분석 결과를 가져오지 못했어요. 연결 상태를 확인하고 다시 시도해 주세요.";
};

export function AiInsightsPageContent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [transactionsQuery, categoriesQuery] = useSuspenseQueries({
    queries: [aiInsightQueries.transactions(), aiInsightQueries.categories()],
  });
  const transactions = transactionsQuery.data;
  const categories = categoriesQuery.data;
  const [filters, setFilters] = useState<InsightFilters>({
    period: "ALL",
    categoryId: null,
  });
  const [insight, setInsight] = useState<InsightResponse | null>(null);
  const [resultScope, setResultScope] = useState<ResultScope | null>(null);
  const [requestErrorMessage, setRequestErrorMessage] = useState<string | null>(
    null,
  );
  const [selectedGoalPlan, setSelectedGoalPlan] =
    useState<SelectedGoalPlan | null>(null);
  const [goalFeedback, setGoalFeedback] = useState<GoalFeedback | null>(null);
  const [showGoalChoices, setShowGoalChoices] = useState(false);
  const analysisScopeRef = useRef<HTMLSelectElement>(null);
  const goalSectionRef = useRef<HTMLElement>(null);

  const filteredTransactions = useMemo(
    () => filterTransactionsForInsight(transactions, filters),
    [filters, transactions],
  );
  const unclassifiedCount = filteredTransactions.filter(
    (transaction) => !isTransactionClassified(transaction),
  ).length;
  const selectedCategory = categories.find(
    (category) => category.id === filters.categoryId,
  );
  const categoryLabel = selectedCategory?.name ?? "전체 카테고리";
  const canAnalyze = canAnalyzeTransactions(filteredTransactions.length);
  const needsMoreRecords = !canAnalyzeTransactions(transactions.length);
  const currentSignature = `${filters.period}:${filters.categoryId ?? "all"}:${buildDataSignature(filteredTransactions)}`;
  const isStaleInsight =
    insight != null &&
    resultScope != null &&
    currentSignature !== resultScope.signature;
  const currentGoalMonth = useMemo(
    () => getLatestTransactionMonth(filteredTransactions),
    [filteredTransactions],
  );
  const goalReferenceTransactions = useMemo(
    () => getGoalReferenceTransactions(filteredTransactions, currentGoalMonth),
    [currentGoalMonth, filteredTransactions],
  );
  const recommendedGoals = useMemo(
    () => buildRecommendedGoals(goalReferenceTransactions, currentGoalMonth),
    [currentGoalMonth, goalReferenceTransactions],
  );
  const monthlyGoalsQuery = useQuery({
    ...aiInsightQueries.monthlyGoals(),
    enabled: true,
  });
  const goals = monthlyGoalsQuery.data ?? [];
  const currentMonthGoal = currentGoalMonth
    ? goals.find((goal) => goal.month === currentGoalMonth)
    : undefined;
  const displayedSavedGoal = currentMonthGoal ?? [...goals].sort((a, b) => b.month.localeCompare(a.month))[0];

  const insightMutation = useMutation({
    mutationFn: ({ request }: InsightMutationVariables) =>
      generateInsight(request),
    onSuccess: (result, variables) => {
      setInsight(result);
      setResultScope(variables.scope);
      setRequestErrorMessage(null);
    },
    onError: (error) => {
      setRequestErrorMessage(getInsightErrorMessage(error));
    },
  });

  const goalMutation = useMutation({
    mutationFn: async (
      variables:
        | { type: "upsert"; goal: MonthlyGoalDraft }
        | { type: "status"; goal: MonthlyGoal; status: MonthlyGoal["status"] },
    ) => {
      if (variables.type === "upsert") {
        const { goal } = variables;
        return upsertMonthlyGoal(goal.month, {
          title: goal.title,
          targetCategory: goal.targetCategory,
          reductionRatio: goal.reductionRatio,
          baselineAmount: goal.baselineAmount,
          monthlySave: goal.monthlySave,
        });
      }

      const { goal, status } = variables;
      return updateMonthlyGoalStatus(goal.id, status);
    },
    onSuccess: (updatedGoal, variables) => {
      queryClient.setQueryData<MonthlyGoal[]>(
        aiInsightKeys.monthlyGoals(),
        (currentGoals = []) => {
          const filteredGoals =
            variables.type === "upsert"
              ? currentGoals.filter((goal) => goal.month !== updatedGoal.month)
              : currentGoals.filter((goal) => goal.id !== updatedGoal.id);
          return [...filteredGoals, updatedGoal].sort((a, b) =>
            a.month.localeCompare(b.month),
          );
        },
      );
      if (variables.type === "upsert") {
        setSelectedGoalPlan(null);
        setShowGoalChoices(false);
        setGoalFeedback({ type: "success", message: "목표를 저장했어요." });
      } else {
        toast.success("목표 상태를 저장했습니다.");
      }
      void queryClient.invalidateQueries({
        queryKey: aiInsightKeys.monthlyGoals(),
      });
    },
    onError: (_error, variables) => {
      if (variables.type === "upsert") {
        setGoalFeedback({
          type: "error",
          message: "목표를 저장하지 못했어요. 선택한 목표는 그대로예요. 다시 시도해 주세요.",
        });
      } else {
        toast.error("목표 상태를 저장하지 못했습니다. 다시 시도해주세요.");
      }
    },
  });

  const requestInsight = () => {
    if (insightMutation.isPending || !canAnalyze) return;

    const request = buildInsightRequest(filteredTransactions, filters);
    setInsight(null);
    setResultScope(null);
    setRequestErrorMessage(null);
    insightMutation.mutate({
      request,
      scope: {
        signature: currentSignature,
        filters: { ...filters },
        transactionCount: filteredTransactions.length,
        categoryLabel,
      },
    });
  };

  const selectGoal = (goal: MonthlyGoalDraft) => {
    if (goalMutation.isPending) return;
    setSelectedGoalPlan({
      goal,
      sourcePeriod: getPeriodLabel(filters.period),
      sourceTransactionCount: goalReferenceTransactions.length,
    });
    setGoalFeedback(null);
    goalMutation.reset();
  };

  const saveSelectedGoal = () => {
    if (
      !selectedGoalPlan ||
      goalMutation.isPending ||
      monthlyGoalsQuery.isPending ||
      monthlyGoalsQuery.isError
    ) {
      return;
    }

    setGoalFeedback(null);
    goalMutation.mutate({ type: "upsert", goal: selectedGoalPlan.goal });
  };

  const updateGoalStatus = (goalId: number, status: MonthlyGoal["status"]) => {
    if (goalMutation.isPending) return;
    const goal = goals.find((item) => item.id === goalId);
    if (goal) goalMutation.mutate({ type: "status", goal, status });
  };

  const jumpToGoalSelection = () => {
    setShowGoalChoices(true);
    requestAnimationFrame(() => {
      goalSectionRef.current?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
        block: "start",
      });
      goalSectionRef.current?.focus({ preventScroll: true });
    });
  };

  const changeAnalysisScope = () => {
    analysisScopeRef.current?.focus();
  };

  const requestInProgress = insightMutation.isPending;

  return (
    <Container size={1180}>
      <Stack gap="xl" className={styles.page}>
        <Stack gap="sm" className={styles.pageHeading}>
          <Text size="sm" fw={800} c="teal.8" tt="uppercase" lts={1}>
            CONSUMPTION INTELLIGENCE
          </Text>
          <Title order={1}>내 소비를 이해하는 첫 번째 발견</Title>
          <Text size="md" c="dimmed" maw={720}>
            정리한 카드 이용내역에서 눈여겨볼 흐름을 발견하고, 다음에 바꿔볼 행동을 생각해 보세요.
          </Text>
        </Stack>

        <div className={styles.analysisGrid}>
          <Paper
            className={styles.analysisStory}
            c="white"
          >
            <Stack justify="space-between" h="100%" gap="xl">
              <Text size="xs" c="gray.4" fw={600}>
                {isStaleInsight ? "이전 분석 결과" : insight ? "발견한 소비 패턴" : "나의 소비 읽기"}
              </Text>
              {requestInProgress ? (
                <Stack gap="sm" role="status" aria-live="polite">
                  <Title order={2} c="white">
                    선택한 내역을 읽고 있어요
                  </Title>
                  <Text c="gray.3" maw={520}>
                    현재 조건에 맞는 거래를 살펴 핵심 내용을 정리하고 있습니다.
                  </Text>
                  <Skeleton h={12} w="78%" radius="xl" />
                  <Skeleton h={12} w="56%" radius="xl" />
                </Stack>
              ) : insight ? (
                <Stack gap="sm">
                  <Text size="xs" fw={700} c="brandMint.4" tt="uppercase">
                    핵심 발견
                  </Text>
                  <Title order={2} c="white" lh={1.35}>
                    {insight.summary}
                  </Title>
                  <Text size="xs" c="gray.4">
                    {resultScope && `${getPeriodLabel(resultScope.filters.period)} · ${resultScope.categoryLabel} · ${resultScope.transactionCount}건 · `}{formatGeneratedAt(insight.generatedAt)} 생성
                  </Text>
                  {isStaleInsight && <Text size="sm" c="gray.3">조회 조건이 바뀌었어요. 위 내용은 이전 범위의 결과예요.</Text>}
                </Stack>
              ) : requestErrorMessage ? (
                <Stack gap="sm">
                  <Title order={2} c="white">이번 분석을 마치지 못했어요</Title>
                  <Text c="gray.3" maw={520}>선택한 내역은 그대로예요. 아래 안내를 확인하고 같은 조건으로 다시 시도할 수 있어요.</Text>
                </Stack>
              ) : !canAnalyze ? (
                <Stack gap="sm">
                  <Title order={2} c="white">
                    {needsMoreRecords ? "소비를 이해할 기록을 조금 더 모아볼까요?" : "분석 범위를 조금 넓혀볼까요?"}
                  </Title>
                  <Text c="gray.3">
                    {needsMoreRecords ? `소비 패턴 분석은 ${MIN_ANALYSIS_TRANSACTION_COUNT}건부터 시작할 수 있어요.` : "현재 조건에 맞는 내역이 충분하지 않아요. 기간이나 카테고리 범위를 넓혀 주세요."}
                  </Text>
                </Stack>
              ) : (
                <Stack gap="sm">
                  <Title order={2} c="white">
                    정리한 내역에서 나의 소비를 읽어볼까요?
                  </Title>
                  <Text c="gray.3" maw={520}>
                    실제 이용내역에서 눈여겨볼 소비 흐름을 찾아요. 원하면 오른쪽에서 분석 범위를 조정할 수 있어요.
                  </Text>
                </Stack>
              )}
              {!requestInProgress && (!insight || isStaleInsight) && (
                <Button
                  color="brandMint"
                  onClick={needsMoreRecords ? () => navigate("/washing") : requestInsight}
                  disabled={!needsMoreRecords && !canAnalyze}
                  aria-describedby={!canAnalyze ? "analysis-eligibility" : undefined}
                  w="fit-content"
                  size="md"
                >
                  {needsMoreRecords ? "이용내역 더 추가하기" : isStaleInsight ? "다시 분석하기" : requestErrorMessage ? "같은 조건으로 다시 시도하기" : "내 소비 분석하기"}
                </Button>
              )}
            </Stack>
          </Paper>

          <Paper className={styles.analysisEvidence}>
            <Stack gap="lg" h="100%">
              <Stack gap={3}>
                <Title order={3}>분석 범위</Title>
                <Text size="sm" c="dimmed">
                  선택한 기간과 카테고리에 해당하는 이용내역을 분석합니다.
                </Text>
              </Stack>
              <div className={styles.scopeCount}>
                <Text size="xs" c="dimmed">현재 분석 대상 이용내역</Text>
                <strong>{filteredTransactions.length}<small>건</small></strong>
                <Text size="sm" fw={700}>{getPeriodLabel(filters.period)} · {categoryLabel}</Text>
                <Text size="sm" c="dimmed" mt="xs">분류 {filteredTransactions.length - unclassifiedCount}건 · 미분류 {unclassifiedCount}건</Text>
              </div>
              {unclassifiedCount > 0 && <Stack gap={6}>
                <Text size="xs" c="dimmed">미분류 내역도 분석에 포함돼요. 카테고리별 해석은 제한될 수 있어요.</Text>
                <Button variant="subtle" color="teal" size="xs" w="fit-content" disabled={requestInProgress} onClick={() => navigate("/washing")}>
                  남은 {unclassifiedCount}건 분류하기
                </Button>
              </Stack>}
              {!canAnalyze && <Text size="sm" id="analysis-eligibility" role="status" c="dimmed">
                {needsMoreRecords
                  ? `현재 ${transactions.length}건 · ${MIN_ANALYSIS_TRANSACTION_COUNT - transactions.length}건 더 추가하면 분석할 수 있어요.`
                  : `현재 조건에서는 ${filteredTransactions.length}건이에요. 기간이나 카테고리 범위를 넓혀 최소 ${MIN_ANALYSIS_TRANSACTION_COUNT}건을 선택해 주세요.`}
              </Text>}
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                <NativeSelect
                  label="조회 기간"
                  ref={analysisScopeRef}
                  value={filters.period}
                  disabled={requestInProgress}
                  onChange={(event) => {
                    const period = event.currentTarget.value as InsightFilters["period"];
                    setFilters((current) => ({
                      ...current,
                      period,
                    }));
                  }}
                  data={periodOptions}
                />
                <NativeSelect
                  label="카테고리"
                  value={String(filters.categoryId ?? "all")}
                  disabled={requestInProgress}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setFilters((current) => ({
                      ...current,
                      categoryId: value === "all" ? null : Number(value),
                    }));
                  }}
                  data={[
                    { value: "all", label: "전체 카테고리" },
                    ...categories.map((category) => ({
                      value: String(category.id),
                      label: category.name,
                    })),
                  ]}
                />
              </SimpleGrid>
            </Stack>
          </Paper>
        </div>

        {requestErrorMessage && (
          <Alert
            color="red"
            variant="light"
            icon={<IconAlertTriangle size={18} />}
            title="이번 분석 결과를 가져오지 못했어요"
          >
            <Stack gap="sm">
              <Text size="sm">{requestErrorMessage}</Text>
            </Stack>
          </Alert>
        )}

        {insight && resultScope && !requestInProgress && (
          <Stack gap="md">
            {isStaleInsight && (
              <Alert
                color="yellow"
                variant="light"
                icon={<IconRefresh size={16} />}
                title="현재 범위와 다른 결과예요"
              >
                아래 결과는 {getPeriodLabel(resultScope.filters.period)} · {resultScope.categoryLabel} · {resultScope.transactionCount}건 기준이에요. 현재 범위의 최신 결과를 보려면 다시 분석해 주세요.
              </Alert>
            )}
            <Stack gap="sm">
              <Group justify="space-between" align="end">
                <Stack gap={3}>
                  <Text size="sm" fw={800} c="teal.8">
                    이 내역에서 발견한 점
                  </Text>
                  <Title order={3}>소비를 이루는 작은 신호들</Title>
                </Stack>
                <Text size="xs" c="dimmed">
                  {getPeriodLabel(resultScope.filters.period)} · {resultScope.categoryLabel} · {resultScope.transactionCount}건
                </Text>
              </Group>
              <SimpleGrid cols={{ base: 1, md: insight.cards.length }} spacing="md">
                {insight.cards.map((card, index) => (
                  <Paper
                    key={`${card.title}-${index}`}
                    withBorder
                    p="xl"
                    radius="lg"
                    bg="white"
                    className={styles.findingCard}
                  >
                    <Stack gap="sm">
                      <Title order={4}>{card.title}</Title>
                      <Text size="sm" c="dimmed" lh={1.65}>
                        {card.description}
                      </Text>
                    </Stack>
                  </Paper>
                ))}
              </SimpleGrid>
            </Stack>
            {!isStaleInsight && <Stack gap="sm" pt="lg">
              <Text size="sm" c="dimmed">발견한 소비 흐름을 바탕으로, 이번에 바꿔볼 한 가지를 골라보세요.</Text>
              <Group gap="lg">
                <Button color="brandMint.8" size="md" leftSection={<IconTargetArrow size={17} aria-hidden="true" />} onClick={jumpToGoalSelection}>
                  개선 목표 살펴보기
                </Button>
                <Button variant="subtle" color="gray" onClick={changeAnalysisScope}>분석 범위 바꿔보기</Button>
              </Group>
            </Stack>}
          </Stack>
        )}

        <section id="goal-selection" ref={goalSectionRef} tabIndex={-1} aria-labelledby="goal-heading" className={styles.goalSection}>
          <Stack gap="lg">
            <Stack gap={5} className={styles.goalHeading}>
              <Text size="sm" fw={800} c="teal.8" lts={1}>DISCOVERY → ACTION</Text>
              <Title order={2} id="goal-heading">발견을 나의 선택으로.</Title>
              <Text size="sm" c="dimmed">
                정리한 이용내역에서 바꿔볼 한 가지를 고르세요. 저장된 목표는 소비 분석 결과와 관계없이 확인할 수 있어요.
              </Text>
            </Stack>

            <div className={styles.goalGrid}>
              <Paper
                className={styles.goalFocus}
                c="white"
              >
                <Stack gap="lg" h="100%" justify="space-between">
                  <Stack gap="md">
                    <Text size="xs" c="gray.4" fw={600}>
                      {selectedGoalPlan
                        ? "선택한 목표 계획"
                        : displayedSavedGoal
                          ? "저장된 목표"
                          : "목표 선택"}
                    </Text>
                    {selectedGoalPlan ? (
                      <>
                        <Stack gap={4}>
                          <Title order={3} c="white">
                            {selectedGoalPlan.goal.title}
                          </Title>
                          <Text size="sm" c="gray.3">
                            {selectedGoalPlan.goal.month} · {selectedGoalPlan.goal.targetCategory} · {selectedGoalPlan.goal.reductionRatio * 100}% 줄이는 계획
                          </Text>
                          <Text size="xs" c="gray.4">
                            {selectedGoalPlan.sourcePeriod} · 해당 거래월의 분류된 내역 {selectedGoalPlan.sourceTransactionCount}건
                          </Text>
                        </Stack>
                        <GoalAmountComparison baseline={selectedGoalPlan.goal.baselineAmount} target={selectedGoalPlan.goal.targetAmount} />
                      </>
                    ) : displayedSavedGoal ? (
                      <Stack gap="md">
                        <Stack gap={4}>
                          <Title order={3} c="white">{displayedSavedGoal.title}</Title>
                          <Text size="sm" c="gray.3">
                            {displayedSavedGoal.month} · {displayedSavedGoal.status === "active" ? "진행 중" : displayedSavedGoal.status === "completed" ? "완수로 표시" : "중단"}
                          </Text>
                          <Text size="xs" c="gray.4">
                            저장 당시 기준과 목표 금액
                          </Text>
                        </Stack>
                        <GoalAmountComparison baseline={displayedSavedGoal.baselineAmount} target={displayedSavedGoal.targetAmount} />
                      </Stack>
                    ) : (
                      <Stack gap="sm">
                        <Title order={3} c="white">
                          아직 선택한 목표가 없어요
                        </Title>
                        <Text size="sm" c="gray.3">
                          오른쪽 후보에서 바꿔보고 싶은 한 가지를 선택해 주세요.
                        </Text>
                      </Stack>
                    )}
                  </Stack>

                  {selectedGoalPlan && (() => {
                    const previousGoal = goals.find(
                      (goal) => goal.month === selectedGoalPlan.goal.month,
                    );
                    const isAlreadySaved = Boolean(
                      previousGoal &&
                      previousGoal.title === selectedGoalPlan.goal.title &&
                      previousGoal.baselineAmount === selectedGoalPlan.goal.baselineAmount &&
                      previousGoal.targetAmount === selectedGoalPlan.goal.targetAmount,
                    );

                    return (
                      <Stack gap="sm">
                        {previousGoal && !isAlreadySaved && (
                          <Alert color="orange" variant="light" title="같은 거래월에 저장된 목표가 있어요">
                            저장하면 {previousGoal.title} 목표를 새 선택으로 교체합니다.
                          </Alert>
                        )}
                        <Button
                          color="brandMint"
                          leftSection={<IconTargetArrow size={16} />}
                          onClick={saveSelectedGoal}
                          loading={goalMutation.isPending && goalMutation.variables?.type === "upsert"}
                          disabled={
                            isAlreadySaved ||
                            goalMutation.isPending ||
                            monthlyGoalsQuery.isPending ||
                            monthlyGoalsQuery.isError
                          }
                        >
                          {goalMutation.isPending
                            ? "목표 저장 중"
                            : isAlreadySaved
                              ? "이미 저장된 목표"
                              : goalFeedback?.type === "error"
                                ? previousGoal
                                  ? "교체 다시 시도하기"
                                  : "다시 저장하기"
                                : previousGoal
                                  ? "기존 목표 교체하기"
                                  : "이 목표 저장하기"}
                        </Button>
                      </Stack>
                    );
                  })()}
                </Stack>
              </Paper>

              <Paper
                className={styles.goalPanel}
              >
                <Stack gap="lg">
                  <Stack gap={3}>
                    <Title order={4}>{goals.length > 0 && !showGoalChoices && !selectedGoalPlan ? "나의 목표" : "바꿔볼 목표 고르기"}</Title>
                    <Text size="xs" c="dimmed">
                      목표 후보는 분류된 이용내역을 기준으로 계산해요. 한 거래월의 실제 분류 내역을 사용합니다.
                    </Text>
                    {currentGoalMonth && <Text size="xs" c="dimmed">거래월 {currentGoalMonth} · 분류된 내역 {goalReferenceTransactions.length}건 · 취소 표시 내역 제외</Text>}
                  </Stack>

                  {monthlyGoalsQuery.isPending && (
                    <Group gap="sm" role="status" aria-live="polite">
                      <Skeleton height={20} width={20} circle />
                      <Text size="sm" c="dimmed">저장된 목표를 불러오고 있어요.</Text>
                    </Group>
                  )}
                  {monthlyGoalsQuery.isError && (
                    <Alert color="orange" variant="light" title="저장된 목표를 불러오지 못했어요">
                      <Stack gap="sm">
                        <Text size="sm">
                          목표 선택은 잠시 멈췄어요. 분석 결과와 이용내역은 그대로 사용할 수 있습니다.
                        </Text>
                        <Button
                          size="xs"
                          variant="light"
                          color="teal"
                          leftSection={<IconRefresh size={14} />}
                          onClick={() => void monthlyGoalsQuery.refetch()}
                          w="fit-content"
                        >
                          목표 다시 불러오기
                        </Button>
                      </Stack>
                    </Alert>
                  )}

                  {goalFeedback && (
                    <Alert
                      role={goalFeedback.type === "success" ? "status" : "alert"}
                      color={goalFeedback.type === "success" ? "green" : "red"}
                      variant="light"
                      title={goalFeedback.type === "success" ? "저장 완료" : "저장 실패"}
                    >
                      {goalFeedback.message}
                    </Alert>
                  )}

                  {!monthlyGoalsQuery.isError && goals.length > 0 && (
                    <details className={styles.savedGoals}>
                      <summary>저장된 목표 {goals.length}건 보기</summary>
                      <Stack gap="xs" mt="sm">
                      {goals.map((goal) => (
                        <div key={goal.id} className={styles.savedGoalRow}>
                          <Group justify="space-between" align="center" gap="md">
                            <Stack gap={5}>
                              <Text fw={800}>{goal.title}</Text>
                              <Text size="xs" c="dimmed">
                                {goal.month} · {goal.status === "active" ? "진행 중" : goal.status === "completed" ? "완수로 표시" : "중단"} · 기준 {formatAmount(goal.baselineAmount)}원 → 목표 {formatAmount(goal.targetAmount)}원 · 계획상 차이 {formatAmount(goal.monthlySave)}원
                              </Text>
                            </Stack>
                            {goal.status === "active" && (
                              <Group gap="xs">
                                <Button
                                  size="xs"
                                  variant="light"
                                  color="teal"
                                  leftSection={<IconCircleCheck size={14} />}
                                  loading={goalMutation.isPending}
                                  onClick={() => updateGoalStatus(goal.id, "completed")}
                                >
                                  완수로 표시
                                </Button>
                                <Button
                                  size="xs"
                                  variant="subtle"
                                  color="gray"
                                  leftSection={<IconPlayerPause size={14} />}
                                  loading={goalMutation.isPending}
                                  onClick={() => updateGoalStatus(goal.id, "stopped")}
                                >
                                  중단
                                </Button>
                              </Group>
                            )}
                          </Group>
                        </div>
                      ))}
                      </Stack>
                    </details>
                  )}
                  {!monthlyGoalsQuery.isError &&
                    !monthlyGoalsQuery.isPending &&
                    goals.length === 0 && (
                      <Text size="sm" c="dimmed">
                        아직 저장된 목표가 없어요.
                      </Text>
                    )}

                  {goals.length > 0 && !showGoalChoices && !selectedGoalPlan && recommendedGoals.length > 0 && (
                    <Button variant="light" color="teal" w="fit-content" onClick={() => setShowGoalChoices(true)}>
                      다른 목표 살펴보기
                    </Button>
                  )}

                  {(goals.length === 0 || showGoalChoices || selectedGoalPlan) && recommendedGoals.length > 0 ? (
                    <Stack gap="sm">
                      <Title order={5}>선택할 수 있는 목표 계획</Title>
                      <Stack gap="xs">
                        {recommendedGoals.map((goal) => {
                          const isSelected = selectedGoalPlan?.goal.id === goal.id;
                          const isAlreadySaved = Boolean(
                            currentMonthGoal &&
                            currentMonthGoal.title === goal.title &&
                            currentMonthGoal.baselineAmount === goal.baselineAmount &&
                            currentMonthGoal.targetAmount === goal.targetAmount,
                          );
                          return (
                            <Paper
                              key={goal.id}
                              className={`${styles.goalChoice} ${isSelected ? styles.goalChoiceSelected : ""}`}
                            >
                              <Group justify="space-between" align="center" gap="md" wrap="wrap">
                                <Stack gap={4}>
                                  <Stack gap={2}>
                                    <Text fw={800}>{goal.title}</Text>
                                    <Text size="xs" c="dimmed">
                                      거래월 {goal.month} · {goal.targetCategory}
                                    </Text>
                                  </Stack>
                                  <Text size="xs" c="dimmed">기준 {formatAmount(goal.baselineAmount)}원 → 목표 {formatAmount(goal.targetAmount)}원 · 계획상 차이 {formatAmount(goal.monthlySave)}원</Text>
                                </Stack>
                                <Button
                                  size="xs"
                                  variant={isSelected ? "filled" : "light"}
                                  color="teal"
                                  disabled={goalMutation.isPending || isAlreadySaved}
                                  aria-pressed={isSelected}
                                  onClick={() => selectGoal(goal)}
                                >
                                  {isAlreadySaved ? "저장된 목표" : isSelected ? "선택됨" : "이 계획 선택"}
                                </Button>
                              </Group>
                            </Paper>
                          );
                        })}
                      </Stack>
                    </Stack>
                  ) : recommendedGoals.length === 0 ? (
                    <Paper withBorder radius="md" p="lg" bg="gray.0">
                      <Stack gap="sm">
                        <Text fw={700}>목표 계획을 만들 수 있는 내역이 아직 없어요</Text>
                        <Text size="sm" c="dimmed">
                          목표 후보는 최근 거래월의 분류된 이용내역에서만 계산해요. 선택한 조회 범위에 해당 거래가 없습니다.
                        </Text>
                        <Button
                          variant="subtle"
                          color="teal"
                          size="xs"
                          leftSection={<IconArrowDownRight size={14} />}
                          onClick={() => navigate("/washing")}
                          w="fit-content"
                        >
                          이용내역 정리하기
                        </Button>
                      </Stack>
                    </Paper>
                  ) : null}
                </Stack>
              </Paper>
            </div>
          </Stack>
        </section>
      </Stack>
    </Container>
  );
}
