// Integration: FastAPI client — all tournament data comes from the backend
import { getAdminKey } from "./auth";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export type Gender = "MALE" | "FEMALE";
export type CategoryFormat = "SINGLES" | "DOUBLES";
export type MatchStatus = "SCHEDULED" | "LIVE" | "COMPLETED";
export type ParticipantType = "PLAYER" | "TEAM";

export interface ApiCategory {
  id: string;
  name: string;
  gender: Gender;
  format: CategoryFormat;
}

export interface ApiGroup {
  id: string;
  category_id: string;
  name: string;
}

export interface ApiPlayer {
  id: string;
  name: string;
  employee_id: string | null;
  gender: Gender;
  is_active: boolean;
}

export interface ApiTeam {
  id: string;
  team_name: string;
  player1_id: string;
  player2_id: string;
  category_id: string;
  is_active: boolean;
}

export interface ApiStanding {
  participant_id: string;
  participant_type: ParticipantType;
  display_name: string;
  matches_played: number;
  wins: number;
  losses: number;
  tournament_points: number;
}

export interface ApiMatch {
  id: string;
  category_id: string;
  group_id: string;
  participant1_id: string;
  participant2_id: string;
  participant_type: ParticipantType;
  status: MatchStatus;
  winner_participant_id: string | null;
  winner_score: number | null;
  participant1_name?: string | null;
  participant2_name?: string | null;
  created_at: string;
}

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

export const api = {
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
    team_name: string;
    player1_id: string;
    player2_id: string;
    category_id: string;
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
    }
  ) =>
    request<ApiMatch>(`/matches/${matchId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
};
