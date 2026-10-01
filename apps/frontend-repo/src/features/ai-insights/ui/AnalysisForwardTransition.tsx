import { Box, Button, Group, Stack, Text } from "@mantine/core";
import { IconArrowDown } from "@tabler/icons-react";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import styles from "./AiInsightsPageContent.module.css";

const clamp = (value: number) => Math.min(1, Math.max(0, value));

export function AnalysisForwardTransition({ enabled, children, goal }: {
  enabled: boolean;
  children: ReactNode;
  goal: ReactNode;
}) {
  const journeyRef = useRef<HTMLDivElement>(null);
  const boundaryRef = useRef<HTMLDivElement>(null);
  const goalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const journey = journeyRef.current;
    const boundary = boundaryRef.current;
    if (!enabled || !journey || !boundary) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let listening = false;
    let padding = parseFloat(window.getComputedStyle(boundary).paddingTop) || 0;
    const update = () => {
      frame = 0;
      // One viewport of ordinary scrolling carries the surface forward. No scroll capture.
      const viewport = Math.max(window.innerHeight, 1);
      const progress = reducedMotion.matches ? 1 : clamp((viewport - boundary.getBoundingClientRect().top - padding) / viewport);
      journey.style.setProperty("--forward-progress", String(progress));
      journey.style.setProperty("--forward-headline", String(clamp((progress - .6) / .14)));
      journey.style.setProperty("--forward-evidence", String(clamp((progress - .68) / .16)));
      journey.style.setProperty("--forward-action", String(clamp((progress - .8) / .14)));
      journey.setAttribute("data-forward-content", progress >= .84 ? "ready" : "waiting");
      if (progress > 0) journey.setAttribute("data-forward-entered", "true");
    };
    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(update); };
    const measure = () => { padding = parseFloat(window.getComputedStyle(boundary).paddingTop) || 0; schedule(); };
    const listen = (active: boolean) => {
      if (active === listening) return;
      listening = active;
      if (active) window.addEventListener("scroll", schedule, { passive: true });
      else window.removeEventListener("scroll", schedule);
    };
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver((entries) => {
      listen(entries.some((entry) => entry.isIntersecting));
      schedule();
    }, { rootMargin: "100% 0px 100% 0px" });
    observer?.observe(boundary);
    if (!observer) listen(true);
    const resize = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    resize?.observe(journey);
    window.addEventListener("resize", measure);
    reducedMotion.addEventListener("change", schedule);
    update();
    return () => {
      observer?.disconnect();
      resize?.disconnect();
      listen(false);
      window.removeEventListener("resize", measure);
      reducedMotion.removeEventListener("change", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [enabled]);

  if (!enabled) return <Stack gap="xl">{children}{goal}</Stack>;

  const goToGoal = () => {
    goalRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
    goalRef.current?.focus({ preventScroll: true });
  };

  return <Stack ref={journeyRef} gap={0} className={styles.forwardJourney} data-forward-journey="true" data-forward-content="waiting">
    <Stack gap="xl" className={styles.conclusionStage}>
      {children}
      <Group gap="lg" align="center" className={styles.forwardDirection}>
        <Stack gap="xs">
          <Text size="xs" fw={700} c="#a8bac7">발견에서 다음 행동으로</Text>
          <Button variant="subtle" color="brandMint.5" w="fit-content" px={0} rightSection={<IconArrowDown size={18} />} onClick={goToGoal}>이 발견으로 바꿔볼 한 가지 찾기</Button>
        </Stack>
        <Box className={styles.directionSignal} aria-hidden="true" />
      </Group>
    </Stack>
    <Box ref={boundaryRef} className={styles.forwardBoundary} data-forward-boundary="true">
      <Stack ref={goalRef} gap="xl" tabIndex={-1} className={styles.forwardSurface} aria-label="분석에서 다음 행동으로">
        {goal}
      </Stack>
    </Box>
  </Stack>;
}
