import {
  Badge,
  Button,
  Group,
  NativeSelect,
  Pagination,
  Paper,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconArrowsSort, IconSortAscending, IconSortDescending, IconFileSpreadsheet, IconSearch } from "@tabler/icons-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Form, Link, useActionData, useNavigation, useSearchParams, useSubmit } from "react-router";
import { toast } from "@/shared/ui/toast";
import type { ActionResult } from "@/features/washing/model/types";
import { useSuspenseQueries } from "@tanstack/react-query";
import { washingQueries } from "@/features/washing/api/queries";
import styles from "@/features/washing/ui/FirstExperience.module.css";
import {
  DEFAULT_WASHING_FILTERS,
  formatAmount,
  isTransactionClassified,
} from "@/features/washing/model/core";
import type {
  CategoryDto,
  TransactionDto,
  WashingFilters,
} from "@/features/washing/model/types";

const categorySelectData = (categories: CategoryDto[]) => [
  { value: "all", label: "전체 카테고리" },
  { value: "unclassified", label: "미분류" },
  ...categories.map((cat) => ({ value: String(cat.id), label: `${cat.name} (${cat.isDefault ? "기본" : "내 카테고리"})` })),
];

const buildCategoryValue = (tx: TransactionDto, categories: CategoryDto[]) => {
  const categoryId = tx.foundation?.categoryId;
  return categoryId != null && categories.some((category) => category.id === categoryId) ? String(categoryId) : "";
};

const buildCategoryOptions = (_tx: TransactionDto, categories: CategoryDto[]) => [
  { value: "", label: "미분류" },
  ...categories.map((cat) => ({ value: String(cat.id), label: `${cat.name} (${cat.isDefault ? "기본" : "내 카테고리"})` })),
];

const filterLedgerTransactions = (
  transactions: TransactionDto[],
  filters: WashingFilters,
) =>
  transactions.filter((tx) => {
    const keyword = filters.merchantKeyword.trim().toLowerCase();
    const matchesMerchant =
      keyword === "" ||
      tx.merchant.toLowerCase().includes(keyword);

    const classified = isTransactionClassified(tx);
    const matchesCategory =
      filters.category === "all" ||
      (filters.category === "unclassified"
        ? !classified
        : String(tx.foundation?.categoryId) === filters.category);

    const matchesStatus =
      filters.status === "all" ||
      (filters.status === "classified" && classified) ||
      (filters.status === "unclassified" && !classified);

    return matchesMerchant && matchesCategory && matchesStatus;
  });

type SortField = "transactionDate" | "amount";
type SortDir = "asc" | "desc";

interface SourceDataManagementPanelProps {
  onOpenUpload: () => void;
}

