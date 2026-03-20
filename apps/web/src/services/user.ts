import type { ExpectDetailResponse, LoginRequest, LoginResponse, LotteryType, SessionUser, UserExpectListItem } from "@statisticalsystem/shared";
import { apiFetch } from "./api";

export async function loginUser(payload: LoginRequest): Promise<LoginResponse> {
  return apiFetch<LoginResponse>("/api/user/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function logoutUser(): Promise<void> {
  await apiFetch("/api/user/logout", {
    method: "POST",
    body: JSON.stringify({})
  });
}

export async function getUserMe(): Promise<SessionUser> {
  const response = await apiFetch<{ user: SessionUser }>("/api/user/me");
  return response.user;
}

export async function getUserExpects(lotteryType: LotteryType): Promise<UserExpectListItem[]> {
  return apiFetch<UserExpectListItem[]>(`/api/user/expects?lottery=${encodeURIComponent(lotteryType)}`);
}

export async function getUserExpectDetail(expect: string, lotteryType: LotteryType): Promise<ExpectDetailResponse> {
  return apiFetch<ExpectDetailResponse>(`/api/user/expects/${expect}?lottery=${encodeURIComponent(lotteryType)}`);
}
