import { Component, Suspense, type ReactNode } from "react";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { WashingPageContent } from "@/features/washing/ui/WashingPageContent";
import { WashingPageSkeleton } from "@/features/washing/ui/WashingPageSkeleton";
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

export function WashingPage() {
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
