export interface Sample {
  id: number;
  message: string;
  status: string;
  urgent: boolean;
  updatedAt: string;
}

const INITIAL_SAMPLES: Sample[] = [
  {
    id: 1,
    message: "Hello World",
    status: "ACTIVE",
    urgent: false,
    updatedAt: "2026-04-23 21:23:20",
  },
  {
    id: 2,
    message: "System Down ASAP!",
    status: "ACTIVE",
    urgent: true,
    updatedAt: "2026-04-23 21:23:20",
  },
  {
    id: 3,
    message: "Scheduled Maintenance",
    status: "INACTIVE",
    urgent: false,
    updatedAt: "2026-04-23 21:23:20",
  },
];

let nextSampleId = 4;
let samples: Sample[] = [...INITIAL_SAMPLES];

const getCurrentTime = () =>
  new Date().toISOString().replace("T", " ").substring(0, 19);

export const resetSamples = () => {
  samples = [...INITIAL_SAMPLES];
  nextSampleId = 4;
};

export const db = {
  getAll: () => samples,

  getById: (id: number) => samples.find((sample) => sample.id === id),

  create: (data: { message: string }) => {
    const newSample: Sample = {
      id: nextSampleId++,
      message: data.message,
      status: "ACTIVE",
      urgent: false,
      updatedAt: getCurrentTime(),
    };
    samples.push(newSample);
    return newSample;
  },

  update: (id: number, data: { message: string }) => {
    const index = samples.findIndex((sample) => sample.id === id);
    if (index === -1) {
      return null;
    }

    samples[index] = {
      ...samples[index],
      message: data.message,
      updatedAt: getCurrentTime(),
    };
    return samples[index];
  },

  patch: (id: number, data: Partial<Sample>) => {
    const index = samples.findIndex((sample) => sample.id === id);
    if (index === -1) {
      return null;
    }

    samples[index] = {
      ...samples[index],
      ...data,
      updatedAt: getCurrentTime(),
    };
    return samples[index];
  },

  delete: (id: number) => {
    const index = samples.findIndex((sample) => sample.id === id);
    if (index === -1) {
      return false;
    }

    samples.splice(index, 1);
    return true;
  },
};

export interface User {
  id: number;
  loginId: string;
  nickname: string;
  password?: string;
  status: "active" | "suspended" | "deleted";
  lastLoginAt?: string;
  createdAt: string;
}

const INITIAL_USERS: User[] = [
  {
    id: 1,
    loginId: "testuser",
    nickname: "테스터",
    password: "password123!",
    status: "active",
    lastLoginAt: "2026-05-25 13:00:00",
    createdAt: "2026-05-25 10:00:00",
  },
];

let nextUserId = 2;
let users: User[] = [...INITIAL_USERS];

export const resetUsers = () => {
  users = [...INITIAL_USERS];
  nextUserId = 2;
};

export const dbUser = {
  getAll: () => users,

  findByLoginId: (loginId: string) =>
    users.find((user) => user.loginId === loginId),

  create: (data: {
    loginId: string;
    nickname: string;
    password?: string;
  }) => {
    const newUser: User = {
      id: nextUserId++,
      loginId: data.loginId,
      nickname: data.nickname,
      password: data.password,
      status: "active",
      createdAt: getCurrentTime(),
    };
    users.push(newUser);
    return newUser;
  },

  delete: (loginId: string) => {
    const index = users.findIndex((user) => user.loginId === loginId);
    if (index === -1) {
      return false;
    }

    users[index] = {
      ...users[index],
      status: "deleted",
    };
    return true;
  },
};

export interface WashingTransactionRecord {
  id: number;
  occurredAt: string;
  merchantName: string;
  description: string;
  cardLabel: string;
  amount: number;
  category: string | null;
  isClassified: boolean;
  matchedRuleLabel: string | null;
  tag: string;
  source: "CARD" | "BANK" | "CASH";
  ledgerId?: number;
}

const WASHING_CATEGORIES = [
  "식비",
  "교통",
  "생활",
  "구독",
  "의료",
  "여가",
  "업무",
];

