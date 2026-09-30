import { Alert, Button, Group, Paper, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { IconArrowRight, IconCheck } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router";
import { analysisQueries } from "../api/analysis";
import { evidenceMetricLabel, renderEvidenceText } from "../model/analytics";
import type { AnalysisRun } from "../model/analytics";
import styles from "./AiInsightsPageContent.module.css";

export function OpportunityReview({ run, userScope }: { run: AnalysisRun; userScope: string | null }) {
  const [params, setParams] = useSearchParams();
  const selected = run.opportunities.find((o) => o.id === params.get("opportunityId"));
  const handoff = useQuery({ ...analysisQueries.handoff(userScope, run.id, selected?.id ?? ""), enabled: Boolean(selected) });
  const snapshot = run.snapshot;
  const blocked = handoff.data?.stale || selected?.goalEligibility.status === "BLOCKED";
  if (!run.opportunities.length) return <Text c="dimmed">현재 근거에서는 카테고리별 변화 후보를 제안하지 않았어요. 범위를 바꾸거나 이용내역을 정리해 다시 살펴보세요.</Text>;
  return <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
    <Paper className={styles.goalFocus} c="white"><Stack gap="lg" h="100%" justify="space-between">
      <Stack gap="md">
        <Text size="xs" c="gray.4" fw={700}>{selected ? "살펴보는 변화 후보" : "발견에서 다음 행동으로"}</Text>
        <Title order={3} c="white">{selected ? `${selected.categoryLabelSnapshot} 소비, 무엇을 바꿔볼까요?` : "바꿔볼 한 가지를 골라보세요"}</Title>
        <Text size="sm" c="gray.3">{selected ? renderEvidenceText(selected.rationale, snapshot) : "눈에 띈 소비를 먼저 확인해 보세요. 후보를 선택하면 같은 거래의 근거와 목표 설정 전 확인할 내용을 볼 수 있어요."}</Text>
        {selected && <Stack gap="sm" className={styles.amountComparison}>
          {selected.evidenceIds.map((id) => {
            const e = snapshot.evidence.find((e) => e.id === id)!;
            return <Group key={id} justify="space-between" gap="sm"><Text size="xs" c="gray.3">{evidenceMetricLabel(e.metric)}</Text><Text fw={800} c="brandMint.4">{renderEvidenceText(`{{${id}}}`, snapshot)}</Text></Group>;
          })}
          <Text size="xs" c="gray.4">선택한 분석 범위의 관측값입니다. 월 목표의 기준 금액과 자료 완결성을 확정한 값은 아닙니다.</Text>
        </Stack>}
        {selected && <Text size="xs" c="gray.4">{handoff.isFetching ? "현재 이용내역과 근거를 확인하고 있어요." : handoff.isError ? "현재 근거를 확인하지 못했어요. 잠시 후 후보를 다시 확인해주세요." : blocked ? "미확인 내역이나 변경된 근거를 먼저 정리해야 해요." : "다음 목표 설정 단계에서 기준월과 대상 카드 내역을 확인하고 목표 금액을 직접 선택합니다."}</Text>}
      </Stack>
      <Stack gap="sm">
        {handoff.data?.stale && <Alert color="orange" variant="light">이용내역이 바뀌었습니다. 현재 내역으로 다시 분석해주세요.</Alert>}
        {selected && <Button component={Link} to={`/goals?analysisRunId=${run.id}&opportunityId=${selected.id}`} color="brandMint.8" disabled={!handoff.data || handoff.data.stale} rightSection={<IconArrowRight size={16} />}>이 변화로 목표 시작하기</Button>}
        {selected && <Button component={Link} to="/washing" variant="subtle" color="brandMint.4">이용내역에서 근거 정리하기</Button>}
        <Text size="xs" c="gray.4">기준월의 내역을 확인한 뒤, 목표 금액과 실천할 달을 직접 선택해요.</Text>
      </Stack>
    </Stack></Paper>
    <Paper className={styles.goalPanel}><Stack gap="lg">
      <Stack gap={4}><Title order={4}>바꿔볼 방향 살펴보기</Title><Text size="xs" c="dimmed">AI가 제안한 후보예요. 내 상황에 맞는지 근거를 확인해 보세요.</Text></Stack>
      {run.opportunities.map((o) => <Paper key={o.id} className={`${styles.goalChoice} ${selected?.id === o.id ? styles.goalChoiceSelected : ""}`}>
        <Stack gap="sm"><Title order={4}>{o.categoryLabelSnapshot}</Title><Text size="sm" c="dimmed">{renderEvidenceText(o.rationale, snapshot)}</Text>
          <Button variant={selected?.id === o.id ? "light" : "subtle"} color="teal" size="sm" w="fit-content" aria-pressed={selected?.id === o.id}
            leftSection={selected?.id === o.id ? <IconCheck size={16} /> : undefined} rightSection={selected?.id === o.id ? undefined : <IconArrowRight size={16} />}
            onClick={() => setParams({ analysisRunId: run.id, opportunityId: o.id }, { replace: true })}>{selected?.id === o.id ? "살펴보는 후보" : "이 변화 후보 살펴보기"}</Button>
        </Stack>
      </Paper>)}
    </Stack></Paper>
  </SimpleGrid>;
}
