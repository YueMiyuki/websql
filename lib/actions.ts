"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { getUserDb, updateLastUsed } from "@/lib/db";
import { log } from "@/lib/logger";

export async function executeQuery(query: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    throw new Error("Authentication required");
  }
  const username = session.user.email.split("@")[0]; // For logging
  let pool;

  try {
    // Split queries by semicolon, filter out empty ones, and ensure each ends with a semicolon for individual execution
    const queries = query
      .trim()
      .split(";")
      .map((q) => q.trim())
      .filter((q) => q.length > 0)
      .map((q) => (q.endsWith(";") ? q : `${q};`));

    // Only log batch if there are multiple queries
    if (queries.length > 1) {
      log(`[${username}.db] Executing query batch: ${query}`, "info-batch");
    }

    if (queries.length === 0) {
      return {
        message: "No queries to execute.",
        columns: [],
        rows: [],
      };
    }

    pool = await getUserDb();

    let lastSelectResult = null;
    let changesAccumulator = 0;
    // eslint-disable-next-line prefer-const
    let messagesAccumulator = [];

    for (const singleQuery of queries) {
      // No need to normalize again as it's done during splitting
      log(`[${username}.db] Executing single query: ${singleQuery}`, "info");

      const lowerCaseQuery = singleQuery.toLowerCase();
      const isWriteQuery =
        lowerCaseQuery.startsWith("insert") ||
        lowerCaseQuery.startsWith("update") ||
        lowerCaseQuery.startsWith("create") ||
        lowerCaseQuery.startsWith("alter");

      // Storage limit: check DB size (50MB)
      if (isWriteQuery) {
        const [sizeRow] = await pool.query(
          "SELECT SUM(data_length + index_length) AS size FROM information_schema.tables WHERE table_schema = DATABASE();",
        );
        const dbFileSize = sizeRow.size || 0;
        const MAX_DB_SIZE_BYTES = 50 * 1024 * 1024;
        if (dbFileSize > MAX_DB_SIZE_BYTES) {
          throw new Error(
            `Database size limit of 50MB reached. Only SELECT, DELETE and DROP operations are allowed to free up space. Current size: ${(dbFileSize / (1024 * 1024)).toFixed(2)}MB`,
          );
        }
      }

      if (
        lowerCaseQuery.startsWith("create table") &&
        !singleQuery.includes("(")
      ) {
        throw new Error(
          "CREATE TABLE statement must include column definitions. Example: CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT);",
        );
      }

      if (lowerCaseQuery.startsWith("select")) {
        const resultRows = await pool.query(singleQuery);
        const columns = resultRows.length > 0 ? Object.keys(resultRows[0]) : [];
        lastSelectResult = {
          columns,
          rows: resultRows,
          message: `Query executed successfully. Returned ${resultRows.length} row(s).`,
        };
        messagesAccumulator.push(
          `SELECT query returned ${resultRows.length} row(s).`,
        );
      } else {
        const runResult = await pool.query(singleQuery);
        const changes = runResult.affectedRows || 0;
        changesAccumulator += changes;
        messagesAccumulator.push(
          `${changes} row(s) affected by non-SELECT query.`,
        );
      }
    }

    pool.end();
    // Directly update last used time after query
    updateLastUsed(username);
    revalidatePath("/");

    // If there was a SELECT query, return its results (typically the last one executed)
    if (lastSelectResult) {
      // Append a summary message if multiple commands were run
      // console.log(queries.length);
      if (queries.length > 1) {
        lastSelectResult.message = `Batch of ${queries.length} queries executed. ${messagesAccumulator.join(" ")} Last SELECT query returned ${lastSelectResult.rows.length} row(s). Total changes: ${changesAccumulator}.`;
      }
      return lastSelectResult;
    }

    // If no SELECT query, return a summary message for other operations
    if (queries.length > 1) {
      return {
        message: `Batch of ${queries.length} queries executed. ${messagesAccumulator.join(" ")} Total changes: ${changesAccumulator}.`,
        columns: [],
        rows: [],
      };
    } else if (queries.length === 1) {
      return {
        message: `Single query executed. ${messagesAccumulator.join(" ")} Total changes: ${changesAccumulator}.`,
        columns: [],
        rows: [],
      };
    }
  } catch (error) {
    if (pool) pool.end();
    const specificErrorMessage =
      error instanceof Error ? error.message : String(error);
    log(`[${username}.db] SQL Error: ${specificErrorMessage}`, "error"); // Log the original error too for stack trace

    let userMessage = specificErrorMessage;
    if (specificErrorMessage.includes("incomplete input")) {
      userMessage = `Incomplete SQL statement. Make sure your statement is complete and includes all required parts. Original Error: ${specificErrorMessage}`;
    } else if (specificErrorMessage.includes("syntax error")) {
      userMessage = `Syntax error in your SQL statement. Check your syntax and try again. Original Error: ${specificErrorMessage}`;
    } else if (specificErrorMessage.includes("doesn't exist")) {
      const tableName = specificErrorMessage.match(
        /Table '.*?\.(.*?)' doesn't exist/,
      )?.[1];
      userMessage = `Table '${tableName || "unknown"}' does not exist. Create it first or check the table name. Original Error: ${specificErrorMessage}`;
    }
    // Instead of throwing, return the error as a result object
    return {
      message: `[${username}.db] SQL Error: ${userMessage}`,
      columns: [],
      rows: [],
      error: true,
    };
  }
}

export async function getDatabaseInfo() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    throw new Error("Authentication required");
  }
  const username = session.user.email.split("@")[0]; // For logging
  let pool;

  try {
    // Get the user-specific database
    pool = await getUserDb();

    // Get all tables
    const tables = await pool.query("SHOW TABLES");
    const tableNames = tables.map((row: any) => Object.values(row)[0]);

    const dbInfo = {
      tables: tableNames,
      tableCount: tableNames.length,
    };

    pool.end();
    return dbInfo;
  } catch (error) {
    if (pool) pool.end();
    const specificErrorMessage =
      error instanceof Error ? error.message : String(error);
    log(
      `[${username}.db] Database Info Error: ${specificErrorMessage}`,
      "error",
    );
    throw new Error(
      `[${username}.db] Error getting database info: ${specificErrorMessage}`,
    );
  }
}
