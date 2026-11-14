import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/// GET /api/leaderboard
/// Returns the global leaderboard sorted by total wins (descending).
/// Only the server can update leaderboard records; this route is read-only.
export async function GET() {
  const rows = await db.leaderboardEntry.findMany({
    orderBy: [{ winsAsMafia: "desc" }, { winsAsVillager: "desc" }, { gamesPlayed: "desc" }, { nameKey: "asc" }],
    take: 200,
  });
  const sorted = [...rows].sort(
    (a, b) =>
      b.winsAsMafia + b.winsAsVillager - (a.winsAsMafia + a.winsAsVillager) ||
      b.gamesPlayed - a.gamesPlayed ||
      a.nameKey.localeCompare(b.nameKey)
  );
  return NextResponse.json({
    rows: sorted.map((r, i) => ({
      rank: i + 1,
      displayName: r.displayName,
      winsAsMafia: r.winsAsMafia,
      winsAsVillager: r.winsAsVillager,
      totalWins: r.winsAsMafia + r.winsAsVillager,
      gamesPlayed: r.gamesPlayed,
    })),
  });
}