const INITIAL_WASHING_TRANSACTIONS: WashingTransactionRecord[] = [];

const INITIAL_WASHING_META_BY_LEDGER_ID: Record<
  number,
  Pick<WashingTransactionRecord, "tag" | "matchedRuleLabel" | "source">
> = {
  16: { tag: "??", matchedRuleLabel: "??: ???? -> ??", source: "CARD" },
  17: { tag: "??", matchedRuleLabel: null, source: "CARD" },
  18: { tag: "??", matchedRuleLabel: "??: ?????? -> ??", source: "CARD" },
  19: { tag: "?????", matchedRuleLabel: null, source: "CARD" },
  20: { tag: "OTT", matchedRuleLabel: "??: ???? -> ??", source: "CARD" },
  21: { tag: "PG", matchedRuleLabel: null, source: "BANK" },
  22: { tag: "?????", matchedRuleLabel: null, source: "CARD" },
};

let nextWashingId = 108;
let washingTransactions: WashingTransactionRecord[] = [];
let washingLastImportedAt = "2026-06-06 18:30:00";

const inferWashingSource = (
  cardName: string,
): WashingTransactionRecord["source"] =>
  cardName === "????" ? "BANK" : "CARD";

const isLedgerTransactionClassified = (tx: LedgerTransaction) =>
  tx.isClassified ?? (tx.categoryId != null || !!tx.categoryName);

const buildWashingTransactionFromLedger = (
  tx: LedgerTransaction,
  previous?: WashingTransactionRecord,
): WashingTransactionRecord => {
  const seed = INITIAL_WASHING_META_BY_LEDGER_ID[tx.id];
  const isClassified = isLedgerTransactionClassified(tx);

  return {
    id: tx.id,
    occurredAt: tx.transactionDate,
    merchantName: tx.merchant,
    description: tx.memo ?? "",
    cardLabel: tx.cardName,
    amount: tx.amount,
    category: tx.categoryName ?? null,
    isClassified,
    matchedRuleLabel: previous?.matchedRuleLabel ?? seed?.matchedRuleLabel ?? null,
    tag:
      tx.tag ??
      previous?.tag ??
      seed?.tag ??
      (isClassified ? "?? ??" : "?? ?? ??"),
    source: previous?.source ?? seed?.source ?? inferWashingSource(tx.cardName),
    ledgerId: tx.id,
  };
};

const syncWashingTransactionsFromLedger = () => {
  const previousByLedgerId = new Map(
    washingTransactions
      .filter(
        (
          transaction,
        ): transaction is WashingTransactionRecord & { ledgerId: number } =>
          transaction.ledgerId != null,
      )
      .map((transaction) => [transaction.ledgerId, transaction]),
  );

  washingTransactions = ledgerTransactions.map((tx) =>
    buildWashingTransactionFromLedger(tx, previousByLedgerId.get(tx.id)),
  );
};

export const resetWashingTransactions = () => {
  washingTransactions = [...INITIAL_WASHING_TRANSACTIONS];
  nextWashingId = 108;
  washingLastImportedAt = "2026-06-06 18:30:00";
  syncWashingTransactionsFromLedger();
};

