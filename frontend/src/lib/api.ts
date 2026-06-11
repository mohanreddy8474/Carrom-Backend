// Unified API — Supabase (default) or FastAPI (VITE_USE_FASTAPI=true)
import { useSupabase } from "./config";
import { fastapiClient, fastapiGalleryImageUrl } from "./api-fastapi";
import { supabaseClient, supabaseGalleryImageUrl } from "./api-supabase";

export type {
  Gender,
  CategoryGender,
  CategoryFormat,
  MatchStatus,
  ParticipantType,
  ApiCategory,
  ApiGroup,
  ApiPlayer,
  ApiTeam,
  ApiStanding,
  ApiGalleryImage,
  ApiMatch,
} from "./types";

const client = useSupabase() ? supabaseClient : fastapiClient;

export const api = {
  verifyAdmin: client.verifyAdmin,
  getCategories: client.getCategories,
  getGroups: client.getGroups,
  getPlayers: client.getPlayers,
  getTeams: client.getTeams,
  getStandings: client.getStandings,
  getGroupMatches: client.getGroupMatches,
  createPlayer: client.createPlayer,
  createTeam: client.createTeam,
  createGroup: client.createGroup,
  assignPlayer: client.assignPlayer,
  assignTeam: client.assignTeam,
  getGroupPlayers: client.getGroupPlayers,
  getGroupTeams: client.getGroupTeams,
  deactivatePlayer: client.deactivatePlayer,
  deactivateTeam: client.deactivateTeam,
  deleteGroup: client.deleteGroup,
  removePlayerFromGroup: client.removePlayerFromGroup,
  removeTeamFromGroup: client.removeTeamFromGroup,
  resetMatch: client.resetMatch,
  updateMatch: client.updateMatch,
  getGalleryImages: client.getGalleryImages,
  uploadGalleryImage: client.uploadGalleryImage,
  deleteGalleryImage: client.deleteGalleryImage,
  seedTournamentData: client.seedTournamentData,
};

export function galleryImageUrl(urlPath: string) {
  if (useSupabase()) return supabaseGalleryImageUrl(urlPath);
  return fastapiGalleryImageUrl(urlPath);
}
