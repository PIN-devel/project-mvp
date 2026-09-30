import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MantineProvider } from "@mantine/core";
import { createMemoryRouter, MemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { theme } from "../../app/theme";
import { dbLedger, resetLedgerTransactions, resetWashingTransactions } from "../../mocks/db";
import { server } from "../../mocks/server";
import { FirstExperienceHero } from "./ui/FirstExperienceHero";
import type { WashingOverview } from "./model/types";
import { action } from "./routes/action";
import { loader } from "./routes/loader";
import { WashingPage } from "./routes/WashingPage";

describe("Washing feature integration flow", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    resetLedgerTransactions();
    resetWashingTransactions();
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
          element: <WashingPage />,
          loader: loader(queryClient),
          action: action(queryClient),
        },
        { path: "/insights", element: <h1>소비 분석 화면</h1> },
        { path: "/rules", element: <h1>자동 분류 규칙 화면</h1> },
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

  it("shows the real classification state and provides the existing ledger view", async () => {
    renderFeature();

    await screen.findByRole("heading", { name: /조금씩 선명해지는/ }, { timeout: 3000 });
    expect(screen.getByRole("button", { name: /남은 9건 분류하기/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "분류할 내역" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: /전체 내역/ }));
    expect(screen.getByText("태그")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /현재 내역으로 소비 분석 보기/ }));
    expect(await screen.findByRole("heading", { name: "소비 분석 화면" })).toBeInTheDocument();
  });

  it("keeps bulk wash waiting items aligned with source-data unclassified rows", async () => {
    renderFeature();

    await screen.findByRole("heading", { name: "분류할 내역" }, { timeout: 3000 });
    fireEvent.click(screen.getByRole("tab", { name: /전체 내역/ }));

    fireEvent.change(screen.getByLabelText("분류 상태"), {
      target: { value: "unclassified" },
    });

    const tables = document.querySelectorAll("table");
    const bulkWashTable = tables[0];
    const sourceTable = tables[1];
    expect(bulkWashTable).toBeDefined();
    expect(sourceTable).toBeDefined();
    if (!bulkWashTable || !sourceTable) throw new Error("Expected both washing tables");

    const bulkRows = bulkWashTable.querySelectorAll("tbody tr");
    const unclassifiedSourceRows = sourceTable.querySelectorAll("tbody tr");

    expect(bulkRows.length).toBe(unclassifiedSourceRows.length);
  });

  it("does not expose the mock import button", async () => {
    renderFeature();

    await screen.findByRole("heading", { name: "분류할 내역" }, { timeout: 3000 });
    expect(screen.queryByRole("button", { name: "Mock 데이터 추가 적재" })).not.toBeInTheDocument();
  });

  it("opens a detail modal for a single unclassified item and saves its category", async () => {
    renderFeature();

    await screen.findByRole("heading", { name: "분류할 내역" }, { timeout: 3000 });

    const bulkWashTable = document.querySelectorAll("table")[0];
    expect(bulkWashTable).toBeDefined();
    if (!bulkWashTable) throw new Error("Expected bulk wash table");

    const initialRows = bulkWashTable.querySelectorAll("tbody tr");
    expect(initialRows.length).toBeGreaterThan(0);

    const firstRow = initialRows[0];
    if (!firstRow) throw new Error("Expected first bulk wash row");

    fireEvent.click(firstRow);

    const dialog = await screen.findByRole("dialog");
    const modalCategorySelect = within(dialog).getByRole("combobox");
    fireEvent.change(modalCategorySelect, { target: { value: "1:식음료" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "저장" }));

    await waitFor(() => {
      expect(within(dialog).queryByRole("button", { name: "저장" })).not.toBeInTheDocument();
    });

    await waitFor(() => {
      const updatedRows = document.querySelectorAll("table")[0]?.querySelectorAll("tbody tr");
      expect(updatedRows?.length).toBe(initialRows.length - 1);
    });
    expect(screen.getByRole("button", { name: /남은 8건 분류하기/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /전체 내역/ }));
    fireEvent.change(screen.getByLabelText("분류 상태"), {
      target: { value: "unclassified" },
    });

    const sourceTable = document.querySelectorAll("table")[1];
    const remainingSourceRows = sourceTable?.querySelectorAll("tbody tr");
    const remainingBulkRows = document.querySelectorAll("table")[0]?.querySelectorAll("tbody tr");

    expect(remainingSourceRows?.length).toBe(remainingBulkRows?.length);
  });

  it("saves both category and mapping rule tag from the source data table", async () => {
    renderFeature();

    await screen.findByRole("heading", { name: "분류할 내역" }, { timeout: 3000 });
    fireEvent.click(screen.getByRole("tab", { name: /전체 내역/ }));

    const sourceTable = document.querySelectorAll("table")[1];
    expect(sourceTable).toBeDefined();
    if (!sourceTable) throw new Error("Expected source data table");

    const firstDataRow = sourceTable.querySelector<HTMLElement>("tbody tr");
    expect(firstDataRow).not.toBeNull();
    if (!firstDataRow) throw new Error("Expected source data row");

    const categorySelect = within(firstDataRow).getByRole("combobox");
    const selectableOptions = Array.from(categorySelect.querySelectorAll("option")).filter(
      (option) => option.value !== "",
    );
    expect(selectableOptions.length).toBeGreaterThan(0);
    fireEvent.change(categorySelect, { target: { value: selectableOptions[0]?.value } });

    const memoInput = within(firstDataRow).getByRole("textbox");
    expect(memoInput).toHaveAttribute("readonly");
    fireEvent.focus(memoInput);
    fireEvent.change(memoInput, { target: { value: "rule-tag-test" } });

    fireEvent.click(within(firstDataRow).getByRole("button", { name: "저장" }));

    await waitFor(() => {
      expect(within(firstDataRow).getByDisplayValue("rule-tag-test")).toBeInTheDocument();
    });
  });

  it("distinguishes an empty account and opens the shared Excel modal", async () => {
    dbLedger.getAll().forEach(({ id }) => dbLedger.delete(id));
    renderFeature();
    await screen.findByRole("heading", { name: /내역을 넘어/ });
    expect(screen.getByText("아직 등록한 내역이 없어요")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Excel 이용내역 업로드/ }));
    expect(await screen.findByRole("dialog")).toHaveTextContent("신한카드와 KB국민카드");
  });

  it("shows Ready from actual counts and allows analysis navigation", async () => {
    dbLedger.getAll().filter((tx) => tx.categoryId == null).forEach(({ id }) =>
      dbLedger.update(id, { categoryId: 1, categoryName: "식음료", isClassified: true }),
    );
    renderFeature();
    await screen.findByRole("heading", { name: /내역 분류는 끝났어요/ });
    expect(screen.getByText("분류한 내역의 구성", { exact: false })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /소비 분석으로 이어가기/ }));
    expect(await screen.findByRole("heading", { name: "소비 분석 화면" })).toBeInTheDocument();
  });

  it("returns from Ready to In Progress when an existing transaction becomes unclassified", async () => {
    dbLedger.getAll().filter((tx) => tx.categoryId == null).forEach(({ id }) =>
      dbLedger.update(id, { categoryId: 1, categoryName: "식음료", isClassified: true }),
    );
    renderFeature();
    await screen.findByRole("heading", { name: /내역 분류는 끝났어요/ });
    fireEvent.click(screen.getByRole("tab", { name: /전체 내역/ }));
    const row = document.querySelector("#work-all tbody tr");
    if (!row) throw new Error("Expected a ledger row");
    fireEvent.change(within(row as HTMLElement).getByRole("combobox"), { target: { value: "" } });
    fireEvent.click(within(row as HTMLElement).getByRole("button", { name: "저장" }));
    expect(await screen.findByRole("button", { name: /남은 1건 분류하기/ })).toBeInTheDocument();
  });

  it("never rounds an unfinished classification to 100%", () => {
    const transactions: WashingOverview["transactions"] = Array.from({ length: 201 }, (_, index) => ({
      id: index + 1, occurredAt: "2026-09-29", merchantName: "가맹점", description: "",
      cardLabel: "카드", amount: 1000, category: index === 200 ? null : "식비",
      isClassified: index !== 200, matchedRuleLabel: null, tag: "", source: "CARD",
    }));
    render(<MemoryRouter><FirstExperienceHero overview={{ transactions, categories: ["식비"], lastImportedAt: "" }} onUpload={() => {}} onOrganize={() => {}} onSeeRecords={() => {}} /></MemoryRouter>);
    expect(screen.getByText("99+")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /남은 1건 분류하기/ })).toBeInTheDocument();
    expect(screen.queryByText("✓ 분류 완료")).not.toBeInTheDocument();
  });

  it.each([1, 7, 9])("%i건 모두 분류하면 추가 업로드와 내역 다시 보기를 제공한다", async (count) => {
    dbLedger.getAll().slice(count).forEach(({ id }) => dbLedger.delete(id));
    dbLedger.getAll().forEach(({ id }) => dbLedger.update(id, { categoryId: 1, categoryName: "식음료", isClassified: true }));
    renderFeature();
    const primary = await screen.findByRole("button", { name: "이용내역 더 추가하기" });
    expect(screen.getByText(`현재 ${count}건 · ${10 - count}건 더 필요해요.`)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /소비 분석으로 이어가기|현재 내역으로 소비 분석 보기/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "남은 0건 분류하기" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /내역 다시 보기/ }));
    expect(screen.getByRole("tab", { name: /전체 내역/ })).toHaveAttribute("aria-selected", "true");
    fireEvent.click(primary);
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it.each([false, true])("정확히 10건에서 분류 완료=%s에 맞는 CTA를 제공한다", async (classified) => {
    dbLedger.getAll().slice(10).forEach(({ id }) => dbLedger.delete(id));
    dbLedger.getAll().forEach(({ id }) => dbLedger.update(id, { categoryId: classified ? 1 : null, categoryName: classified ? "식음료" : null, isClassified: classified }));
    renderFeature();
    const primary = await screen.findByRole("button", { name: classified ? "소비 분석으로 이어가기" : "소비 내역 분류 시작하기" });
    if (!classified) {
      expect(screen.queryByRole("button", { name: "남은 10건 분류하기" })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "현재 내역으로 소비 분석 보기" })).toBeInTheDocument();
      fireEvent.click(primary);
      expect(screen.getByRole("tab", { name: /분류할 내역/ })).toHaveAttribute("aria-selected", "true");
    } else {
      fireEvent.click(primary);
      expect(await screen.findByRole("heading", { name: "소비 분석 화면" })).toBeInTheDocument();
    }
  });

  it("일괄 분류는 명시적인 카테고리 선택 후 실행하고 선택을 해제한다", async () => {
    renderFeature();
    await screen.findByRole("heading", { name: "분류할 내역" });
    const checkbox = screen.getByRole("checkbox", { name: "에이블리 선택" });
    fireEvent.click(checkbox);
    const submit = screen.getByRole("button", { name: "선택한 내역 분류하기" });
    expect(submit).toBeDisabled();
    expect(screen.getByLabelText("분류할 카테고리")).toHaveValue("");
    fireEvent.change(screen.getByLabelText("분류할 카테고리"), { target: { value: "1:식음료" } });
    fireEvent.click(submit);
    await screen.findByRole("button", { name: "남은 8건 분류하기" });
    expect(screen.getByRole("button", { name: "선택한 내역 분류하기" })).toBeDisabled();
    expect(screen.queryByRole("checkbox", { name: "에이블리 선택" })).not.toBeInTheDocument();
  });

  it("개별 분류 실패 시 선택과 모달을 보존하고 재시도한다", async () => {
    server.use(http.patch("/api/transactions/:id/category", () => HttpResponse.json({ status: 503 }, { status: 503 })));
    renderFeature();
    await screen.findByRole("heading", { name: "분류할 내역" });
    fireEvent.click(screen.getByRole("button", { name: "에이블리 분류" }));
    const dialog = await screen.findByRole("dialog");
    const select = within(dialog).getByRole("combobox");
    expect(select).toHaveValue("");
    expect(within(dialog).getByRole("button", { name: "저장" })).toBeDisabled();
    fireEvent.change(select, { target: { value: "1:식음료" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "저장" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("선택한 카테고리는 그대로예요");
    expect(select).toHaveValue("1:식음료");
    server.resetHandlers();
    fireEvent.click(within(dialog).getByRole("button", { name: "저장" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("honors the server classification flag consistently in Hero and ledger filtering", async () => {
    dbLedger.update(1, { isClassified: false });
    renderFeature();
    await screen.findByRole("button", { name: /남은 10건 분류하기/ });
    fireEvent.click(screen.getByRole("tab", { name: /전체 내역/ }));
    fireEvent.change(screen.getByLabelText("분류 상태"), { target: { value: "unclassified" } });
    const sourceTable = document.querySelectorAll("table")[1];
    if (!sourceTable) throw new Error("Expected ledger table");
    expect(within(sourceTable).getByText("GS25 역삼점")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: /분류할 내역/ }));
    fireEvent.click(screen.getByRole("button", { name: "GS25 역삼점 분류" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByRole("combobox"), { target: { value: "6:편의점" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "저장" }));
    await screen.findByRole("button", { name: /남은 9건 분류하기/ });
    expect(dbLedger.getAll().find(({ id }) => id === 1)?.isClassified).toBe(true);
  });

  it("shows a data error instead of an empty account and retries the same query", async () => {
    server.use(http.get("/api/transactions", () => HttpResponse.json({ invalid: "response" })));
    renderFeature();
    await screen.findByRole("heading", { name: /소비 기록을 확인할 수 없어요/ });
    expect(screen.queryByText("아직 등록한 내역이 없어요")).not.toBeInTheDocument();
    server.resetHandlers();
    fireEvent.click(screen.getByRole("button", { name: "다시 불러오기" }));
    expect(await screen.findByRole("heading", { name: /조금씩 선명해지는/ })).toBeInTheDocument();
  });
});
