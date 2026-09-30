// 프리뷰의 제품 기준이며 통계적 유의성을 뜻하지 않습니다.
export const MIN_ANALYSIS_TRANSACTION_COUNT = 10;

export const canAnalyzeTransactions = (transactionCount: number) =>
  transactionCount >= MIN_ANALYSIS_TRANSACTION_COUNT;
