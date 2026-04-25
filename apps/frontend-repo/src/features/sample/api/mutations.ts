import { api } from "@/shared/api/axios";
import type { CreateSampleRequest, UpdateSampleRequest, PatchSampleRequest } from "@/features/sample/model/types";

export const createSample = async (payload: CreateSampleRequest) => {
  const { data } = await api.post("/api/sample", payload);
  return data;
};

/**
 * 표준 수정 메서드 (PUT)
 * 전체 객체 정보를 교체하는 기본 수정 방식입니다.
 */
export const updateSample = async (id: number, payload: UpdateSampleRequest) => {
  const { data } = await api.put(`/api/sample/${id}`, payload);
  return data;
};

/**
 * 부분 수정 메서드 (PATCH)
 * 특정 필드만 선택적으로 수정할 때 사용합니다.
 */
export const patchSample = async (id: number, payload: PatchSampleRequest) => {
  const { data } = await api.patch(`/api/sample/${id}`, payload);
  return data;
};

export const deleteSample = async (id: number) => {
  const { data } = await api.delete(`/api/sample/${id}`);
  return data;
};
