"use server"

import Database from "better-sqlite3"
import path from "path"
import fs from "fs"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// Ensure the data directory exists
const DATA_DIR = path.join(process.cwd(), "data")
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

// Get username from email (everything before @)
function getUsernameFromEmail(email: string): string {
  return email.split("@")[0]
}

// Get the database for a specific user
export async function getUserDb() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    throw new Error("User not authenticated")
  }

  const username = getUsernameFromEmail(session.user.email)
  const dbPath = path.join(DATA_DIR, `${username}.db`)
  const MAX_DB_SIZE_BYTES = 50 * 1024 * 1024 // 50MB

  // Create a new database connection
  const db = new Database(dbPath)

  // Enable foreign keys and set max page count
  db.pragma("foreign_keys = ON")
  // Calculate max_page_count based on 50MB limit and default page size of 4096 bytes
  const pageSizeResult = db.pragma('page_size') as { page_size: number }[];
  const pageSize = pageSizeResult[0].page_size;
  const maxPageCount = Math.floor(MAX_DB_SIZE_BYTES / pageSize);
  db.pragma(`max_page_count = ${maxPageCount}`)

  // Initialize with some basic tables if they don't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS query_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      query TEXT NOT NULL,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `)

  console.log(`User database initialized at ${dbPath} for user ${username}`)

  return db
}

// Get all available user databases
export async function getUserDatabases() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    throw new Error("User not authenticated")
  }

  const username = getUsernameFromEmail(session.user.email)
  const userDbPath = path.join(DATA_DIR, `${username}.db`)

  // Ensure the user's default database exists
  if (!fs.existsSync(userDbPath)) {
    const db = new Database(userDbPath)
    db.pragma("foreign_keys = ON")
    db.exec(`
      CREATE TABLE IF NOT EXISTS query_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        query TEXT NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)
    db.close()
  }

  return {
    currentUser: username,
    currentDbPath: userDbPath,
  }
}
