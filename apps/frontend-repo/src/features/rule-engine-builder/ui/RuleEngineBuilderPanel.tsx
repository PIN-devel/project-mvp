import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Checkbox,
  ColorInput,
  ColorPicker,
  ColorSwatch,
  Group,
  NativeSelect,
  NumberInput,
  Paper,
  Popover,
  ScrollArea,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import {
  IconAlertTriangle,
  IconCategoryPlus,
  IconDeviceFloppy,
  IconMinus,
  IconRefresh,
  IconSearch,
  IconTrash,
} from "@tabler/icons-react";
import {
  useMutation,
  useQueryClient,
  useSuspenseQueries,
} from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  createCategory,
  createRule,
  deleteCategory,
  deleteRule,
  dryRunRule,
} from "@/features/rule-engine-builder/api/mutations";
import {
  ruleEngineKeys,
  ruleEngineQueries,
} from "@/features/rule-engine-builder/api/queries";
import type { RuleDryRunResult } from "@/features/rule-engine-builder/model/types";
import { isTransactionClassified, type TransactionFoundation } from "@/shared/model/transaction";
import { toast } from "@/shared/ui/toast";
import styles from "./RuleEngineBuilderPanel.module.css";

interface RuleEngineCategory {
  id: number;
  name: string;
  color: string;
  isDefault: boolean;
}

interface RuleEngineTransaction {
  foundation?: TransactionFoundation;
  id: number;
  transactionDate: string;
  merchant: string;
  categoryId?: number | null;
  categoryName?: string | null;
  amount: number;
  cardName: string;
}

interface RuleEngineBuilderPanelProps {
  categories: RuleEngineCategory[];
  transactions: RuleEngineTransaction[];
  onRuleApplied?: () => void;
  onCategoriesChanged?: () => void | Promise<void>;
}

const defaultCategoryColor = "#31e6b8";
const rgbChannelFields = [
  { key: "r", label: "R" },
  { key: "g", label: "G" },
  { key: "b", label: "B" },
] as const;

type RgbChannel = (typeof rgbChannelFields)[number]["key"];
type RgbColor = Record<RgbChannel, number>;

const formatAmount = (amount: number) =>
  new Intl.NumberFormat("ko-KR").format(amount);

const isUnclassified = (transaction: RuleEngineTransaction) =>
  !isTransactionClassified(transaction);

const categoryOptions = (categories: RuleEngineCategory[]) =>
  categories.map((category) => ({ value: String(category.id), label: `${category.name} (${category.isDefault ? "기본" : "내 카테고리"})` }));

const clampRgbChannel = (value: number) =>
  Math.max(0, Math.min(255, Math.round(value)));

const parseRgbColor = (value: string): RgbColor | null => {
  const rgbMatch = value.match(
    /rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})/i,
  );
  if (rgbMatch) {
    const [, r, g, b] = rgbMatch;
    return {
      r: clampRgbChannel(Number(r)),
      g: clampRgbChannel(Number(g)),
      b: clampRgbChannel(Number(b)),
    };
  }

  const hexMatch = value.trim().match(/^#?([0-9a-f]{6})$/i);
  if (hexMatch) {
    const [r, g, b] = [0, 2, 4].map((start) =>
      parseInt(hexMatch[1].slice(start, start + 2), 16),
    );
    return { r, g, b };
  }

  return null;
};

const toRgbString = ({ r, g, b }: RgbColor) => `rgb(${r}, ${g}, ${b})`;

