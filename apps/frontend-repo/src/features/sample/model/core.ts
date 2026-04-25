import type { CreateSampleRequest, UpdateSampleRequest, PatchSampleRequest } from "./types";

/**
 * Sample 액션의 의도와 데이터를 정의하는 타입
 */
export type SampleCommand =
  | { type: "create"; payload: CreateSampleRequest }
  | { type: "update"; id: number; payload: UpdateSampleRequest }
  | { type: "patch"; id: number; payload: PatchSampleRequest }
  | { type: "delete"; id: number }
  | { type: "error_test" }
  | { type: "unknown" };

/**
 * [순수 로직] FormData를 SampleCommand로 변환하여 인프라와 도메인을 분리합니다.
 */
export const parseSampleCommand = (formData: FormData): SampleCommand => {
  const intent = formData.get("intent");

  switch (intent) {
    case "create":
      return {
        type: "create",
        payload: {
          message: extractString(formData, "message"),
        },
      };

    case "update":
      return {
        type: "update",
        id: extractNumber(formData, "id"),
        payload: {
          message: extractString(formData, "message"),
          status: extractString(formData, "status"),
          urgent: extractBoolean(formData, "urgent"),
        },
      };

    case "patch":
      return {
        type: "patch",
        id: extractNumber(formData, "id"),
        payload: {
          status: extractString(formData, "status"),
        },
      };

    case "delete":
      return {
        type: "delete",
        id: extractNumber(formData, "id"),
      };

    case "error_test":
      return { type: "error_test" };

    default:
      return { type: "unknown" };
  }
};

/**
 * 도메인 특화 파싱 유틸리티 (순수 함수)
 */
export const extractString = (formData: FormData, key: string): string => 
  String(formData.get(key) || "");

export const extractNumber = (formData: FormData, key: string): number => 
  Number(formData.get(key));

export const extractBoolean = (formData: FormData, key: string): boolean => 
  formData.get(key) === "true";
