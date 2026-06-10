// FastAPI backend client (optional — set VITE_USE_FASTAPI=true)
import { getAdminKey } from "./auth";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

import type {
  ApiCategory,
  ApiGalleryImage,
  ApiGroup,
  ApiMatch,
  ApiPlayer,
  ApiStanding,
  ApiTeam,
  Gender,
  MatchStatus,
} from "./types";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  const adminKey = getAdminKey();
  if (adminKey) headers["X-Admin-Key"] = adminKey;

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const detail = (body as { detail?: string }).detail || response.statusText;
    throw new Error(typeof detail === "string" ? detail : "Request failed");
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const fastapiClient = {
  verifyAdmin: (secret_key: string) =>
    request<{ valid: boolean }>("/admin/verify", {
      method: "POST",
      body: JSON.stringify({ secret_key }),
    }),

  getCategories: () => request<ApiCategory[]>("/categories"),
  getGroups: (categoryId?: string) =>
    request<ApiGroup[]>(`/groups${categoryId ? `?category_id=${categoryId}` : ""}`),
  getPlayers: () => request<ApiPlayer[]>("/players"),
  getTeams: (categoryId?: string) =>
    request<ApiTeam[]>(`/teams${categoryId ? `?category_id=${categoryId}` : ""}`),
  getStandings: (groupId: string) => request<ApiStanding[]>(`/groups/${groupId}/standings`),
  getGroupMatches: (groupId: string) => request<ApiMatch[]>(`/groups/${groupId}/matches`),

  createPlayer: (data: { name: string; employee_id?: string; gender: Gender }) =>
    request<ApiPlayer>("/players", { method: "POST", body: JSON.stringify(data) }),

  createTeam: (data: {
    player1_id: string;
    player2_id: string;
    category_id: string;
    group_id: string;
  }) => request<ApiTeam>("/teams", { method: "POST", body: JSON.stringify(data) }),

  createGroup: (data: { name: string; category_id: string }) =>
    request<ApiGroup>("/groups", { method: "POST", body: JSON.stringify(data) }),

  assignPlayer: (groupId: string, playerId: string) =>
    request(`/groups/${groupId}/players`, {
      method: "POST",
      body: JSON.stringify({ player_id: playerId }),
    }),

  assignTeam: (groupId: string, teamId: string) =>
    request(`/groups/${groupId}/teams`, {
      method: "POST",
      body: JSON.stringify({ team_id: teamId }),
    }),

  updateMatch: (
    matchId: string,
    data: {
      status?: MatchStatus;
      winner_participant_id?: string;
      winner_score?: number;
    },
  ) =>
    request<ApiMatch>(`/matches/${matchId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  getGalleryImages: () => request<ApiGalleryImage[]>("/gallery"),

  uploadGalleryImage: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const headers: Record<string, string> = {};
    const adminKey = getAdminKey();
    if (adminKey) headers["X-Admin-Key"] = adminKey;

    const response = await fetch(`${API_URL}/gallery`, {
      method: "POST",
      headers,
      body: formData,
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const detail = (body as { detail?: string }).detail || response.statusText;
      throw new Error(typeof detail === "string" ? detail : "Upload failed");
    }
    return response.json() as Promise<ApiGalleryImage>;
  },

  deleteGalleryImage: (imageId: string) =>
    request<void>(`/gallery/${imageId}`, { method: "DELETE" }),

  seedTournamentData: (force = false) =>
    request<{
      message: string;
      counts: Record<string, number>;
    }>(`/admin/seed-tournament-data${force ? "?force=true" : ""}`, {
      method: "POST",
    }),
};

export function fastapiGalleryImageUrl(urlPath: string) {
  return `${API_URL}${urlPath}`;
}
