import {
  Alert,
  Badge,
  Button,
  Code,
  Container,
  Group,
  NativeSelect,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
  useMantineColorScheme,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconBrain,
  IconChartLine,
  IconCircleCheck,
  IconDatabase,
  IconPigMoney,
  IconPlayerPause,
  IconRefresh,
  IconSparkles,
  IconTargetArrow,
} from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useSuspenseQueries } from "@tanstack/react-query";
import {
  generateInsightWithMonthlyGoals,
  updateMonthlyGoalStatus,
  upsertMonthlyGoal,
} from "@/features/ai-insights/api/fetchers";
import { aiInsightQueries } from "@/features/ai-insights/api/queries";
import {
  buildDataSignature,
  buildInsightRequest,
  buildPromptPreview,
  buildRecommendedGoals,
  buildTrajectoryRows,
  calculateTotalSaved,
  filterTransactionsForInsight,
  formatAmount,
  formatGeneratedAt,
  getPeriodLabel,
  getLatestTransactionMonth,
  isTransactionClassified,
} from "@/features/ai-insights/model/core";
import type {
  InsightFilters,
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

export function AiInsightsPageContent() {
  const { colorScheme } = useMantineColorScheme();
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
  const [promptOpened, setPromptOpened] = useState(false);
  const [goals, setGoals] = useState<MonthlyGoal[]>([]);
  const [requestErrorMessage, setRequestErrorMessage] = useState<string | null>(
    null,
  );
  const [lastSuccessSignature, setLastSuccessSignature] = useState<string | null>(
    null,
  );

  const filteredTransactions = useMemo(
    () => filterTransactionsForInsight(transactions, filters),
    [filters, transactions],
  );
  const currentGoalMonth = useMemo(
    () =>
      getLatestTransactionMonth(
        filteredTransactions.length > 0 ? filteredTransactions : transactions,
      ),
    [filteredTransactions, transactions],
  );
  const recommendedGoals = useMemo(
    () => buildRecommendedGoals(filteredTransactions, currentGoalMonth),
    [currentGoalMonth, filteredTransactions],
  );
  const unclassifiedTransactions = useMemo(
    () =>
      transactions.filter((transaction) => !isTransactionClassified(transaction)),
    [transactions],
  );
  const totalUnclassifiedAmount = unclassifiedTransactions.reduce(
    (sum, transaction) => sum + transaction.amount,
    0,
  );
  const totalAmount = filteredTransactions.reduce(
    (sum, transaction) => sum + transaction.amount,
    0,
  );
  const promptPreview = buildPromptPreview(
    filteredTransactions,
    categories,
    filters,
  );
  const currentSignature = buildDataSignature(filteredTransactions);
  const isStaleInsight =
    insight != null &&
    lastSuccessSignature != null &&
    currentSignature !== lastSuccessSignature;
  const totalSaved = calculateTotalSaved(goals, filteredTransactions);
  const trajectoryRows = buildTrajectoryRows(goals, currentGoalMonth);
  const currentMonthGoal = goals.find(
    (goal) => goal.month === currentGoalMonth && goal.status !== "stopped",
  );
  const chart = buildTrajectoryChart(trajectoryRows);

  const insightMutation = useMutation({
    mutationFn: generateInsightWithMonthlyGoals,
    onSuccess: ({ insight: result, goals: monthlyGoals }) => {
      setInsight(result);
      setGoals(monthlyGoals);
      setRequestErrorMessage(null);
      setLastSuccessSignature(currentSignature);
      toast.success("AI 인사이트를 생성했습니다.");
    },
    onError: () => {
      const message =
        "인사이트 생성에 실패했습니다. 조건을 확인한 뒤 다시 시도해주세요.";
      setRequestErrorMessage(message);
      toast.error(message);
    },
  });

  const requestInsight = () => {
    if (filteredTransactions.length === 0) {
      toast.warning("분석할 거래 내역이 없습니다.");
      return;
    }

    setRequestErrorMessage(null);
    insightMutation.mutate(buildInsightRequest(filteredTransactions, filters));
  };

  const selectGoal = (goal: MonthlyGoalDraft) => {
    goalMutation.mutate({ type: "upsert", goal });
  };

  const updateGoalStatus = (
    goalId: number,
    status: MonthlyGoal["status"],
  ) => {
    const goal = goals.find((item) => item.id === goalId);
    if (!goal) return;
    goalMutation.mutate({ type: "status", goal, status });
  };

  const goalMutation = useMutation({
    mutationFn: async (
      variables:
        | { type: "upsert"; goal: MonthlyGoalDraft }
        | {
            type: "status";
            goal: MonthlyGoal;
            status: MonthlyGoal["status"];
          },
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
      return updateMonthlyGoalStatus(
        goal.id,
        status,
        status === "completed" ? goal.actualSaved ?? goal.monthlySave : undefined,
      );
    },
    onSuccess: (updatedGoal) => {
      setGoals((currentGoals) =>
        [...currentGoals.filter((goal) => goal.id !== updatedGoal.id && goal.month !== updatedGoal.month), updatedGoal]
          .sort((a, b) => a.month.localeCompare(b.month)),
      );
    },
    onError: () => {
      toast.error("목표 정보를 저장하지 못했습니다. 다시 시도해주세요.");
    },
  });

  return (
    <Container size="xl">
      <Stack gap="lg">
        <Paper withBorder p="xl" radius="md" shadow="sm">
          <Stack gap="md">
            <Group gap="sm" wrap="nowrap">
              <ThemeIcon variant="light" color="violet" size="lg">
                <IconBrain size={22} />
              </ThemeIcon>
              <Stack gap={2}>
                <Title order={2}>AI 소비 인사이트</Title>
                <Text size="sm" c="dimmed">
                  세척된 카드 이용 내역을 기간과 카테고리 조건으로 해석합니다.
                </Text>
              </Stack>
            </Group>

            <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
              <NativeSelect
                label="기간 조건"
                value={filters.period}
                onChange={(event) => {
                  const nextPeriod = event.currentTarget
                    .value as InsightFilters["period"];
                  setFilters((current) => ({
                    ...current,
                    period: nextPeriod,
                  }));
                }}
                data={periodOptions}
              />
              <NativeSelect
                label="카테고리 조건"
                value={String(filters.categoryId ?? "all")}
                onChange={(event) => {
                  const nextCategoryId = event.currentTarget.value;
                  setFilters((current) => ({
                    ...current,
                    categoryId:
                      nextCategoryId === "all" ? null : Number(nextCategoryId),
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
              <Button
                mt={{ base: 0, md: 24 }}
                leftSection={<IconSparkles size={16} />}
                color="violet"
                onClick={requestInsight}
                loading={insightMutation.isPending}
              >
                인사이트 생성
              </Button>
            </SimpleGrid>

            <Paper withBorder p="sm" radius="md" bg="var(--mantine-color-gray-light)">
              <Group justify="space-between" gap="sm">
                <Group gap="xs">
                  <IconDatabase size={16} />
                  <Text size="sm" c="dimmed">
                    {getPeriodLabel(filters.period)} · {filteredTransactions.length}건 ·{" "}
                    {formatAmount(totalAmount)}원
                  </Text>
                </Group>
                <Button
                  variant="subtle"
                  color="teal"
                  size="xs"
                  onClick={() => setPromptOpened((opened) => !opened)}
                >
                  프롬프트 보기
                </Button>
              </Group>
            </Paper>

            {requestErrorMessage && (
              <Alert
                color="red"
                variant="light"
                icon={<IconAlertTriangle size={16} />}
              >
                {requestErrorMessage}
              </Alert>
            )}
          </Stack>
        </Paper>

        {unclassifiedTransactions.length > 0 && (
          <Alert
            color="orange"
            variant="light"
            icon={<IconAlertTriangle size={18} />}
            title="미분류 데이터 잔여"
          >
            미분류 거래 {unclassifiedTransactions.length}건,{" "}
            {formatAmount(totalUnclassifiedAmount)}원이 남아 있어 인사이트 품질이 제한될 수 있습니다.
          </Alert>
        )}

        <Paper withBorder p="xl" radius="md" shadow="sm">
          {insightMutation.isPending ? (
            <Stack align="center" gap="sm" py="xl">
              <ThemeIcon variant="light" color="violet" size={56} radius="md">
                <IconBrain size={28} />
              </ThemeIcon>
              <Text fw={800}>AI가 분석 중입니다</Text>
              <Text size="sm" c="dimmed">
                현재 조건의 거래 내역을 요약하고 핵심 포인트를 만들고 있습니다.
              </Text>
            </Stack>
          ) : insight == null ? (
            <Stack align="center" gap="sm" py="xl">
              <ThemeIcon variant="light" color="violet" size={56} radius="md">
                <IconBrain size={28} />
              </ThemeIcon>
              <Title order={3}>인사이트가 아직 없습니다</Title>
              <Text size="sm" c="dimmed" ta="center">
                조건을 설정하고 인사이트 생성을 눌러 주세요.
              </Text>
            </Stack>
          ) : (
            <Stack gap="lg">
              <Group justify="space-between">
                <Badge variant="light" color="violet">
                  AI 인사이트
                </Badge>
                <Text size="xs" c="dimmed">
                  {formatGeneratedAt(insight.generatedAt)}
                </Text>
              </Group>
              {isStaleInsight && (
                <Alert color="yellow" variant="light" icon={<IconRefresh size={16} />}>
                  거래 데이터나 조회 조건이 변경되었습니다. 최신 내역 기준으로 다시 생성하면 결과 신뢰도를 높일 수 있습니다.
                </Alert>
              )}
              <Text size="sm" lh={1.7}>
                {insight.summary}
              </Text>
              <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
                {insight.cards.map((card) => (
                  <Paper key={card.title} withBorder p="md" radius="md">
                    <Stack gap="xs">
                      <ThemeIcon variant="light" color="violet">
                        <IconSparkles size={18} />
                      </ThemeIcon>
                      <Text fw={900}>{card.title}</Text>
                      <Text size="sm" c="dimmed">
                        {card.description}
                      </Text>
                    </Stack>
                  </Paper>
                ))}
              </SimpleGrid>
            </Stack>
          )}
        </Paper>

        {insight != null && (
          <Stack gap="lg">
            <Paper withBorder p="xl" radius="md" shadow="sm">
              <Group justify="space-between" align="flex-start">
                <Group gap="sm">
                  <ThemeIcon variant="light" color="brandMint">
                    <IconPigMoney size={20} />
                  </ThemeIcon>
                  <Stack gap={2}>
                    <Title order={3}>목표 관리 & 총 절감</Title>
                    <Text size="sm" c="dimmed">
                      이전 목표와 이번 달 목표를 함께 관리합니다.
                    </Text>
                  </Stack>
                </Group>
                <Stack gap={0} align="flex-end">
                  <Text size="xs" c="dimmed">
                    누적 절감액
                  </Text>
                  <Text
                    size="xl"
                    fw={900}
                    c={colorScheme === "dark" ? "brandMint.2" : "#006B56"}
                  >
                    {formatAmount(totalSaved)}원
                  </Text>
                </Stack>
              </Group>

              <Stack gap="sm" mt="lg">
                {goals.map((goal) => (
                  <Paper key={goal.id} withBorder p="md" radius="md">
                    <Group justify="space-between" align="center">
                      <Stack gap={4}>
                        <Group gap="xs">
                          <Text fw={900}>{goal.title}</Text>
                          <Badge
                            color={
                              goal.status === "active"
                                ? "teal"
                                : goal.status === "completed"
                                  ? "green"
                                  : "gray"
                            }
                            variant="light"
                          >
                            {goal.status === "active"
                              ? "유지 중"
                              : goal.status === "completed"
                                ? "완수"
                                : "중단"}
                          </Badge>
                        </Group>
                        <Text size="xs" c="dimmed">
                          {goal.month} · 월 {formatAmount(goal.monthlySave)}원 절감 목표
                        </Text>
                      </Stack>
                      <Group gap="xs">
                        <Button
                          size="xs"
                          variant="light"
                          color="green"
                          leftSection={<IconCircleCheck size={14} />}
                          onClick={() => updateGoalStatus(goal.id, "completed")}
                        >
                          완수
                        </Button>
                        <Button
                          size="xs"
                          variant="light"
                          color="gray"
                          leftSection={<IconPlayerPause size={14} />}
                          onClick={() => updateGoalStatus(goal.id, "stopped")}
                        >
                          중단
                        </Button>
                      </Group>
                    </Group>
                  </Paper>
                ))}
              </Stack>
            </Paper>

            <Paper withBorder p="xl" radius="md" shadow="sm">
              <Stack gap="md">
                <Group gap="sm">
                  <ThemeIcon variant="light" color="violet">
                    <IconChartLine size={20} />
                  </ThemeIcon>
                  <Stack gap={2}>
                    <Title order={3}>절감·자산 추이</Title>
                    <Text size="sm" c="dimmed">
                      유지 중인 목표의 중첩 절감을 반영한 과거·현재·미래 흐름입니다.
                    </Text>
                  </Stack>
                </Group>
                <svg
                  width="100%"
                  height={chart.height}
                  viewBox={`0 0 ${chart.width} ${chart.height}`}
                  role="img"
                  aria-label="절감 자산 추이 그래프"
                >
                  <defs>
                    <linearGradient id="trajectory-area" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="var(--mantine-color-teal-4)" stopOpacity="0.28" />
                      <stop offset="100%" stopColor="var(--mantine-color-teal-4)" stopOpacity="0.04" />
                    </linearGradient>
                  </defs>
                  {[0.25, 0.5, 0.75, 1].map((ratio) => {
                    const y = chart.padding.top + chart.plotHeight * ratio;
                    return (
                      <line
                        key={ratio}
                        x1={chart.padding.left}
                        x2={chart.padding.left + chart.plotWidth}
                        y1={y}
                        y2={y}
                        stroke="var(--mantine-color-gray-3)"
                        strokeDasharray="4 6"
                      />
                    );
                  })}
                  <polyline
                    points={chart.areaPoints}
                    fill="url(#trajectory-area)"
                    stroke="none"
                  />
                  <polyline
                    points={chart.targetPoints}
                    fill="none"
                    stroke="var(--mantine-color-violet-5)"
                    strokeDasharray="8 6"
                    strokeLinecap="round"
                    strokeWidth="3"
                  />
                  <polyline
                    points={chart.savedPoints}
                    fill="none"
                    stroke="var(--mantine-color-teal-6)"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="4"
                  />
                  {trajectoryRows.map((row, index) => {
                    const x = chart.toX(index);
                    const savedY = chart.toY(row.saved);
                    const targetY = chart.toY(row.target);
                    return (
                      <g key={row.month}>
                        {row.isCurrent && (
                          <line
                            x1={x}
                            x2={x}
                            y1={chart.padding.top}
                            y2={chart.padding.top + chart.plotHeight}
                            stroke="var(--mantine-color-yellow-6)"
                            strokeDasharray="5 5"
                            strokeWidth="2"
                          />
                        )}
                        <circle
                          cx={x}
                          cy={targetY}
                          fill="var(--mantine-color-violet-5)"
                          r="4"
                        />
                        <circle
                          cx={x}
                          cy={savedY}
                          fill="var(--mantine-color-teal-6)"
                          r="5"
                          stroke="var(--mantine-color-body)"
                          strokeWidth="2"
                        />
                        <text
                          x={x}
                          y={chart.height - 20}
                          textAnchor="middle"
                          fill="var(--mantine-color-dimmed)"
                          fontSize="13"
                        >
                          {row.month}
                        </text>
                        {row.isCurrent && (
                          <text
                            x={x}
                            y={chart.padding.top - 8}
                            textAnchor="middle"
                            fill="var(--mantine-color-yellow-7)"
                            fontSize="12"
                            fontWeight="700"
                          >
                            현재
                          </text>
                        )}
                      </g>
                    );
                  })}
                  <text
                    x={chart.padding.left}
                    y={chart.padding.top - 8}
                    fill="var(--mantine-color-dimmed)"
                    fontSize="12"
                  >
                    {formatAmount(chart.maxValue)}원
                  </text>
                </svg>
                <Group gap="lg">
                  <Group gap={6}>
                    <Badge color="teal" variant="filled" size="xs">
                      실선
                    </Badge>
                    <Text size="xs" c="dimmed">
                      실제·투영 누적 절감
                    </Text>
                  </Group>
                  <Group gap={6}>
                    <Badge color="violet" variant="light" size="xs">
                      점선
                    </Badge>
                    <Text size="xs" c="dimmed">
                      목표 경로
                    </Text>
                  </Group>
                </Group>
              </Stack>
            </Paper>

            <Paper withBorder p="xl" radius="md" shadow="sm">
              <Stack gap="md">
                <Group gap="sm">
                  <ThemeIcon variant="light" color="teal">
                    <IconTargetArrow size={20} />
                  </ThemeIcon>
                  <Stack gap={2}>
                    <Title order={3}>이번 달 AI 추천 목표</Title>
                    <Text size="sm" c="dimmed">
                      한 달에 하나만 선택할 수 있습니다.
                    </Text>
                  </Stack>
                </Group>
                <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
                  {recommendedGoals.map((goal) => {
                    const isSelectedGoal =
                      currentMonthGoal?.month === goal.month &&
                      currentMonthGoal.title === goal.title;

                    return (
                      <Paper key={goal.id} withBorder p="md" radius="md">
                        <Stack gap="sm">
                          <Group justify="space-between" gap="xs">
                            <Text fw={900}>{goal.title}</Text>
                            {isSelectedGoal && (
                              <Badge color="teal" variant="filled">
                                선택됨
                              </Badge>
                            )}
                          </Group>
                          <Text size="sm" c="dimmed">
                            현재 {formatAmount(goal.baselineAmount)}원에서 목표{" "}
                            {formatAmount(goal.targetAmount)}원까지 줄이는 계획입니다.
                          </Text>
                          <Badge color="teal" variant="light">
                            월 {formatAmount(goal.monthlySave)}원 절감
                          </Badge>
                          <Button
                            size="xs"
                            variant={isSelectedGoal ? "filled" : "light"}
                            color="teal"
                            disabled={isSelectedGoal}
                            onClick={() => selectGoal(goal)}
                          >
                            {isSelectedGoal ? "선택된 목표" : "목표 선택"}
                          </Button>
                        </Stack>
                      </Paper>
                    );
                  })}
                </SimpleGrid>
              </Stack>
            </Paper>
          </Stack>
        )}

        {promptOpened && (
          <Paper withBorder p="md" radius="md">
            <Stack gap="sm">
              <Text fw={800} c="teal">
                전송 프롬프트 미리보기
              </Text>
              <Code block>{promptPreview}</Code>
            </Stack>
          </Paper>
        )}
      </Stack>
    </Container>
  );
}

type TrajectoryRow = ReturnType<typeof buildTrajectoryRows>[number];

const buildTrajectoryChart = (rows: TrajectoryRow[]) => {
  const width = 720;
  const height = 260;
  const padding = { top: 24, right: 28, bottom: 46, left: 56 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(
    ...rows.map((row) => Math.max(row.saved, row.target)),
    1,
  );
  const toX = (index: number) =>
    padding.left + (rows.length <= 1 ? 0 : (plotWidth / (rows.length - 1)) * index);
  const toY = (value: number) =>
    padding.top + plotHeight - (value / maxValue) * plotHeight;
  const savedPoints = rows
    .map((row, index) => `${toX(index)},${toY(row.saved)}`)
    .join(" ");
  const targetPoints = rows
    .map((row, index) => `${toX(index)},${toY(row.target)}`)
    .join(" ");
  const areaPoints = `${padding.left},${padding.top + plotHeight} ${savedPoints} ${
    padding.left + plotWidth
  },${padding.top + plotHeight}`;

  return {
    width,
    height,
    padding,
    plotWidth,
    plotHeight,
    maxValue,
    savedPoints,
    targetPoints,
    areaPoints,
    toX,
    toY,
  };
};
