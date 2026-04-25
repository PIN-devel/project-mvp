import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MantineProvider } from "@mantine/core";
import { SamplePage } from "./routes/SamplePage";
import { action } from "./routes/action";
import { loader } from "./routes/loader";
import { theme } from "@/app/theme";
import { resetSamples } from "@/mocks/db";

/**
 * [핵심 통합 테스트]
 * 
 * 흐름: Component (UI) -> Action (Router) -> API (MSW) -> Component (Result)
 */
describe("Sample 기능 통합 테스트 Flow", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    resetSamples();

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
    const router = createMemoryRouter([
      {
        path: "/",
        element: <SamplePage />,
        loader: loader(queryClient),
        action: action(queryClient),
      },
    ], { initialEntries: ["/"] });

    return render(
      <QueryClientProvider client={queryClient}>
        <MantineProvider theme={theme}>
          <RouterProvider router={router} />
        </MantineProvider>
      </QueryClientProvider>
    );
  };

  it("초기 렌더링 시 MSW로부터 데이터를 조회하여 표시한다", async () => {
    renderFeature();
    await screen.findByDisplayValue("Hello World", {}, { timeout: 3000 });
    expect(screen.getByDisplayValue("Hello World")).toBeDefined();
    expect(screen.getByDisplayValue("System Down ASAP!")).toBeDefined();
  });

  it("새로운 샘플을 생성하면 API 호출 후 목록이 자동으로 갱신된다 (Full Flow)", async () => {
    renderFeature();
    await screen.findByDisplayValue("Hello World", {}, { timeout: 3000 });

    const input = screen.getByPlaceholderText(/메시지를 입력하세요/i);
    const form = input.closest("form")!;

    fireEvent.change(input, { target: { value: "New Integrated Test Sample" } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByDisplayValue("New Integrated Test Sample")).toBeDefined();
    }, { timeout: 5000 });
  });

  it("기존 샘플을 수정하면 UI에 즉시 반영된다", async () => {
    renderFeature();
    await screen.findByDisplayValue("Hello World", {}, { timeout: 3000 });

    const updateInput = screen.getByDisplayValue("Hello World");
    const updateButton = screen.getAllByRole("button", { name: /수정/i })[0];
    const form = updateButton.closest("form")!;

    fireEvent.change(updateInput, { target: { value: "Modified Message Content" } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Modified Message Content")).toBeDefined();
    }, { timeout: 5000 });
  });

  it("샘플 삭제 시 목록에서 제거된다", async () => {
    renderFeature();
    await screen.findByDisplayValue("Hello World", {}, { timeout: 3000 });

    const deleteButton = screen.getAllByRole("button", { name: "삭제" })[0];
    const deleteForm = deleteButton.closest("form")!;
    
    fireEvent.submit(deleteForm);

    await waitFor(() => {
      expect(screen.queryByDisplayValue("Hello World")).toBeNull();
    }, { timeout: 5000 });
  });
});
