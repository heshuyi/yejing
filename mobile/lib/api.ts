import { API_URL } from "@/constants/api";

export interface PublicUser {
  id: string;
  email: string;
  displayName: string;
}

export interface AuthResponse {
  token: string;
  user: PublicUser;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 204) {
    return undefined as T;
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? "请求失败");
  }

  return data as T;
}

export type RouteStatus = "draft" | "active" | "completed";

export interface RouteSummary {
  id: string;
  name: string;
  status: RouteStatus;
  distanceKm: number | null;
  markerCount: number;
  startPlace: string | null;
  updatedAt: string;
}

export interface RouteDetail extends RouteSummary {
  isLoop: boolean;
  endPlace: string | null;
  createdAt: string;
  startedAt: string | null;
  stats?: {
    distanceKm?: number;
    markerCount?: number;
    elevationGainM?: number;
    durationSec?: number;
  };
}

export function fetchRoutes(
  token: string,
  params: { status?: RouteStatus; q?: string } = {},
): Promise<{ routes: RouteSummary[] }> {
  const search = new URLSearchParams();
  if (params.status) search.set("status", params.status);
  if (params.q?.trim()) search.set("q", params.q.trim());
  const qs = search.toString();
  return request<{ routes: RouteSummary[] }>(
    `/api/routes${qs ? `?${qs}` : ""}`,
    {},
    token,
  );
}

export function fetchRoute(
  token: string,
  id: string,
): Promise<{ route: RouteDetail }> {
  return request<{ route: RouteDetail }>(`/api/routes/${id}`, {}, token);
}

export function createRoute(
  token: string,
  input: { name: string },
): Promise<{ route: RouteDetail }> {
  return request<{ route: RouteDetail }>(
    "/api/routes",
    { method: "POST", body: JSON.stringify(input) },
    token,
  );
}

export function deleteRoute(token: string, id: string): Promise<void> {
  return request<void>(
    `/api/routes/${id}`,
    { method: "DELETE" },
    token,
  );
}

export function registerUser(input: {
  email: string;
  password: string;
  displayName?: string;
}): Promise<AuthResponse> {
  return request<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function loginUser(input: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  return request<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function fetchMe(token: string): Promise<{ user: PublicUser }> {
  return request<{ user: PublicUser }>("/api/auth/me", {}, token);
}
