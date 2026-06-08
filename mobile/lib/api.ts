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

export interface GeoPoint {
  type: "Point";
  coordinates: [number, number];
}

export interface GoalDistanceKm {
  min?: number;
  max?: number;
}

export interface RoutePlanInput {
  name: string;
  isLoop?: boolean;
  startPlace?: string;
  endPlace?: string;
  startCoordinate?: GeoPoint;
  endCoordinate?: GeoPoint;
  goalDistanceKm?: GoalDistanceKm | null;
}

export interface RouteDetail extends RouteSummary {
  isLoop: boolean;
  endPlace: string | null;
  createdAt: string;
  startedAt: string | null;
  startCoordinate?: GeoPoint;
  endCoordinate?: GeoPoint;
  goalDistanceKm?: GoalDistanceKm | null;
  recordingState?: "recording" | "paused" | null;
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

export interface RouteDetailAggregate {
  route: RouteDetail;
  track: {
    pointCount: number;
    coordinates: [number, number][];
  };
  markers: Marker[];
  summary: {
    distanceKm: number;
    elevationGainM: number;
    durationSec: number;
    markerCount: number;
  };
}

export function fetchRouteDetail(
  token: string,
  id: string,
): Promise<RouteDetailAggregate> {
  return request<RouteDetailAggregate>(`/api/routes/${id}/detail`, {}, token);
}

export interface TransitEndpoint {
  place: string | null;
  coordinate: GeoPoint | null;
}

export interface TransitInfo {
  routeId: string;
  routeName: string;
  isLoop: boolean;
  loopHint: string | null;
  start: TransitEndpoint;
  end: TransitEndpoint;
}

export function fetchRouteTransit(
  token: string,
  id: string,
): Promise<TransitInfo> {
  return request<TransitInfo>(`/api/routes/${id}/transit`, {}, token);
}

export function createRoute(
  token: string,
  input: RoutePlanInput,
): Promise<{ route: RouteDetail }> {
  return request<{ route: RouteDetail }>(
    "/api/routes",
    { method: "POST", body: JSON.stringify(input) },
    token,
  );
}

export function updateRoute(
  token: string,
  id: string,
  input: Partial<RoutePlanInput>,
): Promise<{ route: RouteDetail }> {
  return request<{ route: RouteDetail }>(
    `/api/routes/${id}`,
    { method: "PATCH", body: JSON.stringify(input) },
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

export interface TrackPoint {
  id?: string;
  timestamp: string;
  location: GeoPoint;
  altitude: number | null;
  speed: number | null;
  accuracy: number | null;
}

export interface TrackPointInput {
  timestamp: string;
  location: GeoPoint;
  altitude?: number;
  speed?: number;
  accuracy?: number;
}

export function startRecording(
  token: string,
  routeId: string,
): Promise<{ route: RouteDetail }> {
  return request<{ route: RouteDetail }>(
    `/api/routes/${routeId}/recording/start`,
    { method: "POST" },
    token,
  );
}

export function pauseRecording(
  token: string,
  routeId: string,
): Promise<{ route: RouteDetail }> {
  return request<{ route: RouteDetail }>(
    `/api/routes/${routeId}/recording/pause`,
    { method: "POST" },
    token,
  );
}

export function resumeRecording(
  token: string,
  routeId: string,
): Promise<{ route: RouteDetail }> {
  return request<{ route: RouteDetail }>(
    `/api/routes/${routeId}/recording/resume`,
    { method: "POST" },
    token,
  );
}

export function finishRecording(
  token: string,
  routeId: string,
  durationSec: number,
): Promise<{ route: RouteDetail }> {
  return request<{ route: RouteDetail }>(
    `/api/routes/${routeId}/recording/finish`,
    { method: "POST", body: JSON.stringify({ durationSec }) },
    token,
  );
}

export function fetchTrackPoints(
  token: string,
  routeId: string,
): Promise<{ points: TrackPoint[] }> {
  return request<{ points: TrackPoint[] }>(
    `/api/routes/${routeId}/track-points`,
    {},
    token,
  );
}

export function uploadTrackPoints(
  token: string,
  routeId: string,
  points: TrackPointInput[],
): Promise<{ inserted: number }> {
  return request<{ inserted: number }>(
    `/api/routes/${routeId}/track-points`,
    { method: "POST", body: JSON.stringify({ points }) },
    token,
  );
}

export type MarkerType =
  | "supply"
  | "photo"
  | "rest"
  | "view"
  | "fork"
  | "other";

export interface Marker {
  id: string;
  routeId: string;
  routeName?: string;
  type: MarkerType;
  name: string;
  note: string | null;
  distanceFromStart: number | null;
  coordinate: GeoPoint;
  facing: string | null;
  bestTime: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MarkerInput {
  type: MarkerType;
  name: string;
  note?: string;
  coordinate: GeoPoint;
  facing?: string;
  bestTime?: string;
}

export function fetchRouteMarkers(
  token: string,
  routeId: string,
  type?: MarkerType,
): Promise<{ markers: Marker[] }> {
  const qs = type ? `?type=${type}` : "";
  return request<{ markers: Marker[] }>(
    `/api/routes/${routeId}/markers${qs}`,
    {},
    token,
  );
}

export function fetchAllMarkers(
  token: string,
  params: { routeId?: string; type?: MarkerType } = {},
): Promise<{ markers: Marker[] }> {
  const search = new URLSearchParams();
  if (params.routeId) search.set("routeId", params.routeId);
  if (params.type) search.set("type", params.type);
  const qs = search.toString();
  return request<{ markers: Marker[] }>(
    `/api/markers${qs ? `?${qs}` : ""}`,
    {},
    token,
  );
}

export function createMarker(
  token: string,
  routeId: string,
  input: MarkerInput,
): Promise<{ marker: Marker }> {
  return request<{ marker: Marker }>(
    `/api/routes/${routeId}/markers`,
    { method: "POST", body: JSON.stringify(input) },
    token,
  );
}

export function deleteMarker(
  token: string,
  routeId: string,
  markerId: string,
): Promise<void> {
  return request<void>(
    `/api/routes/${routeId}/markers/${markerId}`,
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
