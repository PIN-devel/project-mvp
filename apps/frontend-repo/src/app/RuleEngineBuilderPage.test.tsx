import { MemoryRouter } from "react-router";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { delay, http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { theme } from "@/app/theme";
import { RuleEngineBuilderPage } from "@/app/RuleEngineBuilderPage";
import { server } from "@/mocks/server";

describe("Rules route loading experience", () => {
  it("shows the rules-specific skeleton while its data is loading", async () => {
    server.use(
      http.get("/api/transactions", async () => {
        await delay("infinite");
        return HttpResponse.json([]);
      }),
      http.get("/api/categories", async () => {
        await delay("infinite");
        return HttpResponse.json([]);
      }),
    );

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MantineProvider theme={theme}>
          <MemoryRouter><RuleEngineBuilderPage /></MemoryRouter>
        </MantineProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByRole("status", { name: "규칙 화면을 불러오고 있어요." })).toBeInTheDocument();
    expect(screen.queryByText("나의 소비 기록")).not.toBeInTheDocument();
  });
});
