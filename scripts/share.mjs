import { spawn } from "node:child_process";

const root = new URL("..", import.meta.url);
const app = spawn("npm", ["run", "dev"], {
  cwd: root,
  stdio: "inherit",
});
let tunnel;
let stopping = false;

function stop(signal = "SIGTERM") {
  if (stopping) return;
  stopping = true;
  if (tunnel && tunnel.exitCode === null) tunnel.kill(signal);
  if (app.exitCode === null) app.kill(signal);
}

process.on("SIGINT", () => stop("SIGINT"));
process.on("SIGTERM", () => stop("SIGTERM"));
app.on("error", (error) => {
  console.error("Could not start the app:", error.message);
  stop();
});
app.on("exit", (code) => {
  if (!stopping) stop();
  process.exitCode = code ?? 1;
});

const deadline = Date.now() + 120_000;
while (!stopping && app.exitCode === null && Date.now() < deadline) {
  try {
    const response = await fetch("http://127.0.0.1:3000");
    if (response.ok) break;
  } catch {}
  await new Promise((resolve) => setTimeout(resolve, 500));
}

if (app.exitCode !== null) process.exitCode = app.exitCode ?? 1;
if (stopping || app.exitCode !== null) process.exitCode ??= 1;

let localReady = false;
try {
  const response = await fetch("http://127.0.0.1:3000");
  if (!response.ok) throw new Error(`Local app returned HTTP ${response.status}`);
  localReady = true;
} catch (error) {
  console.error("The app did not become ready on port 3000 within two minutes.", error.message);
  stop();
  process.exitCode = 1;
}

if (localReady) {
  console.log("Starting a temporary public link. Share the trycloudflare.com URL below:");
  tunnel = spawn("cloudflared", ["tunnel", "--url", "http://127.0.0.1:3000"], {
    cwd: root,
    stdio: "inherit",
  });
  tunnel.on("error", (error) => {
    console.error("Could not start cloudflared. Install it with: brew install cloudflared");
    console.error(error.message);
    stop();
  });
  tunnel.on("exit", (code) => {
    if (!stopping) {
      console.error("The public link stopped.");
      stop();
      process.exitCode = code ?? 1;
    }
  });
}
