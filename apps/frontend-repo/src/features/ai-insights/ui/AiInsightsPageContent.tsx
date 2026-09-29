import {
  Alert,
  Badge,
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
  ThemeIcon,
  Title,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconArrowDownRight,
  IconBrain,
  IconCircleCheck,
  IconPlayerPause,
  IconRefresh,
  IconSparkles,
  IconTargetArrow,
} from "@tabler/icons-react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQueries,
} from "@tanstack/react-query";
import { useMemo, useState } from "react";
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
    if (insightMutation.isPending || filteredTransactions.length === 0) return;

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
    const goal = goals.find((item) => item.id === goalId);
    if (goal) goalMutation.mutate({ type: "status", goal, status });
  };

  const jumpToGoalSelection = () => {
    document.getElementById("goal-selection")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const requestInProgress = insightMutation.isPending;
  const hasNoMatchingTransactions = filteredTransactions.length === 0;

  return (
    <Container size="xl">
      <Stack gap="xl" py="md">
        <Stack gap={4}>
          <Text size="sm" fw={800} c="teal.8" tt="uppercase" lts={1}>
            CONSUMPTION INTELLIGENCE
          </Text>
          <Title order={1}>내 소비를 이해하는 첫 번째 발견</Title>
          <Text size="md" c="dimmed" maw={720}>
            정리한 카드 이용내역에서 눈여겨볼 흐름을 발견하고, 다음에 바꿔볼 행동을 생각해 보세요.
          </Text>
        </Stack>

        <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
          <Paper
            radius="xl"
            p={{ base: "lg", md: "xl" }}
            bg="#0D1730"
            c="white"
            mih={250}
          >
            <Stack justify="space-between" h="100%" gap="xl">
              <Group justify="space-between" align="flex-start">
                <Badge color="brandMint" variant="light" size="lg">
                  {insight ? "발견한 소비 패턴" : "나의 소비 읽기"}
                </Badge>
                <ThemeIcon color="brandMint" variant="light" size={44} radius="xl">
                  {requestInProgress ? (
                    <IconRefresh size={22} />
                  ) : (
                    <IconBrain size={22} />
                  )}
                </ThemeIcon>
              </Group>
              {requestInProgress ? (
                <Stack gap="sm">
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
                    MOTIFIN INSIGHT
                  </Text>
                  <Title order={2} c="white" lh={1.35}>
                    {insight.summary}
                  </Title>
                  <Text size="xs" c="gray.4">
                    {formatGeneratedAt(insight.generatedAt)} 생성
                  </Text>
                </Stack>
              ) : hasNoMatchingTransactions ? (
                <Stack gap="sm">
                  <Title order={2} c="white">
                    이 조건에 맞는 내역이 없어요
                  </Title>
                  <Text c="gray.3">
                    기간이나 카테고리를 바꾸면 분석할 내역을 찾을 수 있어요.
                  </Text>
                </Stack>
              ) : (
                <Stack gap="sm">
                  <Title order={2} c="white">
                    정리한 내역에서 나의 소비를 읽어볼까요?
                  </Title>
                  <Text c="gray.3" maw={520}>
                    조회 범위를 확인한 뒤 내 소비 분석하기를 선택하면, 실제 이용내역을 바탕으로 핵심 내용을 정리해요.
                  </Text>
                </Stack>
              )}
              {insight && !requestInProgress && (
                <Button
                  color="brandMint"
                  leftSection={<IconTargetArrow size={17} />}
                  onClick={jumpToGoalSelection}
                  w="fit-content"
                >
                  개선 목표 살펴보기
                </Button>
              )}
            </Stack>
          </Paper>

          <Paper withBorder radius="xl" p={{ base: "lg", md: "xl" }}>
            <Stack gap="md">
              <Stack gap={3}>
                <Title order={3}>분석에 사용되는 정보</Title>
                <Text size="sm" c="dimmed">
                  선택한 기간과 카테고리에 해당하는 이용내역을 분석합니다.
                </Text>
              </Stack>
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                <NativeSelect
                  label="조회 기간"
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
              <Paper withBorder bg="gray.0" radius="md" p="sm">
                <Group justify="space-between" gap="sm">
                  <Stack gap={2}>
                    <Text size="xs" c="dimmed">
                      조회 조건에 맞는 카드 이용내역
                    </Text>
                    <Text fw={800}>
                      {getPeriodLabel(filters.period)} · {categoryLabel}
                    </Text>
                  </Stack>
                  <Text size="xl" fw={900} c="teal.8">
                    {filteredTransactions.length}
                    <Text span size="sm" fw={700} c="dimmed">
                      건
                    </Text>
                  </Text>
                </Group>
              </Paper>
              <Button
                color="brandMint"
                leftSection={
                  hasNoMatchingTransactions ? (
                    <IconArrowDownRight size={17} />
                  ) : (
                    <IconSparkles size={17} />
                  )
                }
                onClick={requestInsight}
                loading={requestInProgress}
                disabled={hasNoMatchingTransactions}
                size="md"
              >
                내 소비 분석하기
              </Button>
              {hasNoMatchingTransactions && (
                <Text size="xs" c="dimmed" ta="center">
                  분석을 시작하려면 조회 조건을 다시 선택해 주세요.
                </Text>
              )}
            </Stack>
          </Paper>
        </SimpleGrid>

        {unclassifiedCount > 0 && (
          <Alert
            color="orange"
            variant="light"
            icon={<IconAlertTriangle size={18} />}
            title="분류가 필요한 내역이 있어요"
          >
            선택한 범위에 미분류 거래 {unclassifiedCount}건이 있어 카테고리별 해석은 제한될 수 있어요. 이 내역을 포함해 분석할 수 있습니다.
            <Button
              variant="subtle"
              color="teal"
              size="xs"
              ml="xs"
              onClick={() => navigate("/washing")}
            >
              이용내역 정리하기
            </Button>
          </Alert>
        )}

        {requestErrorMessage && (
          <Alert
            color="red"
            variant="light"
            icon={<IconAlertTriangle size={18} />}
            title="이번 분석 결과를 가져오지 못했어요"
          >
            <Stack gap="sm">
              <Text size="sm">{requestErrorMessage}</Text>
              <Button
                variant="light"
                color="red"
                leftSection={<IconRefresh size={16} />}
                onClick={requestInsight}
                loading={requestInProgress}
                w="fit-content"
              >
                같은 조건으로 다시 시도하기
              </Button>
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
                title="조회 조건이 바뀌었어요"
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
                    p="lg"
                    radius="lg"
                    bg="white"
                  >
                    <Stack gap="sm">
                      <Group justify="space-between">
                        <Badge color="brandMint" variant="light">
                          발견 {String(index + 1).padStart(2, "0")}
                        </Badge>
                        <ThemeIcon variant="light" color="brandMint" radius="xl">
                          <IconSparkles size={17} />
                        </ThemeIcon>
                      </Group>
                      <Title order={4}>{card.title}</Title>
                      <Text size="sm" c="dimmed" lh={1.65}>
                        {card.description}
                      </Text>
                    </Stack>
                  </Paper>
                ))}
              </SimpleGrid>
            </Stack>
          </Stack>
        )}

        <Paper
          id="goal-selection"
          withBorder
          radius="xl"
          p={{ base: "lg", md: "xl" }}
        >
          <Stack gap="lg">
            <Group align="flex-start" gap="md">
              <ThemeIcon variant="light" color="brandMint" size={44} radius="xl">
                <IconTargetArrow size={22} />
              </ThemeIcon>
              <Stack gap={3}>
                <Text size="sm" fw={800} c="teal.8">
                  DISCOVERY → ACTION
                </Text>
                <Title order={3}>발견한 흐름에서 다음 목표를 골라보세요</Title>
                <Text size="sm" c="dimmed" maw={760}>
                  AI 분석과 별도로 저장된 목표를 확인할 수 있어요. 이용내역에서 만든 후보는 계획이며, 실제 절감 성과를 뜻하지 않습니다.
                </Text>
              </Stack>
            </Group>

            <Group align="stretch" gap="md" wrap="wrap">
              <Paper
                radius="lg"
                p={{ base: "lg", md: "xl" }}
                bg="#0D1730"
                c="white"
                flex={{ base: "1 1 100%", lg: "0.86 1 0" }}
                miw={{ base: "100%", lg: 300 }}
              >
                <Stack gap="lg" h="100%" justify="space-between">
                  <Stack gap="md">
                    <Badge color="brandMint" variant="light" w="fit-content">
                      {selectedGoalPlan
                        ? "선택한 목표 계획"
                        : currentMonthGoal
                          ? "저장된 목표"
                          : "목표 선택"}
                    </Badge>
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
                        <Group grow align="flex-start">
                          <Stack gap={2}>
                            <Text size="xs" c="gray.4">기준 금액</Text>
                            <Text fw={800}>{formatAmount(selectedGoalPlan.goal.baselineAmount)}원</Text>
                          </Stack>
                          <Stack gap={2}>
                            <Text size="xs" c="brandMint.4">목표 금액</Text>
                            <Text fw={800} c="brandMint.4">
                              {formatAmount(selectedGoalPlan.goal.targetAmount)}원
                            </Text>
                          </Stack>
                        </Group>
                        <Progress
                          value={
                            selectedGoalPlan.goal.baselineAmount > 0
                              ? (selectedGoalPlan.goal.targetAmount /
                                  selectedGoalPlan.goal.baselineAmount) *
                                100
                              : 0
                          }
                          color="brandMint"
                          size="lg"
                          radius="xl"
                          aria-label="선택한 목표 금액과 기준 금액 비교"
                        />
                        <Badge color="brandMint" variant="light" w="fit-content">
                          기준 대비 계획상 차이 {formatAmount(selectedGoalPlan.goal.monthlySave)}원
                        </Badge>
                      </>
                    ) : currentMonthGoal ? (
                      <Stack gap="md">
                        <Stack gap={4}>
                          <Title order={3} c="white">{currentMonthGoal.title}</Title>
                          <Text size="sm" c="gray.3">
                            {currentMonthGoal.month} · {currentMonthGoal.status === "active" ? "진행 중" : currentMonthGoal.status === "completed" ? "완수로 표시" : "중단"}
                          </Text>
                          <Text size="xs" c="gray.4">
                            저장 당시 기준과 목표 금액
                          </Text>
                        </Stack>
                        <Group grow align="flex-start">
                          <Stack gap={2}>
                            <Text size="xs" c="gray.4">기준 금액</Text>
                            <Text fw={800}>{formatAmount(currentMonthGoal.baselineAmount)}원</Text>
                          </Stack>
                          <Stack gap={2}>
                            <Text size="xs" c="brandMint.4">목표 금액</Text>
                            <Text fw={800} c="brandMint.4">
                              {formatAmount(currentMonthGoal.targetAmount)}원
                            </Text>
                          </Stack>
                        </Group>
                        <Progress
                          value={
                            currentMonthGoal.baselineAmount > 0
                              ? (currentMonthGoal.targetAmount /
                                  currentMonthGoal.baselineAmount) *
                                100
                              : 0
                          }
                          color="brandMint"
                          size="lg"
                          radius="xl"
                          aria-label="저장된 목표 금액과 기준 금액 비교"
                        />
                        <Badge color="brandMint" variant="light" w="fit-content">
                          기준 대비 계획상 차이 {formatAmount(currentMonthGoal.monthlySave)}원
                        </Badge>
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
                withBorder
                radius="lg"
                p={{ base: "lg", md: "xl" }}
                flex={{ base: "1 1 100%", lg: "1.14 1 0" }}
                miw={{ base: "100%", lg: 420 }}
              >
                <Stack gap="lg">
                  <Stack gap={3}>
                    <Title order={4}>이용내역에서 고를 수 있는 목표</Title>
                    <Text size="xs" c="dimmed">
                      AI 추천이 아닌, 한 거래월의 정리된 카테고리 금액에서 만든 계획 예시예요.
                    </Text>
                    {currentGoalMonth && (
                      <Badge color="gray" variant="light" w="fit-content">
                        거래월 {currentGoalMonth} · 분류된 내역 {goalReferenceTransactions.length}건 · 취소 표시 내역 제외
                      </Badge>
                    )}
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
                      color={goalFeedback.type === "success" ? "green" : "red"}
                      variant="light"
                      title={goalFeedback.type === "success" ? "저장 완료" : "저장 실패"}
                    >
                      {goalFeedback.message}
                    </Alert>
                  )}

                  {!monthlyGoalsQuery.isError && goals.length > 0 && (
                    <Stack gap="sm">
                      <Title order={5}>저장된 목표</Title>
                      {goals.map((goal) => (
                        <Paper key={goal.id} withBorder p="md" radius="md">
                          <Group justify="space-between" align="center" gap="md">
                            <Stack gap={5}>
                              <Group gap="xs">
                                <Text fw={800}>{goal.title}</Text>
                                <Badge
                                  color={
                                    goal.status === "active"
                                      ? "brandMint"
                                      : goal.status === "completed"
                                        ? "green"
                                        : "gray"
                                  }
                                  variant="light"
                                >
                                  {goal.status === "active"
                                    ? "진행 중"
                                    : goal.status === "completed"
                                      ? "완수로 표시"
                                      : "중단"}
                                </Badge>
                              </Group>
                              <Text size="xs" c="dimmed">
                                {goal.month} · 기준 {formatAmount(goal.baselineAmount)}원 → 목표 {formatAmount(goal.targetAmount)}원 · 계획상 차이 {formatAmount(goal.monthlySave)}원
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
                        </Paper>
                      ))}
                    </Stack>
                  )}
                  {!monthlyGoalsQuery.isError &&
                    !monthlyGoalsQuery.isPending &&
                    goals.length === 0 && (
                      <Text size="sm" c="dimmed">
                        아직 저장된 목표가 없어요.
                      </Text>
                    )}

                  {recommendedGoals.length > 0 ? (
                    <Stack gap="sm">
                      <Title order={5}>선택할 수 있는 목표 계획</Title>
                      <SimpleGrid cols={{ base: 1, xl: 2 }} spacing="sm">
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
                              withBorder
                              p="md"
                              radius="md"
                              bg={isSelected ? "teal.0" : "white"}
                            >
                              <Stack gap="sm">
                                <Group justify="space-between" align="flex-start">
                                  <Stack gap={2}>
                                    <Text fw={800}>{goal.title}</Text>
                                    <Text size="xs" c="dimmed">
                                      거래월 {goal.month} · {goal.targetCategory}
                                    </Text>
                                  </Stack>
                                  {isAlreadySaved && (
                                    <Badge color="brandMint" variant="light">
                                      저장된 목표
                                    </Badge>
                                  )}
                                </Group>
                                <Group justify="space-between" gap="xs">
                                  <Text size="xs" c="dimmed">
                                    기준 {formatAmount(goal.baselineAmount)}원
                                  </Text>
                                  <Text size="xs" fw={700} c="teal.8">
                                    목표 {formatAmount(goal.targetAmount)}원
                                  </Text>
                                </Group>
                                <Progress
                                  value={(goal.targetAmount / goal.baselineAmount) * 100}
                                  color="brandMint"
                                  size="md"
                                  radius="xl"
                                  aria-label={`${goal.title}: 기준 금액과 목표 금액 비교`}
                                />
                                <Text size="xs" c="dimmed">
                                  기준 대비 계획상 차이 {formatAmount(goal.monthlySave)}원
                                </Text>
                                <Button
                                  size="xs"
                                  variant={isSelected ? "filled" : "light"}
                                  color="brandMint"
                                  disabled={goalMutation.isPending}
                                  aria-pressed={isSelected}
                                  onClick={() => selectGoal(goal)}
                                >
                                  {isSelected ? "선택됨" : "이 계획 선택"}
                                </Button>
                              </Stack>
                            </Paper>
                          );
                        })}
                      </SimpleGrid>
                    </Stack>
                  ) : (
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
                  )}
                </Stack>
              </Paper>
            </Group>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}
