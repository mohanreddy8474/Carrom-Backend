import { requireSupabase } from "./supabase";
import { computeStandings, enrichMatch } from "./standings";
import type {
  ApiCategory,
  ApiGalleryImage,
  ApiGroup,
  ApiMatch,
  ApiPlayer,
  ApiStanding,
  ApiTeam,
  CategoryFormat,
  Gender,
  MatchStatus,
  ParticipantType,
} from "./types";

const GALLERY_BUCKET = "gallery";
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function sbError(error: { message: string } | null): never {
  throw new Error(error?.message ?? "Request failed");
}

let cachedPlayers: ApiPlayer[] | null = null;
let cachedTeams: ApiTeam[] | null = null;

async function loadPlayers(): Promise<ApiPlayer[]> {
  if (cachedPlayers) return cachedPlayers;
  const sb = requireSupabase();
  const { data, error } = await sb.from("players").select("*").order("name");
  if (error) sbError(error);
  cachedPlayers = (data ?? []) as ApiPlayer[];
  return cachedPlayers;
}

async function loadTeams(): Promise<ApiTeam[]> {
  if (cachedTeams) return cachedTeams;
  const sb = requireSupabase();
  const { data, error } = await sb.from("teams").select("*").order("created_at");
  if (error) sbError(error);
  cachedTeams = (data ?? []) as ApiTeam[];
  return cachedTeams;
}

function playerMap(players: ApiPlayer[]) {
  return new Map(players.map((p) => [p.id, p]));
}

function teamMap(teams: ApiTeam[]) {
  return new Map(teams.map((t) => [t.id, t]));
}

function invalidateCache() {
  cachedPlayers = null;
  cachedTeams = null;
}

async function validateDoublesTeam(
  category: ApiCategory,
  player1Id: string,
  player2Id: string,
  players: ApiPlayer[],
): Promise<[ApiPlayer, ApiPlayer]> {
  if (player1Id === player2Id) {
    throw new Error("A team cannot have the same player twice");
  }

  const pmap = playerMap(players);
  const p1 = pmap.get(player1Id);
  const p2 = pmap.get(player2Id);
  if (!p1 || !p2) throw new Error("Player not found");
  if (!p1.is_active || !p2.is_active) throw new Error("Player is not active");

  if (category.gender === "MALE") {
    if (p1.gender !== "MALE" || p2.gender !== "MALE") {
      throw new Error("Men's Doubles teams must have two male players");
    }
  } else if (category.gender === "FEMALE") {
    if (p1.gender !== "FEMALE" || p2.gender !== "FEMALE") {
      throw new Error("Women's Doubles teams must have two female players");
    }
  } else if (category.gender === "MIXED") {
    if (p1.gender === p2.gender) {
      throw new Error("Mixed Doubles teams must have one male and one female player");
    }
  }

  return [p1, p2];
}

export interface SeedResult {
  message: string;
  counts: {
    categories: number;
    groups: number;
    players: number;
    teams: number;
    group_players: number;
    group_teams: number;
    matches: number;
  };
}

