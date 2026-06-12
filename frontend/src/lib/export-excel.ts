import type { CategoryData, GroupMatch, PlayerStanding } from "./tournament";
import { playerScoresForMatch } from "./tournament";

const STANDINGS_HEADERS = [
  "Rank",
  "Player / Team",
  "Played",
  "Wins",
  "Losses",
  "Points",
  "Score",
] as const;

const SCHEDULE_HEADERS = [
  "Match",
  "Player A",
  "Player B",
  "Status",
  "Winner",
  "Score A",
  "Score B",
] as const;

function sortStandings(standings: PlayerStanding[]): PlayerStanding[] {
  return [...standings].sort(
    (a, b) =>
      b.points - a.points ||
      b.score - a.score ||
      a.name.localeCompare(b.name),
  );
}

function formatDateStamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function winnerName(match: GroupMatch): string {
  if (!match.winnerParticipantId) return "";
  if (match.winnerParticipantId === match.participant1Id) return match.playerA;
  if (match.winnerParticipantId === match.participant2Id) return match.playerB;
  return "";
}

function hasAnyGroups(tournament: CategoryData[]): boolean {
  return tournament.some((c) => c.groups.length > 0);
}

function hasAnyMatches(tournament: CategoryData[]): boolean {
  return tournament.some((c) => c.groups.some((g) => g.matches.length > 0));
}

export async function exportTournamentExcel(
  tournament: CategoryData[],
): Promise<void> {
  const XLSX = await import("xlsx");
  const rows: (string | number)[][] = [];
  let isFirstGroup = true;

  for (const cat of tournament) {
    for (const group of cat.groups) {
      if (!isFirstGroup) {
        rows.push([]);
      }
      isFirstGroup = false;

      rows.push([`${cat.category} — ${group.name}`]);
      rows.push([...STANDINGS_HEADERS]);

      const sorted = sortStandings(group.standings);
      for (let idx = 0; idx < sorted.length; idx++) {
        const entry = sorted[idx]!;
        rows.push([
          idx + 1,
          entry.name,
          entry.matchesPlayed,
          entry.wins,
          entry.losses,
          entry.points,
          entry.score,
        ]);
      }
    }
  }

  const wb = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(
    rows.length > 0 ? rows : [["No group standings available"]],
  );
  sheet["!cols"] = [
    { wch: 6 },
    { wch: 28 },
    { wch: 8 },
    { wch: 6 },
    { wch: 6 },
    { wch: 8 },
    { wch: 8 },
  ];
  XLSX.utils.book_append_sheet(wb, sheet, "Group Standings");

  XLSX.writeFile(wb, `carrom-group-standings-${formatDateStamp()}.xlsx`);
}

export async function exportMatchScheduleExcel(
  tournament: CategoryData[],
): Promise<void> {
  const XLSX = await import("xlsx");
  const rows: (string | number)[][] = [];
  let isFirstGroup = true;

  for (const cat of tournament) {
    for (const group of cat.groups) {
      if (!isFirstGroup) {
        rows.push([]);
      }
      isFirstGroup = false;

      rows.push([`${cat.category} — ${group.name}`]);
      rows.push([...SCHEDULE_HEADERS]);

      group.matches.forEach((match, idx) => {
        const { playerAScore: scoreA, playerBScore: scoreB } =
          playerScoresForMatch(match);
        rows.push([
          idx + 1,
          match.playerA,
          match.playerB,
          match.status,
          winnerName(match),
          scoreA ?? "",
          scoreB ?? "",
        ]);
      });
    }
  }

  const wb = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(
    rows.length > 0 ? rows : [["No matches scheduled"]],
  );
  sheet["!cols"] = [
    { wch: 8 },
    { wch: 24 },
    { wch: 24 },
    { wch: 12 },
    { wch: 24 },
    { wch: 8 },
    { wch: 8 },
  ];
  XLSX.utils.book_append_sheet(wb, sheet, "Match Schedule");

  XLSX.writeFile(wb, `carrom-match-schedule-${formatDateStamp()}.xlsx`);
}

export { hasAnyGroups, hasAnyMatches };
