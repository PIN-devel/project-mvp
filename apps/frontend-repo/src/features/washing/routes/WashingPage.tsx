import { Component, Suspense, useRef, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { WashingPageContent } from "@/features/washing/ui/WashingPageContent";
import { WashingPageSkeleton } from "@/features/washing/ui/WashingPageSkeleton";
import { FirstExperienceHero } from "@/features/washing/ui/FirstExperienceHero";
import styles from "@/features/washing/ui/FirstExperience.module.css";

class WashingErrorBoundary extends Component<
  { children: ReactNode; onReset: () => void },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return <main className={styles.page}>
        <div className={styles.pageHeading}><h2>나의 소비 기록</h2></div>
        <section className={styles.stateFrame} aria-labelledby="washing-error-title">
          <h1 id="washing-error-title">소비 기록을<br />확인할 수 없어요.</h1>
          <p>내역 상태를 아직 확인하지 못했어요. 다시 불러오면 이어서 정리할 수 있어요.</p>
          <button type="button" onClick={() => {
            this.props.onReset();
            this.setState({ error: null });
          }}>다시 불러오기</button>
        </section>
      </main>;
    }
    return this.props.children;
  }
}

function GuestEmptyState() {
  const navigate = useNavigate();
  const helpRef = useRef<HTMLElement>(null);
  const showHelp = () => {
    helpRef.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
      block: "start",
    });
    helpRef.current?.focus({ preventScroll: true });
  };

  return <main className={styles.page}>
    <div className={styles.pageHeading}><h2>나의 소비 기록</h2></div>
    <FirstExperienceHero
      overview={{ transactions: [], categories: [], lastImportedAt: "" }}
      onUpload={() => navigate("/login")}
      onOrganize={showHelp}
      onSeeRecords={showHelp}
    />
    <section ref={helpRef} tabIndex={-1} className={`${styles.startGuide} ${styles.guestGuide}`} aria-labelledby="guest-upload-guide">
      <div><h3 id="guest-upload-guide">파일을 준비해 주세요.</h3><p>로그인 후 카드사에서 받은 파일을 올리고, 불러온 내용을 확인한 뒤 저장해요.</p></div>
      <div className={styles.fileHelp}><strong>지원 파일</strong>신한카드 · KB국민카드<br />.xls 또는 .xlsx · 최대 10MB</div>
    </section>
  </main>;
}

export function WashingPage({ isAuthenticated = true }: { isAuthenticated?: boolean }) {
  if (!isAuthenticated) return <GuestEmptyState />;
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => <WashingErrorBoundary onReset={reset}>
        <Suspense fallback={<WashingPageSkeleton />}>
          <WashingPageContent />
        </Suspense>
      </WashingErrorBoundary>}
    </QueryErrorResetBoundary>
  );
}
