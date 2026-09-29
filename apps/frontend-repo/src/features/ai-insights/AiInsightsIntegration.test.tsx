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

  it("connects actual insight results to the existing goal selection", async () => {
    renderFeature();

    await screen.findByText("내 소비를 이해하는 첫 번째 발견", {}, { timeout: 3000 });
    fireEvent.click(screen.getByRole("button", { name: "내 소비 분석하기" }));

    await screen.findByText("다음에 바꿔볼 행동을 골라보세요", {}, { timeout: 3000 });
    expect(screen.getByText(/목표 금액은 선택한 이용내역에서 계산한 계획값/)).toBeInTheDocument();
    expect(screen.getByText("이용내역을 바탕으로 목표를 살펴보기")).toBeInTheDocument();

    const chooseButtons = screen.getAllByRole("button", { name: "이 목표 선택" });
    fireEvent.click(chooseButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("선택됨")).toBeInTheDocument();
    });
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
    expect(await screen.findByText("목표 정보를 불러오지 못했어요")).toBeInTheDocument();
    expect(screen.getByText("가장 큰 지출 영역")).toBeInTheDocument();
  });
});
