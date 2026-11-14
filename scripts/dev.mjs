import { spawn } from "node:child_process";
import { networkInterfaces } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const isPrivateIPv4 = (address) =>
  /^10\./.test(address) ||
  /^192\.168\./.test(address) ||
  /^172\.(1[6-9]|2\d|3[01])\./.test(address) ||
  /^169\.254\./.test(address);
const allowedDevOrigins = Object.values(networkInterfaces())
  .flatMap((interfaces) => interfaces ?? [])
  .filter(
    (network) =>
      !network.internal &&
      (network.family === "IPv4" || network.family === 4) &&
      isPrivateIPv4(network.address),
  )
  .map((network) => network.address)
  .join(",");
const webEnv = {
  ...process.env,
  NEXT_ALLOWED_DEV_ORIGINS: allowedDevOrigins,
};
const children = [
  spawn("bun", ["--hot", "mini-services/game-service/src/index.ts"], {
    cwd: root,
    detached: process.platform !== "win32",
    stdio: "inherit",
  }),
  spawn("caddy", ["run", "--config", "Caddyfile.dev", "--adapter", "caddyfile"], {
    cwd: root,
    detached: process.platform !== "win32",
    stdio: "inherit",
  }),
  spawn(
    process.execPath,
    [resolve(root, "node_modules/next/dist/bin/next"), "dev", "-p", "3001", "--hostname", "127.0.0.1"],
    {
      cwd: root,
      env: webEnv,
      detached: process.platform !== "win32",
      stdio: "inherit",
    },
  ),
];

let stopping = false;

function stopAll(signal, exitCode = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = exitCode;
  for (const child of children) {
    if (child.exitCode !== null || child.signalCode !== null) continue;
    try {
      if (child.detached && child.pid) process.kill(-child.pid, signal);
      else child.kill(signal);
    } catch (error) {
      if (error?.code !== "ESRCH") throw error;
    }
  }
}

for (const child of children) {
  child.on("error", (error) => {
    console.error("Could not start a development service:", error);
    stopAll("SIGTERM", 1);
  });
  child.on("exit", (code, signal) => {
    if (!stopping) stopAll("SIGTERM", code ?? (signal ? 1 : 0));
  });
}

process.on("SIGINT", () => stopAll("SIGINT"));
process.on("SIGTERM", () => stopAll("SIGTERM"));
