import { Alert, Button, Group, Paper, Stack, Text } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { goalLoginPath } from "@/shared/model/goalReturnPath";
import { goalQueries } from "../api/queries";
import { endDate } from "../model/contract";

export interface GoalUploadReceipt { addedCount: number; skippedCount: number }

export function GoalWashingContext({ goalId, userScope, isAuthenticated, receipt, failed }: {
  goalId: string; userScope: string | null; isAuthenticated: boolean; receipt: GoalUploadReceipt | null; failed: boolean;
}) {
  const view = useQuery({ ...goalQueries.view(userScope, goalId), enabled: isAuthenticated });
  const returnTo = `/goals?goalId=${encodeURIComponent(goalId)}`;
  if (!isAuthenticated) return <Alert color="teal" title="이 변화의 내역을 이어서 정리할까요?"><Button component={Link} to={goalLoginPath(`/washing?goalId=${encodeURIComponent(goalId)}&flow=goal-update`)} color="brandMint.8" mt="sm">로그인하고 이어가기</Button></Alert>;
  return <Paper withBorder radius="lg" p="lg" bg="white"><Group justify="space-between" align="flex-start"><Stack gap={5}>
    <Text fw={700}>{view.data ? `${view.data.cycle.categoryLabelSnapshot} 변화 확인을 위한 이용내역` : "변화 확인을 위한 이용내역"}</Text>
    {view.data && <Text size="xs" c="dimmed">{view.data.cycle.start} ~ {endDate(view.data.cycle.endExclusive)} · {view.data.cycle.baseline.snapshot.sourceScope.cardNames.join(", ")}</Text>}
    <Text size="sm" c={failed ? "red" : "dimmed"} role={failed ? "alert" : "status"}>{failed ? "저장하지 못했어요. 내용을 확인한 뒤 다시 저장해 주세요." : receipt ? receipt.addedCount > 0 ? `${receipt.addedCount}건을 저장했어요. 목표 반영 여부는 저장된 내역과 최신 관측값으로 확인합니다.` : "새로 반영할 이용내역이 없어요." : "파일을 올리고 내용을 확인한 뒤 저장해 주세요. 미리보기만으로 변화가 반영되지는 않아요."}</Text>
    {receipt && receipt.skippedCount > 0 && <Text size="xs" c="dimmed">{receipt.skippedCount}건은 중복 또는 저장 조건에 맞지 않아 제외되었어요.</Text>}
    {view.isError && <Text c="orange" size="xs">선택한 목표를 불러오지 못했어요. 목표와 변화에서 다시 확인해 주세요.</Text>}
  </Stack><Button component={Link} to={returnTo} variant="subtle" color="gray" leftSection={<IconArrowLeft size={16} />} vars={() => ({ root: { "--button-hover": "transparent" } })}>목표로 돌아가기</Button></Group></Paper>;
}
