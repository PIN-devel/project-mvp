import { Accordion, Alert, Badge, Button, Checkbox, Group, Modal, Paper, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { IconArrowRight, IconPlus } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router";
import { evaluateGoal, goalKeys, stopGoal } from "../api/queries";
import { changeText, endDate, won } from "../model/contract";
import type { GoalView } from "../model/contract";

const outcomeLabel = { MET: "선택한 소비 상한 안에서 마쳤어요", NOT_MET: "선택한 소비 상한을 넘었어요", UNDETERMINED: "아직 결과를 판단하기 어려워요" };

export function GoalDetail({ goal }: { goal: GoalView }) {
  const { cycle: c, tracking: t, evaluations, nextCycleId } = goal;
  const client = useQueryClient();
  const [confirmed, setConfirmed] = useState(false);
  const [stopOpened, setStopOpened] = useState(false);
  const evaluation = evaluations[0];
  const result = t.phase === "RESULT";
  const ready = t.phase === "READY_TO_REVIEW";
  const stopped = c.lifecycle === "STOPPED";
  const scheduled = c.start > new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
  const actual = result && evaluation ? evaluation.actualAmount : t.actualAmount;
  const change = result && evaluation ? evaluation.observedChange : t.observedChange;
  const washTo = `/washing?goalId=${encodeURIComponent(c.id)}&flow=goal-update`;
  const review = useMutation({ mutationFn: ({ confirm, key }: { confirm: boolean; key: string }) => evaluateGoal(c.id, t.snapshot.dataRevision, confirm, key),
    onSuccess: async () => { setConfirmed(false); await client.invalidateQueries({ queryKey: goalKeys.all }); },
    onError: () => { void client.invalidateQueries({ queryKey: goalKeys.all }); },
  });
  const stop = useMutation({ mutationFn: () => stopGoal(c.id), onSuccess: async () => {
    setStopOpened(false); await client.invalidateQueries({ queryKey: goalKeys.all });
  } });
  const canReview = ready || (result && !stopped && (t.resultChanged || evaluation?.sourceConfirmed === false));
  return <Stack gap="lg">
    <Paper withBorder radius="xl" p={{ base: "xl", md: 36 }} bg="white"><Stack gap="xl">
      <Stack gap="sm">
        <Group justify="space-between"><Badge variant="light" color={result ? "gray" : "teal"}>{stopped ? "멈춘 변화" : result ? t.resultChanged ? "재확인 필요 · 이전 결과" : "결과" : ready ? "결과 확인 준비" : scheduled ? "시작 예정" : "실천 중"}</Badge><Text size="sm" c="dimmed">{c.start} ~ {endDate(c.endExclusive)}</Text></Group>
        <Title order={2}>{stopped ? "잠시 멈춰도, 다음 변화는 시작할 수 있어요" : result ? evaluation ? outcomeLabel[evaluation.outcome] : "이번 변화를 돌아볼까요?" : ready ? "이번 변화를 돌아볼 준비가 되었나요?" : scheduled ? `${c.categoryLabelSnapshot} 소비, 바꿔볼 기준을 세웠어요` : `${c.categoryLabelSnapshot} 소비, 내 기준으로 바꾸고 있어요`}</Title>
        <Text c="dimmed" size="sm">{c.categoryLabelSnapshot} · {c.baseline.snapshot.sourceScope.cardNames.join(", ")}</Text>
      </Stack>
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="xl">
        <Amount label={`기준 소비 · ${c.baseline.snapshot.period.start?.slice(0, 7)}`} value={c.baseline.snapshot.totalAmount} />
        <Amount label="내가 선택한 월 소비 상한" value={c.targetAmount} />
        <Amount label={result && evaluation ? "결과에 기록한 관측 소비" : "현재 관측 소비"} value={actual} emphasized={!result} />
      </SimpleGrid>
      <Stack gap="xs">
        <Text fw={700} fz="lg">{changeText(change)}</Text>
        <Text size="sm" c="dimmed">{result ? "대상 카드에서 확인한 소비 차이예요. 업로드되지 않은 소비나 실제 절감액을 뜻하지 않습니다." : "아직 진행 중인 관측값이에요. 월 전체인 기준 소비와 현재까지 반영한 내역의 차이이며, 최종 결과는 아니에요."}</Text>
        {!result && !ready && <Text size="sm" c="dimmed">새 이용내역을 추가하고 분류하면 현재 변화를 다시 확인할 수 있어요.</Text>}
        {!result && scheduled && <Text size="sm" c="dimmed">{c.start}부터 실천을 시작해요. 실행월의 새 이용내역이 변화의 근거가 됩니다.</Text>}
        {!result && actual === null && <Text size="sm" c="dimmed">실행월이 시작되지 않았거나, 아직 대상 카드 내역이 없어요. 소비가 0원이라고 판단하지 않습니다.</Text>}
      </Stack>
      {!result && !ready && <Button component={Link} to={washTo} color="brandMint.8" size="md" w="fit-content" leftSection={<IconPlus size={18} />}>새 이용내역 추가하기</Button>}
      {result && <Group>
        <Button component={Link} to={nextCycleId ? `/goals?goalId=${nextCycleId}` : `/goals?continueFrom=${c.id}`} variant={canReview ? "subtle" : "filled"} color={canReview ? "gray" : "brandMint.8"} rightSection={<IconArrowRight size={17} />}>{nextCycleId ? "이어가는 목표 확인하기" : "이 목표 이어가기"}</Button>
        <Button component={Link} to="/insights" variant="subtle" color="gray">다시 분석하기</Button>
      </Group>}
    </Stack></Paper>
    {t.baselineChanged && <Alert color="orange" title="기준 내역이 변경되었어요">시작할 때 확인한 기준 소비는 보존했어요. 수정된 내역과 같은 기준이라고 확정할 수 없어 이번 결과의 달성 여부는 판단하지 않습니다. 새 분석에서 다음 기준을 선택해 주세요.</Alert>}
    {t.sourceRisk && <Alert color="orange" title="정리가 필요한 내역이 있어요"><Stack gap="sm"><Text size="sm">대상 카드의 미분류 내역이나 상태, 소비 영역을 먼저 확인해 주세요. 정리 전에는 결과를 확정하지 않아요.</Text><Button component={Link} to={washTo} variant="subtle" color="gray" w="fit-content">이용내역 정리하기</Button></Stack></Alert>}
    {canReview && <Paper withBorder radius="lg" p="xl"><Stack gap="md">
      <Title order={3}>{t.resultChanged ? "새로 반영된 내역으로 결과를 다시 확인할까요?" : ready ? "대상 기간의 내역을 모두 반영했나요?" : "내역을 확인하고 결과를 다시 볼까요?"}</Title>
      <Text size="sm" c="dimmed">기간이 끝나도 자동으로 성공 처리하지 않아요. {c.start} ~ {endDate(c.endExclusive)}의 대상 카드 내역을 확인해 주세요.{t.resultChanged && " 이전 결과는 보존하고 새 확인 기록을 추가합니다."}</Text>
      <Checkbox color="teal" checked={confirmed} disabled={review.isPending} onChange={(e) => setConfirmed(e.currentTarget.checked)} label="대상 카드·기간의 이용내역을 모두 반영했어요. 소비 내역이 없는 경우도 확인했어요." />
      {review.isError && <Text c="red" size="sm" role="alert">결과를 확인하지 못했어요. 최신 내역을 불러온 뒤 다시 확인해 주세요.</Text>}
      <Group>
        <Button color="brandMint.8" disabled={!confirmed} loading={review.isPending} onClick={() => review.mutate({ confirm: true, key: crypto.randomUUID() })}>확인한 내역으로 결과 보기</Button>
        <Button component={Link} to={washTo} variant="subtle" color="gray">새 이용내역 추가하기</Button>
        {ready && <Button variant="subtle" color="gray" disabled={review.isPending} onClick={() => review.mutate({ confirm: false, key: crypto.randomUUID() })}>자료가 부족한 상태로 기록하기</Button>}
      </Group>
    </Stack></Paper>}
    <Accordion variant="separated" radius="lg">
      <Accordion.Item value="basis"><Accordion.Control>선택한 변화와 기준 내역</Accordion.Control><Accordion.Panel><Stack gap="sm">
        <Text size="sm">{c.rationale}</Text><Text size="sm" c="dimmed">기준 기간 {c.baseline.snapshot.period.start} ~ {endDate(c.baseline.snapshot.period.endExclusive!)} · {c.baseline.snapshot.transactionCount}건</Text>
        <Text size="xs" c="dimmed">기준 소비와 목표는 시작 시점에 고정됩니다. {c.previousCycleId ? "이전 Cycle에서 이어온 새로운 목표예요." : "분석에서 선택한 변화 후보를 바탕으로 시작했어요."}</Text>
        {c.previousCycleId && <Button component={Link} to={`/goals?goalId=${c.previousCycleId}`} variant="subtle" color="gray" w="fit-content">이전 결과 보기</Button>}
        {c.lifecycle === "OPEN" && <Button variant="subtle" color="gray" w="fit-content" onClick={() => setStopOpened(true)}>이번 변화 멈추기</Button>}
      </Stack></Accordion.Panel></Accordion.Item>
      {evaluations.length > 0 && <Accordion.Item value="history"><Accordion.Control>결과 확인 기록 · {evaluations.length}회</Accordion.Control><Accordion.Panel><Stack gap="lg">{evaluations.map((e) => <Stack key={e.id} gap={4}><Text size="sm" fw={700}>{outcomeLabel[e.outcome]}</Text><Text size="sm">관측 소비 {e.actualAmount === null ? "미확인" : won(e.actualAmount)} · {changeText(e.observedChange)}</Text><Text size="xs" c="dimmed">{new Date(e.evaluatedAt).toLocaleString("ko-KR")} · {e.sourceConfirmed ? "대상 내역 반영 확인" : "자료 완결성 미확인"}</Text></Stack>)}</Stack></Accordion.Panel></Accordion.Item>}
    </Accordion>
    <Modal opened={stopOpened} onClose={() => setStopOpened(false)} title="이번 변화를 멈출까요?" centered><Stack><Text size="sm">기준 소비와 목표는 기록으로 남아요. 달성 여부를 평가하지 않고, 다음 변화는 새 Cycle로 시작할 수 있어요.</Text>{stop.isError && <Text c="red" size="sm">멈추지 못했어요. 다시 시도해 주세요.</Text>}<Group justify="flex-end"><Button variant="subtle" color="gray" onClick={() => setStopOpened(false)}>계속 실천하기</Button><Button color="gray" loading={stop.isPending} onClick={() => stop.mutate()}>기록을 남기고 멈추기</Button></Group></Stack></Modal>
  </Stack>;
}

function Amount({ label, value, emphasized = false }: { label: string; value: number | null; emphasized?: boolean }) {
  return <Stack gap={6}><Text size="xs" c="dimmed">{label}</Text><Text fz={{ base: 25, md: 30 }} fw={800} c={emphasized ? "brandMint.8" : undefined}>{value === null ? "아직 내역 없음" : won(value)}</Text></Stack>;
}