const toHexColor = (value: string) => {
  const parsedColor = parseRgbColor(value);
  if (!parsedColor) {
    return value.trim();
  }

  return `#${[parsedColor.r, parsedColor.g, parsedColor.b]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
};

const toRgbValue = (value: string) => {
  const parsedColor = parseRgbColor(value);
  return parsedColor ? toRgbString(parsedColor) : value;
};

function RgbChannelInputs({
  color,
  onChange,
}: {
  color: string;
  onChange: (value: string) => void;
}) {
  const rgbColor = parseRgbColor(color) ?? { r: 0, g: 0, b: 0 };

  const updateChannel = (channel: RgbChannel, value: string | number) => {
    if (value === "" || Number.isNaN(value)) {
      return;
    }

    onChange(
      toRgbString({
        ...rgbColor,
        [channel]: clampRgbChannel(Number(value)),
      }),
    );
  };

  return (
    <SimpleGrid cols={3} spacing="xs">
      {rgbChannelFields.map(({ key, label }) => (
        <NumberInput
          key={key}
          label={label}
          value={rgbColor[key]}
          onChange={(value) => updateChannel(key, value)}
          size="xs"
          min={0}
          max={255}
          clampBehavior="strict"
          allowDecimal={false}
          allowNegative={false}
          hideControls
        />
      ))}
    </SimpleGrid>
  );
}

function ColorPickerField({
  label,
  value,
  onChange,
  swatches,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  swatches?: string[];
}) {
  const [opened, setOpened] = useState(false);

  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      position="bottom-start"
      shadow="md"
      withArrow
      withinPortal={false}
    >
      <Popover.Target>
        <ColorInput
          label={label}
          value={value}
          onChange={onChange}
          format="rgb"
          withPicker={false}
          withEyeDropper={false}
          readOnly
          onClick={() => setOpened(true)}
          onFocus={() => setOpened(true)}
          swatches={swatches}
        />
      </Popover.Target>
      <Popover.Dropdown p="xs" w={248}>
        <Stack gap="sm">
          <ColorPicker
            value={value}
            onChange={(nextColor) => onChange(toRgbValue(nextColor))}
            format="rgb"
            swatches={swatches}
            size="sm"
          />
          <Paper withBorder radius="md" p="xs">
            <Stack gap={8}>
              <Group align="center" wrap="nowrap">
                <Text size="10px" c="dimmed" fw={800} tt="uppercase">
                  RGB Fine Tune
                </Text>
              </Group>
              <RgbChannelInputs color={value} onChange={onChange} />
            </Stack>
          </Paper>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}

export function RuleEngineBuilderPanel({
  categories,
  transactions,
  onRuleApplied,
  onCategoriesChanged,
}: RuleEngineBuilderPanelProps) {
  const queryClient = useQueryClient();
  const [rulesQuery, patternsQuery] = useSuspenseQueries({
    queries: [ruleEngineQueries.rules(), ruleEngineQueries.patterns()],
  });
  const rules = rulesQuery.data;
  const suggestions = patternsQuery.data;
  const ruleCategoryOptions = useMemo(
    () => categoryOptions(categories),
    [categories],
  );
  const [categoryName, setCategoryName] = useState("");
  const [categoryColor, setCategoryColor] = useState(defaultCategoryColor);
  const [keyword, setKeyword] = useState("");
  const [targetCategory, setTargetCategory] = useState(ruleCategoryOptions[0]?.value ?? "");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showDryRun, setShowDryRun] = useState(false);
  const [dryRunResult, setDryRunResult] = useState<RuleDryRunResult | null>(null);

  const unclassifiedCount = useMemo(
    () => transactions.filter(isUnclassified).length,
    [transactions],
  );
  const selectedCategory = categories.find(
    (category) => String(category.id) === targetCategory,
  );
  const dryRunMatches = dryRunResult?.transactions ?? [];

  const clearPreview = () => {
    setDryRunResult(null);
    setShowDryRun(false);
  };

  const invalidateRuleQueries = async () => {
    await queryClient.invalidateQueries({ queryKey: ruleEngineKeys.all });
  };

  const refreshCategoryList = async () => {
    await onCategoriesChanged?.();
  };

  const dryRunMutation = useMutation({
    mutationFn: dryRunRule,
    onSuccess: (result) => {
      setDryRunResult(result);
      setShowDryRun(true);
    },
  });

  const createRuleMutation = useMutation({
    mutationFn: createRule,
    onSuccess: async () => {
      await invalidateRuleQueries();
      onRuleApplied?.();
      setKeyword("");
      clearPreview();
      toast.success("자동 분류 규칙을 저장하고 일치 내역을 적용했습니다.");
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: deleteRule,
    onSuccess: async (_, variables) => {
      await invalidateRuleQueries();
      if (variables.restoreTransactions) {
        onRuleApplied?.();
      }
      toast.success(
        variables.restoreTransactions
          ? "매핑 규칙을 삭제하고 적용 거래를 미분류로 복원했습니다."
          : "매핑 규칙을 삭제했습니다.",
      );
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: async () => {
      await refreshCategoryList();
      setCategoryName("");
      setCategoryColor(defaultCategoryColor);
      toast.success("카테고리를 추가했습니다.");
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: async (_, categoryId) => {
      const removedCategory = categories.find((category) => category.id === categoryId);
      await refreshCategoryList();
      if (removedCategory && targetCategory === String(removedCategory.id)) {
        setTargetCategory("");
        clearPreview();
      }
      toast.success("카테고리를 삭제했습니다.");
    },
  });

  const analyzePatterns = () => {
    setShowSuggestions(true);
    patternsQuery.refetch();
  };

  const addServerCategory = () => {
    const name = categoryName.trim();
    if (!name) {
      toast.warning("카테고리명을 입력해주세요.");
      return;
    }
    if (categories.some((category) => !category.isDefault && category.name === name)) {
      toast.warning("이미 등록된 카테고리입니다.");
      return;
    }

    createCategoryMutation.mutate({
      name,
      color: toHexColor(categoryColor),
    });
  };

  const confirmDeleteCategory = (categoryToRemove: RuleEngineCategory) => {
    modals.openConfirmModal({
      title: "카테고리 삭제",
      children: (
        <Text size="sm">
          "{categoryToRemove.name}" 카테고리를 삭제할까요?
        </Text>
      ),
      labels: { confirm: "삭제", cancel: "취소" },
      confirmProps: { color: "red" },
      onConfirm: () => deleteCategoryMutation.mutate(categoryToRemove.id),
    });
  };

  const confirmDeleteRule = (rule: {
    id: number;
    keyword: string;
    appliedCount: number;
  }) => {
    let restoreTransactions = false;

    modals.openConfirmModal({
      title: "규칙 삭제",
      children: (
        <Stack gap="sm">
          <Text size="sm">
            "{rule.keyword}" 규칙을 삭제할까요?
          </Text>
          <Checkbox
            label="이 규칙으로 분류된 거래를 미분류 상태로 복원"
            description={`${rule.appliedCount}건의 현재 적용 거래가 대상이 될 수 있습니다.`}
            onChange={(event) => {
              restoreTransactions = event.currentTarget.checked;
            }}
          />
        </Stack>
      ),
      labels: { confirm: "삭제", cancel: "취소" },
      confirmProps: { color: "red" },
      onConfirm: () =>
        deleteRuleMutation.mutate({
          id: rule.id,
          restoreTransactions,
        }),
    });
  };

  const applySuggestion = (suggestion: {
    keyword: string;
    recommendedCategoryId: number;
    recommendedCategoryName: string;
  }) => {
    setKeyword(suggestion.keyword);
    setTargetCategory(String(suggestion.recommendedCategoryId));
    setShowSuggestions(false);
    dryRunMutation.mutate({
      keyword: suggestion.keyword,
      categoryId: suggestion.recommendedCategoryId,
    });
    toast.info("추천 패턴을 규칙 입력값에 반영했습니다.");
  };

  const getSelectedCategoryId = () => {
    if (!selectedCategory) {
      toast.warning("규칙에 사용할 카테고리를 선택해주세요.");
      return null;
    }
    return selectedCategory.id;
  };

  const runDryRun = () => {
    const normalizedKeyword = keyword.trim();
    if (!normalizedKeyword) {
      toast.warning("가맹점 키워드를 입력해주세요.");
      return;
    }

    const categoryId = getSelectedCategoryId();
    if (categoryId == null) return;

    dryRunMutation.mutate({ keyword: normalizedKeyword, categoryId });
  };

  const addRule = () => {
    const normalizedKeyword = keyword.trim();
    if (!normalizedKeyword) {
      toast.warning("가맹점 키워드를 입력해주세요.");
      return;
    }

    const categoryId = getSelectedCategoryId();
    if (categoryId == null) return;

    createRuleMutation.mutate({
      keyword: normalizedKeyword,
      categoryId,
    });
  };

  return (
    <Stack gap="xl" className={styles.page}>
      <section className={styles.intro}>
        <Group justify="space-between" align="flex-end" gap="xl">
          <Stack gap="sm">
            <Text size="xs" fw={800} c="teal.8" tt="uppercase" lts={1}>
              SUPPORTING EXPERIENCE
            </Text>
            <Title order={1}>반복되는 내역을 내 기준으로 정리해요</Title>
            <Text size="sm" c="dimmed" maw={760}>
              카테고리를 정돈하고 자동 분류 규칙을 만들면, 다음 소비 분석에서 더 알아보기 쉬운 기록을 만날 수 있어요.
            </Text>
          </Stack>
          <div className={styles.status} aria-label={`분류가 필요한 내역 ${unclassifiedCount}건`}>
            <span>분류가 필요한 내역</span>
            <strong>{unclassifiedCount}<small>건</small></strong>
            <p>{unclassifiedCount > 0 ? "이용내역에서 이어서 정리할 수 있어요" : "현재 정리할 내역이 없어요"}</p>
          </div>
        </Group>
      </section>

      <div className={styles.grid}>
        <Paper
          withBorder
          p="xl"
          radius="lg"
          className={styles.utilityCard}
        >
        <Stack gap="lg">
          <Stack gap={4}>
            <Title order={3}>01 · 카테고리 관리</Title>
            <Text size="sm" c="dimmed">
              나에게 익숙한 이름과 색상으로 소비를 구분해 보세요.
            </Text>
          </Stack>

          <Paper bg="gray.0" p="md" radius="md" className={styles.categoryForm}>
            <Stack gap="md">
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                <TextInput
                  label="카테고리명"
                  placeholder="예: 식비, 취미"
                  value={categoryName}
                  onChange={(event) => setCategoryName(event.currentTarget.value)}
                />
                <ColorPickerField
                  label="테마 컬러"
                  value={categoryColor}
                  onChange={setCategoryColor}
                  swatches={[
                    "#f97316",
                    "#31e6b8",
                    "#10b981",
                    "#3b82f6",
                    "#ec4899",
                    "#f59e0b",
                  ]}
                />
              </SimpleGrid>
              <Button
                variant="light"
                leftSection={<IconCategoryPlus size={16} />}
                onClick={addServerCategory}
                loading={createCategoryMutation.isPending}
              >
                카테고리 추가
              </Button>
            </Stack>
          </Paper>

          <Stack gap="sm">
            <Text size="sm" fw={700} c="dimmed">
              등록된 카테고리
            </Text>
            <ScrollArea h={348} type="auto">
              <Stack gap="xs">
                {categories.map((category) => (
                  <Paper key={category.id} p="sm" radius="sm" className={styles.categoryRow}>
                    <Group justify="space-between" wrap="nowrap">
                      <Group gap="sm" wrap="nowrap">
                        <ColorSwatch color={category.color} size={14} />
                        <Text fw={800} size="sm">
                          {category.name}
                        </Text>
                        {category.isDefault && (
                          <Badge variant="light" color="gray">
                            기본
                          </Badge>
                        )}
                      </Group>
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        onClick={() => confirmDeleteCategory(category)}
                        aria-label={`${category.name} 삭제`}
                      >
                        <IconMinus size={16} />
                      </ActionIcon>
                    </Group>
                  </Paper>
                ))}
              </Stack>
            </ScrollArea>
          </Stack>
        </Stack>
      </Paper>

        <Paper
          withBorder
          p="xl"
          radius="lg"
          className={styles.utilityCard}
        >
        <Stack gap="lg">
          <Stack gap={4}>
            <Title order={3}>02 · 자동 분류 규칙 만들기</Title>
            <Text size="sm" c="dimmed">
              반복되는 이용내역을 확인하고, 적용 범위를 미리 본 뒤 규칙을 저장할 수 있어요.
            </Text>
          </Stack>

          <Paper p="md" radius="md" className={styles.patternAction}>
            <Group justify="space-between" align="center">
              <Group gap="sm">
                <Stack gap={2}>
                  <Text fw={900}>반복되는 내역 찾기</Text>
                  <Text size="xs" c="dimmed">
                    이용내역에서 반복되는 가맹점과 분류 제안을 살펴봅니다.
                  </Text>
                </Stack>
              </Group>
              <Button
                color="brandMint"
                variant="light"
                leftSection={<IconRefresh size={16} />}
                onClick={analyzePatterns}
                loading={patternsQuery.isFetching}
              >
                제안 살펴보기
              </Button>
            </Group>
          </Paper>

          {showSuggestions && (
            <Stack gap="xs">
              {suggestions.length === 0 ? (
                <Paper withBorder p="md" radius="md">
                  <Text ta="center" c="dimmed">
                    지금은 살펴볼 분류 제안이 없어요.
                  </Text>
                </Paper>
              ) : (
                suggestions.map((suggestion) => (
                  <Paper key={suggestion.keyword} withBorder p="md" radius="md">
                    <Group justify="space-between" align="flex-start">
                      <Stack gap={4}>
                        <Group gap="xs">
                          <Text fw={900}>"{suggestion.keyword}"</Text>
                          <Badge color="brandMint" variant="light">
                            {suggestion.occurrences}건
                          </Badge>
                        </Group>
                        <Text size="xs" c="dimmed">
                          예시: {suggestion.exampleMerchant}
                        </Text>
                        <Group gap="xs">
                          <Text size="xs" c="dimmed" fw={700}>
                            추천 카테고리
                          </Text>
                          <Badge variant="light" color="orange">
                            {suggestion.recommendedCategoryName}
                          </Badge>
                        </Group>
                      </Stack>
                        <Button
                          size="xs"
                          color="brandMint"
                          onClick={() => applySuggestion(suggestion)}
                        >
                          규칙 만들기
                        </Button>
                    </Group>
                  </Paper>
                ))
              )}
            </Stack>
          )}

          <Paper bg="gray.0" p="md" radius="md" className={styles.ruleForm}>
            <Stack gap="md">
              <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
                <TextInput
                  label="가맹점 키워드"
                  placeholder="예: 스타벅스, 쿠팡"
                  value={keyword}
                  onChange={(event) => {
                    setKeyword(event.currentTarget.value);
                    clearPreview();
                  }}
                />
                <NativeSelect
                  label="분류할 카테고리"
                  value={targetCategory}
                  onChange={(event) => {
                    setTargetCategory(event.currentTarget.value);
                    clearPreview();
                  }}
                  data={[{ value: "", label: "카테고리 선택", disabled: true }, ...ruleCategoryOptions]}
                />

              </SimpleGrid>

              <Button
                variant="light"
                color="gray"
                leftSection={<IconSearch size={16} />}
                onClick={runDryRun}
                loading={dryRunMutation.isPending}
              >
                이 규칙이 적용될 내역 미리보기
              </Button>

              {showDryRun && (
                <Paper withBorder p="md" radius="md">
                  <Stack gap="sm">
                    <Group justify="space-between">
                      <Text fw={900}>적용 전 미리보기</Text>
                      <Group gap="xs">
                        <Badge color={dryRunResult?.matchCount ? "brandMint" : "gray"} variant="light">
                          영향 {dryRunResult?.matchCount ?? 0}건
                        </Badge>
                        {dryRunResult && dryRunResult.newlyClassifiedCount > 0 && (
                          <Badge color="blue" variant="light">
                            신규 {dryRunResult.newlyClassifiedCount}건
                          </Badge>
                        )}
                        {dryRunResult?.hasOverrideRisk && (
                          <Badge color="orange" variant="light">
                            기존 분류 변경 {dryRunResult.overrideCount}건
                          </Badge>
                        )}
                      </Group>
                    </Group>
                    {dryRunResult?.hasOverrideRisk && (
                      <Alert
                        color="orange"
                        variant="light"
                        icon={<IconAlertTriangle size={16} />}
                      >
                        이미 분류된 내역이 포함되어 있어요. 미리보기의 기존 분류 변경 건수를 확인해 주세요.
                      </Alert>
                    )}
                    <ScrollArea h={180}>
                      <Table verticalSpacing="xs">
                        <Table.Tbody>
                          {dryRunMatches.length === 0 ? (
                            <Table.Tr>
                              <Table.Td>
                                <Text ta="center" c="dimmed" py="md">
                                  일치하는 거래가 없습니다.
                                </Text>
                              </Table.Td>
                            </Table.Tr>
                          ) : (
                            dryRunMatches.slice(0, 5).map((transaction) => (
                              <Table.Tr key={transaction.id}>
                                <Table.Td>
                                  <Text fw={700}>{transaction.merchant}</Text>
                                  <Group gap="xs">
                                    <Text size="xs" c="dimmed">
                                      {transaction.transactionDate}
                                    </Text>
                                    {transaction.override && (
                                      <Badge size="xs" color="orange" variant="light">
                                        분류 변경
                                      </Badge>
                                    )}
                                    {transaction.newlyClassified && (
                                      <Badge size="xs" color="blue" variant="light">
                                        신규 분류
                                      </Badge>
                                    )}
                                  </Group>
                                </Table.Td>
                                <Table.Td ta="right" fw={700}>
                                  {formatAmount(transaction.amount)}원
                                </Table.Td>
                              </Table.Tr>
                            ))
                          )}
                        </Table.Tbody>
                      </Table>
                    </ScrollArea>
                  </Stack>
                </Paper>
              )}

              <Button
                leftSection={<IconDeviceFloppy size={16} />}
                onClick={addRule}
                loading={createRuleMutation.isPending}
              >
                규칙 저장하고 적용하기
              </Button>
              <Text size="xs" ta="center" c="dimmed">
                미리보기로 영향을 확인한 뒤 등록하는 것을 권장합니다.
              </Text>
            </Stack>
          </Paper>

          <Stack gap="sm" className={styles.savedRules}>
            <Text size="sm" fw={700} c="dimmed">
              03 · 저장된 규칙
            </Text>
            <ScrollArea h={188} type="auto">
              <Table highlightOnHover verticalSpacing="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>가맹점 키워드</Table.Th>
                    <Table.Th>분류 카테고리</Table.Th>
                    <Table.Th ta="right">현재 적용</Table.Th>
                    <Table.Th ta="center">동작</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {rules.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={4}>
                        <Text ta="center" c="dimmed" py="xl">
                          등록된 분류 규칙이 없습니다.
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    rules.map((rule) => (
                      <Table.Tr key={rule.id}>
                        <Table.Td>
                          <Text fw={800}>"{rule.keyword}"</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{rule.categoryName || "미지정"}</Text>
                        </Table.Td>

                        <Table.Td ta="right">
                          <Text size="sm" fw={700} c="teal.8">{rule.appliedCount}건</Text>
                        </Table.Td>
                        <Table.Td ta="center">
                          <ActionIcon
                            variant="subtle"
                            color="gray"
                            loading={deleteRuleMutation.isPending}
                            onClick={() => confirmDeleteRule(rule)}
                            aria-label={`${rule.keyword} 규칙 삭제`}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Table.Td>
                      </Table.Tr>
                    ))
                  )}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          </Stack>
        </Stack>
        </Paper>
      </div>
    </Stack>
  );
}
