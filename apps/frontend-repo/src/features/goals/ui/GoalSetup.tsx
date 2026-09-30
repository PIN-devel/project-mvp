import { journeyPrimaryProps } from "@/shared/ui/journeyActions";
import { Alert, Button, Checkbox, Divider, Group, NumberInput, Paper, Select, SimpleGrid, Stack, Text, TextInput, Title, useMantineTheme } from "@mantine/core";
import { IconAlertTriangle, IconArrowRight } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { createGoal, goalKeys, goalQueries } from "../api/queries";
import { endDate, reasonText, won } from "../model/contract";
import type { GoalPreparation } from "../model/contract";

export function GoalSetup({ userScope, runId, opportunityId, previousId }: { userScope: string | null; runId: string; opportunityId: string; previousId: string }) {
  const [month, setMonth] = useState<string | null>(null);
  const prepared = useQuery(goalQueries.prepare(userScope, runId, opportunityId, previousId, month));
  if (prepared.isPending) return <Paper withBorder p="xl" radius="lg"><Text role="status">선택한 변화의 기준 소비를 확인하고 있어요.</Text></Paper>;
  if (prepared.isError) return <Alert color="orange" title="변화의 근거를 확인하지 못했어요"><Stack gap="sm"><Text size="sm">다시 시도하거나 소비 분석에서 새로운 변화를 골라주세요.</Text><Group><Button variant="subtle" color="gray" onClick={() => { if (month !== null) setMonth(null); else void prepared.refetch(); }}>다시 확인하기</Button><Button component={Link} to="/insights" variant="subtle" color="teal">소비 분석하기</Button></Group></Stack></Alert>;
  return <GoalSetupForm key={`${prepared.data.baselineMonth}:${prepared.data.baselineSnapshot.dataRevision}`} preparation={prepared.data} onMonth={setMonth} userScope={userScope} />;
}

