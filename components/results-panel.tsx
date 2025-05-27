"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, Copy, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface FloatingResultsPanelProps {
  results: any;
  loading: boolean;
  error: string | null;
}

export function FloatingResultsPanel({
  results,
  loading,
  error,
}: FloatingResultsPanelProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    if (!results?.rows || !results?.columns) return;

    const headers = results.columns.join("\t");
    const data = results.rows
      .map((row: any) =>
        results.columns.map((col: string) => row[col]).join("\t"),
      )
      .join("\n");
    const text = `${headers}\n${data}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadCsv = () => {
    if (!results?.rows || !results?.columns) return;

    const headers = results.columns.join(",");
    const data = results.rows
      .map((row: any) =>
        results.columns
          .map((col: string) => {
            const value = row[col];
            return typeof value === "string" &&
              (value.includes(",") || value.includes('"'))
              ? `"${value.replace(/"/g, '""')}"`
              : value;
          })
          .join(","),
      )
      .join("\n");

    const csv = `${headers}\n${data}`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sqlite-export-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      className="fixed right-6 top-24 bottom-6 left-[474px] z-40"
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
    >
      <motion.div
        className="h-full bg-white dark:bg-[var(--card)]/90 backdrop-blur-xl border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-xl overflow-hidden"
        whileHover={{
          y: -4,
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)",
        }}
        transition={{ duration: 0.3 }}
      >
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex h-full items-center justify-center"
            >
              <div className="text-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 2,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "linear",
                  }}
                  className="w-12 h-12 border-4 border-blue-200 dark:border-blue-800 border-t-blue-600 dark:border-t-blue-400 rounded-full mx-auto mb-4"
                />
                <p className="text-muted-foreground">Executing query...</p>
              </div>
            </motion.div>
          ) : error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex h-full items-center justify-center"
            >
              <div className="text-center max-w-md">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                >
                  <AlertCircle className="w-16 h-16 text-red-500 dark:text-red-400 mx-auto mb-4" />
                </motion.div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Query Error
                </h3>
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                  <p className="font-mono text-sm text-red-700 dark:text-red-300">
                    {error}
                  </p>
                </div>
              </div>
            </motion.div>
          ) : !results ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex h-full items-center justify-center"
            >
              <div className="text-center">
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                    opacity: [0.5, 0.8, 0.5],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "easeInOut",
                  }}
                  className="text-6xl mb-4"
                >
                  ⚡
                </motion.div>
                <p className="text-muted-foreground text-lg">
                  Run a query to see results
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="h-full flex flex-col"
              transition={{ duration: 0.4 }}
            >
              {results.message && (
                <motion.div
                  className={`mb-6 p-4 rounded-xl border shadow flex flex-col items-start gap-2 ${results.error ? "bg-red-100 border-red-400" : "bg-green-100 border-green-400"}`}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {results.error ? (
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    ) : (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    )}
                    <span
                      className={`font-semibold text-base ${results.error ? "text-red-800" : "text-green-800"}`}
                    >
                      {results.error ? "Error" : "Success"}
                    </span>
                  </div>
                  <div
                    className={`font-mono text-sm ${results.error ? "text-red-700" : "text-green-700"}`}
                  >
                    {typeof results.message === "string"
                      ? results.message
                          .split(/\.\s+/)
                          .map((line: string, idx: number, arr: string[]) => (
                            <span key={idx}>
                              {line}
                              {idx < arr.length - 1 ? "." : ""}
                              <br />
                            </span>
                          ))
                      : results.message}
                  </div>
                </motion.div>
              )}

              {results.rows && results.columns && results.rows.length > 0 ? (
                <>
                  <motion.div
                    className="flex justify-between items-center mb-4"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <h3 className="font-semibold text-lg text-green-800 px-3 py-1 rounded">
                      Results: {results.rows.length} row
                      {results.rows.length !== 1 ? "s" : ""}
                    </h3>
                    <div className="flex gap-2">
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2 border-gray-300 dark:border-gray-600 hover:bg-gray-100 hover:border-gray-400 dark:hover:bg-gray-800 dark:hover:border-gray-400 text-gray-700 dark:text-gray-300"
                          onClick={copyToClipboard}
                        >
                          {copied ? (
                            <>
                              <CheckCircle className="h-3 w-3 text-green-600" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              Copy
                            </>
                          )}
                        </Button>
                      </motion.div>
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2 border-gray-300 dark:border-gray-600 hover:bg-gray-400 hover:text-white hover:border-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-100 dark:hover:border-gray-400 text-gray-700 dark:text-gray-300"
                          onClick={downloadCsv}
                        >
                          <Download className="h-3 w-3" />
                          Export CSV
                        </Button>
                      </motion.div>
                    </div>
                  </motion.div>

                  <motion.div
                    className="rounded-xl border border-[var(--border)] bg-[var(--card)] dark:border-[var(--border)] overflow-hidden flex-1 dark:bg-[var(--card)]"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    <div className="overflow-auto h-full">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-b border-[var(--border)] bg-[var(--card)] dark:border-[var(--border)] dark:bg-[var(--card)] text-[var(--foreground)] dark:text-[var(--card-foreground)]">
                            {results.columns.map(
                              (column: string, index: number) => (
                                <TableHead
                                  key={column}
                                  className="font-semibold text-[var(--foreground)] bg-[var(--card)] dark:text-[var(--card-foreground)] dark:bg-[var(--card)]"
                                >
                                  <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5 + index * 0.05 }}
                                  >
                                    {column}
                                  </motion.div>
                                </TableHead>
                              ),
                            )}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {results.rows.map((row: any, rowIndex: number) => (
                            <motion.tr
                              key={rowIndex}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.6 + rowIndex * 0.02 }}
                              className="border-b border-[var(--border)] bg-[var(--card)] dark:border-[var(--border)] dark:bg-[var(--card)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] dark:hover:bg-[var(--muted)] dark:hover:text-[var(--card-foreground)]"
                            >
                              {results.columns.map((column: string) => (
                                <TableCell
                                  key={column}
                                  className="font-mono text-sm text-[var(--foreground)] dark:text-[var(--card-foreground)] bg-[var(--card)] dark:bg-[var(--card)]"
                                >
                                  {row[column] === null ? (
                                    <span className="text-muted-foreground italic">
                                      NULL
                                    </span>
                                  ) : typeof row[column] === "object" ? (
                                    JSON.stringify(row[column])
                                  ) : (
                                    String(row[column])
                                  )}
                                </TableCell>
                              ))}
                            </motion.tr>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </motion.div>
                </>
              ) : results.rows &&
                results.rows.length === 0 &&
                !results.error ? (
                <motion.div
                  className="flex items-center justify-center h-full"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="text-center">
                    <motion.div
                      animate={{
                        scale: [1, 1.1, 1],
                        opacity: [0.5, 0.8, 0.5],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: "easeInOut",
                      }}
                      className="text-6xl mb-4"
                    >
                      📭
                    </motion.div>
                    <p className="text-muted-foreground text-lg">
                      Query executed successfully, but returned no data
                    </p>
                  </div>
                </motion.div>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
