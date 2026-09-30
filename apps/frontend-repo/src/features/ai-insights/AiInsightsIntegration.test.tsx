import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { delay, http, HttpResponse } from "msw";
import { useAppStore } from "@/app/store/useAppStore";
import { theme } from "@/app/theme";
import { dbLedger, resetAllMocks } from "@/mocks/db";
import { server } from "@/mocks/server";
import { resetMonthlyGoalsMock } from "@/mocks/handlers";
import { analysisQueries, createAnalysis } from "./api/analysis";
import type { AnalyticsQuery } from "./model/analytics";
import { AiInsightsPage } from "./routes/AiInsightsPage";
import { loader } from "./routes/loader";

const all: AnalyticsQuery = { period: "ALL", start: null, endExclusive: null, categoryIds: [], cardNames: [] };
const unavailable = () => HttpResponse.json({ type: "about:blank", title: "Unavailable", status: 503 }, { status: 503 });

describe("vNext 소비 분석 통합 흐름", () => {
  let queryClient: QueryClient;
  const routers: ReturnType<typeof createMemoryRouter>[] = [];
  const requests: Request[] = [];
  const recordRequest = ({ request }: { request: Request }) => { requests.push(request.clone()); };
  const scope = () => useAppStore.getState().analysisNamespace;
  const posts = () => requests.filter((r) => r.method === "POST" && new URL(r.url).pathname === "/api/v2/analyses");

  beforeEach(() => {
    window.localStorage.clear();
    useAppStore.getState().clearSession();
    useAppStore.getState().setSession("test-session", "테스터");
    resetAllMocks();
    resetMonthlyGoalsMock();
    requests.length = 0;
    server.events.on("request:start", recordRequest);
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  });
  afterEach(() => {
    routers.splice(0).forEach((router) => router.dispose());
    queryClient.clear();
    server.events.removeListener("request:start", recordRequest);
    vi.restoreAllMocks();
  });

  const renderFeature = (entry = "/insights") => {
    const router = createMemoryRouter([
      { path: "/insights", element: <AiInsightsPage userScope={scope()} />, loader: loader(queryClient) },
      { path: "/washing", element: <h1>이용내역 정리 화면</h1> },
      { path: "/goals", element: <h1>목표 설정 화면</h1> },
    ], { initialEntries: [entry] });
    routers.push(router);
    render(<QueryClientProvider client={queryClient}><MantineProvider theme={theme}><RouterProvider router={router} /></MantineProvider></QueryClientProvider>);
    return router;
  };
  const ready = async () => {
    const button = await screen.findByRole("button", { name: "내 소비 분석하기" });
    await waitFor(() => expect(button).toBeEnabled());
    return button;
  };
  const analyze = async () => {
    fireEvent.click(await ready());
    await screen.findByText("핵심 발견");
  };
  const selectFuel = async () => {
    fireEvent.click(await screen.findByRole("button", { name: /^주유.*이 후보 선택하고 근거 보기/ }));
    return screen.findByRole("link", { name: "이 변화로 목표 시작하기" });
  };
  const seedRun = async (query = all) => {
    const snapshot = await queryClient.fetchQuery(analysisQueries.snapshot(scope(), query));
    return createAnalysis(query, snapshot.dataRevision);
  };

  it("서버 조회 후 조건과 분석 전 안내를 보여주고 자동으로 분석하지 않는다", async () => {
    renderFeature();
    await ready();
    expect(screen.getByLabelText("조회 기간")).toHaveValue("ALL");
    expect(screen.getByLabelText("카테고리")).toHaveValue("all");
    expect(screen.getByRole("heading", { name: "정리한 내역에서 나의 소비를 읽어볼까요?" })).toBeInTheDocument();
    expect(screen.queryByLabelText("실제 소비 시각화")).not.toBeInTheDocument();
    expect(posts()).toHaveLength(0);
  });

  it("미분류의 해석 한계를 알리고 이용내역 정리로 연결한다", async () => {
    renderFeature();
    await ready();
    expect(screen.getByText(/미분류 9건 · 분류 확인 필요 0건도 합계에 포함/)).toBeInTheDocument();
    expect(screen.queryByText(/전송 프롬프트/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "이용내역 정리하기" }));
    await screen.findByRole("heading", { name: "이용내역 정리 화면" });
  });

  it("서버 집계 revision으로 분석하고 필터 변경 시 이전 결과를 숨긴다", async () => {
    const router = renderFeature();
    await analyze();
    expect(screen.getByLabelText("실제 소비 시각화")).toBeInTheDocument();
    const id = new URLSearchParams(router.state.location.search).get("analysisRunId");
    const saved = await queryClient.fetchQuery(analysisQueries.run(scope(), id));
    expect(await posts()[0].json()).toEqual({ ...all, expectedDataRevision: saved.run!.snapshot.dataRevision });
    expect(saved.run!.snapshot.transactionCount).toBe(29); // 취소 거래 제외
    expect(screen.getByRole("heading", { name: /MSW 샘플 해석/ })).toHaveTextContent("359,800원");
    fireEvent.change(screen.getByLabelText("조회 기간"), { target: { value: "LAST_1_MONTH" } });
    expect(screen.queryByText("핵심 발견")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("실제 소비 시각화")).not.toBeInTheDocument();
    await analyze();
    expect(await posts()[1].json()).toMatchObject({ period: "LAST_1_MONTH", categoryIds: [] });
    expect(new URLSearchParams(router.state.location.search).get("analysisRunId")).not.toBe(id);
  });

  it("후보 선택 후 근거를 조회하고 두 ID를 목표 설정 화면에 전달한다", async () => {
    const router = renderFeature();
    await analyze();
    expect(screen.queryByRole("link", { name: "이 변화로 목표 시작하기" })).not.toBeInTheDocument();
    const id = new URLSearchParams(router.state.location.search).get("analysisRunId");
    const link = await selectFuel();
    await waitFor(() => expect(link).not.toHaveAttribute("data-disabled"));
    expect(link).toHaveAttribute("href", `/goals?analysisRunId=${id}&opportunityId=opportunity-7`);
    expect(screen.getByRole("button", { name: /^주유.*선택한 후보/ })).toHaveAttribute("aria-pressed", "true");
    expect(requests.some((r) => r.method === "POST" && r.url.includes("goal-cycles"))).toBe(false);
    fireEvent.click(link);
    await screen.findByRole("heading", { name: "목표 설정 화면" });
    expect(router.state.location.search).toBe(`?analysisRunId=${id}&opportunityId=opportunity-7`);
  });

  it("근거 조회 실패 시 선택을 유지하고 목표 이동을 막으며 재조회할 수 있다", async () => {
    server.use(http.get("/api/v2/analyses/:id/opportunities/:opportunityId", unavailable));
    renderFeature();
    await analyze();
    const link = await selectFuel();
    await screen.findByText("현재 근거를 확인하지 못했어요. 다시 확인해주세요.");
    expect(link).toHaveAttribute("data-disabled", "true");
    expect(screen.getByRole("button", { name: /^주유.*선택한 후보/ })).toHaveAttribute("aria-pressed", "true");
    server.resetHandlers();
    fireEvent.click(screen.getByRole("button", { name: "근거 다시 확인하기" }));
    await waitFor(() => expect(link).not.toHaveAttribute("data-disabled"));
  });

  it("후보의 근거가 최신 내역과 달라졌으면 목표 이동을 막는다", async () => {
    renderFeature();
    await analyze();
    const tx = dbLedger.getAll()[0];
    dbLedger.update(tx.id, { amount: tx.amount + 1000 });
    const link = await selectFuel();
    await screen.findByText("이용내역이 바뀌었습니다. 현재 내역으로 다시 분석해주세요.");
    expect(link).toHaveAttribute("data-disabled", "true");
  });

  it.each([0, 9])("집계 대상 %i건이면 실제 기록을 안내하고 AI 해석과 후보는 제공하지 않는다", async (count) => {
    dbLedger.getAll().slice(count).forEach(({ id }) => dbLedger.delete(id));
    renderFeature();
    fireEvent.click(await ready());
    await screen.findByText("AI 해석에는 소비 집계 대상 10건이 필요해요. 이용내역을 추가하면 다시 분석할 수 있어요.");
    expect(screen.getByText(new RegExp(`현재 ${count}건이에요`))).toBeInTheDocument();
    expect(screen.queryByText("핵심 발견")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "바꿔볼 한 가지를 골라보세요" })).not.toBeInTheDocument();
    expect(requests.some((r) => new URL(r.url).pathname === "/api/insights")).toBe(false);
  });

  it("필터 결과가 10건 미만이어도 해당 기록을 보여주며 범위를 넓혀 다시 분석할 수 있다", async () => {
    renderFeature();
    await ready();
    fireEvent.change(screen.getByLabelText("카테고리"), { target: { value: "1" } });
    fireEvent.click(await ready());
    await screen.findByText(/AI 해석에는 소비 집계 대상 10건이 필요해요/);
    expect(screen.getByLabelText("실제 소비 시각화")).toBeInTheDocument();
    expect(await posts()[0].json()).toMatchObject({ categoryIds: [1] });
    fireEvent.change(screen.getByLabelText("카테고리"), { target: { value: "all" } });
    await analyze();
  });

  it("정확히 10건의 미분류도 분석하고 AI 대기 중 시각화를 유지하며 중복 요청을 막는다", async () => {
    dbLedger.getAll().slice(10).forEach(({ id }) => dbLedger.delete(id));
    dbLedger.getAll().forEach(({ id }) => dbLedger.update(id, { categoryId: null, categoryName: null, isClassified: false }));
    const result = await seedRun();
    server.use(http.get("/api/v2/analyses", () => HttpResponse.json({ run: null, currentDataRevision: null, stale: false })),
      http.post("/api/v2/analyses", async () => { await delay(200); return HttpResponse.json(result); }));
    requests.length = 0;
    renderFeature();
    const button = await ready();
    fireEvent.click(button);
    await screen.findByRole("heading", { name: "소비의 근거를 읽고 있어요" });
    expect(screen.getByLabelText("실제 소비 시각화")).toBeInTheDocument();
    expect(screen.getByLabelText("조회 기간")).toBeDisabled();
    expect(screen.getByLabelText("카테고리")).toBeDisabled();
    fireEvent.click(button);
    await screen.findByText("핵심 발견");
    expect(posts()).toHaveLength(1);
    expect(result.run!.snapshot.transactionCount).toBe(10);
    expect(screen.getByText(/현재 근거에서는 카테고리별 변화 후보를 제안하지 않았어요/)).toBeInTheDocument();
  });

  it("AI 요청 오류에서도 시각화와 조건을 보존하고 같은 revision으로 재시도한다", async () => {
    server.use(http.post("/api/v2/analyses", unavailable));
    renderFeature();
    await ready();
    fireEvent.change(screen.getByLabelText("조회 기간"), { target: { value: "LAST_1_MONTH" } });
    fireEvent.click(await ready());
    await screen.findByText("AI 해석을 완료하지 못했어요");
    expect(screen.getByLabelText("실제 소비 시각화")).toBeInTheDocument();
    expect(screen.getByLabelText("조회 기간")).toHaveValue("LAST_1_MONTH");
    const payload = await posts()[0].json();
    server.resetHandlers();
    fireEvent.click(screen.getByRole("button", { name: "AI 해석 다시 시도하기" }));
    await screen.findByText("핵심 발견");
    expect(await posts()[1].json()).toEqual(payload);
  });

  it("재방문 시 서버 결과와 조건을 복원하고 재분석 없이 첫 소비 장면으로 스크롤한다", async () => {
    await seedRun({ ...all, period: "LAST_1_MONTH" });
    requests.length = 0;
    const scroll = vi.spyOn(HTMLElement.prototype, "scrollIntoView");
    renderFeature();
    await screen.findByText("핵심 발견");
    expect(screen.getByLabelText("조회 기간")).toHaveValue("LAST_1_MONTH");
    expect(screen.getByLabelText("실제 소비 시각화")).toBeInTheDocument();
    expect(posts()).toHaveLength(0);
    await waitFor(() => expect(scroll).toHaveBeenCalled());
    expect(scroll.mock.instances[0]).toBe(document.querySelector("[data-scene='0']"));
  });

  it("내역 변경 시 이전 결과를 숨기고 재분석 실패에도 저장된 성공 근거를 보존한다", async () => {
    const router = renderFeature();
    await analyze();
    const id = new URLSearchParams(router.state.location.search).get("analysisRunId")!;
    const previous = await queryClient.fetchQuery(analysisQueries.run(scope(), id));
    const tx = dbLedger.getAll()[0];
    dbLedger.update(tx.id, { amount: tx.amount + 1000 });
    await act(async () => { await queryClient.invalidateQueries({ queryKey: ["vnext-analytics"] }); });
    await screen.findByRole("heading", { name: "이용내역이 바뀌었어요" });
    expect(screen.queryByLabelText("실제 소비 시각화")).not.toBeInTheDocument();
    expect(screen.queryByText("핵심 발견")).not.toBeInTheDocument();
    server.use(http.post("/api/v2/analyses", unavailable));
    fireEvent.click(await ready());
    await screen.findByText("AI 해석을 완료하지 못했어요");
    expect(screen.queryByText("핵심 발견")).not.toBeInTheDocument();
    const preserved = await queryClient.fetchQuery({ ...analysisQueries.run(scope(), id), staleTime: 0 });
    expect(preserved.run).toEqual(previous.run);
    expect(preserved.stale).toBe(true);
  });

  it("집계 조회 실패 시 빈 집계로 분석하지 않고 재조회 후 요청을 허용한다", async () => {
    server.use(http.get("/api/v2/analytics", unavailable));
    renderFeature();
    await screen.findByText("분석 데이터를 가져오지 못했어요");
    expect(screen.getByRole("button", { name: "내 소비 분석하기" })).toBeDisabled();
    expect(posts()).toHaveLength(0);
    server.resetHandlers();
    fireEvent.click(screen.getByRole("button", { name: "다시 확인하기" }));
    await analyze();
  });
});
