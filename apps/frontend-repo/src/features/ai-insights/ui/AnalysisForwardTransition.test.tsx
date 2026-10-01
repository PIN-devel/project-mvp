import { MantineProvider } from "@mantine/core";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AnalysisForwardTransition } from "./AnalysisForwardTransition";

const show = (enabled = true) => render(<MantineProvider>
  <AnalysisForwardTransition enabled={enabled} goal={<button>목표 후보 선택</button>}>
    <h2>계산 근거가 있는 발견</h2>
  </AnalysisForwardTransition>
</MantineProvider>);

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("분석에서 행동으로 이어지는 전환", () => {
  it("모든 내용을 처음부터 유지하며 스크롤로만 다음 공간을 열고 역스크롤도 지원한다", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    vi.stubGlobal("ResizeObserver", undefined);
    vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame"] });
    vi.spyOn(window, "matchMedia").mockReturnValue(Object.assign(new EventTarget(), { matches: false }) as MediaQueryList);
    let top = window.innerHeight;
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(() => new DOMRect(0, top, 1000, 1200));
    const view = show();
    const journey = view.container.querySelector<HTMLElement>("[data-forward-journey]")!;
    expect(screen.getByRole("heading")).toHaveTextContent("계산 근거가 있는 발견");
    expect(screen.getByRole("button", { name: "목표 후보 선택" })).toBeInTheDocument();
    expect(journey.style.getPropertyValue("--forward-progress")).toBe("0");
    top = window.innerHeight * .35;
    act(() => { fireEvent.scroll(window); vi.advanceTimersByTime(16); });
    expect(Number(journey.style.getPropertyValue("--forward-progress"))).toBeCloseTo(.65);
    expect(Number(journey.style.getPropertyValue("--forward-headline"))).toBeGreaterThan(0);
    expect(journey.style.getPropertyValue("--forward-evidence")).toBe("0");
    expect(journey).toHaveAttribute("data-forward-content", "waiting");
    top = -100;
    act(() => { fireEvent.scroll(window); vi.advanceTimersByTime(16); });
    expect(journey.style.getPropertyValue("--forward-action")).toBe("1");
    expect(journey).toHaveAttribute("data-forward-content", "ready");
    top = window.innerHeight;
    act(() => { fireEvent.scroll(window); vi.advanceTimersByTime(16); });
    expect(journey.style.getPropertyValue("--forward-progress")).toBe("0");
    const remove = vi.spyOn(window, "removeEventListener");
    view.unmount();
    expect(remove).toHaveBeenCalledWith("scroll", expect.any(Function));
  });

  it("모션 감소 설정과 CTA 이동에서는 다음 내용을 즉시 읽고 조작할 수 있다", () => {
    vi.spyOn(window, "matchMedia").mockReturnValue(Object.assign(new EventTarget(), { matches: true }) as MediaQueryList);
    const scroll = vi.spyOn(HTMLElement.prototype, "scrollIntoView");
    const view = show();
    const journey = view.container.querySelector<HTMLElement>("[data-forward-journey]")!;
    expect(journey.style.getPropertyValue("--forward-headline")).toBe("1");
    expect(journey.style.getPropertyValue("--forward-action")).toBe("1");
    fireEvent.click(screen.getByRole("button", { name: "이 발견으로 바꿔볼 한 가지 찾기" }));
    expect(scroll).toHaveBeenCalledWith({ behavior: "instant", block: "start" });
    expect(screen.getByLabelText("분석에서 다음 행동으로")).toHaveFocus();
  });

  it("변화 후보가 없는 결과에는 전환 CTA를 만들지 않고 기존 내용을 보존한다", () => {
    show(false);
    expect(screen.getByRole("heading")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "목표 후보 선택" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "이 발견으로 바꿔볼 한 가지 찾기" })).not.toBeInTheDocument();
    expect(document.querySelector("[data-forward-journey]")).toBeNull();
  });
});
