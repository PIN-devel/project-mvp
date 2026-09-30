import { journeyPrimaryProps } from "@/shared/ui/journeyActions";
import { Accordion, Alert, Button, Container, Group, NativeSelect, Paper, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { IconAlertTriangle, IconArrowRight, IconRefresh } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { analysisKeys, analysisQueries, createAnalysis } from "../api/analysis";
import { aiInsightQueries } from "../api/queries";
import { evidenceMetricLabel, renderEvidenceText } from "../model/analytics";
import type { AnalyticsQuery, AnalyticsSnapshot } from "../model/analytics";
import { formatGeneratedAt, getPeriodLabel } from "../model/core";
import { MIN_ANALYSIS_TRANSACTION_COUNT } from "@/shared/model/analysisEligibility";
import { OpportunityReview } from "./OpportunityReview";
import { SpendingDiscovery } from "./SpendingDiscovery";
import styles from "./AiInsightsPageContent.module.css";

const defaultQuery: AnalyticsQuery = { period: "ALL", start: null, endExclusive: null, categoryIds: [], cardNames: [] };
const periodOptions = [{ value: "ALL", label: "전체 기간" }, { value: "LAST_1_MONTH", label: "최근 1개월" }, { value: "LAST_3_MONTHS", label: "최근 3개월" }];
const sameScope = (a: AnalyticsQuery, b: AnalyticsQuery) => JSON.stringify(a) === JSON.stringify(b);

export function AiInsightsPageContent({ userScope }: { userScope: string | null }) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const runId = params.get("analysisRunId");
  const queryClient = useQueryClient();
  const { data: categories } = useSuspenseQuery(aiInsightQueries.categories());
  const restored = useQuery(analysisQueries.run(userScope, runId));
  const [selectedQuery, setSelectedQuery] = useState<AnalyticsQuery | null>(null);
  const query = selectedQuery ?? restored.data?.run?.snapshot.query ?? defaultQuery;
  const analytics = useQuery({ ...analysisQueries.snapshot(userScope, query), enabled: !restored.isPending });
  const [activeSnapshot, setActiveSnapshot] = useState<AnalyticsSnapshot | null>(null);
  const [entryRequested, setEntryRequested] = useState(false);
  const resultRevealRef = useRef<HTMLDivElement>(null);
  const restoredResultScrollRef = useRef(false);
  const analysisScopeRef = useRef<HTMLSelectElement>(null);
  const analysis = useMutation({
    mutationFn: ({ query, revision }: { query: AnalyticsQuery; revision: string }) => createAnalysis(query, revision),
    onSuccess: (response) => {
      if (!response.run) return;
      queryClient.setQueryData(analysisKeys.run(userScope, response.run.id), response);
      queryClient.setQueryData(analysisKeys.run(userScope, null), response);
      setParams({ analysisRunId: response.run.id }, { replace: true });
      if (response.stale) setActiveSnapshot(null);
    },
  });
  const response = analysis.data ?? restored.data;
  const run = response?.run;
  const current = analytics.data;
  const sameRunScope = Boolean(run && sameScope(run.snapshot.query, query));
  const stale = Boolean(sameRunScope && (response?.stale || (current && run?.snapshot.dataRevision !== current.dataRevision)));
  const checking = restored.isFetching || analytics.isFetching;
  const activeIsStale = Boolean(activeSnapshot && current && activeSnapshot.dataRevision !== current.dataRevision);
  const snapshot = activeIsStale ? null : activeSnapshot ?? (sameRunScope && !stale && !checking ? run?.snapshot : null);
  const displayRun = snapshot && run?.snapshot.dataRevision === snapshot.dataRevision && sameRunScope && !stale ? run : null;
  const leadFinding = displayRun?.findings.toSorted((a, b) => ["HIGH", "MEDIUM", "LOW"].indexOf(a.importance) - ["HIGH", "MEDIUM", "LOW"].indexOf(b.importance))[0];
  const categoryLabel = query.categoryIds.length
    ? categories.find((c) => c.id === query.categoryIds[0])?.name ?? run?.snapshot.categories.find((c) => c.categoryId === query.categoryIds[0])?.categoryLabel ?? "선택한 카테고리"
    : "전체 카테고리";
  const count = current?.transactionCount;
  const aiEligible = count !== undefined && count >= MIN_ANALYSIS_TRANSACTION_COUNT;
  const unresolved = (current?.quality.unclassifiedCount ?? 0) + (current?.quality.inconsistentCount ?? 0);

  useEffect(() => {
    if (restoredResultScrollRef.current || !snapshot || !run || !sameRunScope || stale || checking || activeSnapshot) return;
    const firstScene = resultRevealRef.current?.querySelector<HTMLElement>("[data-scene]");
    if (!firstScene) return;
    const frame = window.requestAnimationFrame(() => {
      restoredResultScrollRef.current = true;
      firstScene.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeSnapshot, checking, run, sameRunScope, snapshot, stale]);

  const changeQuery = (next: AnalyticsQuery) => {
    setSelectedQuery(next);
    setActiveSnapshot(null);
    setEntryRequested(false);
    analysis.reset();
  };
  const requestAnalysis = () => {
    if (!current || analysis.isPending || checking) return;
    setActiveSnapshot(current);
    setEntryRequested(true);
    analysis.mutate({ query, revision: current.dataRevision });
    requestAnimationFrame(() => {
      const firstScene = resultRevealRef.current?.querySelector<HTMLElement>("[data-scene]");
      firstScene?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
      firstScene?.focus({ preventScroll: true });
    });
  };

  return <Container size={1180}><Stack gap="xl" className={styles.page}>
    <Stack gap="sm" className={styles.pageHeading}>
      <Text size="sm" fw={800} c="teal.8" tt="uppercase" lts={1}>CONSUMPTION INTELLIGENCE</Text>
      <Title order={1}>내 소비를 이해하는 첫 번째 발견</Title>
      <Text size="md" c="dimmed" maw={720}>정리한 카드 이용내역에서 눈여겨볼 흐름을 발견하고, 다음에 바꿔볼 행동을 생각해 보세요.</Text>
    </Stack>
    <Paper className={styles.scopeContext}><Stack gap="md">
      <Group justify="space-between" align="start" gap="md">
        <Stack gap={3}><Title order={3} fz="md">지금 살펴보는 소비</Title><Text size="xs" c="dimmed">시각화와 AI가 같은 서버 집계를 사용해요. 최근 기간은 마지막 거래일 기준입니다.</Text></Stack>
        <Stack gap={3}><Text size="sm" fw={700}>{count === undefined ? analytics.isError || restored.isError ? "대상 건수 미확인" : "대상 건수 확인 중" : `${count}건`} · {getPeriodLabel(query.period)} · {categoryLabel}</Text></Stack>
      </Group>
      <Group align="end" gap="md">
        <NativeSelect w={{ base: "100%", sm: 190 }} label="조회 기간" ref={analysisScopeRef} value={query.period} disabled={analysis.isPending}
          onChange={(e) => changeQuery({ ...query, period: e.currentTarget.value as AnalyticsQuery["period"], start: null, endExclusive: null })} data={periodOptions} />
        <NativeSelect w={{ base: "100%", sm: 190 }} label="카테고리" value={String(query.categoryIds[0] ?? "all")} disabled={analysis.isPending}
          onChange={(e) => changeQuery({ ...query, categoryIds: e.currentTarget.value === "all" ? [] : [Number(e.currentTarget.value)] })}
          data={[{ value: "all", label: "전체 카테고리" }, ...categories.map((c) => ({ value: String(c.id), label: c.name })),
            ...query.categoryIds.filter((id) => !categories.some((c) => c.id === id)).map((id) => ({ value: String(id), label: "이전 카테고리 · 현재 사용 불가" }))]} />
      </Group>
      {query.start && <Text size="xs" c="dimmed">지정 기간 {query.start} ~ {query.endExclusive} 직전까지</Text>}
      {current && unresolved > 0 && <Group gap="sm"><Text size="xs" c="dimmed">미분류 {current.quality.unclassifiedCount}건 · 분류 확인 필요 {current.quality.inconsistentCount}건도 합계에 포함되며 카테고리 해석은 제한됩니다.</Text><Button variant="subtle" color="teal" size="xs" onClick={() => navigate("/washing")}>이용내역 정리하기</Button></Group>}
      {!aiEligible && current && <Text size="sm" role="status" c="dimmed">실제 소비는 살펴볼 수 있어요. AI 해석은 소비 집계 대상 {MIN_ANALYSIS_TRANSACTION_COUNT}건부터 제공됩니다. 현재 {count}건이에요.</Text>}
      <Accordion variant="default">
        <Accordion.Item value="scope-details">
          <Accordion.Control>분석 범위와 집계 기준 확인하기</Accordion.Control>
          <Accordion.Panel><Stack gap="xs">
            {current && <Text size="xs" c="dimmed">{current.sourceScope.kind === "ALL_CARDS" ? "등록된 전체 카드 내역" : "선택한 카드 내역"} · {current.sourceScope.cardNames.map((name) => name || "카드 정보 없음").join(", ") || "등록된 카드 없음"}</Text>}
            <Text size="xs" c="dimmed">취소·상태 미확인·잘못된 날짜/금액은 소비에서 제외됩니다. 카드 자료의 기간 완결성은 미확인입니다.</Text>
          </Stack></Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Stack></Paper>

    {(analytics.isError || restored.isError) && <Alert color="red" icon={<IconAlertTriangle size={18} />} title="분석 데이터를 가져오지 못했어요"><Stack gap="sm"><Text size="sm">잠시 후 다시 시도해 주세요.</Text><Button variant="subtle" color="gray" onClick={() => { void restored.refetch(); void analytics.refetch(); }}>다시 확인하기</Button></Stack></Alert>}
    {!snapshot && <Paper className={styles.gateway}><Stack gap="xl">
      <Stack gap="sm" aria-live="polite"><Text size="xs" c="dimmed" fw={700}>나의 소비 읽기</Text><Title order={2}>{checking ? "저장한 결과와 이용내역을 확인하고 있어요" : stale ? "이용내역이 바뀌었어요" : "정리한 내역에서 나의 소비를 읽어볼까요?"}</Title><Text c="dimmed" maw={620}>{stale ? "현재 이용내역으로 다시 분석해 주세요. 이전 근거는 저장한 분석에서 보존됩니다." : "소비가 모이는 곳과 시간의 흐름을 실제 기록에서 먼저 확인하고, AI의 해석을 더해보세요."}</Text></Stack>
      <Button {...journeyPrimaryProps} w="fit-content" rightSection={<IconArrowRight size={18} />} onClick={requestAnalysis} disabled={!current || checking || analysis.isPending} loading={checking}>내 소비 분석하기</Button>
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="xl" className={styles.gatewayPreview}>{["소비가 집중된 영역", "시간에 따른 소비 흐름", "패턴을 만든 주요 거래"].map((label, i) => <Stack gap={5} key={label}><Text size="xs" c="dimmed">분석 후 살펴볼 내용 / 0{i + 1}</Text><Text size="sm" fw={600}>{label}</Text></Stack>)}</SimpleGrid>
    </Stack></Paper>}

    {snapshot && <Stack ref={resultRevealRef} gap="xl">
      <SpendingDiscovery key={snapshot.dataRevision} snapshot={snapshot} entryRequested={entryRequested} onEntryComplete={setEntryRequested} />
      <Stack gap="sm" className={styles.aiHeading}><Text size="xs" fw={700} c="teal.8" lts={1.5}>04 / MAKE SENSE OF IT</Text><Title order={2}>눈에 보인 흐름에, 해석을 더해요.</Title><Text size="sm" c="dimmed">위 시각화와 아래 해석은 같은 거래 집계를 근거로 합니다. AI 해석과 변화 후보는 사용자가 확인할 제안입니다.</Text></Stack>
      {analysis.isPending && <Paper className={styles.aiInterpretation}><Stack gap="sm" role="status"><Title order={3}>소비의 근거를 읽고 있어요</Title><Text c="dimmed">실제 소비의 모습은 먼저 살펴볼 수 있어요. AI가 계산된 근거에 해석을 더하고 있어요.</Text></Stack></Paper>}
      {!analysis.isPending && !analysis.isError && displayRun?.status === "PENDING" && <Paper className={styles.aiInterpretation}><Stack gap="sm" role="status"><Title order={3}>저장된 AI 해석의 완료 여부를 아직 확인하지 못했어요</Title><Text size="sm" c="dimmed">거래 집계와 시각화는 살펴볼 수 있어요. 저장된 결과의 현재 상태를 다시 확인해 주세요.</Text><Button variant="subtle" color="gray" w="fit-content" leftSection={<IconRefresh size={16} />} onClick={() => { analysis.reset(); void restored.refetch(); }} disabled={checking}>AI 해석 상태 확인하기</Button></Stack></Paper>}
      {(analysis.isError || displayRun?.status === "AI_FAILED") && <Alert color="orange" icon={<IconAlertTriangle size={18} />} title="AI 해석을 완료하지 못했어요"><Stack gap="sm"><Text size="sm">거래 집계와 시각화는 계속 볼 수 있어요. 같은 범위로 다시 시도할 수 있어요.</Text><Button variant="subtle" color="gray" leftSection={<IconRefresh size={16} />} onClick={requestAnalysis} disabled={checking || analysis.isPending}>AI 해석 다시 시도하기</Button></Stack></Alert>}
      {(displayRun?.status === "INSUFFICIENT_DATA" || (!aiEligible && !analysis.isPending)) && <Text c="dimmed" size="sm">AI 해석에는 소비 집계 대상 {MIN_ANALYSIS_TRANSACTION_COUNT}건이 필요해요. 이용내역을 추가하면 다시 분석할 수 있어요.</Text>}
      {displayRun?.status === "SUCCEEDED" && !analysis.isPending && <>
        <Paper className={styles.aiInterpretation}><Stack gap="sm"><Text size="xs" c="teal.8" fw={700}>핵심 발견</Text><Title order={2}>{leadFinding ? renderEvidenceText(leadFinding.interpretation, snapshot) : "뚜렷한 해석을 더할 근거가 부족해요"}</Title><Text size="xs" c="dimmed">{snapshot.transactionCount}건 · {formatGeneratedAt(displayRun.generatedAt)} 생성</Text></Stack></Paper>
        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">{displayRun.findings.map((f) => <Paper key={f.id} withBorder p="xl" radius="lg" bg="white" className={styles.findingCard}><Stack gap="sm"><Text size="xs" c="teal.8" fw={700}>관측된 소비의 해석</Text><Title order={4}>{snapshot.observations.find((o) => o.id === f.observationId)?.kind === "OBSERVED_TIME_PEAK" ? "소비가 집중된 시간" : `${snapshot.evidence.find((e) => f.evidenceIds.includes(e.id))?.categoryLabel ?? "선택한 내역"}에서 보이는 흐름`}</Title>{f.id !== leadFinding?.id && <Text size="sm" lh={1.65}>{renderEvidenceText(f.interpretation, snapshot)}</Text>}{f.limitations.map((limit, i) => <Text key={i} size="xs" c="dimmed">{renderEvidenceText(limit, snapshot)}</Text>)}<details className={styles.allTransactions}><summary>계산 근거 확인하기</summary><Stack gap="xs" mt="sm">{f.evidenceIds.map((id) => {
          const e = snapshot.evidence.find((e) => e.id === id)!;
          return <Text key={id} size="xs" c="dimmed">{e.categoryLabel ?? (e.metric === "TIME_AMOUNT" ? e.scopeKey : "선택한 전체 내역")} · {evidenceMetricLabel(e.metric)} · {renderEvidenceText(`{{${id}}}`, snapshot)} · 연결 거래 {e.transactionIds.length}건</Text>;
        })}</Stack></details></Stack></Paper>)}</SimpleGrid>
        <Stack gap="lg" className={styles.goalSection}>
          <Stack gap={5} className={styles.goalHeading}><Text size="sm" fw={800} c="teal.8" lts={1}>DISCOVERY → ACTION</Text><Title order={2}>발견을 나의 선택으로.</Title><Text size="sm" c="dimmed">근거를 확인하고 바꿔볼 방향을 생각해 보세요. 목표 금액과 기준월은 목표 설정 단계에서 직접 선택합니다.</Text></Stack>
          <OpportunityReview run={displayRun} userScope={userScope} />
        </Stack>
      </>}
      <Button variant="subtle" color="gray" w="fit-content" onClick={() => analysisScopeRef.current?.focus()}>분석 범위 바꿔보기</Button>
    </Stack>}
  </Stack></Container>;
}
