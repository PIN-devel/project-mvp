import { http, HttpResponse, delay } from "msw";
import { db } from "./db";

const IS_TEST = import.meta.env.MODE === "test";

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
        detail: "강제로 발생시킨 비즈니스 예외 테스트입니다.",
        instance: "/api/sample/error",
        errorCode: "SAMPLE_LIMIT_EXCEEDED",
      },
      { status: 400 }
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
    const data = await request.json() as Record<string, unknown>;
    const newSample = db.create({ message: data.message as string });
    return HttpResponse.json(newSample, { status: 201 });
  }),

  http.put("/api/sample/:id", async ({ params, request }) => {
    if (!IS_TEST) await delay();
    const id = Number(params.id);
    const data = await request.json() as Record<string, unknown>;
    const updated = db.update(id, { message: data.message as string });
    
    if (!updated) {
      return new HttpResponse(null, { status: 404 });
    }
    
    return HttpResponse.json(updated);
  }),

  http.patch("/api/sample/:id", async ({ params, request }) => {
    if (!IS_TEST) await delay();
    const id = Number(params.id);
    const data = await request.json() as Record<string, unknown>;
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
];
