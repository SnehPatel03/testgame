-- Room leaderboards now live with each active room in game-service memory.
-- Removing the persistent global leaderboard also removes its historical rows.
DROP TABLE IF EXISTS "LeaderboardEntry";
