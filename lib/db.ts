"use server";

import mariadb from "mariadb";
import { execSync } from "child_process";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import path from "path";
import { log } from "@/lib/logger";
import { promises as fsp } from "fs";

const DATA_DIR = path.join(process.cwd(), "data");
const MARIADB_IMAGE = "mariadb:lts";
const MARIADB_ROOT_PASSWORD = process.env.MARIADB_ROOT_PASSWORD || "rootpass";
const MARIADB_PORT_BASE = 33060; // Each user gets a port: 33060, 33061, ...
const IDLE_TIMEOUT_MINUTES = parseInt(
  process.env.MARIADB_IDLE_TIMEOUT_MINUTES || "30",
  10,
);

// Get username from email (everything before @)
function getUsernameFromEmail(email: string): string {
  return email.split("@")[0];
}

function getUserContainerName(username: string) {
  return `mariadb_${username}`;
}

function getUserDbName(username: string) {
  return `db_${username}`;
}

function getUserPort(username: string) {
  // Simple hash: sum char codes
  const base = Array.from(username).reduce((a, c) => a + c.charCodeAt(0), 0);
  return MARIADB_PORT_BASE + (base % 1000); // Avoid port collision
}

function getUserVolume(username: string) {
  return `${DATA_DIR}/mariadb_${username}`;
}

function runDockerCmd(cmd: string) {
  return execSync(cmd, { stdio: "pipe" }).toString();
}

// Helper to read/write JSON files generically
async function readJsonFile<T>(file: string, fallback: T): Promise<T> {
  try {
    await fsp.access(file);
    const data = await fsp.readFile(file, "utf-8");
    return JSON.parse(data);
  } catch {
    return fallback;
  }
}

async function writeJsonFile<T>(file: string, data: T) {
  await fsp.writeFile(file, JSON.stringify(data, null, 2));
}

export async function updateLastUsed(username: string) {
  const LAST_USED_FILE = path.join(DATA_DIR, "last_used.json");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let lastUsedMap = await readJsonFile<Record<string, number>>(
    LAST_USED_FILE,
    {},
  );
  lastUsedMap[username] = Math.floor(Date.now() / 1000);
  await writeJsonFile(LAST_USED_FILE, lastUsedMap);
  log(
    `[MariaDB] Last use for user ${username} updated to ${lastUsedMap[username]}`,
    "update",
  );
}

