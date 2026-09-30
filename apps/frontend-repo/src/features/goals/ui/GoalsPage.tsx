import { Alert, Button, Container, Group, Paper, Stack, Text, Title } from "@mantine/core";
import { IconArrowRight } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router";
import { goalQueries } from "../api/queries";
import { endDate } from "../model/contract";
import { GoalDetail } from "./GoalDetail";
import { GoalSetup } from "./GoalSetup";

export function GoalsPage({ userScope }: { userScope: string | null }) {
  const [params] = useSearchParams();
  const list = useQuery(goalQueries.list(userScope));
  const id = params.get("goalId") ?? list.data?.find((g) => g.lifecycle === "OPEN")?.id ?? list.data?.[0]?.id ?? "";
  const runId = params.get("analysisRunId") ?? "";
  const opportunityId = params.get("opportunityId") ?? "";
  const previousId = params.get("continueFrom") ?? "";
  const setup = Boolean(previousId || (runId && opportunityId));
  const view = useQuery({ ...goalQueries.view(userScope, id), enabled: !setup && Boolean(id) });
  return <Container size="lg" py="xl"><Stack gap="xl">
    <Group justify="space-between" align="flex-start"><Stack gap={5}><Title order={1} fz={{ base: 27, md: 32 }}>목표와 변화</Title><Text size="sm" c="dimmed">발견한 소비에서 한 가지를 선택하고, 새 이용내역으로 변화를 확인해요.</Text></Stack>{setup && <Button component={Link} to="/goals" variant="subtle" color="gray">현재 목표로 돌아가기</Button>}</Group>
    {setup ? <GoalSetup key={`${runId}:${opportunityId}:${previousId}`} userScope={userScope} runId={runId} opportunityId={opportunityId} previousId={previousId} />
      : list.isPending ? <Text role="status">진행 중인 변화를 확인하고 있어요.</Text>
      : list.isError ? <Alert color="orange" title="목표를 불러오지 못했어요"><Button variant="subtle" color="gray" onClick={() => void list.refetch()}>다시 불러오기</Button></Alert>
      : !id ? <Paper withBorder radius="xl" p={{ base: "xl", md: 48 }} bg="white"><Stack gap="lg"><Text size="xs" fw={700} c="teal">DISCOVER → CHOOSE → CHANGE</Text><Title order={2}>무엇을 바꿔볼까요?</Title><Text c="dimmed">소비 분석에서 눈에 띄는 패턴을 살펴보고, 내 상황에 맞는 변화 한 가지를 선택해 보세요.</Text><Button component={Link} to="/insights" color="brandMint.8" w="fit-content" rightSection={<IconArrowRight size={18} />}>소비 분석에서 변화 찾기</Button></Stack></Paper>
      : view.isPending ? <Text role="status">새 이용내역에서 변화를 확인하고 있어요.</Text>
      : view.isError ? <Alert color="orange" title="선택한 목표를 확인하지 못했어요"><Group><Button variant="subtle" color="gray" onClick={() => void view.refetch()}>다시 확인하기</Button><Button component={Link} to="/goals" variant="subtle" color="gray">내 목표 보기</Button></Group></Alert>
      : <GoalDetail key={`${view.data.cycle.id}:${view.data.tracking.snapshot.dataRevision}:${view.data.evaluations[0]?.id}`} goal={view.data} observedAt={view.dataUpdatedAt} refreshing={view.isFetching} />}
    {!setup && list.data && list.data.length > 1 && <Paper withBorder radius="lg" p="lg"><Stack gap="sm"><Text fw={700} size="sm">다른 변화 기록</Text>{list.data.filter((g) => g.id !== id).map((g) => <Group key={g.id} justify="space-between"><Stack gap={2}><Text size="sm">{g.categoryLabel} · {g.lifecycle === "OPEN" ? "실천 중" : g.lifecycle === "STOPPED" ? "멈춘 변화" : "결과 확인"}</Text><Text c="dimmed" size="xs">{g.start} ~ {endDate(g.endExclusive)}</Text></Stack><Button component={Link} to={`/goals?goalId=${g.id}`} variant="subtle" color="gray" size="xs">기록 보기</Button></Group>)}</Stack></Paper>}
  </Stack></Container>;
}
