import styles from "./FirstExperience.module.css";

export function WashingPageSkeleton() {
  return (
    <main className={styles.page} aria-busy="true">
      <div className={styles.pageHeading}><h2>나의 소비 기록</h2></div>
      <section className={styles.stateFrame} aria-labelledby="washing-loading-title">
        <h1 id="washing-loading-title">소비 기록을<br />불러오고 있어요.</h1>
        <p>현재 데이터 상태를 확인하고 있어요.</p>
        <div className={styles.skeletonLine} aria-hidden="true" />
        <div className={`${styles.skeletonLine} ${styles.skeletonLarge}`} aria-hidden="true" />
      </section>
      <span role="status" className="mantine-visually-hidden">소비 기록을 불러오고 있어요.</span>
    </main>
  );
}
