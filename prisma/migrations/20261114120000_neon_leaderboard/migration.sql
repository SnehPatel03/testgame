-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "LeaderboardEntry" (
    "id" TEXT NOT NULL,
    "nameKey" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "winsAsMafia" INTEGER NOT NULL DEFAULT 0,
    "winsAsVillager" INTEGER NOT NULL DEFAULT 0,
    "gamesPlayed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaderboardEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LeaderboardEntry_nameKey_key" ON "LeaderboardEntry"("nameKey");

-- CreateIndex
CREATE INDEX "LeaderboardEntry_winsAsMafia_winsAsVillager_idx" ON "LeaderboardEntry"("winsAsMafia", "winsAsVillager");

