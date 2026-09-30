import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { theme } from "@/app/theme";
import type { TransactionDto } from "../model/types";
import { SpendingDiscovery } from "./SpendingDiscovery";

const data: TransactionDto[] = [
  { id: 1, userId: 1, transactionDate: "2026-09-01", merchant: "식당", categoryId: 1, categoryName: "식비", amount: 8000, cardName: "카드", installment: 0, status: "승인", isClassified: true },
  { id: 2, userId: 1, transactionDate: "2026-09-03", merchant: "버스", categoryId: 2, categoryName: "교통", amount: 2000, cardName: "카드", installment: 0, status: "승인", isClassified: true },
];
const show = (transactions = data) => render(<MantineProvider theme={theme}><SpendingDiscovery transactions={transactions} categories={[]} /></MantineProvider>);

describe("spending discovery interaction", () => {
  it("shows three different questions before AI with exact source totals", () => {
    show();
    expect(screen.getByRole("group", { name: /카테고리별 소비 구조, 총 10,000원, 2건/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "기록을 시간 위에 펼쳐보면." })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "패턴 뒤에는 실제 거래가 있어요." })).toBeInTheDocument();
    expect(screen.queryByText(/예측|실제 절감/)).not.toBeInTheDocument();
  });
  it("supports keyboard category isolation without changing totals and touch-friendly interval selection", () => {
    show();
    const ring = screen.getByRole("button", { name: /교통 고리/ });
    fireEvent.keyDown(ring, { key: "Enter" });
    expect(ring).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("group", { name: /총 10,000원, 2건/ })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("시간 흐름 상세 구간"), { target: { value: "2026-09-02" } });
    expect(screen.getByText("2026-09-02 · 0원 · 0건", { selector: "p" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "카테고리 강조 해제" }));
    expect(ring).toHaveAttribute("aria-pressed", "false");
  });
  it("connects a selected bubble to its actual transactions through keyboard and select controls", () => {
    show();
    const chart = screen.getByRole("group", { name: /가맹점별 소비 분포/ });
    fireEvent.keyDown(within(chart).getByRole("button", { name: "버스, 2,000원, 1건" }), { key: " " });
    expect(screen.getByRole("heading", { name: "버스" })).toBeInTheDocument();
    expect(screen.getByText("전체 소비의 20% · 1건")).toBeInTheDocument();
    const selector = screen.getByLabelText("가맹점 상세 보기");
    fireEvent.change(selector, { target: { value: JSON.stringify(["id:1", "식당"]) } });
    expect(screen.getByRole("heading", { name: "식당" })).toBeInTheDocument();
    expect(screen.getByText("전체 소비의 80% · 1건")).toBeInTheDocument();
  });
  it("does not render fabricated charts in the empty or all-cancelled state", () => {
    show(data.map((t) => ({ ...t, status: "취소" })));
    expect(screen.getByRole("heading", { name: "아직 그릴 수 있는 소비 내역이 없어요" })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: /카테고리별 소비 구조/ })).not.toBeInTheDocument();
    expect(screen.getByText(/취소 2건/)).toBeInTheDocument();
  });
});
