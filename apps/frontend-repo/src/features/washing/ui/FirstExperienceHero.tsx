import { IconArrowRight } from "@tabler/icons-react";
import { useNavigate } from "react-router";
import { getUnclassifiedTransactions } from "@/features/washing/model/core";
import type { WashingOverview } from "@/features/washing/model/types";
import styles from "./FirstExperience.module.css";

interface FirstExperienceHeroProps {
  overview: WashingOverview;
  onUpload: () => void;
  onOrganize: () => void;
  onSeeRecords: () => void;
}

const cells = Array.from({ length: 128 }, (_, index) => index);

export function FirstExperienceHero({
  overview,
  onUpload,
  onOrganize,
  onSeeRecords,
}: FirstExperienceHeroProps) {
  const navigate = useNavigate();
  const total = overview.transactions.length;
  const remaining = getUnclassifiedTransactions(overview.transactions).length;
  const completed = total - remaining;
  const empty = total === 0;
  const ready = total > 0 && remaining === 0;
  const rate = empty ? 0 : completed / total;
  const displayRate = ready ? "100" : completed > 0 && rate < 0.01 ? "<1" :
    rate >= 1 ? "100" : Math.floor(rate * 100) === 99 && rate * 100 > 99 ? "99+" :
      String(Math.floor(rate * 100));
  const title = empty ? (
    <>내역을 넘어,<br /><em>당신만의 소비 패턴으로.</em></>
  ) : ready ? (
    <>내역 정리는 끝났어요.<br /><em>이제, 패턴을 발견할 차례.</em></>
  ) : completed === 0 ? (
    <>소비 패턴을 발견할<br /><em>첫 단계.</em></>
  ) : (
    <>조금씩 선명해지는,<br /><em>나의 소비 패턴.</em></>
  );

  return (
    <section className={styles.hero} aria-labelledby="first-experience-title">
      <div className={styles.heroGrid}>
        <div className={styles.story}>
          <span className={styles.eyebrow}>
            {empty ? "YOUR FIRST PATTERN" : ready ? "READY TO EXPLORE" : "YOUR PATTERN IS TAKING SHAPE"}
          </span>
          <h1 id="first-experience-title">{title}</h1>
          <p className={styles.description}>
            {empty ? "카드사에서 내려받은 Excel 이용내역을 직접 가져오세요. 흩어진 기록을 정리하면, 나의 소비를 이해할 수 있어요." :
              ready ? <>등록한 <strong>{total}건의 분류를 마쳤어요.</strong><br />정리된 기록에서 나의 소비 패턴을 살펴보세요.</> :
                completed === 0 ? <><strong>{total}건의 내역을 가져왔어요.</strong><br />카테고리를 정리해 보세요.</> :
                  <>전체 {total}건 중 <strong>{completed}건을 정리했어요.</strong><br />남은 {remaining}건에 카테고리를 더해 보세요.</>}
          </p>
          <div className={styles.actions}>
            <button className={styles.primary} type="button" onClick={empty ? onUpload : ready ? () => navigate("/insights") : onOrganize}>
              {empty ? "Excel 내역 업로드" : ready ? "소비 패턴 살펴보기" : `남은 ${remaining}건 정리하기`}
              <IconArrowRight size={19} aria-hidden="true" />
            </button>
            <button className={styles.secondary} type="button" onClick={empty || ready ? onSeeRecords : () => navigate("/insights")}>
              {empty ? "지원 파일 안내" : ready ? "내역 다시 보기" : "지금 소비 분석 보기"}
              <span aria-hidden="true">{empty || ready ? "↓" : "↗"}</span>
            </button>
          </div>
          <p className={styles.support}>
            {empty ? "신한카드 · KB국민카드 / .xls, .xlsx / 최대 10MB" :
              ready ? "분류 완료 기준 · AI 분석 결과는 다음 화면에서 확인" :
                "미분류 내역이 있어도 분석 화면을 볼 수 있어요."}
          </p>
        </div>

        <div className={styles.signal}>
          {empty ? (
            <>
              <span className={styles.artLabel}>FROM RECORDS TO PATTERNS</span>
              <div className={styles.emptyArt} aria-hidden="true">
                <div className={styles.fileTile}><b>Excel</b><i /><i /><i /></div>
                <span className={styles.artArrow}>→</span>
                <div className={styles.patternTile}><i /><i /><i /><i /></div>
              </div>
              <div className={styles.emptyCount}><span>아직 등록한 내역이 없어요</span><strong>0건</strong></div>
            </>
          ) : (
            <>
              <div className={styles.signalHead}>
                <div><span className={styles.signalTitle}>내역 정리 상태</span><div className={styles.rate}>{displayRate}<small>%</small></div></div>
                <span className={styles.status}>{ready ? "✓ 분류 완료" : "정리 중"}</span>
              </div>
              <div className={styles.field} role="img" aria-label={`등록 거래 ${total}건 중 ${completed}건 분류 완료, ${remaining}건 미분류. 격자는 비율을 표현하며 셀 하나가 거래 한 건을 뜻하지 않습니다.`}>
                {cells.map((cell) => <i key={cell} className={cell < Math.floor(rate * cells.length) ? styles.activeCell : undefined} />)}
              </div>
              <div className={styles.legend}>
                <div><span><i className={styles.mintDot} />분류 완료</span><strong>{completed}<small> 건</small></strong></div>
                <div><span><i className={styles.grayDot} />미분류</span><strong>{remaining}<small> 건</small></strong></div>
                <div><span>등록 거래</span><strong>{total}<small> 건</small></strong></div>
              </div>
              <p className={styles.signalNote}>격자는 분류 비율을 표현합니다. 셀 하나가 거래 한 건은 아니에요.</p>
            </>
          )}
        </div>
      </div>
      <div className={styles.heroFoot}>
        <span>내역을 넘어, 당신만의 소비 패턴으로. <small>BEYOND TOTALS. FIND YOUR PATTERN.</small></span>
        <span>{empty ? "카드 내역을 직접 업로드해 시작하세요." : "등록한 전체 거래 기준 · 금액이 아닌 분류 상태"}</span>
      </div>
    </section>
  );
}
