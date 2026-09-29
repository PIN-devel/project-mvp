import { delay, http, HttpResponse } from "msw";
import { db, dbLedger, dbRuleEngine, dbUser, dbWashing } from "./db";

const IS_TEST = import.meta.env.MODE === "test";
let monthlyGoals: Array<{
  id: number;
  month: string;
  title: string;
  targetCategory: string;
  reductionRatio: number;
  baselineAmount: number;
  targetAmount: number;
  monthlySave: number;
  status: "active" | "completed" | "stopped";
  actualSaved: number | null;
  createdAt: string;
  updatedAt: string;
}> = [];
let nextMonthlyGoalId = 1;

export const handlers = [
  http.get("/api/sample", async () => {
    if (!IS_TEST) await delay();
    return HttpResponse.json(db.getAll());
  }),

  http.get("/api/sample/error", async () => {
    if (!IS_TEST) await delay();
    return HttpResponse.json(
      {
        type: "about:blank",
        title: "Bad Request",
        status: 400,
        detail: "강제로 발생시키는 비즈니스 예외 테스트입니다.",
        instance: "/api/sample/error",
        errorCode: "SAMPLE_LIMIT_EXCEEDED",
      },
      { status: 400 },
    );
  }),

  http.get("/api/sample/:id", async ({ params }) => {
    if (!IS_TEST) await delay();
    const id = Number(params.id);
    const sample = db.getById(id);
    if (!sample) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json(sample);
  }),

  http.post("/api/sample", async ({ request }) => {
    if (!IS_TEST) await delay();
    const data = (await request.json()) as Record<string, unknown>;
    const newSample = db.create({ message: data.message as string });
    return HttpResponse.json(newSample, { status: 201 });
  }),

  http.put("/api/sample/:id", async ({ params, request }) => {
    if (!IS_TEST) await delay();
    const id = Number(params.id);
    const data = (await request.json()) as Record<string, unknown>;
    const updated = db.update(id, { message: data.message as string });

    if (!updated) {
      return new HttpResponse(null, { status: 404 });
    }

    return HttpResponse.json(updated);
  }),

  http.patch("/api/sample/:id", async ({ params, request }) => {
    if (!IS_TEST) await delay();
    const id = Number(params.id);
    const data = (await request.json()) as Record<string, unknown>;
    const updated = db.patch(id, data);

    if (!updated) {
      return new HttpResponse(null, { status: 404 });
    }

    return HttpResponse.json(updated);
  }),

  http.delete("/api/sample/:id", async ({ params }) => {
    if (!IS_TEST) await delay();
    const id = Number(params.id);
    const success = db.delete(id);

    if (!success) {
      return new HttpResponse(null, { status: 404 });
    }

    return new HttpResponse(null, { status: 204 });
  }),

  http.get("/api/transactions/overview", async () => {
    if (!IS_TEST) await delay();
    return HttpResponse.json(dbWashing.getOverview());
  }),

  http.post("/api/transactions/bulk-classify", async ({ request }) => {
    if (!IS_TEST) await delay();
    const body = (await request.json()) as {
      ids?: number[];
      category?: string;
    };

    if (!body.category || !Array.isArray(body.ids) || body.ids.length === 0) {
      return HttpResponse.json(
        {
          type: "about:blank",
          title: "Bad Request",
          status: 400,
          detail: "분류할 내역과 카테고리를 선택해 주세요.",
          instance: "/api/transactions/bulk-classify",
          errorCode: "WASH001",
        },
        { status: 400 },
      );
    }

    const overview = dbWashing.bulkClassify(body.ids, body.category);

    const matchedLedgerCategory = dbLedger.getCategories().find(
      (c) => c.name === body.category,
    );
    overview.transactions
      .filter((tx) => body.ids!.includes(tx.id) && tx.ledgerId != null)
      .forEach((tx) => {
        dbLedger.update(tx.ledgerId!, {
          categoryId: matchedLedgerCategory?.id ?? null,
          categoryName: body.category,
        });
      });

    return HttpResponse.json(overview);
  }),

  http.patch(
    "/api/transactions/:id/category",
    async ({ params, request }) => {
      if (!IS_TEST) await delay();
      const id = Number(params.id);
      const body = (await request.json()) as {
        category?: string | null;
        categoryId?: number | null;
      };
      const matchedCategory =
        body.categoryId == null
          ? null
          : dbLedger.getCategories().find((category) => category.id === body.categoryId) ?? null;
      const nextCategory = body.category ?? matchedCategory?.name ?? null;
      const updated = dbLedger.update(id, {
        categoryId: body.categoryId ?? null,
        categoryName: nextCategory,
        isClassified: body.categoryId != null,
      });

      if (!updated) {
        return new HttpResponse(null, { status: 404 });
      }

      return HttpResponse.json(updated);
    },
  ),

  http.patch("/api/transactions/:id/tag", async ({ params, request }) => {
    if (!IS_TEST) await delay();
    const id = Number(params.id);
    const body = (await request.json()) as { tag?: string | null };
    const normalizedTag =
      body.tag && body.tag.trim()
        ? body.tag.trim().startsWith("#")
          ? body.tag.trim()
          : `#${body.tag.trim()}`
        : null;
    const updated = dbLedger.update(id, { tag: normalizedTag });

    if (!updated) {
      return new HttpResponse(null, { status: 404 });
    }

    return HttpResponse.json(updated);
  }),

  http.post("/api/transactions/import-mock", async () => {
    if (!IS_TEST) await delay();
    const today = new Date().toISOString().slice(0, 10);
    const mockItems: Omit<import("./db").LedgerTransaction, "id">[] = [
      {
        userId: 1, transactionDate: today,
        merchant: "메가MGC커피", categoryId: null, categoryName: null,
        amount: 3900, cardName: "현대 Zero", installment: 1, status: "승인",
        memo: "출근길 커피",
      },
      {
        userId: 1, transactionDate: today,
        merchant: "오늘의집", categoryId: null, categoryName: null,
        amount: 78200, cardName: "토스뱅크", installment: 1, status: "승인",
        memo: "소형 가구 결제",
      },
    ];
    const added = dbLedger.bulkAdd(mockItems);
    added.forEach((tx) => dbWashing.addFromLedger(tx));
    return HttpResponse.json(dbWashing.getOverview(), { status: 201 });
  }),

  http.get("/api/transactions", async () => {
    if (!IS_TEST) await delay();
    return HttpResponse.json(dbLedger.getAll());
  }),

  http.post("/api/transactions/reset", async () => {
    if (!IS_TEST) await delay();
    return HttpResponse.json(dbLedger.reset());
  }),

  http.get("/api/transactions/:id", async ({ params }) => {
    if (!IS_TEST) await delay();
    const id = Number(params.id);
    const tx = dbLedger.getById(id);
    if (!tx) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(tx);
  }),

  http.delete("/api/transactions/:id", async ({ params }) => {
    if (!IS_TEST) await delay();
    const id = Number(params.id);
    const success = dbLedger.delete(id);
    if (!success) return new HttpResponse(null, { status: 404 });
    return new HttpResponse(null, { status: 204 });
  }),

  http.put("/api/transactions/:id", async ({ params, request }) => {
    if (!IS_TEST) await delay();
    const id = Number(params.id);
    const body = (await request.json()) as Record<string, unknown>;
    const updated = dbLedger.update(id, body as Parameters<typeof dbLedger.update>[1]);
    if (!updated) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(updated);
  }),

  http.get("/api/categories", async () => {
    if (!IS_TEST) await delay();
    return HttpResponse.json(dbLedger.getCategories());
  }),

  http.get("/api/monthly-goals", async () => {
    if (!IS_TEST) await delay();
    return HttpResponse.json(monthlyGoals);
  }),

  http.put("/api/monthly-goals/:month", async ({ params, request }) => {
    if (!IS_TEST) await delay();
    const body = (await request.json()) as {
      title: string;
      targetCategory: string;
      reductionRatio: number;
      baselineAmount: number;
      monthlySave: number;
    };
    const month = String(params.month);
    const now = new Date().toISOString();
    const goal = {
      id: monthlyGoals.find((item) => item.month === month)?.id ?? nextMonthlyGoalId++,
      month,
      ...body,
      targetAmount: body.baselineAmount - body.monthlySave,
      status: "active" as const,
      actualSaved: null,
      createdAt: now,
      updatedAt: now,
    };
    monthlyGoals = [...monthlyGoals.filter((item) => item.month !== month), goal];
    return HttpResponse.json(goal);
  }),

  http.patch("/api/monthly-goals/:id/status", async ({ params, request }) => {
    if (!IS_TEST) await delay();
    const body = (await request.json()) as {
      status: "active" | "completed" | "stopped";
      actualSaved?: number;
    };
    const id = Number(params.id);
    const current = monthlyGoals.find((goal) => goal.id === id);
    if (!current) return new HttpResponse(null, { status: 404 });
    const updated = {
      ...current,
      status: body.status,
      actualSaved: body.status === "completed" ? body.actualSaved ?? current.monthlySave : null,
      updatedAt: new Date().toISOString(),
    };
    monthlyGoals = monthlyGoals.map((goal) => (goal.id === id ? updated : goal));
    return HttpResponse.json(updated);
  }),

  http.post("/api/insights", async ({ request }) => {
    if (!IS_TEST) await delay();
    const body = (await request.json()) as {
      period?: string;
      categoryId?: number | null;
      transactions?: Array<{
        merchant?: string;
        categoryName?: string | null;
        amount?: number;
        isClassified?: boolean;
      }>;
    };

    if (!body.period || !Array.isArray(body.transactions)) {
      return HttpResponse.json(
        {
          type: "about:blank",
          title: "Bad Request",
          status: 400,
          detail: "잘못된 입력값입니다.",
          errors: {
            period: body.period ? undefined : "분석 기간을 선택해주세요.",
            transactions: Array.isArray(body.transactions)
              ? undefined
              : "분석할 거래 내역을 한 건 이상 입력해주세요.",
          },
        },
        { status: 400 },
      );
    }

    if (body.transactions.length === 0) {
      return HttpResponse.json(
        {
          type: "about:blank",
          title: "Bad Request",
          status: 400,
          detail: "잘못된 입력값입니다.",
          errors: {
            transactions: "분석할 거래 내역을 한 건 이상 입력해주세요.",
          },
        },
        { status: 400 },
      );
    }

    const totalAmount = body.transactions.reduce(
      (sum, transaction) => sum + (transaction.amount ?? 0),
      0,
    );
    const unclassifiedCount = body.transactions.filter(
      (transaction) => transaction.isClassified === false,
    ).length;
    const categoryAmounts = new Map<string, number>();
    body.transactions.forEach((transaction) => {
      const categoryName = transaction.categoryName || "미분류";
      categoryAmounts.set(
        categoryName,
        (categoryAmounts.get(categoryName) ?? 0) + (transaction.amount ?? 0),
      );
    });
    const topCategory =
      [...categoryAmounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ??
      "미분류";

    return HttpResponse.json({
      summary: `선택한 조건의 ${body.transactions.length}건 거래를 분석했습니다. 총 ${totalAmount.toLocaleString()}원 중 ${topCategory} 영역의 비중이 가장 높고, 미분류 ${unclassifiedCount}건은 추가 정리 후 다시 분석하면 더 정확합니다.`,
      cards: [
        {
          title: "가장 큰 지출 영역",
          description: `${topCategory} 지출이 가장 크게 나타났습니다. 이번 달 절감 목표 후보로 우선 검토할 수 있습니다.`,
        },
        {
          title: "반복 소비 패턴",
          description:
            "같은 가맹점 또는 같은 카테고리의 반복 결제가 있어 정기 지출 여부를 확인해 볼 수 있습니다.",
        },
        {
          title: "소비 점검 포인트",
          description:
            "미분류 거래를 먼저 정리한 뒤 다시 요청하면 목표 추천과 절감 추이의 신뢰도가 올라갑니다.",
        },
      ],
      generatedAt: new Date().toISOString(),
    });
  }),

  http.post("/api/categories", async ({ request }) => {
    if (!IS_TEST) await delay();
    const body = (await request.json()) as { name?: string; color?: string };

    if (!body.name || !body.color) {
      return HttpResponse.json(
        {
          type: "about:blank",
          title: "Bad Request",
          status: 400,
          detail: "카테고리명과 색상은 필수입니다.",
          instance: "/api/categories",
          errorCode: "CAT001",
        },
        { status: 400 },
      );
    }

    const exists = dbLedger
      .getCategories()
      .some((category) => category.name === body.name);
    if (exists) {
      return HttpResponse.json(
        {
          type: "about:blank",
          title: "Bad Request",
          status: 400,
          detail: "이미 존재하는 카테고리명입니다.",
          instance: "/api/categories",
          errorCode: "CAT002",
        },
        { status: 400 },
      );
    }

    const created = dbLedger.createCategory({
      name: body.name,
      color: body.color,
    });
    return HttpResponse.json(created, { status: 201 });
  }),

  http.delete("/api/categories/:id", async ({ params }) => {
    if (!IS_TEST) await delay();
    const success = dbLedger.deleteCategory(Number(params.id));
    if (!success) return new HttpResponse(null, { status: 404 });
    return new HttpResponse(null, { status: 204 });
  }),

  http.get("/api/rules", async () => {
    if (!IS_TEST) await delay();
    return HttpResponse.json(dbRuleEngine.getAll());
  }),

  http.get("/api/rules/patterns", async () => {
    if (!IS_TEST) await delay();
    return HttpResponse.json(dbRuleEngine.getPatterns());
  }),

  http.post("/api/rules/dry-run", async ({ request }) => {
    if (!IS_TEST) await delay();
    const body = (await request.json()) as {
      keyword?: string;
      categoryId?: number;
    };
    return HttpResponse.json(
      dbRuleEngine.dryRun({
        keyword: body.keyword ?? "",
        categoryId: body.categoryId ?? 0,
      }),
    );
  }),

  http.post("/api/rules", async ({ request }) => {
    if (!IS_TEST) await delay();
    const body = (await request.json()) as {
      keyword?: string;
      categoryId?: number;
      tag?: string;
    };

    if (!body.keyword || body.categoryId == null) {
      return HttpResponse.json(
        {
          type: "about:blank",
          title: "Bad Request",
          status: 400,
          detail: "규칙 키워드와 카테고리 ID가 필요합니다.",
          instance: "/api/rules",
          errorCode: "RUL003",
        },
        { status: 400 },
      );
    }

    const success = dbRuleEngine.create({
      keyword: body.keyword,
      categoryId: body.categoryId,
      tag: body.tag,
    });
    if (!success) {
      return HttpResponse.json(
        {
          type: "urn:cop:kbds:agilemvp:error:RUL004",
          title: "INVALID_CATEGORY",
          status: 400,
          detail: "카테고리가 유효하지 않습니다.",
          instance: "/api/rules",
        },
        { status: 400 },
      );
    }

    return new HttpResponse(null, { status: 201 });
  }),

  http.delete("/api/rules/:id", async ({ params }) => {
    if (!IS_TEST) await delay();
    const success = dbRuleEngine.delete(Number(params.id));
    if (!success) return new HttpResponse(null, { status: 404 });
    return new HttpResponse(null, { status: 204 });
  }),

  http.post("/api/excel/upload", async () => {
    if (!IS_TEST) await delay();
    const parsed: Omit<import("./db").LedgerTransaction, "id">[] = [
      {
        userId: 1, transactionDate: "2026-06-10",
        merchant: "GS25 강남점", categoryId: null, categoryName: null,
        amount: 4200, cardName: "신한 Deep", installment: 1, status: "승인",
        memo: "편의점",
      },
      {
        userId: 1, transactionDate: "2026-06-10",
        merchant: "CGV 강남", categoryId: null, categoryName: null,
        amount: 15000, cardName: "현대 Zero", installment: 1, status: "승인",
        memo: "영화 관람",
      },
      {
        userId: 1, transactionDate: "2026-06-11",
        merchant: "이마트 역삼점", categoryId: null, categoryName: null,
        amount: 67800, cardName: "삼성 taptap", installment: 1, status: "승인",
        memo: "주간 장보기",
      },
      {
        userId: 1, transactionDate: "2026-06-11",
        merchant: "KT 통신요금", categoryId: null, categoryName: null,
        amount: 55000, cardName: "토스뱅크", installment: 1, status: "승인",
        memo: "6월 통신비",
      },
      {
        userId: 1, transactionDate: "2026-06-12",
        merchant: "스타벅스 역삼점", categoryId: null, categoryName: null,
        amount: 6500, cardName: "신한 Deep", installment: 1, status: "승인",
        memo: null,
      },
    ];
    const withTempId = parsed.map((item, idx) => ({ ...item, id: 9000 + idx + 1 }));
    return HttpResponse.json(withTempId);
  }),

  http.post("/api/transactions/bulk", async ({ request }) => {
    if (!IS_TEST) await delay();
    const body = (await request.json()) as Omit<import("./db").LedgerTransaction, "id">[];
    const added = dbLedger.bulkAdd(body);
    added
      .filter((tx) => tx.categoryId == null)
      .forEach((tx) => dbWashing.addFromLedger(tx));
    return HttpResponse.json({ added, skippedCount: body.length - added.length }, { status: 200 });
  }),

  http.post("/api/auth/register", async ({ request }) => {
    if (!IS_TEST) await delay();
    const body = (await request.json()) as {
      loginId: string;
      nickname: string;
      password?: string;
    };

    const existing = dbUser.findByLoginId(body.loginId);
    if (existing) {
      return HttpResponse.json(
        {
          type: "about:blank",
          title: "Bad Request",
          status: 400,
          detail: "이미 존재하거나 등록된 아이디입니다.",
          instance: "/api/auth/register",
          errorCode: "ATH004",
        },
        { status: 400 },
      );
    }

    const created = dbUser.create({
      loginId: body.loginId,
      nickname: body.nickname,
      password: body.password,
    });

    return HttpResponse.json(created, { status: 201 });
  }),

  http.post("/api/auth/login", async ({ request }) => {
    if (!IS_TEST) await delay();
    const body = (await request.json()) as {
      loginId: string;
      password?: string;
    };

    const user = dbUser.findByLoginId(body.loginId);
    if (!user || user.password !== body.password || user.status === "deleted") {
      return HttpResponse.json(
        {
          type: "about:blank",
          title: "Unauthorized",
          status: 401,
          detail: "잘못된 아이디 또는 비밀번호입니다.",
          instance: "/api/auth/login",
          errorCode: "ATH001",
        },
        { status: 401 },
      );
    }

    return HttpResponse.json(
      {
        accessToken: `mock-jwt-token-for-${user.loginId}`,
        nickname: user.nickname,
      },
      { status: 200 },
    );
  }),

  http.get("/api/user/me", async ({ request }) => {
    if (!IS_TEST) await delay();
    const authHeader = request.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer mock-jwt-token-for-")) {
      return HttpResponse.json(
        {
          type: "about:blank",
          title: "Unauthorized",
          status: 401,
          detail: "인증 토큰이 없거나 유효하지 않습니다.",
          instance: "/api/user/me",
          errorCode: "ATH003",
        },
        { status: 401 },
      );
    }

    const loginId = authHeader.replace("Bearer mock-jwt-token-for-", "");
    const user = dbUser.findByLoginId(loginId);

    if (!user || user.status === "deleted") {
      return HttpResponse.json(
        {
          type: "about:blank",
          title: "Unauthorized",
          status: 401,
          detail: "사용자를 찾을 수 없거나 탈퇴했습니다.",
          instance: "/api/user/me",
          errorCode: "ATH002",
        },
        { status: 401 },
      );
    }

    return HttpResponse.json(
      {
        id: user.id,
        loginId: user.loginId,
        nickname: user.nickname,
        status: user.status,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
      },
      { status: 200 },
    );
  }),

  http.delete("/api/user", async ({ request }) => {
    if (!IS_TEST) await delay();
    const authHeader = request.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer mock-jwt-token-for-")) {
      return HttpResponse.json(
        {
          type: "about:blank",
          title: "Unauthorized",
          status: 401,
          detail: "인증 토큰이 유효하지 않습니다.",
          instance: "/api/user",
          errorCode: "ATH003",
        },
        { status: 401 },
      );
    }

    const loginId = authHeader.replace("Bearer mock-jwt-token-for-", "");
    const success = dbUser.delete(loginId);

    if (!success) {
      return HttpResponse.json(
        {
          type: "about:blank",
          title: "Not Found",
          status: 404,
          detail: "존재하지 않는 회원 정보입니다.",
          instance: "/api/user",
          errorCode: "USR001",
        },
        { status: 404 },
      );
    }

    return new HttpResponse(null, { status: 204 });
  }),
];