export const dbWashing = {
  getOverview: () => {
    syncWashingTransactionsFromLedger();
    return {
      categories: [...WASHING_CATEGORIES],
      transactions: [...washingTransactions],
      lastImportedAt: washingLastImportedAt,
    };
  },

  bulkClassify: (ids: number[], category: string) => {
    washingTransactions = washingTransactions.map((transaction) =>
      ids.includes(transaction.id)
        ? {
            ...transaction,
            category,
            isClassified: true,
            matchedRuleLabel: null,
            tag: "?? ?? ??",
          }
        : transaction,
    );

    ledgerTransactions = ledgerTransactions.map((transaction) =>
      ids.includes(transaction.id)
        ? {
            ...transaction,
            categoryName: category,
          }
        : transaction,
    );

    syncWashingTransactionsFromLedger();
    washingLastImportedAt = getCurrentTime();
    return dbWashing.getOverview();
  },

  updateCategory: (id: number, category: string | null) => {
    const index = washingTransactions.findIndex(
      (transaction) => transaction.id === id,
    );
    if (index === -1) {
      return null;
    }

    washingTransactions[index] = {
      ...washingTransactions[index],
      category,
      isClassified: category !== null,
      matchedRuleLabel:
        category === null ? null : washingTransactions[index].matchedRuleLabel,
      tag: category === null ? "?? ?? ??" : washingTransactions[index].tag,
    };

    const ledgerId = washingTransactions[index].ledgerId;
    if (ledgerId != null) {
      const ledgerIndex = ledgerTransactions.findIndex((tx) => tx.id == ledgerId);
      if (ledgerIndex !== -1) {
        ledgerTransactions[ledgerIndex] = {
          ...ledgerTransactions[ledgerIndex],
          categoryId:
            category === null ? null : ledgerTransactions[ledgerIndex].categoryId,
          categoryName: category,
        };
      }
    }

    syncWashingTransactionsFromLedger();
    washingLastImportedAt = getCurrentTime();
    return washingTransactions.find((transaction) => transaction.id === id) ?? null;
  },

  addFromLedger: (tx: LedgerTransaction) => {
    syncWashingTransactionsFromLedger();
    return (
      washingTransactions.find((transaction) => transaction.ledgerId === tx.id) ??
      buildWashingTransactionFromLedger(tx)
    );
  },

  importMockBatch: () => {
    const today = new Date().toISOString().slice(0, 10);
    const imported: WashingTransactionRecord[] = [
      {
        id: nextWashingId++,
        occurredAt: `${today} 08:08`,
        merchantName: "??MGC??",
        description: "??? ??",
        cardLabel: "?? Zero",
        amount: 3900,
        category: null,
        isClassified: false,
        matchedRuleLabel: null,
        tag: "?? ??",
        source: "CARD",
      },
      {
        id: nextWashingId++,
        occurredAt: `${today} 19:48`,
        merchantName: "????",
        description: "?? ?? ??",
        cardLabel: "????",
        amount: 78200,
        category: null,
        isClassified: false,
        matchedRuleLabel: null,
        tag: "?? ??",
        source: "BANK",
      },
    ];

    washingTransactions = [...imported, ...washingTransactions];
    washingLastImportedAt = getCurrentTime();
    return dbWashing.getOverview();
  },
};

export interface LedgerCategory {
  id: number;
  name: string;
  color: string;
  displayOrder: number;
  isDefault: boolean;
}

export interface LedgerTransaction {
  id: number;
  userId: number;
  transactionDate: string;
  merchant: string;
  categoryId: number | null;
  categoryName: string | null;
  amount: number;
  cardName: string;
  installment: number;
  status: "승인" | "취소";
  memo: string | null;
  tag?: string | null;
  appliedRuleId?: number | null;
  isClassified?: boolean;
}

const LEDGER_CATEGORIES: LedgerCategory[] = [
  { id: 1, name: "식음료", color: "#f97316", displayOrder: 10, isDefault: true },
  { id: 2, name: "쇼핑", color: "#8b5cf6", displayOrder: 20, isDefault: true },
  { id: 3, name: "교통", color: "#3b82f6", displayOrder: 30, isDefault: true },
  { id: 4, name: "의료/건강", color: "#ef4444", displayOrder: 40, isDefault: true },
  { id: 5, name: "문화/여가", color: "#ec4899", displayOrder: 50, isDefault: true },
  { id: 6, name: "편의점", color: "#10b981", displayOrder: 60, isDefault: true },
  { id: 7, name: "주유", color: "#6b7280", displayOrder: 70, isDefault: true },
  { id: 8, name: "통신", color: "#06b6d4", displayOrder: 80, isDefault: true },
  { id: 9, name: "교육", color: "#f59e0b", displayOrder: 90, isDefault: true },
  { id: 10, name: "기타", color: "#64748b", displayOrder: 100, isDefault: true },
];

