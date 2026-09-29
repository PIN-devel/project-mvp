import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { theme } from "@/app/theme";
import { resetAllMocks } from "@/mocks/db";
import { server } from "@/mocks/server";
import { AiInsightsPage } from "@/features/ai-insights/routes/AiInsightsPage";
import { loader } from "@/features/ai-insights/routes/loader";

describe("AI insights integration flow", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    window.localStorage.clear();
    resetAllMocks();
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

    await screen.findByText("분류가 필요한 내역이 있어요", {}, { timeout: 3000 });

    expect(screen.getByText(/미분류 거래 \d+건/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "이용내역 정리하기" })).toBeInTheDocument();
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

    fireEvent.click(screen.getByRole("button", { name: "내 소비 분석하기" }));
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
});
