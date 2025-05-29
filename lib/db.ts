"use server";

import mariadb from "mariadb";
import { execSync } from "child_process";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import path from "path";
import fs from "fs";
import { log } from "@/lib/logger";

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

// Helper to get last used times from a JSON file
function getLastUsedMap() {
  const file = path.join(DATA_DIR, "last_used.json");
  if (!fs.existsSync(file)) return {};
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch {
    return {};
  }
}

// Helper to get/set container state
function getContainerStateMap(): Record<string, string> {
  const file = path.join(DATA_DIR, "container_state.json");
  if (!fs.existsSync(file)) return {};
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch {
    return {};
  }
}

function setContainerState(username: string, state: "running" | "stopped") {
  const file = path.join(DATA_DIR, "container_state.json");
  let map: Record<string, string> = {};
  if (fs.existsSync(file)) {
    try {
      map = JSON.parse(fs.readFileSync(file, "utf-8"));
    } catch {
      map = {};
    }
  }
  map[username] = state;
  fs.writeFileSync(file, JSON.stringify(map, null, 2));
}

// Helper to set last used time
function setLastUsed(username: string, timestamp: number) {
  const file = path.join(DATA_DIR, "last_used.json");
  let map: Record<string, number> = {};
  if (fs.existsSync(file)) {
    try {
      map = JSON.parse(fs.readFileSync(file, "utf-8"));
    } catch {
      map = {};
    }
  }
  map[username] = timestamp;
  fs.writeFileSync(file, JSON.stringify(map, null, 2));
}

export async function updateLastUsed(username: string) {
  const DATA_DIR = path.join(process.cwd(), "data");
  const LAST_USED_FILE = path.join(DATA_DIR, "last_used.json");
  let lastUsedMap: Record<string, number> = {};
  if (fs.existsSync(LAST_USED_FILE)) {
    try {
      lastUsedMap = JSON.parse(fs.readFileSync(LAST_USED_FILE, "utf-8"));
    } catch {
      lastUsedMap = {};
    }
  }
  lastUsedMap[username] = Math.floor(Date.now() / 1000);
  fs.writeFileSync(LAST_USED_FILE, JSON.stringify(lastUsedMap, null, 2));
  log(
    `[MariaDB] Last use for user ${username} updated to ${lastUsedMap[username]}`,
    "info",
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
      setContainerState(username, "running");
      setLastUsed(username, Math.floor(Date.now() / 1000));
      return { port, dbName };
    }
  } catch {}

  // If not running, check if exists
  try {
    runDockerCmd(`docker inspect ${container}`);
    // Exists but not running, start it
    runDockerCmd(`docker start ${container}`);
    setContainerState(username, "running");
    setLastUsed(username, Math.floor(Date.now() / 1000));
    return { port, dbName };
  } catch {}

  // Create volume dir
  runDockerCmd(`mkdir -p ${volume}`);

  // Try up to maxTries ports
  while (triedPorts < maxTries) {
    try {
      runDockerCmd(
        `docker run -d --name ${container} -e MARIADB_ROOT_PASSWORD=${MARIADB_ROOT_PASSWORD} -e MARIADB_DATABASE=${dbName} -v ${volume}:/var/lib/mysql -p ${port}:3306 ${MARIADB_IMAGE}`,
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
      setContainerState(username, "running");
      setLastUsed(username, Math.floor(Date.now() / 1000));
      return { port, dbName };
    } catch (err) {
      lastError = err;
      port++;
      triedPorts++;
    }
  }
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
  const lastUsedMap = getLastUsedMap();
  const now = Math.floor(Date.now() / 1000);
  const containerStateMap: Record<string, string> = getContainerStateMap();
  for (const container of containers) {
    const username = container.replace(/^mariadb_/, "");
    const lastUsed = lastUsedMap[username];
    if (lastUsed === undefined) {
      // No activity ever recorded for this user/container, skip.
      continue;
    }
    const idleSeconds = now - lastUsed;
    const state = containerStateMap[username] || "running";
    // Sanity check for lastUsed
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
      setContainerState(username, "stopped");
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
    fs.writeFileSync(
      path.join(DATA_DIR, "container_state.json"),
      JSON.stringify(containerStateMap, null, 2),
    );
    fs.writeFileSync(
      path.join(DATA_DIR, "last_used.json"),
      JSON.stringify(lastUsedMap, null, 2),
    );
  }
}

export async function getUserDatabases() {
  // Not needed for MariaDB, stub for compatibility
  return {};
}

// Schedule shutdownIdleContainers to run every 5 minutes (300,000 ms)
if (typeof process !== "undefined") {
  if (IDLE_TIMEOUT_MINUTES > 0) {
    log(
      "[MariaDB] Starting idle container shutdown scheduler (every 5 minutes)",
      "info",
    );
    setInterval(() => {
      shutdownIdleContainers().catch((err) => {
        log(`[MariaDB] Error in shutdownIdleContainers: ${err}`, "error");
      });
    }, 60 * 1000);
  } else {
    log(
      "[MariaDB] Idle container shutdown scheduler is disabled (MARIADB_IDLE_TIMEOUT_MINUTES=0)",
      "info",
    );
  }
}
