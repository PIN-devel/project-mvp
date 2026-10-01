import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { theme } from "./theme";
import { useAppStore } from "./store/useAppStore";
import { analysisQueries, createAnalysis } from "@/features/ai-insights/api/analysis";
import { createGoal, goalQueries } from "@/features/goals/api/queries";
import { GoalsPage } from "@/features/goals/ui/GoalsPage";
import { dbLedger, resetAllMocks } from "@/mocks/db";
import { resetMonthlyGoalsMock } from "@/mocks/handlers";
import { server } from "@/mocks/server";

describe("분석 근거에서 목표 Cycle 시작", () => {
  let client: QueryClient;
  let router: ReturnType<typeof createMemoryRouter>;
  const scope = () => useAppStore.getState().analysisNamespace;

  beforeEach(() => {
    window.localStorage.clear();
    useAppStore.getState().clearSession();
    useAppStore.getState().setSession("test-session", "테스터");
    resetAllMocks();
    resetMonthlyGoalsMock();
    client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  });
  afterEach(() => { router?.dispose(); client.clear(); });

  const prepare = async (clean = true) => {
    if (clean) dbLedger.getAll().filter((tx) => tx.categoryId === null).forEach(({ id }) => {
      dbLedger.update(id, { categoryId: 1, categoryName: "식음료", isClassified: true });
    });
    const query = { period: "ALL" as const, start: null, endExclusive: null, categoryIds: [], cardNames: [] };
    const snapshot = await client.fetchQuery(analysisQueries.snapshot(scope(), query));
    const { run } = await createAnalysis(query, snapshot.dataRevision);
    const opportunity = run!.opportunities.find((o) => o.categoryId === 7)!;
    return client.fetchQuery(goalQueries.prepare(scope(), run!.id, opportunity.id, "", null));
  };
  const renderGoals = (entry: string) => {
    router = createMemoryRouter([
      { path: "/goals", element: <GoalsPage userScope={scope()} /> },
      { path: "/washing", element: <h1>이용내역 정리 화면</h1> },
    ], { initialEntries: [entry] });
    render(<QueryClientProvider client={client}><MantineProvider theme={theme}><RouterProvider router={router} /></MantineProvider></QueryClientProvider>);
  };
  const fill = async (amount: number) => {
    const input = await screen.findByLabelText("이번에는 얼마까지 쓰고 싶나요?");
    fireEvent.change(input, { target: { value: String(amount) } });
    fireEvent.click(screen.getByRole("checkbox"));
    return input;
  };

  it("사용자가 금액과 기준 내역을 확인한 뒤 두 ID와 revision으로 목표를 저장한다", async () => {
    const p = await prepare();
    renderGoals(`/goals?analysisRunId=${p.analysisRunId}&opportunityId=${p.opportunityId}`);
    const button = await screen.findByRole("button", { name: "이 변화로 시작하기" });
    expect(button).toBeDisabled();
    const target = p.baselineSnapshot.totalAmount - 1000;
    await fill(target);
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    await screen.findByText("Current · 현재까지 관측");
    const id = new URLSearchParams(router.state.location.search).get("goalId")!;
    const goal = await client.fetchQuery(goalQueries.view(scope(), id));
    expect(goal.cycle).toMatchObject({
      analysisRunId: p.analysisRunId, opportunityId: p.opportunityId,
      targetAmount: target, start: `${p.earliestExecutionMonth}-01`,
    });
    expect(goal.cycle.baseline.snapshot).toEqual(p.baselineSnapshot);
    expect(goal.tracking.actualAmount).toBeNull();
    expect(screen.getByText(/소비가 0원이라고 판단하지 않습니다/)).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "새 이용내역 추가하기" })).toHaveAttribute("href", `/washing?goalId=${id}&flow=goal-update`);
  });

  it("저장 실패에도 선택한 금액과 확인 상태를 유지하며 같은 조건으로 재시도한다", async () => {
    const p = await prepare();
    server.use(http.post("/api/v2/goal-cycles", () => HttpResponse.json({ status: 503 }, { status: 503 })));
    renderGoals(`/goals?analysisRunId=${p.analysisRunId}&opportunityId=${p.opportunityId}`);
    const target = p.baselineSnapshot.totalAmount - 1000;
    const input = await fill(target);
    const button = screen.getByRole("button", { name: "이 변화로 시작하기" });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    await screen.findByRole("alert");
    expect(input).toHaveValue(`${target.toLocaleString("en-US")} 원`);
    expect(screen.getByRole("checkbox")).toBeChecked();
    await waitFor(() => expect(button).toBeEnabled());
    server.resetHandlers();
    fireEvent.click(button);
    await screen.findByText("Current · 현재까지 관측");
    expect(new URLSearchParams(router.state.location.search).get("goalId")).toBeTruthy();
  });

  it("기준월 내역이 미정리 상태면 목표 생성을 막고 정리 화면으로 안내한다", async () => {
    const p = await prepare(false);
    expect(p.canCreate).toBe(false);
    renderGoals(`/goals?analysisRunId=${p.analysisRunId}&opportunityId=${p.opportunityId}`);
    await fill(1000);
    expect(screen.getByRole("button", { name: "이 변화로 시작하기" })).toBeDisabled();
    const links = screen.getAllByRole("link", { name: "이용내역 정리하기" });
    fireEvent.click(links[0]);
    await screen.findByRole("heading", { name: "이용내역 정리 화면" });
    expect(await client.fetchQuery(goalQueries.list(scope()))).toEqual([]);
  });

  it("저장된 목표는 AI 화면을 다시 분석하지 않아도 조회할 수 있다", async () => {
    const p = await prepare();
    const goal = await createGoal({
      analysisRunId: p.analysisRunId, opportunityId: p.opportunityId, previousCycleId: null,
      baselineMonth: p.baselineMonth, executionMonth: p.earliestExecutionMonth,
      targetAmount: 1000, sourceConfirmed: true,
      expectedSourceRevision: p.sourceDataRevision, expectedBaselineRevision: p.baselineSnapshot.dataRevision,
      idempotencyKey: crypto.randomUUID(),
    });
    renderGoals("/goals");
    await screen.findByText("Current · 현재까지 관측");
    expect(screen.queryByRole("button", { name: "내 소비 분석하기" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "새 이용내역 추가하기" })).toHaveAttribute("href", `/washing?goalId=${goal.cycle.id}&flow=goal-update`);
  });
});
