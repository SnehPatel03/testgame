FROM oven/bun:1.3.4

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY mini-services/game-service/package.json ./mini-services/game-service/package.json

RUN bun install --no-save

COPY mini-services/game-service/src ./mini-services/game-service/src

RUN bunx prisma generate --schema=prisma/schema.prisma

CMD ["bun", "run", "mini-services/game-service/src/index.ts"]
