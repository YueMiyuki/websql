"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { getUserDb } from "@/lib/db"

export async function executeQuery(query: string) {
  const session = await getServerSession(authOptions)

  if (!session) {
    throw new Error("Authentication required")
  }

  try {
    console.log("Executing query:", query)
    // Ensure the query ends with a semicolon
    const normalizedQuery = query.trim().endsWith(";") ? query : `${query};`
    console.log("Normalized query:", normalizedQuery)

    // Get the user-specific database
    const db = await getUserDb()

    // For CREATE TABLE statements, check if they have column definitions
    if (normalizedQuery.toLowerCase().startsWith("create table") && !normalizedQuery.includes("(")) {
      db.close()
      throw new Error(
        "CREATE TABLE statement must include column definitions. Example: CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT);",
      )
    }

    // For SELECT queries
    if (normalizedQuery.toLowerCase().startsWith("select")) {
      try {
        const result = db.prepare(normalizedQuery).all()

        // Extract column names from the first row
        const columns = result.length > 0 ? Object.keys(result[0] as Record<string, unknown>) : []

        // Close the database connection
        db.close()

        return {
          columns,
          rows: result,
          message: `Query executed successfully. Returned ${result.length} row(s).`,
        }
      } catch (error) {
        db.close()
        throw error
      }
    }

    // For other queries (INSERT, UPDATE, DELETE, CREATE, etc.)
    try {
      const result = db.prepare(normalizedQuery).run()

      // Close the database connection
      db.close()

      revalidatePath("/")

      return {
        message: `Query executed successfully. ${
          result.changes !== undefined ? `${result.changes} row(s) affected.` : ""
        }`,
      }
    } catch (error) {
      db.close()
      throw error
    }
  } catch (error) {
    console.error("SQL Error:", error)

    // Provide more helpful error messages for common SQLite errors
    const errorMessage = error instanceof Error ? error.message : String(error)

    if (errorMessage.includes("incomplete input")) {
      throw new Error(
        "SQL Error: Incomplete SQL statement. Make sure your statement is complete and includes all required parts.",
      )
    }

    if (errorMessage.includes("syntax error")) {
      throw new Error(`SQL Error: Syntax error in your SQL statement. Check your syntax and try again.`)
    }

    if (errorMessage.includes("no such table")) {
      const tableName = errorMessage.match(/no such table: ([^\s]+)/)?.[1]
      throw new Error(
        `SQL Error: Table '${tableName || "unknown"}' does not exist. Create it first or check the table name.`,
      )
    }

    throw new Error(`SQL Error: ${errorMessage}`)
  }
}

export async function getDatabaseInfo() {
  const session = await getServerSession(authOptions)

  if (!session) {
    throw new Error("Authentication required")
  }

  try {
    // Get the user-specific database
    const db = await getUserDb()

    // Get all tables
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()

    // Get database size
    const dbInfo = {
      tables: tables.map((t: any) => t.name),
      tableCount: tables.length,
    }

    // Close the database connection
    db.close()

    return dbInfo
  } catch (error) {
    console.error("Database Info Error:", error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Error getting database info: ${errorMessage}`)
  }
}