export function SourceDataManagementPanel({ onOpenUpload }: SourceDataManagementPanelProps) {
  const [params] = useSearchParams();
  const goalContext = params.get("flow") === "goal-update" && params.get("goalId")
    ? `?${new URLSearchParams({ goalId: params.get("goalId")!, flow: "goal-update" })}` : "";
  const [{ data: transactions }, { data: categories }] = useSuspenseQueries({
    queries: [washingQueries.transactions(), washingQueries.categories()],
  });
  const submit = useSubmit();
  const navigation = useNavigation();
  const [filters, setFilters] = useState(DEFAULT_WASHING_FILTERS);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField | null>("transactionDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
    setCurrentPage(1);
  };

  const PAGE_SIZE = 10;
  const filteredTransactions = filterLedgerTransactions(transactions, filters);
  const sortedTransactions = sortField
    ? [...filteredTransactions].sort((a, b) => {
      const mul = sortDir === "asc" ? 1 : -1;
      if (sortField === "transactionDate") return a.transactionDate.localeCompare(b.transactionDate) * mul;
      return (a.amount - b.amount) * mul;
    })
    : filteredTransactions;
  const totalPages = Math.max(1, Math.ceil(sortedTransactions.length / PAGE_SIZE));
  const paginatedTransactions = sortedTransactions.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const updateFilters = (updater: (prev: typeof filters) => typeof filters) => {
    setFilters(updater);
    setCurrentPage(1);
  };

  const isCategoryUpdateSubmitting = (txId: number) =>
    navigation.state === "submitting" &&
    navigation.formData?.get("intent") === "update_category" &&
    navigation.formData?.get("id") === String(txId);

  const isDeleteSubmitting = (txId: number) =>
    navigation.state === "submitting" &&
    navigation.formData?.get("intent") === "delete_transaction" &&
    navigation.formData?.get("id") === String(txId);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_WASHING_FILTERS);
    setCurrentPage(1);
    setSortField("transactionDate");
    setSortDir("desc");
  }, []);

  const actionData = useActionData<ActionResult>();
  const seenAction = useRef<unknown>(null);

  useEffect(() => {
    if (!actionData || actionData === seenAction.current) return;
    seenAction.current = actionData;

    if (actionData.intent === "update_category") {
      if (actionData.error) {
        toast.error("카테고리 저장에 실패했습니다.");
      } else {
        toast.success("카테고리가 저장됐습니다.");
      }
    }

    if (actionData.intent === "delete_transaction") {
      if (actionData.error) {
        toast.error("이용내역 삭제에 실패했습니다.");
      } else {
        toast.success("이용내역이 삭제됐습니다.");
        window.setTimeout(resetFilters, 0);
      }
    }
  }, [actionData, resetFilters]);

  return (
    <>
      <Paper withBorder p="xl" radius="lg" className={styles.workSurface}>
        <Stack gap="lg">
          <Stack gap={4}>
            <Group justify="space-between" wrap="nowrap">
              <Title order={3}>전체 이용내역</Title>
              <Group gap="xs" wrap="nowrap">
                <Button
                  variant="light"
                  color="brandMint"
                  leftSection={<IconFileSpreadsheet size={16} />}
                  onClick={onOpenUpload}
                >
                  Excel 추가
                </Button>
              </Group>
            </Group>
            <Text size="sm" c="dimmed">
              카드사에서 내려받은 Excel 이용내역을 직접 가져오세요.
            </Text>
          </Stack>

          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
            <TextInput
              label="가맹점 검색"
              placeholder="가맹점 검색"
              leftSection={<IconSearch size={14} />}
              value={filters.merchantKeyword}
              onChange={(event) => {
                const value = event.currentTarget.value;
                updateFilters((current) => ({ ...current, merchantKeyword: value }));
              }}
            />
            <NativeSelect
              label="카테고리 필터"
              value={filters.category}
              onChange={(event) => {
                const value = event.currentTarget.value;
                updateFilters((current) => ({ ...current, category: value }));
              }}
              data={categorySelectData(categories)}
            />
            <NativeSelect
              label="분류 상태"
              value={filters.status}
              onChange={(event) => {
                const value = event.currentTarget.value as "all" | "classified" | "unclassified";
                updateFilters((current) => ({ ...current, status: value }));
              }}
              data={[
                { value: "all", label: "전체 상태" },
                { value: "classified", label: "분류 완료" },
                { value: "unclassified", label: "미분류" },
              ]}
            />
          </SimpleGrid>

          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              {sortedTransactions.length === 0
                ? "총 0건"
                : `총 ${sortedTransactions.length}건 중 ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, sortedTransactions.length)}건 표시`}
            </Text>
            <Button variant="light" color="gray" onClick={resetFilters}>
              필터 초기화
            </Button>
          </Group>

          <Table.ScrollContainer minWidth={1120}>
            <Table
              highlightOnHover
              verticalSpacing="sm"
              horizontalSpacing="md"
              layout="fixed"
              style={{ whiteSpace: "nowrap" }}
            >
              <Table.Thead>
                <Table.Tr>
                  <Table.Th w={130} onClick={() => handleSort("transactionDate")}>
                    <Group component="span" gap={4} align="center" wrap="nowrap">
                      일자
                      {sortField === "transactionDate" ? (
                        sortDir === "asc" ? <IconSortAscending size={14} /> : <IconSortDescending size={14} />
                      ) : (
                        <IconArrowsSort size={14} color="var(--mantine-color-dimmed)" />
                      )}
                    </Group>
                  </Table.Th>
                  <Table.Th>가맹점명</Table.Th>
                  <Table.Th w={120}>카드사</Table.Th>
                  <Table.Th w={160}>카테고리</Table.Th>
                  <Table.Th w={160} ta="right" onClick={() => handleSort("amount")}>
                    <Group component="span" w="100%" gap={4} align="center" justify="flex-end" wrap="nowrap">
                      {sortField === "amount" ? (
                        sortDir === "asc" ? <IconSortAscending size={14} /> : <IconSortDescending size={14} />
                      ) : (
                        <IconArrowsSort size={14} color="var(--mantine-color-dimmed)" />
                      )}
                      금액
                    </Group>
                  </Table.Th>
                  <Table.Th w={160}>정리 상태</Table.Th>
                  <Table.Th w={150}>동작</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredTransactions.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={7}>
                      <Text ta="center" c="dimmed" py="xl">
                        조건에 맞는 이용내역이 없습니다.
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  paginatedTransactions.map((tx) => (
                    <Table.Tr key={tx.id}>
                      <Table.Td>{tx.transactionDate}</Table.Td>
                      <Table.Td>
                        <Text fw={600} truncate title={tx.merchant}>{tx.merchant}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text truncate title={tx.cardName}>{tx.cardName}</Text>
                      </Table.Td>
                      <Table.Td>
                        <NativeSelect
                          form={`category-form-${tx.id}`}
                          key={`${tx.id}-${tx.categoryId ?? ""}-${tx.categoryName ?? ""}`}
                          name="category"
                          aria-label={`${tx.merchant} 카테고리`}
                          defaultValue={buildCategoryValue(tx, categories)}
                          data={buildCategoryOptions(tx, categories)}
                        />
                      </Table.Td>
                      <Table.Td ta="right" fw={700}>
                        {formatAmount(tx.amount)}원
                      </Table.Td>
                      <Table.Td>
                        <Stack gap={4}>
                          <Badge color={isTransactionClassified(tx) ? "teal" : !tx.foundation || tx.foundation.classification === "INCONSISTENT" ? "orange" : "gray"} variant="light">
                            {(!tx.foundation || tx.foundation.classification === "INCONSISTENT") ? "분류 확인 필요" : isTransactionClassified(tx) ? "분류 완료" : "미분류"}
                          </Badge>
                          {tx.foundation?.appliedRuleId != null && <Text component={Link} to={`/washing/rules${goalContext}`} size="xs" c="teal.8">규칙 #{tx.foundation.appliedRuleId}</Text>}
                          <Text size="xs" c="dimmed">{(tx.foundation?.canonicalStatus ?? "UNKNOWN") === "UNKNOWN" ? `승인 상태 확인 필요 (${tx.status || "값 없음"})` : tx.status}</Text>
                        </Stack>
                      </Table.Td>
                      <Table.Td>
                        <Group wrap="nowrap" gap="xs">
                          <Form method="post" id={`category-form-${tx.id}`}>
                            <input type="hidden" name="intent" value="update_category" />
                            <input type="hidden" name="id" value={tx.id} />
                            <Button type="submit" size="xs" loading={isCategoryUpdateSubmitting(tx.id)}>
                              저장
                            </Button>
                          </Form>
                          <Button
                            size="xs"
                            color="red"
                            variant="light"
                            loading={isDeleteSubmitting(tx.id)}
                            onClick={() =>
                              modals.openConfirmModal({
                                title: "이용내역 삭제",
                                children: (
                                  <Stack gap="xs">
                                    <Text size="sm">아래 항목을 삭제하시겠습니까?</Text>
                                    <Stack gap={4}>
                                      <Group justify="space-between">
                                        <Text size="sm" c="dimmed">일자</Text>
                                        <Text size="sm">{tx.transactionDate}</Text>
                                      </Group>
                                      <Group justify="space-between">
                                        <Text size="sm" c="dimmed">가맹점</Text>
                                        <Text size="sm" fw={600}>{tx.merchant}</Text>
                                      </Group>
                                      <Group justify="space-between">
                                        <Text size="sm" c="dimmed">카드사</Text>
                                        <Text size="sm">{tx.cardName}</Text>
                                      </Group>
                                      <Group justify="space-between">
                                        <Text size="sm" c="dimmed">금액</Text>
                                        <Text size="sm" fw={600}>{formatAmount(tx.amount)}원</Text>
                                      </Group>
                                    </Stack>
                                  </Stack>
                                ),
                                labels: { confirm: "삭제", cancel: "취소" },
                                confirmProps: { color: "red" },
                                onConfirm: () => {
                                  const formData = new FormData();
                                  formData.append("intent", "delete_transaction");
                                  formData.append("id", String(tx.id));
                                  submit(formData, { method: "post" });
                                },
                              })
                            }
                          >
                            삭제
                          </Button>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))
                )}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>

          {totalPages > 1 && (
            <Group justify="center">
              <Pagination
                total={totalPages}
                value={currentPage}
                onChange={setCurrentPage}
                size="sm"
              />
            </Group>
          )}
        </Stack>
      </Paper>
    </>
  );
}