let ledgerCategories: LedgerCategory[] = [...LEDGER_CATEGORIES];
let nextLedgerCategoryId = 11;

const INITIAL_LEDGER_TRANSACTIONS: LedgerTransaction[] = [
  // 2026-05
  { id: 1,  userId: 1, transactionDate: "2026-05-02", merchant: "GS25 역삼점",        categoryId: 6,    categoryName: "편의점",   amount: 3800,  cardName: "신한 Deep",   installment: 1, status: "승인", memo: "간식" },
  { id: 2,  userId: 1, transactionDate: "2026-05-05", merchant: "현대자동차 주유소",   categoryId: 7,    categoryName: "주유",     amount: 82000, cardName: "현대 Zero",   installment: 1, status: "승인", memo: "주유 풀탱크" },
  { id: 3,  userId: 1, transactionDate: "2026-05-07", merchant: "에이블리",           categoryId: null, categoryName: null,       amount: 34500, cardName: "삼성 taptap", installment: 1, status: "승인", memo: null },
  { id: 4,  userId: 1, transactionDate: "2026-05-09", merchant: "서울아산병원",       categoryId: 4,    categoryName: "의료/건강", amount: 15000, cardName: "KB국민카드",  installment: 1, status: "승인", memo: "외래 진료" },
  { id: 5,  userId: 1, transactionDate: "2026-05-12", merchant: "메가박스 코엑스",    categoryId: 5,    categoryName: "문화/여가", amount: 28000, cardName: "현대 Zero",   installment: 1, status: "승인", memo: "영화 2인" },
  { id: 6,  userId: 1, transactionDate: "2026-05-14", merchant: "KT 통신요금",        categoryId: 8,    categoryName: "통신",     amount: 55000, cardName: "토스뱅크",    installment: 1, status: "승인", memo: "5월 통신비" },
  { id: 7,  userId: 1, transactionDate: "2026-05-16", merchant: "배달의민족",         categoryId: null, categoryName: null,       amount: 31500, cardName: "신한 Deep",   installment: 1, status: "승인", memo: "저녁 배달" },
  { id: 8,  userId: 1, transactionDate: "2026-05-19", merchant: "이마트 역삼점",      categoryId: 1,    categoryName: "식음료",   amount: 74200, cardName: "삼성 taptap", installment: 1, status: "승인", memo: "주간 장보기" },
  { id: 9,  userId: 1, transactionDate: "2026-05-21", merchant: "카카오택시",         categoryId: 3,    categoryName: "교통",     amount: 8900,  cardName: "토스뱅크",    installment: 1, status: "승인", memo: null },
  { id: 10, userId: 1, transactionDate: "2026-05-22", merchant: "유데미",             categoryId: 9,    categoryName: "교육",     amount: 19800, cardName: "KB국민카드",  installment: 1, status: "승인", memo: "React 강의" },
  { id: 11, userId: 1, transactionDate: "2026-05-24", merchant: "다이소 강남점",      categoryId: null, categoryName: null,       amount: 12000, cardName: "신한 Deep",   installment: 1, status: "승인", memo: null },
  { id: 12, userId: 1, transactionDate: "2026-05-26", merchant: "스타벅스 선릉점",    categoryId: 1,    categoryName: "식음료",   amount: 9500,  cardName: "현대 Zero",   installment: 1, status: "승인", memo: "카페 미팅" },
  { id: 13, userId: 1, transactionDate: "2026-05-28", merchant: "쿠팡",              categoryId: null, categoryName: null,       amount: 56300, cardName: "삼성 taptap", installment: 1, status: "승인", memo: "생활용품" },
  { id: 14, userId: 1, transactionDate: "2026-05-29", merchant: "롯데시네마 건대",    categoryId: 5,    categoryName: "문화/여가", amount: 14000, cardName: "KB국민카드",  installment: 1, status: "승인", memo: null },
  { id: 15, userId: 1, transactionDate: "2026-05-30", merchant: "서울교통공사",       categoryId: 3,    categoryName: "교통",     amount: 1450,  cardName: "신한 Deep",   installment: 1, status: "승인", memo: "후불 교통" },
  // 2026-06
  { id: 16, userId: 1, transactionDate: "2026-06-01", merchant: "스타벅스 성수역점",  categoryId: 1,    categoryName: "식음료",   amount: 11200, cardName: "현대 Zero",   installment: 1, status: "승인", memo: "아메리카노 외 1건" },
  { id: 17, userId: 1, transactionDate: "2026-06-01", merchant: "배달의민족",         categoryId: null, categoryName: null,       amount: 26800, cardName: "신한 Deep",   installment: 1, status: "승인", memo: "저녁 주문" },
  { id: 18, userId: 1, transactionDate: "2026-06-02", merchant: "서울교통공사",       categoryId: 3,    categoryName: "교통",     amount: 1450,  cardName: "신한 Deep",   installment: 1, status: "승인", memo: "후불 교통" },
  { id: 19, userId: 1, transactionDate: "2026-06-02", merchant: "쿠팡",              categoryId: null, categoryName: null,       amount: 38700, cardName: "삼성 taptap", installment: 1, status: "승인", memo: "생활용품 구매" },
  { id: 20, userId: 1, transactionDate: "2026-06-03", merchant: "넷플릭스",          categoryId: 5,    categoryName: "문화/여가", amount: 17000, cardName: "현대 Zero",   installment: 1, status: "승인", memo: "정기결제" },
  { id: 21, userId: 1, transactionDate: "2026-06-03", merchant: "네이버페이",         categoryId: null, categoryName: null,       amount: 53000, cardName: "토스뱅크",    installment: 1, status: "승인", memo: "결제대행" },
  { id: 22, userId: 1, transactionDate: "2026-06-04", merchant: "올리브영",          categoryId: 2,    categoryName: "쇼핑",     amount: 21400, cardName: "삼성 taptap", installment: 1, status: "승인", memo: "건강용품" },
  { id: 23, userId: 1, transactionDate: "2026-06-05", merchant: "GS주유소 강남",      categoryId: 7,    categoryName: "주유",     amount: 91000, cardName: "현대 Zero",   installment: 1, status: "승인", memo: null },
  { id: 24, userId: 1, transactionDate: "2026-06-06", merchant: "당근마켓",           categoryId: null, categoryName: null,       amount: 45000, cardName: "토스뱅크",    installment: 1, status: "승인", memo: "중고 거래" },
  { id: 25, userId: 1, transactionDate: "2026-06-07", merchant: "교보문고 강남점",    categoryId: 9,    categoryName: "교육",     amount: 27500, cardName: "KB국민카드",  installment: 1, status: "승인", memo: "개발 서적" },
  { id: 26, userId: 1, transactionDate: "2026-06-08", merchant: "맥도날드 역삼점",    categoryId: 1,    categoryName: "식음료",   amount: 9800,  cardName: "신한 Deep",   installment: 1, status: "승인", memo: "점심" },
  { id: 27, userId: 1, transactionDate: "2026-06-09", merchant: "무신사",            categoryId: null, categoryName: null,       amount: 62000, cardName: "삼성 taptap", installment: 3, status: "승인", memo: "봄 의류" },
  { id: 28, userId: 1, transactionDate: "2026-06-10", merchant: "세브란스병원",       categoryId: 4,    categoryName: "의료/건강", amount: 22000, cardName: "KB국민카드",  installment: 1, status: "승인", memo: "치과 치료" },
  { id: 29, userId: 1, transactionDate: "2026-06-11", merchant: "CU 선릉역점",       categoryId: 6,    categoryName: "편의점",   amount: 5200,  cardName: "토스뱅크",    installment: 1, status: "승인", memo: null },
  { id: 30, userId: 1, transactionDate: "2026-06-11", merchant: "T머니",             categoryId: 3,    categoryName: "교통",     amount: 50000, cardName: "신한 Deep",   installment: 1, status: "취소", memo: "충전 취소" },
];

