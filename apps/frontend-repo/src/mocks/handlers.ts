import { http, HttpResponse } from "msw";
import { db } from "./db";

export const handlers = [
  http.get("/api/sample", () => {
    return HttpResponse.json(db.getAll());
  }),

  http.get("/api/sample/error", () => {
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

  http.get("/api/sample/:id", ({ params }) => {
    const id = Number(params.id);
    const sample = db.getById(id);
    if (!sample) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json(sample);
  }),

  http.post("/api/sample", async ({ request }) => {
    const data = await request.json() as any;
    const newSample = db.create({ message: data.message });
    return HttpResponse.json(newSample, { status: 201 });
  }),

  http.put("/api/sample/:id", async ({ params, request }) => {
    const id = Number(params.id);
    const data = await request.json() as any;
    const updated = db.update(id, { message: data.message });
    
    if (!updated) {
      return new HttpResponse(null, { status: 404 });
    }
    
    return HttpResponse.json(updated);
  }),

  http.patch("/api/sample/:id", async ({ params, request }) => {
    const id = Number(params.id);
    const data = await request.json() as any;
    const updated = db.patch(id, data);
    
    if (!updated) {
      return new HttpResponse(null, { status: 404 });
    }
    
    return HttpResponse.json(updated);
  }),

  http.delete("/api/sample/:id", ({ params }) => {
    const id = Number(params.id);
    const success = db.delete(id);
    
    if (!success) {
      return new HttpResponse(null, { status: 404 });
    }
    
    return new HttpResponse(null, { status: 204 });
  }),
];
