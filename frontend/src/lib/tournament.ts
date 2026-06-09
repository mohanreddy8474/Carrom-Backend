// Integration: maps FastAPI responses into the UI shapes used by App.tsx
import { api, ApiCategory, ApiMatch, ApiPlayer, ApiTeam, MatchStatus as ApiMatchStatus } from "./api";

export type UiMatchStatus = "Scheduled" | "Live" | "Completed";

export interface PlayerStanding {
  id: string;
  name: string;
  matchesPlayed: number;
  wins: number;
  losses: number;
  points: number;
  score: number;
}

export interface GroupMatch {
  id: string;
  playerA: string;
  playerB: string;
  participant1Id: string;
  participant2Id: string;
  winnerParticipantId: string | null;
  winnerScore: number | null;
  status: UiMatchStatus;
}

export interface TournamentGroup {
  id: string;
  name: string;
  standings: PlayerStanding[];
  matches: GroupMatch[];
}

export interface CategoryData {
  category: string;
  categoryId: string;
  groups: TournamentGroup[];
}

export function categoryDisplayName(category: ApiCategory): string {
  return category.name;
}

export function toUiStatus(status: ApiMatchStatus): UiMatchStatus {
  if (status === "LIVE") return "Live";
  if (status === "COMPLETED") return "Completed";
  return "Scheduled";
}

export function toApiStatus(status: UiMatchStatus): ApiMatchStatus {
  if (status === "Live") return "LIVE";
  if (status === "Completed") return "COMPLETED";
  return "SCHEDULED";
}

function mapMatch(match: ApiMatch): GroupMatch {
  return {
    id: match.id,
    playerA: match.participant1_name || "TBD",
    playerB: match.participant2_name || "TBD",
    participant1Id: match.participant1_id,
    participant2Id: match.participant2_id,
    winnerParticipantId: match.winner_participant_id,
    winnerScore: match.winner_score,
    status: toUiStatus(match.status),
  };
}

export async function fetchTournamentData(): Promise<{
  tournament: CategoryData[];
  categories: ApiCategory[];
  players: ApiPlayer[];
  teams: ApiTeam[];
}> {
  const [categories, players, teams] = await Promise.all([
    api.getCategories(),
    api.getPlayers(),
    api.getTeams(),
  ]);

  const tournament: CategoryData[] = [];

  for (const category of categories) {
    const groups = await api.getGroups(category.id);
    const groupData: TournamentGroup[] = [];

    for (const group of groups) {
      const [standings, matches] = await Promise.all([
        api.getStandings(group.id),
        api.getGroupMatches(group.id),
      ]);

      groupData.push({
        id: group.id,
        name: group.name,
        standings: standings.map((s) => ({
          id: s.participant_id,
          name: s.display_name,
          matchesPlayed: s.matches_played,
          wins: s.wins,
          losses: s.losses,
          points: s.tournament_points,
          score: s.score,
        })),
        matches: matches.map(mapMatch),
      });
    }

    tournament.push({
      category: categoryDisplayName(category),
      categoryId: category.id,
      groups: groupData,
    });
  }

  return { tournament, categories, players, teams };
}
