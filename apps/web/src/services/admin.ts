import type {
  AdminDataResponse,
  AdminExpectDetailResponse,
  LoginRequest,
  LoginResponse,
  LotteryType,
  SessionUser,
  UpsertUserRequest,
  UserExpectListItem,
  UserRecord
} from "@statisticalsystem/shared";
import { apiFetch } from "./api";

export async function loginAdmin(payload: LoginRequest): Promise<LoginResponse> {
  return apiFetch<LoginResponse>("/api/admin/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function logoutAdmin(): Promise<void> {
  await apiFetch("/api/admin/logout", {
    method: "POST",
    body: JSON.stringify({})
  });
}

export async function getAdminMe(): Promise<SessionUser> {
  const response = await apiFetch<{ user: SessionUser }>("/api/admin/me");
  return response.user;
}

export async function getAdminUsers(): Promise<UserRecord[]> {
  return apiFetch<UserRecord[]>("/api/admin/users");
}

export async function createAdminUser(payload: UpsertUserRequest): Promise<UserRecord> {
  return apiFetch<UserRecord>("/api/admin/users", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateAdminUser(id: string, payload: UpsertUserRequest): Promise<UserRecord> {
  return apiFetch<UserRecord>(`/api/admin/users/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function getAdminData(account: string, expect: string, lotteryType: LotteryType): Promise<AdminDataResponse> {
  return apiFetch<AdminDataResponse>(
    `/api/admin/data?account=${encodeURIComponent(account)}&expect=${encodeURIComponent(expect)}&lottery=${encodeURIComponent(lotteryType)}`
  );
}

export async function getAdminExpects(account: string, lotteryType: LotteryType): Promise<UserExpectListItem[]> {
  return apiFetch<UserExpectListItem[]>(
    `/api/admin/data/expects?account=${encodeURIComponent(account)}&lottery=${encodeURIComponent(lotteryType)}`
  );
}

export async function getAdminExpectDetail(account: string, expect: string, lotteryType: LotteryType): Promise<AdminExpectDetailResponse> {
  return apiFetch<AdminExpectDetailResponse>(
    `/api/admin/data/expects/${encodeURIComponent(expect)}?account=${encodeURIComponent(account)}&lottery=${encodeURIComponent(lotteryType)}`
  );
}

export async function syncAdminDraw(lotteryType: LotteryType, expect?: string): Promise<void> {
  const query = new URLSearchParams();

  query.set("lottery", lotteryType);

  if (expect) {
    query.set("expect", expect);
  }

  await apiFetch(`/api/admin/draws/sync?${query.toString()}`, {
    method: "POST",
    body: JSON.stringify({})
  });
}
