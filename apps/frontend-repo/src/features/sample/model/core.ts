import type { CreateSampleRequest, UpdateSampleRequest, PatchSampleRequest } from "./types";

/**
 * SampleCommand represents the intent and associated data for a sample action.
 */
export type SampleCommand =
  | { type: "create"; payload: CreateSampleRequest }
  | { type: "update"; id: number; payload: UpdateSampleRequest }
  | { type: "patch"; id: number; payload: PatchSampleRequest }
  | { type: "delete"; id: number }
  | { type: "error_test" }
  | { type: "unknown" };

/**
 * [Pure Logic] Parses FormData into a typed SampleCommand.
 * This function decouples infrastructure (FormData) from domain intent.
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
 * Domain-specific parsing rules (Pure Functions)
 */
export const extractString = (formData: FormData, key: string): string => 
  String(formData.get(key) || "");

export const extractNumber = (formData: FormData, key: string): number => 
  Number(formData.get(key));

export const extractBoolean = (formData: FormData, key: string): boolean => 
  formData.get(key) === "true";
