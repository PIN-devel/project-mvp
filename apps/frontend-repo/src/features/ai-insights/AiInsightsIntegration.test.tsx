import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { delay, http, HttpResponse } from "msw";
import { theme } from "@/app/theme";
import { dbLedger, resetAllMocks } from "@/mocks/db";
import { server } from "@/mocks/server";
import { resetMonthlyGoalsMock } from "@/mocks/handlers";
import { AiInsightsPage } from "@/features/ai-insights/routes/AiInsightsPage";
import { loader } from "@/features/ai-insights/routes/loader";

describe("AI insights integration flow", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    window.localStorage.clear();
    resetAllMocks();
    resetMonthlyGoalsMock();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          staleTime: Infinity,
        },
      },
    });
  });

  const renderFeature = () => {
    const router = createMemoryRouter(
      [
        {
          path: "/",
          element: <AiInsightsPage />,
          loader: loader(queryClient),
        },
      ],
      { initialEntries: ["/"] },
    );

    return render(
      <QueryClientProvider client={queryClient}>
        <MantineProvider theme={theme}>
          <RouterProvider router={router} />
        </MantineProvider>
      </QueryClientProvider>,
    );
  };

  it("renders request controls and an initial state before analysis", async () => {
    renderFeature();

    await screen.findByText("내 소비를 이해하는 첫 번째 발견", {}, { timeout: 3000 });

    expect(screen.getByLabelText("조회 기간")).toBeInTheDocument();
    expect(screen.getByLabelText("카테고리")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "내 소비 분석하기" }),
    ).toBeInTheDocument();
    expect(screen.getByText("정리한 내역에서 나의 소비를 읽어볼까요?")).toBeInTheDocument();
  });

  it("explains unclassified transactions without exposing the prompt", async () => {
    renderFeature();

    await screen.findByText(/미분류 내역도 분석에 포함돼요/, {}, { timeout: 3000 });

    expect(screen.getByText(/분류 \d+건 · 미분류 \d+건/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /남은 \d+건 분류하기/ })).toBeInTheDocument();
    expect(screen.queryByText(/전송 프롬프트/)).not.toBeInTheDocument();
  });

  it("generates insight results, supports re-request, and marks stale results when filters change", async () => {
    renderFeature();

    await screen.findByText("내 소비를 이해하는 첫 번째 발견", {}, { timeout: 3000 });

    fireEvent.click(screen.getByRole("button", { name: "내 소비 분석하기" }));

    await screen.findByText("이 내역에서 발견한 점", {}, { timeout: 3000 });
    expect(screen.getByText("가장 큰 지출 영역")).toBeInTheDocument();
    expect(screen.getByText("반복 소비 패턴")).toBeInTheDocument();
    expect(screen.getByText("소비 점검 포인트")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("조회 기간"), {
      target: { value: "LAST_1_MONTH" },
    });

    expect(
      await screen.findByText(/조회 조건이 바뀌었어요/),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "다시 분석하기" }));
    await waitFor(() => {
      expect(
        screen.queryByText(/조회 조건이 바뀌었어요/),
      ).not.toBeInTheDocument();
    });
  });

  it("selects a plan separately and saves it through the goal API", async () => {
    renderFeature();

    await screen.findByText("내 소비를 이해하는 첫 번째 발견", {}, { timeout: 3000 });
    fireEvent.click(screen.getByRole("button", { name: "내 소비 분석하기" }));

    await screen.findByText("발견을 나의 선택으로.", {}, { timeout: 3000 });
    expect(screen.getByText("바꿔볼 목표 고르기")).toBeInTheDocument();
    expect(screen.getByText(/한 거래월의 실제 분류 내역/)).toBeInTheDocument();

    const chooseButtons = screen.getAllByRole("button", { name: "이 계획 선택" });
    fireEvent.click(chooseButtons[0]);
    expect(screen.getByRole("button", { name: "이 목표 저장하기" })).toBeInTheDocument();
    expect(screen.queryByText("저장 완료")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "이 목표 저장하기" }));
    expect(await screen.findByText("저장 완료")).toBeInTheDocument();
    expect(await screen.findByText("저장된 목표 1건 보기")).toBeInTheDocument();
  });

  it("shows saved goals even when there is no AI result", async () => {
    server.use(
      http.get("/api/monthly-goals", () =>
        HttpResponse.json([
          {
            id: 91,
            month: "2026-06",
            title: "저장 데이터 목표",
            targetCategory: "교통",
            reductionRatio: 0.3,
            baselineAmount: 100000,
            targetAmount: 70000,
            monthlySave: 30000,
            status: "active",
            actualSaved: null,
            createdAt: "2026-06-01T00:00:00Z",
            updatedAt: "2026-06-01T00:00:00Z",
          },
        ]),
      ),
    );

    renderFeature();

    expect(await screen.findAllByText("저장 데이터 목표")).toHaveLength(2);
    expect(screen.queryByText("이 내역에서 발견한 점")).not.toBeInTheDocument();
    expect(screen.queryByText("30,000원 절감했어요")).not.toBeInTheDocument();
  });

  it("keeps the selected plan and replacement notice when saving fails", async () => {
    server.use(
      http.get("/api/monthly-goals", () =>
        HttpResponse.json([
          {
            id: 92,
            month: "2026-06",
            title: "기존 교통 목표",
            targetCategory: "교통",
            reductionRatio: 0.2,
            baselineAmount: 100000,
            targetAmount: 80000,
            monthlySave: 20000,
            status: "active",
            actualSaved: null,
            createdAt: "2026-06-01T00:00:00Z",
            updatedAt: "2026-06-01T00:00:00Z",
          },
        ]),
      ),
      http.put("/api/monthly-goals/:month", () =>
        HttpResponse.json({ status: 503 }, { status: 503 }),
      ),
    );

    renderFeature();
    await screen.findByText("저장된 목표 1건 보기");
    fireEvent.click(screen.getByRole("button", { name: "다른 목표 살펴보기" }));
    await screen.findByText("주유 30% 줄이기");

    fireEvent.click(screen.getAllByRole("button", { name: "이 계획 선택" })[0]);
    expect(await screen.findByText(/기존 교통 목표 목표를 새 선택으로 교체합니다/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "기존 목표 교체하기" }));

    expect(await screen.findByText("저장 실패")).toBeInTheDocument();
    expect(screen.getByText("선택됨")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "교체 다시 시도하기" })).toBeInTheDocument();
  });

  it("keeps a successful insight visible when the separate goal lookup fails", async () => {
    server.use(
      http.get("/api/monthly-goals", () =>
        HttpResponse.json(
          { type: "about:blank", title: "Unavailable", status: 503 },
          { status: 503 },
        ),
      ),
    );

    renderFeature();
    await screen.findByText("내 소비를 이해하는 첫 번째 발견", {}, { timeout: 3000 });
    fireEvent.click(screen.getByRole("button", { name: "내 소비 분석하기" }));

    expect(await screen.findByText("이 내역에서 발견한 점", {}, { timeout: 3000 })).toBeInTheDocument();
    expect(await screen.findByText("저장된 목표를 불러오지 못했어요")).toBeInTheDocument();
    expect(screen.getByText("가장 큰 지출 영역")).toBeInTheDocument();
  });

  it.each([0, 9])("전체 내역 %i건이면 추가 업로드로 안내하고 AI를 호출하지 않는다", async (count) => {
    dbLedger.getAll().slice(count).forEach(({ id }) => dbLedger.delete(id));
    const generate = vi.fn(() => HttpResponse.json({}));
    server.use(http.post("/api/insights", generate));
    renderFeature();
    expect(await screen.findByRole("button", { name: "이용내역 더 추가하기" })).toBeEnabled();
    expect(screen.getByText(`현재 ${count}건 · ${10 - count}건 더 추가하면 분석할 수 있어요.`)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "내 소비 분석하기" })).not.toBeInTheDocument();
    expect(generate).not.toHaveBeenCalled();
  });

  it("전체 데이터가 충분해도 필터 결과가 10건 미만이면 범위를 넓히도록 안내한다", async () => {
    const generate = vi.fn(() => HttpResponse.json({}));
    server.use(http.post("/api/insights", generate));
    renderFeature();
    await screen.findByRole("button", { name: "내 소비 분석하기" });
    fireEvent.change(screen.getByLabelText("카테고리"), { target: { value: "1" } });
    const button = screen.getByRole("button", { name: "내 소비 분석하기" });
    expect(button).toBeDisabled();
    expect(screen.getByText(/기간이나 카테고리 범위를 넓혀 최소 10건/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "이용내역 더 추가하기" })).not.toBeInTheDocument();
    fireEvent.click(button);
    expect(generate).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("카테고리"), { target: { value: "all" } });
    expect(button).toBeEnabled();
  });

  it("정확히 10건의 미분류 내역도 분석하고 Loading 중 중복 실행을 막는다", async () => {
    dbLedger.getAll().slice(10).forEach(({ id }) => dbLedger.delete(id));
    dbLedger.getAll().forEach(({ id }) => dbLedger.update(id, { categoryId: null, categoryName: null, isClassified: false }));
    const generate = vi.fn(async ({ request }: { request: Request }) => {
      const payload = await request.json() as { transactions: unknown[] };
      expect(payload.transactions).toHaveLength(10);
      await delay(100);
      return HttpResponse.json({ summary: "확인한 소비 흐름", cards: [{ title: "세부 발견", description: "실제 이용내역의 특징" }], generatedAt: "2026-09-30T05:00:00Z" });
    });
    server.use(http.post("/api/insights", generate));
    renderFeature();
    const button = await screen.findByRole("button", { name: "내 소비 분석하기" });
    fireEvent.click(button);
    await screen.findByText("선택한 내역을 읽고 있어요");
    expect(screen.getByLabelText("조회 기간")).toBeDisabled();
    expect(screen.getByLabelText("카테고리")).toBeDisabled();
    fireEvent.click(button);
    await screen.findByRole("heading", { name: "확인한 소비 흐름" });
    expect(generate).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "개선 목표 살펴보기" })).toBeInTheDocument();
  });

  it("분석 오류에서 조건을 보존하고 같은 범위로 재시도한다", async () => {
    server.use(http.post("/api/insights", () => HttpResponse.json({ type: "INS002", status: 503 }, { status: 503 })));
    renderFeature();
    await screen.findByRole("button", { name: "내 소비 분석하기" });
    fireEvent.change(screen.getByLabelText("조회 기간"), { target: { value: "LAST_1_MONTH" } });
    fireEvent.click(screen.getByRole("button", { name: "내 소비 분석하기" }));
    expect(await screen.findByText("이번 분석 결과를 가져오지 못했어요")).toBeInTheDocument();
    expect(screen.getByLabelText("조회 기간")).toHaveValue("LAST_1_MONTH");
    server.resetHandlers();
    fireEvent.click(screen.getByRole("button", { name: "같은 조건으로 다시 시도하기" }));
    expect(await screen.findByText("이 내역에서 발견한 점")).toBeInTheDocument();
  });

  it("결과에서 목표로 Focus를 옮기고 저장 후 상태까지 확인한다", async () => {
    renderFeature();
    fireEvent.click(await screen.findByRole("button", { name: "내 소비 분석하기" }));
    fireEvent.click(await screen.findByRole("button", { name: "개선 목표 살펴보기" }));
    const section = document.getElementById("goal-selection");
    await waitFor(() => expect(section).toHaveFocus());
    fireEvent.click(screen.getAllByRole("button", { name: "이 계획 선택" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "이 목표 저장하기" }));
    await screen.findByText("저장 완료");
    fireEvent.click(screen.getByText("저장된 목표 1건 보기"));
    fireEvent.click(screen.getByRole("button", { name: "완수로 표시" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "완수로 표시" })).not.toBeInTheDocument());
    expect(within(section!).getAllByText(/완수로 표시/).length).toBeGreaterThan(0);
  });
});
