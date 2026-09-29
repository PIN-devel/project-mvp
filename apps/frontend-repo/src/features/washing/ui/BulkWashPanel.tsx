import {
  Badge,
  Button,
  Checkbox,
  Group,
  Modal,
  NativeSelect,
  Paper,
  ScrollArea,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Form, useActionData, useNavigation, useSubmit } from "react-router";
import { toast } from "@/shared/ui/toast";
import { washingQueries } from "@/features/washing/api/queries";
import styles from "@/features/washing/ui/FirstExperience.module.css";
import type { ActionResult } from "@/features/washing/model/types";
import {
  formatAmount,
  getUnclassifiedTransactions,
} from "@/features/washing/model/core";
import type {
  CategoryDto,
  WashingOverview,
  WashingTransaction,
} from "@/features/washing/model/types";

interface BulkWashPanelProps {
  overview: WashingOverview;
}

const buildCategoryOptionValue = (
  categoryName: string,
  categories: CategoryDto[],
) => {
  const matched = categories.find((category) => category.name === categoryName);
  return matched ? `${matched.id}:${matched.name}` : `0:${categoryName}`;
};

type SelectedIdsAction =
  | { type: "replace"; ids: number[] }
  | { type: "toggle"; id: number; checked: boolean }
  | { type: "clear" };

const selectedIdsReducer = (
  current: number[],
  action: SelectedIdsAction,
) => {
  switch (action.type) {
    case "replace":
      return action.ids;
    case "toggle":
      return action.checked
        ? [...new Set([...current, action.id])]
        : current.filter((currentId) => currentId !== action.id);
    case "clear":
      return [];
  }
};

const detailTransactionReducer = (
  _current: WashingTransaction | null,
  nextTransaction: WashingTransaction | null,
) => nextTransaction;