export const supabaseClient = {
  verifyAdmin: async (_secret_key: string) => {
    throw new Error("Use email and password sign-in with Supabase");
  },

  seedTournamentData: async (force = false): Promise<SeedResult> => {
    const sb = requireSupabase();
    const { data, error } = await sb.rpc("seed_tournament_data", {
      force_reseed: force,
    });
    if (error) sbError(error);
    invalidateCache();
    return data as SeedResult;
  },

  getCategories: async (): Promise<ApiCategory[]> => {
    const sb = requireSupabase();
    const { data, error } = await sb.from("categories").select("*").order("name");
    if (error) sbError(error);
    return (data ?? []) as ApiCategory[];
  },

  getGroups: async (categoryId?: string): Promise<ApiGroup[]> => {
    const sb = requireSupabase();
    let query = sb.from("groups").select("*").order("name");
    if (categoryId) query = query.eq("category_id", categoryId);
    const { data, error } = await query;
    if (error) sbError(error);
    return (data ?? []) as ApiGroup[];
  },

  getPlayers: async (): Promise<ApiPlayer[]> => loadPlayers(),

  getTeams: async (categoryId?: string): Promise<ApiTeam[]> => {
    const teams = await loadTeams();
    if (!categoryId) return teams;
    return teams.filter((t) => t.category_id === categoryId);
  },

  getStandings: async (groupId: string): Promise<ApiStanding[]> => {
    const sb = requireSupabase();
    const [players, teams, groupRes, gpRes, gtRes, matchRes] = await Promise.all([
      loadPlayers(),
      loadTeams(),
      sb.from("groups").select("id, category_id").eq("id", groupId).single(),
      sb.from("group_players").select("player_id").eq("group_id", groupId),
      sb.from("group_teams").select("team_id").eq("group_id", groupId),
      sb.from("matches").select("*").eq("group_id", groupId),
    ]);

    if (groupRes.error) sbError(groupRes.error);
    if (gpRes.error) sbError(gpRes.error);
    if (gtRes.error) sbError(gtRes.error);
    if (matchRes.error) sbError(matchRes.error);

    const categoryRes = await sb
      .from("categories")
      .select("format")
      .eq("id", groupRes.data.category_id)
      .single();
    if (categoryRes.error) sbError(categoryRes.error);

    const format = categoryRes.data.format as CategoryFormat;
    const participantIds =
      format === "SINGLES"
        ? (gpRes.data ?? []).map((r) => ({ id: r.player_id as string, type: "PLAYER" as ParticipantType }))
        : (gtRes.data ?? []).map((r) => ({ id: r.team_id as string, type: "TEAM" as ParticipantType }));

    return computeStandings(
      groupId,
      format,
      participantIds,
      (matchRes.data ?? []) as ApiMatch[],
      playerMap(players),
      teamMap(teams),
    );
  },

  getGroupMatches: async (groupId: string): Promise<ApiMatch[]> => {
    const sb = requireSupabase();
    const [players, teams, { data, error }] = await Promise.all([
      loadPlayers(),
      loadTeams(),
      sb.from("matches").select("*").eq("group_id", groupId).order("created_at"),
    ]);
    if (error) sbError(error);

    const pmap = playerMap(players);
    const tmap = teamMap(teams);
    return ((data ?? []) as ApiMatch[]).map((m) => enrichMatch(m, pmap, tmap));
  },

  createPlayer: async (data: {
    name: string;
    employee_id?: string;
    gender: Gender;
  }): Promise<ApiPlayer> => {
    const sb = requireSupabase();
    const { data: row, error } = await sb
      .from("players")
      .insert({
        name: data.name,
        employee_id: data.employee_id ?? null,
        gender: data.gender,
      })
      .select()
      .single();
    if (error) sbError(error);
    invalidateCache();
    return row as ApiPlayer;
  },

  createTeam: async (data: {
    player1_id: string;
    player2_id: string;
    category_id: string;
    group_id: string;
  }): Promise<ApiTeam> => {
    const sb = requireSupabase();
    const [players, categories, groupRes] = await Promise.all([
      loadPlayers(),
      supabaseClient.getCategories(),
      sb.from("groups").select("id, category_id").eq("id", data.group_id).single(),
    ]);

    if (groupRes.error) sbError(groupRes.error);
    if (groupRes.data.category_id !== data.category_id) {
      throw new Error("Group does not belong to the selected category");
    }

    const category = categories.find((c) => c.id === data.category_id);
    if (!category) throw new Error("Category not found");
    if (category.format !== "DOUBLES") {
      throw new Error("Teams can only be created for doubles categories");
    }

    const [p1, p2] = await validateDoublesTeam(category, data.player1_id, data.player2_id, players);

    const existingTeams = (await loadTeams()).filter(
      (t) => t.category_id === data.category_id && t.is_active,
    );
    for (const team of existingTeams) {
      const assigned = new Set([team.player1_id, team.player2_id]);
      if (assigned.has(data.player1_id) || assigned.has(data.player2_id)) {
        throw new Error("One or both players are already on a team in this category");
      }
    }

    const { data: team, error: teamError } = await sb
      .from("teams")
      .insert({
        team_name: `${p1.name} / ${p2.name}`,
        player1_id: data.player1_id,
        player2_id: data.player2_id,
        category_id: data.category_id,
      })
      .select()
      .single();
    if (teamError) sbError(teamError);

    const { error: assignError } = await sb.from("group_teams").insert({
      group_id: data.group_id,
      team_id: team.id,
    });
    if (assignError) sbError(assignError);

    invalidateCache();
    return team as ApiTeam;
  },

  createGroup: async (data: { name: string; category_id: string }): Promise<ApiGroup> => {
    const sb = requireSupabase();
    const { data: row, error } = await sb
      .from("groups")
      .insert(data)
      .select()
      .single();
    if (error) sbError(error);
    return row as ApiGroup;
  },

  assignPlayer: async (groupId: string, playerId: string) => {
    const sb = requireSupabase();
    const { error } = await sb.from("group_players").insert({
      group_id: groupId,
      player_id: playerId,
    });
    if (error) sbError(error);
  },

  assignTeam: async (groupId: string, teamId: string) => {
    const sb = requireSupabase();
    const { error } = await sb.from("group_teams").insert({
      group_id: groupId,
      team_id: teamId,
    });
    if (error) sbError(error);
  },

  updateMatch: async (
    matchId: string,
    data: {
      status?: MatchStatus;
      winner_participant_id?: string;
      winner_score?: number;
    },
  ): Promise<ApiMatch> => {
    const sb = requireSupabase();
    const payload: Record<string, unknown> = {};
    if (data.status !== undefined) payload.status = data.status;
    if (data.winner_participant_id !== undefined) {
      payload.winner_participant_id = data.winner_participant_id;
    }
    if (data.winner_score !== undefined) payload.winner_score = data.winner_score;

    const { data: row, error } = await sb
      .from("matches")
      .update(payload)
      .eq("id", matchId)
      .select()
      .single();
    if (error) sbError(error);

    const [players, teams] = await Promise.all([loadPlayers(), loadTeams()]);
    return enrichMatch(row as ApiMatch, playerMap(players), teamMap(teams));
  },

  getGalleryImages: async (): Promise<ApiGalleryImage[]> => {
    const sb = requireSupabase();
    const { data, error } = await sb
      .from("gallery_images")
      .select("id, filename, content_type, storage_path, created_at")
      .order("created_at", { ascending: false });
    if (error) sbError(error);

    return (data ?? []).map((row) => ({
      id: row.id as string,
      filename: row.filename as string,
      content_type: row.content_type as string,
      url_path: row.storage_path as string,
      created_at: row.created_at as string,
    }));
  },

  uploadGalleryImage: async (file: File): Promise<ApiGalleryImage> => {
    if (!ALLOWED_TYPES.has(file.type)) {
      throw new Error("Only JPEG, PNG, WebP, and GIF images are allowed");
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new Error("Image must be 5 MB or smaller");
    }

    const sb = requireSupabase();
    const ext = file.name.split(".").pop() ?? "jpg";
    const storagePath = `${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await sb.storage
      .from(GALLERY_BUCKET)
      .upload(storagePath, file, { contentType: file.type, upsert: false });
    if (uploadError) sbError(uploadError);

    const { data: row, error } = await sb
      .from("gallery_images")
      .insert({
        filename: file.name,
        content_type: file.type,
        storage_path: storagePath,
      })
      .select()
      .single();
    if (error) {
      await sb.storage.from(GALLERY_BUCKET).remove([storagePath]);
      sbError(error);
    }

    return {
      id: row.id as string,
      filename: row.filename as string,
      content_type: row.content_type as string,
      url_path: row.storage_path as string,
      created_at: row.created_at as string,
    };
  },

  deleteGalleryImage: async (imageId: string) => {
    const sb = requireSupabase();
    const { data: row, error: fetchError } = await sb
      .from("gallery_images")
      .select("storage_path")
      .eq("id", imageId)
      .single();
    if (fetchError) sbError(fetchError);

    const { error } = await sb.from("gallery_images").delete().eq("id", imageId);
    if (error) sbError(error);

    if (row?.storage_path) {
      await sb.storage.from(GALLERY_BUCKET).remove([row.storage_path as string]);
    }
  },
};

export function supabaseGalleryImageUrl(storagePath: string) {
  const sb = requireSupabase();
  const { data } = sb.storage.from(GALLERY_BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}
