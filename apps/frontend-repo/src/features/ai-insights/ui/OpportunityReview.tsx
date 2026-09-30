import { journeyPrimaryProps } from "@/shared/ui/journeyActions";
import { Alert, Button, Divider, Group, Paper, SimpleGrid, Stack, Text, Title } from "@mantine/core";
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
  return <Paper withBorder radius="xl" p={{ base: "lg", md: 36 }} bg="white"><Stack gap="xl">
    <Stack gap="sm">
      <Text size="xs" c="dimmed" fw={700}>발견에서 다음 행동으로</Text>
      <Title order={3}>바꿔볼 한 가지를 골라보세요</Title>
      <Text size="sm" c="dimmed">AI가 제안한 후보예요. 후보를 선택하면 같은 거래의 근거와 목표 설정 전 확인할 내용을 볼 수 있어요.</Text>
    </Stack>
    <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
      {run.opportunities.map((o) => {
        const isSelected = selected?.id === o.id;
        const select = () => setParams({ analysisRunId: run.id, opportunityId: o.id }, { replace: true });
        return <Paper key={o.id} component="button" type="button" aria-pressed={isSelected}
          className={`${styles.goalChoice} ${isSelected ? styles.goalChoiceSelected : ""}`} onClick={select}>
          <Stack gap="md" h="100%"><Group justify="space-between" align="flex-start" wrap="nowrap"><Title order={4}>{o.categoryLabelSnapshot}</Title><span className={`${styles.goalChoiceMark} ${isSelected ? styles.goalChoiceMarkSelected : ""}`} aria-hidden="true">{isSelected ? <IconCheck size={16} /> : null}</span></Group>
            <Text size="sm" c="dimmed">{renderEvidenceText(o.rationale, snapshot)}</Text>
            <Group className={`${styles.goalChoiceAction} ${isSelected ? styles.goalChoiceActionSelected : ""}`} justify="space-between" mt="auto" wrap="nowrap">
              <Text size="sm" fw={700}>{isSelected ? "선택한 후보" : "이 후보 선택하고 근거 보기"}</Text>
              {!isSelected && <IconArrowRight size={17} aria-hidden="true" />}
            </Group>
          </Stack>
        </Paper>;
      })}
    </SimpleGrid>
    {selected && <Stack gap="md">
      <Divider />
      <Title order={4}>{selected.categoryLabelSnapshot} 소비의 근거 확인하기</Title>
      {selected.evidenceIds.map((id) => {
        const evidence = snapshot.evidence.find((e) => e.id === id);
        return <Group key={id} justify="space-between" gap="sm"><Text size="sm" c="dimmed">{evidence ? evidenceMetricLabel(evidence.metric) : "근거 미확인"}</Text><Text fw={800}>{renderEvidenceText(`{{${id}}}`, snapshot)}</Text></Group>;
      })}
      <Text size="xs" c="dimmed">선택한 분석 범위의 관측값입니다. 월 목표의 기준 금액과 자료 완결성을 확정한 값은 아닙니다.</Text>
      <Text size="sm" c="dimmed" role="status">{handoff.isFetching ? "현재 이용내역과 근거를 확인하고 있어요." : handoff.isError ? "현재 근거를 확인하지 못했어요. 다시 확인해주세요." : blocked ? "미확인 내역이나 변경된 근거를 먼저 정리해야 해요." : "다음 목표 설정 단계에서 기준월과 대상 카드 내역을 확인하고 목표 금액을 직접 선택합니다."}</Text>
      {handoff.data?.stale && <Alert color="orange" variant="light">이용내역이 바뀌었습니다. 현재 내역으로 다시 분석해주세요.</Alert>}
      <Group className={styles.goalActions}>
        <Button component={Link} to={`/goals?analysisRunId=${encodeURIComponent(run.id)}&opportunityId=${encodeURIComponent(selected.id)}`} {...journeyPrimaryProps} disabled={!handoff.data || handoff.data.stale || handoff.isFetching || handoff.isError} rightSection={<IconArrowRight size={18} />}>이 변화로 목표 시작하기</Button>
        <Button component={Link} to="/washing" variant="subtle" color="gray">이용내역에서 근거 정리하기</Button>
        {handoff.isError && <Button variant="subtle" color="gray" onClick={() => void handoff.refetch()}>근거 다시 확인하기</Button>}
      </Group>
      <Text size="xs" c="dimmed">기준월의 내역을 확인한 뒤, 목표 금액과 실천할 달을 직접 선택해요.</Text>
    </Stack>}
  </Stack></Paper>;
}