export async function ensureUserDbContainer(username: string) {
  const container = getUserContainerName(username);
  const dbName = getUserDbName(username);
  let port = getUserPort(username);
  const volume = getUserVolume(username);
  let triedPorts = 0;
  const maxTries = 10;
  let lastError = null;

  // Check if running
  try {
    const status = runDockerCmd(
      `docker inspect -f '{{.State.Running}}' ${container}`,
    ).trim();
    if (status === "true") {
      return { port, dbName };
    }
  } catch {}

  // If not running, check if exists
  try {
    runDockerCmd(`docker inspect ${container}`);
    // Exists but not running, start it
    runDockerCmd(`docker start ${container}`);
    return { port, dbName };
  } catch {}

  // Create volume dir
  runDockerCmd(`mkdir -p ${volume}`);

  // Try up to maxTries ports
  while (triedPorts < maxTries) {
    try {
      runDockerCmd(
        `docker run --rm -d --name ${container} -e MARIADB_ROOT_PASSWORD=${MARIADB_ROOT_PASSWORD} -e MARIADB_DATABASE=${dbName} -v ${volume}:/var/lib/mysql -p ${port}:3306 ${MARIADB_IMAGE}`,
      );
      // Wait for MariaDB to be ready
      let ready = false;
      for (let i = 0; i < 30; i++) {
        try {
          const pool = mariadb.createPool({
            host: "127.0.0.1",
            port,
            user: "root",
            password: MARIADB_ROOT_PASSWORD,
            database: dbName,
            connectionLimit: 1,
          });
          await pool.getConnection();
          pool.end();
          ready = true;
          break;
        } catch {
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
      if (!ready) throw new Error("MariaDB container did not start in time");
      return { port, dbName };
    } catch (err) {
      lastError = err;
      port++;
      triedPorts++;
    }
  }
  log(
    `Failed to start MariaDB container for user ${username}: ${lastError instanceof Error ? lastError.stack : String(lastError)}`,
    "error",
  );
  throw new Error(
    `Failed to start MariaDB container for user ${username}: All attempted ports are occupied. Last error: ${lastError}`,
  );
}

export async function getUserDb() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("User not authenticated");
  const username = getUsernameFromEmail(session.user.email);
  const { port, dbName } = await ensureUserDbContainer(username);
  const pool = mariadb.createPool({
    host: "127.0.0.1",
    port,
    user: "root",
    password: MARIADB_ROOT_PASSWORD,
    database: dbName,
    connectionLimit: 1,
  });
  return pool;
}

// Idle shutdown logic (to be run periodically, e.g. with a cron job or serverless timer)
export async function shutdownIdleContainers() {
  const out = runDockerCmd(
    `docker ps -a --filter 'name=mariadb_' --format '{{.Names}}'`,
  ).trim();
  if (!out) return;
  const containers = out.split("\n").filter(Boolean);
  const validUsernames = new Set(
    containers.map((c) => c.replace(/^mariadb_/, "")),
  );
  const lastUsedMap = await readJsonFile<Record<string, number>>(
    path.join(DATA_DIR, "last_used.json"),
    {},
  );
  const now = Math.floor(Date.now() / 1000);
  const containerStateMap: Record<string, string> = await readJsonFile(
    path.join(DATA_DIR, "container_state.json"),
    {},
  );
  for (const container of containers) {
    const username = container.replace(/^mariadb_/, "");
    const lastUsed = lastUsedMap[username];
    if (lastUsed === undefined) {
      continue;
    }
    const idleSeconds = now - lastUsed;
    const state = containerStateMap[username] || "running";
    if (lastUsed > now || idleSeconds < 0 || idleSeconds > 365 * 24 * 60 * 60) {
      log(
        `[MariaDB] Skipping container ${container} for user ${username}: suspicious lastUsed value (${lastUsed}), now=${now}`,
        "warn",
      );
      continue;
    }
    if (idleSeconds > IDLE_TIMEOUT_MINUTES * 60 && state === "running") {
      log(
        `[MariaDB] Stopping container ${container} for user ${username} due to idle timeout (${idleSeconds} seconds > ${IDLE_TIMEOUT_MINUTES * 60} seconds)`,
        "info",
      );
      runDockerCmd(`docker stop ${container}`);
      containerStateMap[username] = "stopped";
    }
  }
  // Clean up state for containers that no longer exist
  let changed = false;
  for (const username of Object.keys(containerStateMap)) {
    if (!validUsernames.has(username)) {
      delete containerStateMap[username];
      changed = true;
    }
  }
  for (const username of Object.keys(lastUsedMap)) {
    if (!validUsernames.has(username)) {
      delete lastUsedMap[username];
      changed = true;
    }
  }
  if (changed) {
    await writeJsonFile(
      path.join(DATA_DIR, "container_state.json"),
      containerStateMap,
    );
    await writeJsonFile(path.join(DATA_DIR, "last_used.json"), lastUsedMap);
  }
}

export async function getUserDatabases() {
  // Not needed for MariaDB, stub for compatibility
  return {};
}

// Schedule shutdownIdleContainers
if (typeof process !== "undefined") {
  if (IDLE_TIMEOUT_MINUTES > 0) {
    log(
      "[MariaDB] Starting idle container shutdown scheduler (every 5 minutes)",
      "info",
    );
    // Reset last_used.json and container_state.json on server start
    (async () => {
      try {
        const lastUsedFile = path.join(DATA_DIR, "last_used.json");
        const stateFile = path.join(DATA_DIR, "container_state.json");
        await fsp.writeFile(lastUsedFile, JSON.stringify({}, null, 2));
        await fsp.writeFile(stateFile, JSON.stringify({}, null, 2));
        log("[MariaDB] Reset last_used.json and container_state.json", "info");
      } catch (err) {
        log(`[MariaDB] Error resetting state files: ${err}`, "error");
      }
    })();
    setInterval(
      () => {
        shutdownIdleContainers().catch((err) => {
          log(`[MariaDB] Error in shutdownIdleContainers: ${err}`, "error");
        });
      },
      5 * 60 * 1000,
    );
  } else {
    log(
      "[MariaDB] Idle container shutdown scheduler is disabled (MARIADB_IDLE_TIMEOUT_MINUTES=0)",
      "info",
    );
  }
}