let ledgerTransactions: LedgerTransaction[] = [...INITIAL_LEDGER_TRANSACTIONS];
let nextLedgerId = 31;
syncWashingTransactionsFromLedger();

export const resetLedgerTransactions = () => {
  ledgerTransactions = [...INITIAL_LEDGER_TRANSACTIONS];
  nextLedgerId = 31;
  ledgerCategories = [...LEDGER_CATEGORIES];
  nextLedgerCategoryId = 11;
  syncWashingTransactionsFromLedger();
};

export const dbLedger = {
  getAll: () => [...ledgerTransactions],

  getById: (id: number) => ledgerTransactions.find((tx) => tx.id === id) ?? null,

  update: (id: number, data: Partial<LedgerTransaction>) => {
    const index = ledgerTransactions.findIndex((tx) => tx.id === id);
    if (index === -1) return null;
    ledgerTransactions[index] = { ...ledgerTransactions[index], ...data };
    syncWashingTransactionsFromLedger();
    return ledgerTransactions[index];
  },

  reset: () => {
    resetLedgerTransactions();
    return [...ledgerTransactions];
  },

  delete: (id: number) => {
    const index = ledgerTransactions.findIndex((tx) => tx.id === id);
    if (index === -1) return false;
    ledgerTransactions.splice(index, 1);
    syncWashingTransactionsFromLedger();
    return true;
  },

  bulkAdd: (items: Omit<LedgerTransaction, "id">[]) => {
    const added: LedgerTransaction[] = [];
    for (const item of items) {
      const isDuplicate = ledgerTransactions.some(
        (tx) =>
          tx.userId === item.userId &&
          tx.transactionDate === item.transactionDate &&
          tx.merchant === item.merchant &&
          tx.amount === item.amount &&
          tx.cardName === item.cardName,
      );
      if (!isDuplicate) {
        const newTx: LedgerTransaction = { ...item, id: nextLedgerId++ };
        ledgerTransactions.push(newTx);
        added.push(newTx);
      }
    }
    syncWashingTransactionsFromLedger();
    return added;
  },

  getCategories: () =>
    [...ledgerCategories].sort((a, b) => a.displayOrder - b.displayOrder),

  createCategory: (data: { name: string; color: string }) => {
    const category: LedgerCategory = {
      id: nextLedgerCategoryId++,
      name: data.name,
      color: data.color,
      displayOrder:
        Math.max(0, ...ledgerCategories.map((item) => item.displayOrder)) + 10,
      isDefault: false,
    };
    ledgerCategories.push(category);
    return category;
  },

  deleteCategory: (id: number) => {
    const index = ledgerCategories.findIndex((category) => category.id === id);
    if (index === -1) return false;
    ledgerCategories.splice(index, 1);
    ledgerTransactions = ledgerTransactions.map((transaction) =>
      transaction.categoryId === id
        ? { ...transaction, categoryId: null, categoryName: null, isClassified: false, appliedRuleId: null }
        : transaction,
    );
    syncWashingTransactionsFromLedger();
    return true;
  },
};

