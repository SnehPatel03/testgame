# Mafia — No Host Needed

A phone-first Mafia party game. Each player joins from their own phone; the game service assigns roles and synchronizes rounds. Night actions last 15 seconds, and the eliminated player stays visible through the following vote. Neon stores the global leaderboard. Active rooms live in memory in one game-service process.

## Run locally

Requirements: Node.js 20.9+, Bun, and Caddy.

```sh
npm ci
npm run db:generate
npm run db:push
npm run dev
```

Open `http://localhost:3000`. For phones on the same Wi-Fi, use the computer's LAN IP on port 3000. The dev script starts Next.js, the game service, and Caddy together.

### Share a free temporary link with friends

For a quick game without deploying a server, install Cloudflare's tunnel client on your Mac and run the app with a public HTTPS link:

```sh
brew install cloudflared
npm run play:online
```

Copy the `https://….trycloudflare.com` URL printed in the terminal and send it to your friends. They can open it in their mobile browsers and join with the room code. Keep this terminal and your Mac awake while playing; press **Ctrl+C** to stop the app and link. The link changes each time you run the command. Quick Tunnels are free and need no Cloudflare account, but they are for temporary testing and have no uptime guarantee. For a permanent always-available link, use the VPS steps below.

## Deploy so people can play

Use **one Linux VPS** for Next.js, the game service, and Caddy, plus your existing Neon database. This app needs a long-running Socket.IO service and in-memory rooms; a static host or a frontend-only Vercel deployment cannot run the included game service. Keep one game-service instance; restarting it ends active rooms.

### 1. Prepare a domain and server

- Create an A record for your domain pointing to the VPS public IP.
- Install Node.js 20.9 or newer, Bun, and Caddy on the VPS.
- Allow inbound TCP ports 22, 80, and 443. Keep ports 3000 and 3003 private.
- Create a Linux service account named `mafia`, and put the project at `/opt/mafia`.

Caddy will automatically issue and renew HTTPS certificates when the domain resolves to the VPS and ports 80/443 are reachable. [Caddy HTTPS setup](https://caddyserver.com/docs/automatic-https)

### 2. Configure the app

From the project directory on the VPS:

```sh
cp .env.example .env
```

Edit `/opt/mafia/.env` and set:

- `DATABASE_URL`: the pooled Neon URL (hostname includes `-pooler`).
- `DATABASE_URL_UNPOOLED`: the direct Neon URL for Prisma schema changes.
- `NEXT_PUBLIC_APP_URL`: `https://your-domain`.
- `GAME_SERVICE_PORT`: `3003`.

Keep `.env` private. Edit `Caddyfile` and replace `mafia.example.com` with your domain. The file routes normal web traffic to Next.js and the `XTransformPort=3003` Socket.IO traffic to the game service.

### 3. Build and create the database table

Run these as the `mafia` account from `/opt/mafia`:

```sh
npm ci
npm run db:generate
npm run db:push
npm run build
```

The build uses `NEXT_PUBLIC_APP_URL`, so set it before building. The app is built as a Next.js standalone server. [Next.js standalone deployment](https://nextjs.org/docs/app/guides/self-hosting)

### 4. Start the services

The included systemd units assume `/opt/mafia`, user `mafia`, and Bun at `/home/mafia/.bun/bin/bun`. Adjust those paths in `deploy/mafia-web.service` and `deploy/mafia-game.service` if yours differ, then install and start them:

```sh
sudo cp deploy/mafia-web.service deploy/mafia-game.service /etc/systemd/system/
sudo cp Caddyfile /etc/caddy/Caddyfile
sudo systemctl daemon-reload
sudo systemctl enable --now mafia-web mafia-game caddy
```

Open `https://your-domain` on each phone. Create a room on one phone, have at least three others join with the room code, then start the game. On Android choose **Install app** in Chrome; on iPhone use **Share → Add to Home Screen**.

For later code updates, rebuild and restart the two app services:

```sh
git pull
npm ci
npm run db:generate
npm run build
sudo systemctl restart mafia-web mafia-game
```

Use `npm run db:migrate` to create development migrations and `npm run db:migrate:deploy` to apply committed migrations on the VPS.
