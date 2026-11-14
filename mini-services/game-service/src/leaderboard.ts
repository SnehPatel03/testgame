import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

// Mini-service uses the same Prisma schema as the Next.js project.
// The schema.prisma is shared from the project root.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }),
    log: ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

/// Compute the leaderboard nameKey.
export function nameKeyOf(name: string): string {
  return name.trim().toLowerCase();
}

/// Atomically apply the result of one finished game to the leaderboard.
/// Each winner side player gets +1 win of their type; everyone gets +1 game played.
/// Role is NEVER exposed — only used here to compute the increment.
export async function applyGameResult(opts: {
  players: Array<{ name: string; role: "mafia" | "villager" }>;
  winner: "mafia" | "villagers";
}): Promise<void> {
  const seen = new Set<string>();
  for (const p of opts.players) {
    const key = nameKeyOf(p.name);
    if (!key) continue;
    const display = p.name.trim();
    const wonAsMafia = opts.winner === "mafia" && p.role === "mafia" ? 1 : 0;
    const wonAsVillager = opts.winner === "villagers" && p.role === "villager" ? 1 : 0;

    // Use upsert to ensure exactly one row per nameKey, idempotent.
    await db.leaderboardEntry.upsert({
      where: { nameKey: key },
      create: {
        nameKey: key,
        displayName: display,
        winsAsMafia: wonAsMafia,
        winsAsVillager: wonAsVillager,
        gamesPlayed: 1,
      },
      update: {
        displayName: display,
        winsAsMafia: { increment: wonAsMafia },
        winsAsVillager: { increment: wonAsVillager },
        gamesPlayed: { increment: 1 },
      },
    });
    seen.add(key);
  }
}

export interface LeaderboardRow {
  rank: number;
  nameKey: string;
  displayName: string;
  winsAsMafia: number;
  winsAsVillager: number;
  totalWins: number;
  gamesPlayed: number;
}

export async function getLeaderboard(limit = 200): Promise<LeaderboardRow[]> {
  const rows = await db.leaderboardEntry.findMany({
    orderBy: [{ winsAsMafia: "desc" }, { winsAsVillager: "desc" }, { gamesPlayed: "desc" }, { nameKey: "asc" }],
    take: limit,
  });
  // Sort by total wins descending for ranking (DB index covers performance path).
  const sorted = [...rows].sort(
    (a, b) =>
      b.winsAsMafia + b.winsAsVillager - (a.winsAsMafia + a.winsAsVillager) ||
      b.gamesPlayed - a.gamesPlayed ||
      a.nameKey.localeCompare(b.nameKey)
  );
  return sorted.map((r, i) => ({
    rank: i + 1,
    nameKey: r.nameKey,
    displayName: r.displayName,
    winsAsMafia: r.winsAsMafia,
    winsAsVillager: r.winsAsVillager,
    totalWins: r.winsAsMafia + r.winsAsVillager,
    gamesPlayed: r.gamesPlayed,
  }));
}