export interface RuleEngineRule {
  id: number;
  keyword: string;
  categoryId: number;
  categoryName: string;
  tag: string | null;
  appliedCount: number;
}

export interface RulePatternSuggestion {
  keyword: string;
  occurrences: number;
  totalAmount: number;
  exampleMerchant: string;
  recommendedCategoryId: number;
  recommendedCategoryName: string;
}

export interface RuleDryRunResult {
  matchCount: number;
  newlyClassifiedCount: number;
  overrideCount: number;
  hasOverrideRisk: boolean;
  transactions: {
    id: number;
    transactionDate: string;
    merchant: string;
    amount: number;
    currentCategoryId: number | null;
    currentCategory: string | null;
    newlyClassified: boolean;
    override: boolean;
  }[];
}

const INITIAL_RULES: Omit<RuleEngineRule, "appliedCount">[] = [
  {
    id: 1,
    keyword: "스타벅스",
    categoryId: 1,
    categoryName: "음식음료",
    tag: "#필수수혈",
  },
  {
    id: 2,
    keyword: "택시",
    categoryId: 3,
    categoryName: "교통",
    tag: "#야근택시",
  },
  {
    id: 3,
    keyword: "넷플릭스",
    categoryId: 5,
    categoryName: "문화/여가",
    tag: "#고정지출",
  },
];

