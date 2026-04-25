import { z } from "zod";

/**
 * API 응답 데이터의 타입 안정성을 위한 스키마
 * 비즈니스 로직 유효성 검증은 백엔드에 위임합니다.
 */
export const SampleSchema = z.object({
  id: z.number(),
  message: z.string(),
  status: z.enum(["ACTIVE", "INACTIVE", "ERROR"]),
  urgent: z.boolean(),
  updatedAt: z.string(),
});

export const SampleListSchema = z.array(SampleSchema);
