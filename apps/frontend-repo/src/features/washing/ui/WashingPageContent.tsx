import { useRef, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router";
import { Button, Group, Stack } from "@mantine/core";
import { IconArrowRight } from "@tabler/icons-react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { washingKeys, washingQueries } from "@/features/washing/api/queries";
import { getUnclassifiedTransactions } from "@/features/washing/model/core";
import { BulkWashPanel } from "@/features/washing/ui/BulkWashPanel";
import { ExcelUploadModal } from "@/features/washing/ui/ExcelUploadModal";
import { FirstExperienceHero } from "@/features/washing/ui/FirstExperienceHero";
import { SourceDataManagementPanel } from "@/features/washing/ui/SourceDataManagementPanel";
import styles from "./FirstExperience.module.css";

type WorkView = "pending" | "all" | "summary" | "help";

export interface GoalUpdateJourney {
  state: "checking" | "error" | "unchanged" | "needs-organization" | "ready";
  supportingContext: string;
  onReview: () => void;
  onRetry: () => void;
}

export function WashingPageContent({ onUploadSaved, onUploadFailed, goalContext: goalContextBand, goalUpdate }: {
  goalContext?: ReactNode;
  goalUpdate?: GoalUpdateJourney;
  onUploadSaved?: (receipt: { addedCount: number; skippedCount: number }) => void; onUploadFailed?: () => void;
}) {
  const [params] = useSearchParams();
  const goalContext = params.get("flow") === "goal-update" && params.get("goalId")
    ? `?${new URLSearchParams({ goalId: params.get("goalId")!, flow: "goal-update" })}` : "";
  const { data: overview, isError, isFetching } = useSuspenseQuery(washingQueries.overview());
  const queryClient = useQueryClient();
  const [view, setView] = useState<WorkView>("pending");
  const [uploadOpened, setUploadOpened] = useState(false);
  const [uploadVersion, setUploadVersion] = useState(0);
  const workRef = useRef<HTMLElement>(null);
  const uploadTrigger = useRef<HTMLElement | null>(null);
  const total = overview.transactions.length;
  const remaining = getUnclassifiedTransactions(overview.transactions).length;
  const empty = total === 0;
  const ready = total > 0 && remaining === 0;
  const activeView: WorkView = empty ? (view === "all" ? "all" : "help") :
    ready ? (view === "all" ? "all" : "summary") :
      (view === "all" ? "all" : "pending");

  const openUpload = () => {
    uploadTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setUploadOpened(true);
  };
  const closeUpload = () => {
    setUploadOpened(false);
    requestAnimationFrame(() => uploadTrigger.current?.focus());
  };
  const moveToWork = (nextView: WorkView) => {
    setView(nextView);
    requestAnimationFrame(() => {
      workRef.current?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
        block: "start",
      });
      workRef.current?.focus({ preventScroll: true });
    });
  };

  const categoryCounts = new Map<number, { label: string; count: number }>();
  if (ready) {
    for (const transaction of overview.transactions) {
      const categoryId = transaction.foundation?.categoryId;
      if (categoryId == null) continue;
      const current = categoryCounts.get(categoryId);
      categoryCounts.set(categoryId, { label: transaction.category || "이름 미확인", count: (current?.count ?? 0) + 1 });
    }
  }
  const sortedCategories: [string, number][] = [...categoryCounts.values()].map(({ label, count }) => [label, count] as [string, number]).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko"));
  const categoryRows: [string, number][] = sortedCategories.length > 4 ? [
    ...sortedCategories.slice(0, 3),
    ["그 외 카테고리", sortedCategories.slice(3).reduce((sum, [, count]) => sum + count, 0)] as [string, number],
  ] : sortedCategories;
  const maxCategoryCount = categoryRows[0]?.[1] ?? 1;

  return (
    <main className={styles.page}>
      <ExcelUploadModal
        opened={uploadOpened}
        onClose={closeUpload}
        onSuccess={(receipt) => { setUploadVersion((current) => current + 1); onUploadSaved?.(receipt); }}
        onSaveError={onUploadFailed}
      />
      <div className={styles.pageHeading}>
        <h2>이용내역 관리</h2>
      </div>
      {goalContextBand && <Stack mb="xl">{goalContextBand}</Stack>}
      {isError && <div role="alert" className={styles.staleNotice}>최신 내역을 확인하지 못했어요. 마지막으로 확인한 기록을 보여드립니다. <button type="button" onClick={() => queryClient.invalidateQueries({ queryKey: washingKeys.all })}>다시 불러오기</button></div>}
      {isFetching && !isError && <span role="status" className="mantine-visually-hidden">내역 업데이트 중</span>}
      <FirstExperienceHero
        overview={overview}
        onUpload={openUpload}
        onOrganize={() => moveToWork("pending")}
        onSeeRecords={() => moveToWork(empty ? "help" : "all")}
        primaryAction={goalUpdate ? {
          label: goalUpdate.state === "ready" ? "변화 확인하기" : goalUpdate.state === "checking" ? "내역 확인 중" : goalUpdate.state === "error" ? "반영 상태 다시 확인하기" : goalUpdate.state === "needs-organization" ? "목표 내역 정리하기" : "새 이용내역 추가하기",
          onClick: goalUpdate.state === "ready" ? goalUpdate.onReview : goalUpdate.state === "error" ? goalUpdate.onRetry : goalUpdate.state === "needs-organization" ? () => moveToWork("all") : openUpload,
          disabled: goalUpdate.state === "checking",
        } : undefined}
        supportingContext={goalUpdate?.supportingContext}
      />

      <div className={styles.workspace}>
        <section className={styles.workMain} ref={workRef} tabIndex={-1} aria-labelledby="work-title">
          <div className={styles.workHeading}>
            <div>
              <h2 id="work-title">내역 작업실</h2>
              <p>{empty ? "카드사에서 받은 파일 하나로 시작할 수 있어요." :
                ready ? "분류한 내역을 살펴보고 필요하면 수정할 수 있어요." :
                  "같은 카테고리의 내역을 골라 한 번에 분류하세요."}</p>
            </div>
            <Group gap="xs">
              {!empty && <button type="button" className={styles.uploadSecondary} onClick={openUpload}>＋ Excel 추가</button>}
              <Button component={Link} to={`/washing/rules${goalContext}`} variant="subtle" color="teal" size="xs"
                vars={() => ({ root: { "--button-hover": "transparent" } })}
                rightSection={<IconArrowRight size={15} aria-hidden="true" />}>자동 분류 규칙</Button>
            </Group>
          </div>
          <div className={styles.tabs} role="tablist" aria-label="이용내역 보기">
            <button type="button" role="tab" id="tab-primary" aria-controls="work-primary" aria-selected={activeView !== "all"} onClick={() => setView(empty ? "help" : ready ? "summary" : "pending")}>{empty ? "시작 안내" : ready ? "분류 한눈에" : <>분류할 내역 <span>{remaining}</span></>}</button>
            <button type="button" role="tab" id="tab-all" aria-controls="work-all" aria-selected={activeView === "all"} onClick={() => setView("all")}>전체 내역 <span>{total}</span></button>
          </div>
          <div className={styles.view} id="work-primary" role="tabpanel" aria-labelledby="tab-primary" hidden={activeView === "all"}>
            {empty ? (
              <div className={styles.startGuide}>
                <div><h3>파일을 준비해 주세요.</h3><p>카드사에서 내려받은 이용내역을 올리고, 불러온 내용을 확인한 뒤 저장해요.</p></div>
                <div className={styles.fileHelp}><strong>지원 파일</strong>신한카드 · KB국민카드<br />.xls 또는 .xlsx · 최대 10MB<br />저장 전 불러온 내역을 확인할 수 있어요.</div>
              </div>
            ) : ready ? (
              <div className={styles.readySummary}>
                <div><h3>분류한 내역의 구성 <small>· 건수 기준</small></h3>
                  <div className={styles.categoryRows}>{categoryRows.map(([name, count], index) => (
                    <div className={styles.categoryRow} key={`${index}-${name}`}><span>{name}</span><span className={styles.barTrack}><i style={{ width: `${count / maxCategoryCount * 100}%` }} /></span><span>{count}건</span></div>
                  ))}</div>
                </div>
                <div className={styles.readySide}><strong>어디에 썼는지,<br />이제 더 잘 보일 거예요.</strong><p>카테고리별 내역을 확인하고 소비 패턴 탐색으로 이어가세요.</p><button type="button" onClick={() => setView("all")}>전체 내역 확인 →</button></div>
              </div>
            ) : <BulkWashPanel overview={overview} />}
          </div>
          <div className={styles.view} id="work-all" role="tabpanel" aria-labelledby="tab-all" hidden={activeView !== "all"}>
            <SourceDataManagementPanel key={uploadVersion} onOpenUpload={openUpload} />
          </div>
        </section>
        <aside className={styles.aside} aria-label="이용 안내">
          <span className={styles.asideLabel}>FROM RECORDS TO PATTERNS</span>
          <h3>정리에서 이해로,<br />이해에서 변화로.</h3>
          <ol className={styles.journey}>
            <li><span className={`${styles.step} ${!empty ? styles.doneStep : ""}`}>{empty ? "1" : "✓"}</span><div><strong>내역 가져오기</strong><p>카드사 Excel 파일을 직접 업로드해요.</p></div></li>
            <li><span className={`${styles.step} ${ready ? styles.doneStep : empty ? styles.futureStep : ""}`}>{ready ? "✓" : "2"}</span><div><strong>카테고리 분류하기</strong><p>같은 성격의 내역을 모아 소비의 윤곽을 만들어요.</p></div></li>
            <li><span className={`${styles.step} ${ready ? "" : styles.futureStep}`}>3</span><div><strong>소비 패턴 살펴보기</strong><p>정리한 기록을 바탕으로 나의 소비를 이해해요.</p></div></li>
          </ol>
        </aside>
      </div>
    </main>
  );
}