let nextRuleId = 4;
let rules: Omit<RuleEngineRule, "appliedCount">[] = [...INITIAL_RULES];

const matchRuleTransactions = (keyword: string) => {
  const normalizedKeyword = keyword.trim().toLowerCase();
  if (!normalizedKeyword) return [];
  return ledgerTransactions.filter((transaction) =>
    transaction.merchant.toLowerCase().includes(normalizedKeyword),
  );
};

const guessRuleCategory = (keyword: string) => {
  const lowerKeyword = keyword.toLowerCase();
  if (
    lowerKeyword.includes("스타벅스") ||
    lowerKeyword.includes("빽다방") ||
    lowerKeyword.includes("커피") ||
    lowerKeyword.includes("카페") ||
    lowerKeyword.includes("메가") ||
    lowerKeyword.includes("이디야")
  ) {
    return LEDGER_CATEGORIES.find((category) => category.name.includes("음료")) ??
      LEDGER_CATEGORIES[0];
  }
  if (
    lowerKeyword.includes("배달의민족") ||
    lowerKeyword.includes("요기요") ||
    lowerKeyword.includes("쿠팡이츠") ||
    lowerKeyword.includes("마켓컬리")
  ) {
    return LEDGER_CATEGORIES.find((category) => category.name.includes("음료")) ??
      LEDGER_CATEGORIES[0];
  }
  if (
    lowerKeyword.includes("택시") ||
    lowerKeyword.includes("교통") ||
    lowerKeyword.includes("t머니")
  ) {
    return LEDGER_CATEGORIES.find((category) => category.name.includes("교통")) ??
      LEDGER_CATEGORIES[0];
  }
  if (
    lowerKeyword.includes("넷플") ||
    lowerKeyword.includes("멜론") ||
    lowerKeyword.includes("디즈니플러스") ||
    lowerKeyword.includes("유튜브프리미엄") ||
    lowerKeyword.includes("cgv") ||
    lowerKeyword.includes("영화")
  ) {
    return LEDGER_CATEGORIES.find((category) => category.name.includes("문화")) ??
      LEDGER_CATEGORIES[0];
  }
  if (
    lowerKeyword.includes("쿠팡") ||
    lowerKeyword.includes("11번가") ||
    lowerKeyword.includes("g마켓") ||
    lowerKeyword.includes("무신사")
  ) {
    return LEDGER_CATEGORIES.find((category) => category.name.includes("쇼핑")) ??
      LEDGER_CATEGORIES[0];
  }
  if (
    lowerKeyword.includes("교보문고") ||
    lowerKeyword.includes("클래스") ||
    lowerKeyword.includes("예스24")
  ) {
    return LEDGER_CATEGORIES.find((category) => category.name.includes("교육")) ??
      LEDGER_CATEGORIES[0];
  }
  if (
    lowerKeyword.includes("이마트") ||
    lowerKeyword.includes("gs25") ||
    lowerKeyword.includes("cu")
  ) {
    return LEDGER_CATEGORIES.find((category) => category.name.includes("편의점")) ??
      LEDGER_CATEGORIES[0];
  }
  return LEDGER_CATEGORIES[0];
};

const getRuleKeyword = (merchant: string) => {
  const normalized = merchant.replace(/[()[\]]/g, " ").trim();
  const [firstToken] = normalized.split(/\s+/);
  if (firstToken.length >= 2) return firstToken;
  return normalized.slice(0, 5);
};

export const resetRules = () => {
  rules = [...INITIAL_RULES];
  nextRuleId = 4;
};