export function BulkWashPanel({ overview }: BulkWashPanelProps) {
  const { data: categories } = useSuspenseQuery(washingQueries.categories());
  const categoryNames = useMemo(
    () => categories.map((category) => category.name),
    [categories],
  );
  const submit = useSubmit();
  const navigation = useNavigation();
  const actionData = useActionData<ActionResult>();
  const seenAction = useRef<unknown>(null);
  const detailSubmitIdRef = useRef<number | null>(null);

  const unclassifiedTransactions = getUnclassifiedTransactions(
    overview.transactions,
  );
  const [selectedIds, updateSelectedIds] = useReducer(selectedIdsReducer, []);
  const [selectedCategory, setSelectedCategory] = useState(
    categories[0] ? `${categories[0].id}:${categories[0].name}` : "",
  );
  const [detailTransaction, updateDetailTransaction] = useReducer(
    detailTransactionReducer,
    null,
  );
  const [detailCategory, setDetailCategory] = useState(
    categoryNames[0]
      ? buildCategoryOptionValue(categoryNames[0], categories)
      : "",
  );

  const bulkCategoryOptions = categories.map((category) => ({
    value: `${category.id}:${category.name}`,
    label: category.name,
  }));
  const selectedCategoryValue =
    selectedCategory &&
    bulkCategoryOptions.some((option) => option.value === selectedCategory)
      ? selectedCategory
      : (bulkCategoryOptions[0]?.value ?? "");
  const defaultDetailCategory = detailTransaction
    ? buildCategoryOptionValue(
      detailTransaction.category ?? categoryNames[0] ?? "",
      categories,
    )
    : "";
  const detailCategoryValue = detailCategory || defaultDetailCategory;
  const detailCategoryOptions = categories.map((category) => ({
    value: `${category.id}:${category.name}`,
    label: category.name,
  }));
  if (
    detailCategoryValue &&
    !detailCategoryOptions.some((option) => option.value === detailCategoryValue)
  ) {
    detailCategoryOptions.push({
      value: detailCategoryValue,
      label: detailCategoryValue.split(":").slice(1).join(":") || "미분류",
    });
  }

  useEffect(() => {
    if (!actionData || actionData === seenAction.current) return;
    seenAction.current = actionData;

    if (actionData.intent === "bulk_wash") {
      if (actionData.error) {
        toast.error("선택한 내역을 분류하지 못했어요.");
      } else {
        toast.success(`${actionData.count}건을 분류했어요.`);
        updateSelectedIds({ type: "clear" });
      }
      return;
    }

    if (
      actionData.intent === "update_category" &&
      detailSubmitIdRef.current != null
    ) {
      if (!actionData.error) {
        updateDetailTransaction(null);
      }
      detailSubmitIdRef.current = null;
    }
  }, [actionData]);

  const validSelectedIds = selectedIds.filter((id) =>
    unclassifiedTransactions.some((transaction) => transaction.id === id),
  );
  const selectedCount = validSelectedIds.length;
  const isSubmitting =
    navigation.state === "submitting" &&
    navigation.formData?.get("intent") === "bulk_wash";
  const isDetailSubmitting =
    navigation.state === "submitting" &&
    navigation.formData?.get("intent") === "update_category" &&
    navigation.formData?.get("origin") === "bulk-detail";

  const toggleAll = (checked: boolean) => {
    updateSelectedIds({
      type: "replace",
      ids: checked
        ? unclassifiedTransactions.map((transaction) => transaction.id)
        : [],
    });
  };

  const toggleSingle = (id: number, checked: boolean) => {
    updateSelectedIds({ type: "toggle", id, checked });
  };

  const handleBulkWash = () => {
    if (validSelectedIds.length === 0 || selectedCategoryValue === "") {
      return;
    }

    const formData = new FormData();
    formData.append("intent", "bulk_wash");
    formData.append("ids", validSelectedIds.join(","));
    formData.append("category", selectedCategoryValue);
    submit(formData, { method: "post" });
  };

  const openDetailModal = (transaction: WashingTransaction) => {
    updateDetailTransaction(transaction);
    setDetailCategory(
      buildCategoryOptionValue(
        transaction.category ?? categoryNames[0] ?? "",
        categories,
      ),
    );
  };

  return (
    <>
      <Modal
        opened={detailTransaction != null}
        onClose={() => {
          if (isDetailSubmitting) return;
          updateDetailTransaction(null);
        }}
        title="미분류 내역 상세"
        centered
      >
        {detailTransaction && (
          <Form
            method="post"
            onSubmit={() => {
              detailSubmitIdRef.current = detailTransaction.id;
              updateDetailTransaction(null);
            }}
          >
            <input type="hidden" name="intent" value="update_category" />
            <input type="hidden" name="origin" value="bulk-detail" />
            <input type="hidden" name="id" value={detailTransaction.id} />
            <input type="hidden" name="tag" value={detailTransaction.tag} />
            <Stack gap="md">
            <Stack gap={6}>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">
                  사용 일자
                </Text>
                <Text size="sm">{detailTransaction.occurredAt}</Text>
              </Group>
              <Group justify="space-between" align="flex-start">
                <Text size="sm" c="dimmed">
                  가맹점
                </Text>
                <Text size="sm" fw={600} ta="right">
                  {detailTransaction.merchantName}
                </Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">
                  카드
                </Text>
                <Text size="sm">{detailTransaction.cardLabel}</Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">
                  금액
                </Text>
                <Text size="sm" fw={700}>
                  {formatAmount(detailTransaction.amount)}원
                </Text>
              </Group>
              <Stack gap={4}>
                <Text size="sm" c="dimmed">
                  태그/메모
                </Text>
                <Text size="sm">{detailTransaction.description || "-"}</Text>
              </Stack>
            </Stack>

            <NativeSelect
              label="카테고리"
              name="category"
              value={detailCategoryValue}
              onChange={(event) => setDetailCategory(event.currentTarget.value)}
              data={detailCategoryOptions}
            />

            <Group justify="flex-end">
              <Button
                variant="default"
                onClick={() => updateDetailTransaction(null)}
                disabled={isDetailSubmitting}
              >
                취소
              </Button>
              <Button
                leftSection={<IconCheck size={16} />}
                type="submit"
                loading={isDetailSubmitting}
                disabled={detailCategoryValue === ""}
              >
                저장
              </Button>
            </Group>
            </Stack>
          </Form>
        )}
      </Modal>

      <Paper withBorder p="xl" radius="lg" className={styles.workSurface}>
        <Stack gap="lg">
          <Group justify="space-between" align="flex-start">
            <Stack gap={6}>
              <Title order={3}>정리할 내역</Title>
              <Text size="sm" c="dimmed">
                같은 카테고리의 내역을 골라 한 번에 정리하거나 개별 내역을 분류하세요.
              </Text>
            </Stack>
            <Badge color="brandMint" variant="light" size="lg">
              미분류 {unclassifiedTransactions.length}건
            </Badge>
          </Group>

          <ScrollArea h={320} type="auto">
            <Table highlightOnHover verticalSpacing="sm" horizontalSpacing="md">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th w={48} ta="center">
                    <Checkbox
                      checked={
                        unclassifiedTransactions.length > 0 &&
                        selectedCount === unclassifiedTransactions.length
                      }
                      indeterminate={
                        selectedCount > 0 &&
                        selectedCount < unclassifiedTransactions.length
                      }
                      onChange={(event) => toggleAll(event.currentTarget.checked)}
                      aria-label="전체 선택"
                    />
                  </Table.Th>
                  <Table.Th>사용 일자</Table.Th>
                  <Table.Th>가맹점</Table.Th>
                  <Table.Th>카드</Table.Th>
                  <Table.Th ta="right">금액</Table.Th>
                  <Table.Th>기존 태그</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {unclassifiedTransactions.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={6}>
                      <Text ta="center" c="dimmed" py="xl">
                        현재 미분류 내역이 없습니다.
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  unclassifiedTransactions.map((transaction) => (
                    <Table.Tr
                      key={transaction.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => openDetailModal(transaction)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          openDetailModal(transaction);
                        }
                      }}
                    >
                      <Table.Td
                        ta="center"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <Checkbox
                          checked={validSelectedIds.includes(transaction.id)}
                          onChange={(event) =>
                            toggleSingle(
                              transaction.id,
                              event.currentTarget.checked,
                            )
                          }
                          aria-label={`${transaction.merchantName} 선택`}
                        />
                      </Table.Td>
                      <Table.Td>{transaction.occurredAt.slice(0, 10)}</Table.Td>
                      <Table.Td>
                        <Text fw={600}>{transaction.merchantName}</Text>
                      </Table.Td>
                      <Table.Td>{transaction.cardLabel}</Table.Td>
                      <Table.Td ta="right" fw={700}>
                        {formatAmount(transaction.amount)}원
                      </Table.Td>
                      <Table.Td>
                        <Badge color="gray" variant="light">
                          미분류
                        </Badge>
                      </Table.Td>
                    </Table.Tr>
                  ))
                )}
              </Table.Tbody>
            </Table>
          </ScrollArea>

          <Group justify="space-between" align="flex-end">
            <Text size="sm" c="dimmed">
              선택 항목{" "}
              <Text
                component="span"
                inherit
                fw={700}
                c="#006B56"
              >
                {selectedCount}건
              </Text>
            </Text>
            <Group align="flex-end">
              <NativeSelect
                label="분류할 카테고리"
                value={selectedCategoryValue}
                onChange={(event) => setSelectedCategory(event.currentTarget.value)}
                data={bulkCategoryOptions}
              />
              <Button
                leftSection={<IconCheck size={16} />}
                onClick={handleBulkWash}
                disabled={selectedCount === 0 || selectedCategoryValue === ""}
                loading={isSubmitting}
              >
                선택한 내역 분류하기
              </Button>
            </Group>
          </Group>
        </Stack>
      </Paper>
    </>
  );
}
