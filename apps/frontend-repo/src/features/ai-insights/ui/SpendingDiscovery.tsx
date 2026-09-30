import { Box, Button, Group, NativeSelect, SimpleGrid, Stack, Text, Title, UnstyledButton } from "@mantine/core";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { formatAmount } from "../model/core";
import { buildSpendingModel, categoryKey, packMerchants } from "../model/spending";
import type { CategoryDto, TransactionDto } from "../model/types";
import styles from "./AiInsightsPageContent.module.css";

const won = (amount: number) => `${formatAmount(amount)}원`;
const percent = (amount: number, total: number) => `${new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 1 }).format(total ? amount / total * 100 : 0)}%`;
const shortDate = (value: string) => value.length === 7 ? `${Number(value.slice(5))}월` : `${Number(value.slice(5, 7))}.${Number(value.slice(8))}`;
function activate(event: KeyboardEvent<SVGGElement>, action: () => void) {
  if (event.key === "Enter" || event.key === " ") { event.preventDefault(); action(); }
}

// CSS variables have no Mantine equivalent; geometry is read only at preparation / activation.
function prepareSignalAperture(scene: HTMLElement, orbit: SVGSVGElement) {
  const sceneBounds = scene.getBoundingClientRect();
  const orbitBounds = orbit.getBoundingClientRect();
  const x = orbitBounds.left + orbitBounds.width / 2 - sceneBounds.left;
  const y = orbitBounds.top + orbitBounds.height / 2 - sceneBounds.top;
  scene.style.setProperty("--signal-x", `${x}px`);
  scene.style.setProperty("--signal-y", `${y}px`);
  scene.style.setProperty("--signal-core", `${orbitBounds.width * 0.4}px`);
  scene.style.setProperty("--signal-diameter", `${orbitBounds.width * 464 / 520}px`);
  scene.style.setProperty("--signal-extent", `${Math.hypot(Math.max(x, sceneBounds.width - x), Math.max(y, sceneBounds.height - y)) + 2}px`);
}