export const dbRuleEngine = {
  getAll: (): RuleEngineRule[] =>
    rules.map((rule) => ({
      ...rule,
      appliedCount: matchRuleTransactions(rule.keyword).length,
    })),

  getPatterns: (): RulePatternSuggestion[] => {
    const counts = new Map<string, number>();
    const samples = new Map<string, string[]>();

    ledgerTransactions
      .filter((transaction) => transaction.categoryId == null && !transaction.categoryName)
      .forEach((transaction) => {
        const keyword = getRuleKeyword(transaction.merchant);
        if (keyword.length < 2) return;
        counts.set(keyword, (counts.get(keyword) ?? 0) + 1);
        const currentSamples = samples.get(keyword) ?? [];
        if (currentSamples.length < 3) {
          samples.set(keyword, [...currentSamples, transaction.merchant]);
        }
      });

    return [...counts.entries()]
      .filter(([, count]) => count >= 2)
      .sort(([leftKeyword, leftCount], [rightKeyword, rightCount]) => {
        if (rightCount !== leftCount) return rightCount - leftCount;
        if (rightKeyword.length !== leftKeyword.length) {
          return rightKeyword.length - leftKeyword.length;
        }
        return leftKeyword.localeCompare(rightKeyword, "ko-KR");
      })
      .slice(0, 6)
      .map(([keyword, count]) => {
        const category = guessRuleCategory(keyword);
        const keywordSamples = samples.get(keyword) ?? [];
        return {
          keyword,
          occurrences: count,
          totalAmount: ledgerTransactions
            .filter((transaction) => getRuleKeyword(transaction.merchant) === keyword)
            .reduce((sum, transaction) => sum + transaction.amount, 0),
          exampleMerchant: keywordSamples[0] ?? keyword,
          recommendedCategoryId: category.id,
          recommendedCategoryName: category.name,
        };
      });
  },

  dryRun: (payload: {
    keyword: string;
    categoryId: number;
  }): RuleDryRunResult => {
    const matchedTransactions = matchRuleTransactions(payload.keyword);
    const transactions = matchedTransactions.map((transaction) => ({
      id: transaction.id,
      transactionDate: transaction.transactionDate,
      merchant: transaction.merchant,
      amount: transaction.amount,
      currentCategoryId: transaction.categoryId ?? null,
      currentCategory: transaction.categoryName ?? null,
      newlyClassified: transaction.categoryId == null && !transaction.categoryName,
      override: transaction.categoryId != null || !!transaction.categoryName,
    }));
    const overrideCount = transactions.filter((transaction) => transaction.override).length;
    return {
      matchCount: transactions.length,
      newlyClassifiedCount: transactions.filter((transaction) => transaction.newlyClassified).length,
      overrideCount,
      hasOverrideRisk: overrideCount > 0,
      transactions,
    };
  },

  create: (payload: {
    keyword: string;
    categoryId: number;
    tag?: string;
  }) => {
    const category = ledgerCategories.find((item) => item.id === payload.categoryId);
    if (!category) return false;
    const normalizedTag = payload.tag?.trim()
      ? payload.tag.trim().startsWith("#")
        ? payload.tag.trim()
        : `#${payload.tag.trim()}`
      : "";
    const rule = {
      id: nextRuleId++,
      keyword: payload.keyword.trim(),
      categoryId: category.id,
      categoryName: category.name,
      tag: normalizedTag || null,
    };
    rules = [rule, ...rules];

    ledgerTransactions = ledgerTransactions.map((transaction) =>
      transaction.merchant.toLowerCase().includes(payload.keyword.toLowerCase()) && (transaction.isClassified === false || transaction.categoryId == null)
        ? {
            ...transaction,
            categoryId: rule.categoryId,
            categoryName: rule.categoryName,
            tag: rule.tag ?? transaction.tag,
            appliedRuleId: rule.id,
            isClassified: true,
          }
        : transaction,
    );
    syncWashingTransactionsFromLedger();

    return true;
  },

  delete: (id: number) => {
    const before = rules.length;
    rules = rules.filter((rule) => rule.id !== id);
    return rules.length !== before;
  },
};

export const resetAllMocks = () => {
  resetSamples();
  resetUsers();
  resetWashingTransactions();
  resetLedgerTransactions();
  resetRules();
};
