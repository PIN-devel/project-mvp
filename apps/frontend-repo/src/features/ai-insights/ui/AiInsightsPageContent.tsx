import {
  Alert,
  Badge,
  Button,
  Container,
  Group,
  NativeSelect,
  Paper,
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
  fetchMonthlyGoals,
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
    () =>
      getLatestTransactionMonth(
        filteredTransactions.length > 0 ? filteredTransactions : transactions,
      ),
    [filteredTransactions, transactions],
  );
  const hasClassifiedCategory = filteredTransactions.some(
    (transaction) =>
      isTransactionClassified(transaction) && Boolean(transaction.categoryName),
  );
  const recommendedGoals = useMemo(
    () =>
      hasClassifiedCategory
        ? buildRecommendedGoals(filteredTransactions, currentGoalMonth)
        : [],
    [currentGoalMonth, filteredTransactions, hasClassifiedCategory],
  );
  const monthlyGoalsQuery = useQuery({
    queryKey: aiInsightKeys.monthlyGoals(),
    queryFn: fetchMonthlyGoals,
    enabled: insight != null,
    retry: false,
  });
  const goals = monthlyGoalsQuery.data ?? [];
  const currentMonthGoal = goals.find(
    (goal) => goal.month === currentGoalMonth && goal.status !== "stopped",
  );

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
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: aiInsightKeys.monthlyGoals(),
      });
      toast.success("목표 상태를 저장했습니다.");
    },
    onError: () => {
      toast.error("목표 정보를 저장하지 못했습니다. 다시 시도해주세요.");
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
    goalMutation.mutate({ type: "upsert", goal });
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

        {insight && (
          <Paper id="goal-selection" withBorder radius="xl" p={{ base: "lg", md: "xl" }}>
            <Stack gap="lg">
              <Group align="flex-start" gap="md">
                <ThemeIcon variant="light" color="brandMint" size={44} radius="xl">
                  <IconTargetArrow size={22} />
                </ThemeIcon>
                <Stack gap={3}>
                  <Text size="sm" fw={800} c="teal.8">
                    DISCOVERY → ACTION
                  </Text>
                  <Title order={3}>다음에 바꿔볼 행동을 골라보세요</Title>
                  <Text size="sm" c="dimmed" maw={720}>
                    목표 금액은 선택한 이용내역에서 계산한 계획값입니다. 실제 절감 성과를 뜻하지 않아요.
                  </Text>
                </Stack>
              </Group>

              {monthlyGoalsQuery.isFetching && (
                <Text size="sm" c="dimmed">저장된 목표를 불러오는 중이에요.</Text>
              )}
              {monthlyGoalsQuery.isError && (
                <Alert color="orange" variant="light" title="목표 정보를 불러오지 못했어요">
                  <Group justify="space-between" align="center">
                    <Text size="sm">분석 결과는 표시되고 있어요. 목표 정보는 따로 다시 불러올 수 있습니다.</Text>
                    <Button
                      size="xs"
                      variant="light"
                      color="teal"
                      leftSection={<IconRefresh size={14} />}
                      onClick={() => void monthlyGoalsQuery.refetch()}
                    >
                      목표 다시 불러오기
                    </Button>
                  </Group>
                </Alert>
              )}

              {!monthlyGoalsQuery.isError && goals.length > 0 && (
                <Stack gap="sm">
                  <Title order={4}>저장된 목표</Title>
                  <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="sm">
                    {goals.map((goal) => (
                      <Paper key={goal.id} withBorder p="md" radius="lg">
                        <Group justify="space-between" align="center" gap="md">
                          <Stack gap={5}>
                            <Group gap="xs">
                              <Text fw={800}>{goal.title}</Text>
                              <Badge
                                color={goal.status === "active" ? "brandMint" : goal.status === "completed" ? "green" : "gray"}
                                variant="light"
                              >
                                {goal.status === "active" ? "진행 중" : goal.status === "completed" ? "완수 표시" : "중단"}
                              </Badge>
                            </Group>
                            <Text size="xs" c="dimmed">
                              {goal.month} · 월 절감 목표 {formatAmount(goal.monthlySave)}원
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
                  </SimpleGrid>
                </Stack>
              )}

              <Stack gap="sm">
                <Group justify="space-between" align="end">
                  <Stack gap={3}>
                    <Title order={4}>이용내역을 바탕으로 목표를 살펴보기</Title>
                    <Text size="xs" c="dimmed">
                      제안 금액은 현재 조회 범위의 분류된 카테고리 합계에 비율을 적용한 계획 예시입니다.
                    </Text>
                  </Stack>
                  <Badge variant="light" color="gray">
                    {currentGoalMonth} 기준
                  </Badge>
                </Group>
                {recommendedGoals.length > 0 ? (
                  <SimpleGrid cols={{ base: 1, md: 3 }} spacing="sm">
                    {recommendedGoals.map((goal) => {
                      const isSelectedGoal =
                        currentMonthGoal?.month === goal.month &&
                        currentMonthGoal.title === goal.title;
                      return (
                        <Paper key={goal.id} withBorder p="md" radius="lg">
                          <Stack gap="sm">
                            <Group justify="space-between" align="flex-start">
                              <Text fw={800}>{goal.title}</Text>
                              {isSelectedGoal && (
                                <Badge color="brandMint" variant="filled">선택됨</Badge>
                              )}
                            </Group>
                            <Text size="sm" c="dimmed">
                              조회 범위의 {goal.targetCategory} 이용 금액 {formatAmount(goal.baselineAmount)}원에서 {formatAmount(goal.targetAmount)}원까지 줄이는 계획이에요.
                            </Text>
                            <Badge color="teal" variant="light" w="fit-content">
                              목표 차이 {formatAmount(goal.monthlySave)}원
                            </Badge>
                            <Button
                              size="sm"
                              variant={isSelectedGoal ? "filled" : "light"}
                              color="brandMint"
                              disabled={isSelectedGoal || goalMutation.isPending || monthlyGoalsQuery.isError}
                              loading={goalMutation.isPending && goalMutation.variables?.type === "upsert" && goalMutation.variables.goal.id === goal.id}
                              onClick={() => selectGoal(goal)}
                            >
                              {isSelectedGoal ? "선택된 목표" : "이 목표 선택"}
                            </Button>
                          </Stack>
                        </Paper>
                      );
                    })}
                  </SimpleGrid>
                ) : (
                  <Paper withBorder radius="lg" p="lg" bg="gray.0">
                    <Text size="sm" c="dimmed">
                      현재 조회 범위에는 목표 예시를 계산할 분류된 카테고리 내역이 없어요. 카테고리를 정리한 뒤 다시 살펴볼 수 있습니다.
                    </Text>
                  </Paper>
                )}
              </Stack>
            </Stack>
          </Paper>
        )}
      </Stack>
    </Container>
  );
}