export function SpendingDiscovery({ transactions, categories, entryRequested = false, onEntryComplete }: {
  transactions: TransactionDto[];
  categories: CategoryDto[];
  entryRequested?: boolean;
  onEntryComplete?: (requested: false) => void;
}) {
  const model = useMemo(() => buildSpendingModel(transactions, categories), [transactions, categories]);
  const nodes = useMemo(() => packMerchants(model.merchants), [model.merchants]);
  const [category, setCategory] = useState<string | null>(null);
  const [previewCategory, setPreviewCategory] = useState<string | null>(null);
  const [interval, setInterval] = useState<string | null>(null);
  const [merchant, setMerchant] = useState<string | null>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const orbitRef = useRef<SVGSVGElement>(null);
  const entryConsumed = useRef(false);
  const [entryStarted, setEntryStarted] = useState(false);
  const [activeScene, setActiveScene] = useState<number | null>(null);
  useLayoutEffect(() => {
    if (!entryRequested) return;
    const firstScene = sceneRef.current?.querySelector<HTMLElement>("[data-scene='0']");
    if (firstScene && orbitRef.current) prepareSignalAperture(firstScene, orbitRef.current);
  }, [entryRequested]);
  useEffect(() => {
    if (!sceneRef.current || typeof IntersectionObserver === "undefined") {
      // No scene / observer support: render the final surface without an intro.
      if (!entryRequested) return;
      const frame = requestAnimationFrame(() => onEntryComplete?.(false));
      return () => cancelAnimationFrame(frame);
    }
    const scenes = [...sceneRef.current.querySelectorAll<HTMLElement>("section[data-scene]")];
    const revealObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) {
        entry.target.setAttribute("data-revealed", "true");
        revealObserver.unobserve(entry.target);
      }
    }, { threshold: 0.12 });
    // The viewport centre identifies a scene without changing native scrolling.
    const visible = new Set<number>();
    const positionObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const target = entry.target as HTMLElement;
        const index = Number(target.dataset.scene ?? target.dataset.sceneFrame);
        if (entry.isIntersecting) visible.add(index); else visible.delete(index);
      }
      setActiveScene(visible.size ? Math.min(...visible) : null);
      if (!entryRequested || entryConsumed.current || !visible.size) return;
      entryConsumed.current = true;
      if (!visible.has(0) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        onEntryComplete?.(false);
        return;
      }
      const firstScene = scenes[0];
      const orbit = orbitRef.current;
      if (!firstScene || !orbit) { onEntryComplete?.(false); return; }
      prepareSignalAperture(firstScene, orbit);
      setEntryStarted(true);
    }, { rootMargin: "-40% 0px -40% 0px", threshold: 0 });
    scenes.forEach((scene, index) => {
      revealObserver.observe(scene);
      // The aperture must not clip its own visibility trigger or header/navigation lifecycle.
      positionObserver.observe(index === 0 ? scene.parentElement! : scene);
    });
    return () => { revealObserver.disconnect(); positionObserver.disconnect(); };
  }, [model.records.length, entryRequested, onEntryComplete]);
  useEffect(() => {
    if (!entryRequested || !entryStarted) return;
    // Also settle if CSS animation is interrupted, unsupported or paused in a background tab.
    const timeout = window.setTimeout(() => onEntryComplete?.(false), 600);
    return () => window.clearTimeout(timeout);
  }, [entryRequested, entryStarted, onEntryComplete]);
  const goToScene = (index: number) => {
    const scene = sceneRef.current?.querySelector<HTMLElement>(`[data-scene="${index}"]`);
    scene?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
    scene?.focus({ preventScroll: true });
  };
  const activeCategory = previewCategory ?? category;
  const activeStructure = model.structure.find((c) => c.key === activeCategory) ?? model.structure[0];
  const activeInterval = model.pulse.find((p) => p.date === interval) ?? model.peak;
  const categoryMerchants = category ? model.merchants.filter((m) => m.categoryKey === category) : model.merchants;
  const activeMerchant = model.merchants.find((m) => m.key === merchant) ?? nodes.find((m) => m.key === merchant) ?? categoryMerchants[0];
  const excludedCount = model.excluded.cancelled + model.excluded.nonPositive + model.excluded.invalid;

  if (!model.records.length) return (
    <Stack gap="sm" py="xl" className={styles.discoveryEmpty}>
      <Text size="xs" fw={700} c="#a8bac7">01 / 실제 소비의 모습</Text>
      <Title order={2}>아직 그릴 수 있는 소비 내역이 없어요</Title>
      <Text c="#a8bac7">현재 범위에 취소가 아닌 양수 금액의 유효한 거래가 있으면 소비 구조와 흐름을 볼 수 있어요.</Text>
      {excludedCount > 0 && <Text size="sm" c="#a8bac7">금액 집계 제외: 취소 {model.excluded.cancelled}건 · 0원·음수 {model.excluded.nonPositive}건 · 날짜·금액 오류 {model.excluded.invalid}건</Text>}
    </Stack>
  );

  const circumference = 2 * Math.PI * 185;
  const countCircumference = 2 * Math.PI * 151;
  const pulseMax = Math.max(...model.pulse.map((p) => p.amount), 1);
  const plotLeft = 64, plotWidth = 952, plotTop = 38, plotHeight = 230;
  const step = plotWidth / model.pulse.length;
  const pointX = (index: number) => plotLeft + step * (index + 0.5);
  const pointY = (amount: number) => plotTop + plotHeight * (1 - amount / pulseMax);
  const points = model.pulse.map((p, i) => `${pointX(i)},${pointY(p.amount)}`).join(" ");
  const activeIndex = model.pulse.findIndex((p) => p.date === activeInterval?.date);
  const activeTransactions = [...(activeMerchant?.records ?? [])].sort((a, b) => b.amount - a.amount || a.id - b.id);

  return (
    <Stack ref={sceneRef} gap={0} aria-label="실제 소비 시각화" className={styles.analysisStage} data-entry={entryRequested ? entryStarted ? "running" : "pending" : "idle"} data-analysis-stage-active={activeScene !== null ? "true" : "false"}>
      <nav aria-label="소비 시각화 장면" className={styles.sceneNavigator} data-active={activeScene !== null ? "true" : "false"}>
        <Stack gap={12}>{["소비 구조", "소비 흐름", "거래 패턴"].map((label, index) => <button type="button" key={label} className={styles.sceneLink} aria-label={`0${index + 1} ${label} 장면으로 이동`} aria-current={activeScene === index ? "step" : undefined} onClick={() => goToScene(index)}><span>0{index + 1}</span><span className={styles.sceneLabel}>{label}</span></button>)}</Stack>
      </nav>
      <Box className={styles.apertureViewport} data-scene-frame={0}>
      <Stack component="section" justify="center" gap="xl" data-scene={0} tabIndex={-1} className={styles.structureScene} aria-labelledby="structure-heading" onAnimationEnd={(event) => {
        if (event.target === event.currentTarget && event.animationName.includes("signal-aperture") && entryRequested) onEntryComplete?.(false);
      }}>
        <Stack gap={8}>
          <Group justify="space-between" gap="xs">
            <Text size="xs" fw={700} c="gray.4" lts={1.5}>01 / SPENDING STRUCTURE</Text>
            <Text size="xs" c="gray.4">{model.start} — {model.end}</Text>
          </Group>
          <Title order={2} id="structure-heading" c="white">소비의 무게는 어디에 있을까요?</Title>
          <Text size="sm" c="gray.4">바깥 고리는 금액, 안쪽 고리는 거래 수. 같은 소비의 두 가지 모습을 겹쳐 봅니다.</Text>
        </Stack>
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing={{ base: "md", md: 48 }} verticalSpacing="sm">
          <Box className={styles.orbitCanvas}>
            <svg ref={orbitRef} viewBox="0 0 520 520" className={styles.orbitSvg} role="group" aria-label={`카테고리별 소비 구조, 총 ${won(model.total)}, ${model.records.length}건. 고리 또는 목록에서 카테고리를 선택할 수 있습니다.`}>
              <circle cx="260" cy="260" r="232" fill="none" stroke="#ffffff" strokeOpacity="0.08" />
              {[0, 90, 180, 270].map((angle) => <path key={angle} d="M260 20v12" transform={`rotate(${angle} 260 260)`} stroke="#9daec1" strokeOpacity="0.6" />)}
              <circle cx="260" cy="260" r="185" fill="none" stroke="#26344a" strokeWidth="34" />
              <circle cx="260" cy="260" r="151" fill="none" stroke="#26344a" strokeWidth="5" />
              {model.structure.map((c, index) => {
                const amountLength = circumference * c.amount / model.total;
                const countLength = countCircumference * c.count / model.records.length;
                const amountStart = circumference * model.structure.slice(0, index).reduce((sum, item) => sum + item.amount, 0) / model.total;
                const countStart = countCircumference * model.structure.slice(0, index).reduce((sum, item) => sum + item.count, 0) / model.records.length;
                const opacity = activeCategory && activeCategory !== c.key ? 0.2 : 1;
                const select = () => { setCategory(category === c.key ? null : c.key); setMerchant(null); };
                return <g key={c.key} opacity={opacity} className={styles.orbitSegment} role="button" tabIndex={0} aria-label={`${c.name} 고리, ${won(c.amount)}, ${percent(c.amount, model.total)}`} aria-pressed={category === c.key} onMouseEnter={() => setPreviewCategory(c.key)} onMouseLeave={() => setPreviewCategory(null)} onFocus={() => setPreviewCategory(c.key)} onBlur={() => setPreviewCategory(null)} onClick={select} onKeyDown={(e) => activate(e, select)}>
                  <title>{c.name}: {won(c.amount)} · {percent(c.amount, model.total)} · {c.count}건</title>
                  <circle cx="260" cy="260" r="185" fill="none" stroke={c.color} strokeWidth="34" strokeDasharray={`${amountLength} ${circumference - amountLength}`} strokeDashoffset={-amountStart} transform="rotate(-90 260 260)" />
                  <circle cx="260" cy="260" r="151" fill="none" stroke={c.color} strokeWidth="5" strokeDasharray={`${countLength} ${countCircumference - countLength}`} strokeDashoffset={-countStart} transform="rotate(-90 260 260)" />
                </g>;
              })}
              <text x="260" y="226" textAnchor="middle" fill="#a8bac7" fontSize="14">집계 소비 금액</text>
              <text x="260" y="273" textAnchor="middle" fill="white" fontWeight="800" fontSize={model.total >= 1e9 ? 28 : 38} letterSpacing="-1.5">{formatAmount(model.total)}<tspan fontSize="16" letterSpacing="0"> 원</tspan></text>
              <text x="260" y="306" textAnchor="middle" fill="#a8bac7" fontSize="14">{model.records.length}건 · {model.structure.length}개 카테고리</text>
              <text x="260" y="497" textAnchor="middle" fill="#a8bac7" fontSize="11">금액 비중 / 거래 수 비중</text>
            </svg>
          </Box>
          <Stack gap="lg" justify="center" className={styles.structureReading}>
            <Stack gap={6} aria-live="polite" aria-atomic="true">
              <Text size="xs" c="gray.4">{activeCategory ? "살펴보는 카테고리" : "가장 큰 소비 영역"}</Text>
              <Title order={3} c="white" className={styles.structureCategory}>{activeStructure.name}</Title>
              <Group align="baseline" gap="sm"><Text className={styles.bigRatio} c="white">{percent(activeStructure.amount, model.total)}</Text><Text size="sm" c="gray.4">전체 소비 금액 중</Text></Group>
              <Text c="gray.3" size="sm">{won(activeStructure.amount)} · {activeStructure.count}건 · 거래 수 비중 {percent(activeStructure.count, model.records.length)}</Text>
            </Stack>
            <Stack gap={0} className={styles.categoryList}>
              {model.structure.map((c, index) => <UnstyledButton key={c.key} className={styles.categoryRow} data-selected={category === c.key || undefined} aria-pressed={category === c.key} aria-label={`${c.name} 강조, ${won(c.amount)}, ${percent(c.amount, model.total)}, ${c.count}건`} onMouseEnter={() => setPreviewCategory(c.key)} onMouseLeave={() => setPreviewCategory(null)} onFocus={() => setPreviewCategory(c.key)} onBlur={() => setPreviewCategory(null)} onClick={() => { setCategory(category === c.key ? null : c.key); setMerchant(null); }}>
                <Group justify="space-between" gap="sm" wrap="nowrap">
                  <Group gap="sm" wrap="nowrap"><svg width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="5" fill={c.color} /></svg><Text size="sm" c="gray.1">{String(index + 1).padStart(2, "0")} / {c.name}</Text></Group>
                  <Text size="sm" fw={700} c="white">{percent(c.amount, model.total)}</Text>
                </Group>
              </UnstyledButton>)}
            </Stack>
            <Text size="xs" c="gray.4">카테고리를 선택하면 아래 시간 흐름과 가맹점도 강조돼요. 조회 범위와 총액은 그대로 유지됩니다.</Text>
            {category && <Button variant="subtle" color="gray.3" size="xs" w="fit-content" onClick={() => { setCategory(null); setMerchant(null); }}>카테고리 강조 해제</Button>}
          </Stack>
        </SimpleGrid>
      </Stack>
      </Box>

      <Group justify="space-between" align="start" className={styles.dataBasis} gap="lg">
        <Stack gap={5}><Text size="sm" fw={700}>실제 기록이 있는 구간만 그렸어요.</Text><Text size="xs" c="#a8bac7">{model.start} ~ {model.end} · 취소가 아닌 양수 금액 {model.records.length}건 기준. 기록이 없는 구간의 집계 금액은 0원입니다.</Text></Stack>
        <Stack gap={5}><Text size="xs" c="#a8bac7">조회 내역 {transactions.length}건 중 금액 집계 제외 {excludedCount}건</Text><Text size="xs" c="#a8bac7">취소 {model.excluded.cancelled} · 0원·음수 {model.excluded.nonPositive} · 날짜·금액 오류 {model.excluded.invalid}</Text></Stack>
      </Group>

      <section data-scene={1} tabIndex={-1} aria-labelledby="pulse-heading" className={styles.pulseScene}>
        <Stack gap="xl">
          <Group justify="space-between" align="end" gap="lg">
            <Stack gap={8}><Text size="xs" fw={700} c="#a8bac7" lts={1.5}>02 / SPENDING PULSE</Text><Title order={2} id="pulse-heading">기록을 시간 위에 펼쳐보면.</Title><Text size="sm" c="#a8bac7">{model.unit === "day" ? "일별" : "월별"} 소비 금액의 높낮이. 각 구간을 선택해 실제 기록을 확인하세요.</Text></Stack>
            <Stack gap={3} ta="right"><Text size="xs" c="#a8bac7">가장 큰 {model.unit === "day" ? "하루" : "거래월"} · {model.peak?.date}</Text><Text size="xl" fw={800}>{won(model.peak?.amount ?? 0)}</Text></Stack>
          </Group>
          <Box className={styles.pulseCanvas}>
            <svg viewBox="0 0 1060 330" role="img" aria-label={`${model.unit === "day" ? "일별" : "월별"} 실제 소비 금액. 세로축 0원부터 ${won(pulseMax)}. 아래 기간 선택으로 상세 금액을 확인할 수 있습니다.`}>
              {[0, 0.5, 1].map((ratio) => <g key={ratio}><line x1={plotLeft} x2="1016" y1={pointY(pulseMax * ratio)} y2={pointY(pulseMax * ratio)} stroke="#304057" strokeDasharray={ratio === 0 ? undefined : "3 6"} /><text x="52" y={pointY(pulseMax * ratio) + 4} textAnchor="end" fill="#a8bac7" fontSize="11">{new Intl.NumberFormat("ko-KR", { notation: "compact", maximumFractionDigits: 1 }).format(pulseMax * ratio)}</text></g>)}
              {model.pulse.map((p, i) => {
                const selected = activeInterval?.date === p.date;
                const emphasized = activeCategory ? p.records.filter((t) => categoryKey(t) === activeCategory).reduce((s, t) => s + t.amount, 0) : null;
                return <g key={p.date} className={styles.pulseBar} onMouseEnter={() => setInterval(p.date)} onClick={() => setInterval(p.date)}>
                  <title>{p.date} · {won(p.amount)} · {p.count}건</title>
                  <rect x={plotLeft + i * step} y={plotTop} width={step} height={plotHeight} fill="transparent" />
                  <rect x={plotLeft + i * step + step * 0.15} y={pointY(p.amount)} width={step * 0.7} height={plotHeight * p.amount / pulseMax} rx={Math.min(step * 0.12, 3)} fill={selected ? "#31e6b8" : "#96acc2"} fillOpacity={emphasized != null ? 0.15 : selected ? 1 : 0.32} />
                  {emphasized != null && <rect x={plotLeft + i * step + step * 0.15} y={pointY(emphasized)} width={step * 0.7} height={plotHeight * emphasized / pulseMax} rx={Math.min(step * 0.12, 3)} fill="#31e6b8" />}
                </g>;
              })}
              <polyline points={points} fill="none" stroke="#9ab1c5" strokeWidth="1.5" strokeLinejoin="round" pointerEvents="none" className={styles.pulseLine} />
              {activeIndex >= 0 && <g pointerEvents="none"><line x1={pointX(activeIndex)} x2={pointX(activeIndex)} y1={plotTop - 10} y2={plotTop + plotHeight + 10} stroke="#31e6b8" strokeDasharray="3 5" /><circle cx={pointX(activeIndex)} cy={pointY(activeInterval?.amount ?? 0)} r="5" fill="#31e6b8" stroke="#31e6b8" strokeWidth="2" /></g>}
              {[...new Set([0, Math.floor((model.pulse.length - 1) / 2), model.pulse.length - 1])].map((i) => <text key={i} x={pointX(i)} y="303" textAnchor="middle" fill="#a8bac7" fontSize="12">{shortDate(model.pulse[i].date)}</text>)}
            </svg>
          </Box>
          <Group justify="space-between" align="end" className={styles.pulseDetail} gap="lg">
            <NativeSelect label="시간 흐름 상세 구간" value={activeInterval?.date} onChange={(e) => setInterval(e.currentTarget.value)} data={model.pulse.map((p) => ({ value: p.date, label: p.date }))} w={{ base: "100%", sm: 190 }} />
            <Stack gap={4} aria-live="polite" aria-atomic="true"><Text fw={800}>{activeInterval?.date} · {won(activeInterval?.amount ?? 0)} · {activeInterval?.count}건</Text><Text size="sm" c="#a8bac7">{activeCategory ? `${activeStructure.name} ${won(activeInterval?.records.filter((t) => categoryKey(t) === activeCategory).reduce((s, t) => s + t.amount, 0) ?? 0)}` : activeInterval?.records.length ? `가장 큰 거래: ${[...activeInterval.records].sort((a, b) => b.amount - a.amount)[0].merchant} · ${won(Math.max(...activeInterval.records.map((t) => t.amount)))}` : "이 구간에는 집계 대상 거래가 없어요."}</Text></Stack>
          </Group>
          {activeCategory && <Text size="xs" c="#a8bac7">회색 막대와 연결선은 전체 소비, 민트 막대는 {activeStructure.name} 소비 금액이에요. 세로축은 동일한 금액 기준입니다.</Text>}
          {model.unit === "month" && <Text size="xs" c="#a8bac7">첫 달과 마지막 달은 일부 날짜만 포함될 수 있어요. 거래가 관측된 범위의 합계이며, 완결된 월 간 성과 비교가 아닙니다.</Text>}
        </Stack>
      </section>

      <section data-scene={2} tabIndex={-1} aria-labelledby="exploration-heading" className={styles.explorationScene}>
        <Stack gap="xl">
          <Stack gap={8}><Text size="xs" fw={700} c="#a8bac7" lts={1.5}>03 / BEHIND THE PATTERN</Text><Title order={2} id="exploration-heading">패턴 뒤에는 실제 거래가 있어요.</Title><Text size="sm" c="#a8bac7">원 하나는 같은 카테고리의 가맹점 그룹. 원의 면적은 실제 소비 금액에 비례합니다.</Text></Stack>
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
            <Stack gap="sm" justify="center">
              <Box className={styles.constellationCanvas}>
                <svg viewBox="0 0 700 410" role="group" aria-label="가맹점별 소비 분포. 원을 선택하거나 아래 가맹점 목록을 이용하세요.">
                  {nodes.map((node) => <g key={node.key} role="button" tabIndex={node.r >= 8 ? 0 : -1} aria-label={`${node.name}, ${won(node.amount)}, ${node.records.length}건`} aria-pressed={activeMerchant?.key === node.key} className={styles.merchantNode} opacity={activeCategory && activeCategory !== node.categoryKey && node.key !== "remainder" ? 0.18 : 1} onClick={() => setMerchant(node.key)} onKeyDown={(e) => activate(e, () => setMerchant(node.key))}>
                    <title>{node.name}: {won(node.amount)} · {node.records.length}건</title>
                    <circle cx={node.x} cy={node.y} r={node.r} fill={node.color} fillOpacity={activeMerchant?.key === node.key ? 0.5 : 0.16} stroke={activeMerchant?.key === node.key ? "#f0f5f8" : node.color} strokeWidth={activeMerchant?.key === node.key ? 2 : 1} />
                    {node.r > 29 && <><text x={node.x} y={node.y - 2} textAnchor="middle" fill="#f0f5f8" fontSize={node.r > 55 ? 14 : 11} fontWeight="700">{node.name.length > 9 ? `${node.name.slice(0, 8)}…` : node.name}</text><text x={node.x} y={node.y + 17} textAnchor="middle" fill="#bac9d6" fontSize="11">{node.records.length}건</text></>}
                  </g>)}
                </svg>
              </Box>
              <Text size="xs" c="#a8bac7">{model.merchants.length}개 가맹점·카테고리 그룹 · 위치는 읽기 위한 배치이며 시간·거리·유사성을 뜻하지 않아요.{model.merchants.length > 35 && " 큰 35개와 나머지 합계를 표시해요. 전체 가맹점은 목록에서 선택할 수 있어요."}</Text>
            </Stack>
            <Stack gap="lg" className={styles.merchantDetail}>
              <NativeSelect label="가맹점 상세 보기" value={activeMerchant?.key ?? ""} onChange={(e) => setMerchant(e.currentTarget.value)} data={[...model.merchants, ...nodes.filter((n) => n.key === "remainder")].map((m) => ({ value: m.key, label: `${m.name} · ${model.structure.find((c) => c.key === m.categoryKey)?.name ?? "여러 카테고리"}` }))} />
              {activeMerchant && <Stack gap="md" aria-live="polite" aria-atomic="true">
                <Stack gap={4}><Text size="xs" c="#a8bac7">{model.structure.find((c) => c.key === activeMerchant.categoryKey)?.name ?? "여러 카테고리"}</Text><Title order={3}>{activeMerchant.name}</Title><Text fz={30} fw={800} lts={-1}>{won(activeMerchant.amount)}</Text><Text size="sm" c="#a8bac7">전체 소비의 {percent(activeMerchant.amount, model.total)} · {activeMerchant.records.length}건</Text></Stack>
                <Stack gap={0} className={styles.transactionList}>
                  {activeTransactions.slice(0, 4).map((t) => <Group key={t.id} justify="space-between" gap="sm" className={styles.transactionRow}><Stack gap={2}><Text size="xs" c="#a8bac7">{t.transactionDate.slice(0, 10)}</Text><Text size="sm">{t.merchant}</Text></Stack><Text size="sm" fw={700}>{won(t.amount)}</Text></Group>)}
                </Stack>
                {activeTransactions.length > 4 && <details className={styles.allTransactions}><summary>나머지 {activeTransactions.length - 4}건 보기</summary><Stack gap="sm" mt="sm">{activeTransactions.slice(4).map((t) => <Group key={t.id} justify="space-between" gap="sm"><Text size="xs">{t.transactionDate.slice(0, 10)} · {t.merchant}</Text><Text size="xs" fw={700}>{won(t.amount)}</Text></Group>)}</Stack></details>}
                <Text size="xs" c="#a8bac7">금액이 큰 거래부터 보여드려요. 원을 눌러 소비를 만든 기록을 확인해 보세요.</Text>
              </Stack>}
            </Stack>
          </SimpleGrid>
        </Stack>
      </section>
      <Box aria-hidden="true" className={styles.stageRecovery} />
    </Stack>
  );
}