function GoalSetupForm({ preparation: p, onMonth, userScope }: { preparation: GoalPreparation; onMonth: (value: string) => void; userScope: string | null }) {
  const theme = useMantineTheme();
  const navigate = useNavigate(); const client = useQueryClient();
  const [target, setTarget] = useState<string | number>("");
  const [execution, setExecution] = useState(p.earliestExecutionMonth);
  const [confirmed, setConfirmed] = useState(false);
  const [key] = useState(() => crypto.randomUUID());
  const baselineInput = useRef<HTMLInputElement>(null);
  const mutation = useMutation({ mutationFn: createGoal, onSuccess: async (goal) => {
    client.setQueryData(goalKeys.view(userScope, goal.cycle.id), goal);
    await client.invalidateQueries({ queryKey: goalKeys.all });
    navigate(`/goals?goalId=${goal.cycle.id}`, { replace: true });
  }, onError: () => { void client.invalidateQueries({ queryKey: goalKeys.all }); } });
  const baseline = p.baselineSnapshot.totalAmount;
  const validTarget = typeof target === "number" && Number.isSafeInteger(target) && target >= 0 && target < baseline;
  const validMonth = /^\d{4}-\d{2}$/.test(execution) && execution >= p.earliestExecutionMonth;
  const needsGoal = p.reasons.some((reason) => reason === "OPEN_GOAL_EXISTS" || reason === "NEXT_CYCLE_EXISTS");
  const needsRecords = p.reasons.some((reason) => reason === "UNRESOLVED_RECORDS" || reason === "SOURCE_SCOPE_UNAVAILABLE");
  const needsAnalysis = p.reasons.some((reason) => reason === "STALE_OPPORTUNITY" || reason === "CATEGORY_UNAVAILABLE");
  const resolution = needsGoal ? { to: "/goals", label: "현재 목표 확인하기" }
    : needsRecords ? { to: "/washing", label: "이용내역 정리하기" }
    : needsAnalysis ? { to: "/insights", label: "다시 분석하기" }
    : p.reasons.includes("NO_BASELINE_SPENDING") ? { to: null, label: "기준월 다시 선택하기" }
    : { to: "/washing", label: "기준 내역 확인하기" };
  const alternatives = [
    { to: "/goals", label: "현재 목표 확인하기" },
    { to: "/washing", label: "이용내역 정리하기" },
    { to: "/insights", label: "다시 분석하기" },
  ].filter((action) => action.to !== resolution.to);
  return <Stack gap="lg">
    <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
      <Paper radius="xl" p={{ base: "xl", md: 36 }} bg={theme.other.brand.deepNavy} c="white"><Stack gap="lg">
        <Text size="xs" c="gray.4" fw={700}>CHOOSE A CHANGE</Text><Title order={2} c="white">{p.categoryLabel} 소비에<br />내 기준을 세워볼까요?</Title>
        <Text size="sm" c="gray.3" lh={1.7}>{p.rationale}</Text>
        <Stack gap={5}><Text size="xs" c="gray.4">기준 소비 · {p.baselineMonth}</Text><Text fz={36} fw={800}>{won(baseline)}</Text><Text size="xs" c="gray.4">{p.baselineSnapshot.transactionCount}건 · {p.baselineSnapshot.sourceScope.cardNames.join(", ")}</Text></Stack>
        <Text size="xs" c="gray.4">AI가 목표 금액을 정하지 않아요. 실제 기준 소비를 확인하고 나에게 맞는 소비 상한을 직접 선택하세요.</Text>
      </Stack></Paper>
      <Paper withBorder radius="xl" p={{ base: "xl", md: 36 }} bg="white"><Stack gap="lg">
        <Title order={3}>{p.previousCycleId ? "같은 변화, 새로운 Cycle" : "내가 선택할 변화"}</Title>
        <Select ref={baselineInput} label="어느 달을 기준으로 볼까요?" data={[...new Set([p.baselineMonth, ...p.availableBaselineMonths])]} value={p.baselineMonth} onChange={(value) => { if (value) onMonth(value); }} disabled={mutation.isPending} allowDeselect={false} description={`기준 내역 ${p.baselineSnapshot.period.start} ~ ${p.baselineSnapshot.period.endExclusive ? endDate(p.baselineSnapshot.period.endExclusive) : ""}`} />
        <NumberInput label="이번에는 얼마까지 쓰고 싶나요?" description={`0원부터 기준 소비 ${won(baseline)}보다 낮은 금액을 직접 선택해 주세요.`} suffix=" 원" thousandSeparator min={0} max={Math.max(0, baseline - 1)} step={1000} clampBehavior="strict" decimalScale={0} value={target} onChange={setTarget} disabled={mutation.isPending} />
        <TextInput type="month" label="언제 실천할까요?" min={p.earliestExecutionMonth} value={execution} onChange={(e) => setExecution(e.currentTarget.value)} disabled={mutation.isPending} description="월 전체 소비를 비교해요. 지금 시작할 수 있는 완전한 달력월부터 선택할 수 있어요." />
        {validTarget && <Text size="sm" c="dimmed">계획한 소비 차이 {won(baseline - target)} · 실제 결과는 새 이용내역에서 확인해요.</Text>}
        <Checkbox color="teal" checked={confirmed} onChange={(e) => setConfirmed(e.currentTarget.checked)} disabled={mutation.isPending} label={`${p.baselineMonth}의 대상 카드 이용내역을 모두 반영했고, 이 소비를 기준으로 시작할게요.`} />
        {!p.canCreate && <Alert color="orange" bg="#FFF4E3" variant="light" radius="lg" icon={<IconAlertTriangle size={18} />} title="목표를 시작하기 전에 확인해 주세요">
          <Stack gap="sm">
            <Stack gap={4}>{p.reasons.map((reason) => <Text size="sm" key={reason}>{reasonText(reason)}</Text>)}</Stack>
            <Group>
              {resolution.to ? <Button component={Link} to={resolution.to} variant="default" color="gray" size="sm" radius={10} fw={600} rightSection={<IconArrowRight size={16} />}>{resolution.label}</Button>
                : <Button variant="default" color="gray" size="sm" radius={10} fw={600} onClick={() => baselineInput.current?.focus()}>{resolution.label}</Button>}
            </Group>
            <Divider color="orange.2" />
            <Group gap="xs">
              <Text size="xs" c="dimmed" fw={600}>다른 방법</Text>
              {alternatives.map((action) => <Button key={action.to} component={Link} to={action.to} variant="subtle" color="gray" size="xs">{action.label}</Button>)}
            </Group>
          </Stack>
        </Alert>}
        {mutation.isError && <Text size="sm" c="red" role="alert">목표를 시작하지 못했어요. 현재 기준 내역을 다시 확인해 주세요.</Text>}
        <Button {...journeyPrimaryProps} rightSection={<IconArrowRight size={17} />} loading={mutation.isPending} disabled={!p.canCreate || !validTarget || !validMonth || !confirmed}
          onClick={() => { if (typeof target !== "number") return; mutation.mutate({ analysisRunId: p.analysisRunId, opportunityId: p.opportunityId, previousCycleId: p.previousCycleId,
            baselineMonth: p.baselineMonth, executionMonth: execution, targetAmount: target, sourceConfirmed: confirmed,
            expectedSourceRevision: p.sourceDataRevision, expectedBaselineRevision: p.baselineSnapshot.dataRevision, idempotencyKey: key }); }}>이 변화로 시작하기</Button>
      </Stack></Paper>
    </SimpleGrid>
    <Text size="xs" c="dimmed">기준월과 실행월이 떨어져 있다면 내 생활이 달라졌는지도 함께 살펴보세요. 기준 소비와 목표는 시작 시점에 고정되며, 결과가 과거 목표를 덮어쓰지 않습니다.</Text>
  </Stack>;
}
