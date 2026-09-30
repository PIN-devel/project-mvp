import { MantineProvider } from "@mantine/core";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { routes, router as browserRouter } from "./router";
import { queryClient } from "./queryClient";
import { theme } from "./theme";
import { useAppStore } from "./store/useAppStore";
import { server } from "@/mocks/server";

describe("첫 경험과 인증 경계", () => {
  beforeEach(() => {
    browserRouter.dispose();
    queryClient.clear();
    useAppStore.getState().clearSession();
  });
  afterEach(() => queryClient.clear());

  const renderRoute = (path: string) => {
    const router = createMemoryRouter(routes, { initialEntries: [path] });
    render(<QueryClientProvider client={queryClient}><MantineProvider theme={theme}><RouterProvider router={router} /></MantineProvider></QueryClientProvider>);
    return router;
  };

  it("비로그인 첫 화면은 API를 조회하지 않고 업로드 시 로그인으로 이동한다", async () => {
    const read = vi.fn(() => HttpResponse.json([]));
    server.use(http.get("/api/transactions", read), http.get("/api/categories", read));
    const router = renderRoute("/");
    await screen.findByRole("button", { name: "Excel 이용내역 업로드" });
    expect(router.state.location.pathname).toBe("/washing");
    expect(read).not.toHaveBeenCalled();
    expect(screen.getAllByRole("tab").slice(0, 3).map((tab) => tab.textContent)).toEqual(["이용내역", "소비 분석", "자동 분류 규칙"]);
    fireEvent.click(screen.getByRole("button", { name: "Excel 이용내역 업로드" }));
    await waitFor(() => expect(router.state.location.pathname).toBe("/login"));
    expect(read).not.toHaveBeenCalled();
    router.dispose();
  });

  it.each(["/insights", "/rules", "/sample"])("비로그인 %s 진입은 데이터 조회 전에 차단한다", async (path) => {
    const read = vi.fn(() => HttpResponse.json([]));
    server.use(http.get("/api/transactions", read), http.get("/api/categories", read), http.get("/api/sample", read));
    const router = renderRoute(path);
    await waitFor(() => expect(router.state.location.pathname).toBe("/login"));
    expect(read).not.toHaveBeenCalled();
    router.dispose();
  });

  it("공개 첫 화면에서 보호 탭으로 이동해도 인증 경계를 유지한다", async () => {
    const router = renderRoute("/washing");
    await screen.findByRole("button", { name: "Excel 이용내역 업로드" });
    fireEvent.click(screen.getByRole("tab", { name: "소비 분석" }));
    await waitFor(() => expect(router.state.location.pathname).toBe("/login"));
    router.dispose();
  });

  it("로그인 계정 메뉴에서 로그아웃하면 세션을 지우고 로그인으로 이동한다", async () => {
    useAppStore.getState().setSession("test-token", "미리보기 사용자");
    const router = renderRoute("/washing");
    fireEvent.click(await screen.findByRole("button", { name: "미리보기 사용자 계정 메뉴" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "로그아웃" }));
    await waitFor(() => expect(router.state.location.pathname).toBe("/login"));
    expect(useAppStore.getState().isAuthenticated).toBe(false);
    router.dispose();
  });

  it("공개 이용내역 화면에서도 비로그인 변경 요청은 인증 전에 실행하지 않는다", async () => {
    const mutate = vi.fn(() => HttpResponse.json({}));
    server.use(http.post("/api/transactions/bulk-classify", mutate));
    const router = renderRoute("/washing");
    await screen.findByRole("button", { name: "Excel 이용내역 업로드" });
    const formData = new FormData();
    formData.set("intent", "bulk_wash");
    formData.set("ids", "1");
    formData.set("category", "1:식음료");
    await act(() => router.navigate("/washing", { formMethod: "post", formData }));
    expect(router.state.location.pathname).toBe("/login");
    expect(mutate).not.toHaveBeenCalled();
    router.dispose();
  });
});
