"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Play,
  History,
  X,
  ChevronRight,
  Database,
  Table,
  Info,
  Sparkles,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FloatingCommandPanelProps {
  query: string;
  setQuery: (query: string) => void;
  runQuery: () => Promise<void>;
  history: string[];
  loading: boolean;
  dbInfo: any;
  dbInfoLoading: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  dbDisabled?: boolean;
}

export function FloatingCommandPanel({
  query,
  setQuery,
  runQuery,
  history,
  loading,
  dbInfo,
  dbInfoLoading,
  activeTab,
  setActiveTab,
  dbDisabled = false,
}: FloatingCommandPanelProps) {
  const [showHistory, setShowHistory] = useState(false);
  const router = useRouter();

  const handleTableAction = (action: string, table: string) => {
    if (action === "data") {
      setQuery(`SELECT * FROM ${table} LIMIT 100;`);
    } else if (action === "structure") {
      setQuery(`PRAGMA table_info(${table});`);
    }
    setActiveTab("query");
    router.refresh();
  };

  return (
    <motion.div
      className="fixed left-6 top-24 bottom-6 w-[420px] z-40"
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
    >
      <motion.div
        className="h-full bg-[var(--card)]/90 backdrop-blur-xl border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-xl relative"
        whileHover={{
          y: -4,
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)",
        }}
        transition={{ duration: 0.3 }}
      >
        {dbDisabled && (
          <div className="absolute inset-0 z-50 flex items-center justify-center rounded-2xl pointer-events-auto bg-background/80">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-blue-700 dark:text-blue-300 font-semibold text-lg animate-pulse">
                Database is starting...
              </span>
            </div>
          </div>
        )}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="h-full flex flex-col"
        >
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <TabsList className="grid grid-cols-2 mb-6 bg-accent border border-border">
              <TabsTrigger
                value="query"
                className="data-[state=active]:bg-background data-[state=active]:shadow-sm text-foreground data-[state=active]:text-foreground"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                SQL Query
              </TabsTrigger>
              <TabsTrigger
                value="schema"
                className="data-[state=active]:bg-background data-[state=active]:shadow-sm text-foreground data-[state=active]:text-foreground"
              >
                <Database className="h-4 w-4 mr-2" />
                Schema
              </TabsTrigger>
            </TabsList>
          </motion.div>

          <TabsContent value="query" className="flex-1 flex flex-col">
            <motion.div
              className="flex items-center justify-between mb-4"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-foreground">
                  SQL Commands
                </h2>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <motion.div whileHover={{ scale: 1.1 }}>
                        <Info className="h-4 w-4 text-gray-500 dark:text-gray-400 cursor-help" />
                      </motion.div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm bg-white/95 dark:bg-gray-900/95 backdrop-blur border-gray-200 dark:border-gray-700">
                      <p>
                        Make sure your SQL statements end with a semicolon (;)
                      </p>
                      <p className="mt-1">
                        For CREATE TABLE statements, include column definitions
                        in parentheses.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowHistory(!showHistory)}
                  className="border-gray-300 dark:border-gray-600 hover:bg-gray-700 hover:text-white dark:hover:bg-gray-700 dark:hover:text-white text-gray-700 dark:text-gray-300 transition-colors"
                >
                  <History className="h-4 w-4" />
                </Button>
              </motion.div>
            </motion.div>

            <AnimatePresence>
              {showHistory && (
                <motion.div
                  className="mb-4 border rounded-xl overflow-hidden"
                  style={{
                    background: "var(--card)",
                    borderColor: "var(--border)",
                  }}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div
                    className="p-3 border-b flex items-center justify-between"
                    style={{
                      borderColor: "var(--border)",
                      background: "var(--secondary)",
                    }}
                  >
                    <span
                      className="text-sm font-medium"
                      style={{ color: "var(--card-foreground)" }}
                    >
                      History
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-6 w-6"
                      style={{
                        borderColor: "var(--border)",
                        color: "var(--card-foreground)",
                      }}
                      onClick={() => setShowHistory(false)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <div
                    className={
                      history.length > 2 ? "max-h-[200px] overflow-y-auto" : ""
                    }
                    style={{ background: "var(--card)" }}
                  >
                    {history.length === 0 ? (
                      <p
                        className="p-3 text-sm"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        No history yet
                      </p>
                    ) : (
                      <ul
                        className="divide-y"
                        style={{ borderColor: "var(--border)" }}
                      >
                        {history.map((item, i) => (
                          <motion.li
                            key={i}
                            whileHover={{
                              backgroundColor: "var(--accent)",
                              color: "var(--accent-foreground)",
                            }}
                            className="p-3 text-sm cursor-pointer flex items-center transition-colors"
                            style={{ color: "var(--card-foreground)" }}
                            onClick={() => setQuery(item)}
                          >
                            <ChevronRight
                              className="h-3 w-3 mr-2"
                              style={{ color: "var(--muted-foreground)" }}
                            />
                            <span className="truncate">{item}</span>
                          </motion.li>
                        ))}
                      </ul>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex-1 mb-4"
            >
              <Textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter SQL query..."
                className="h-full font-mono text-sm resize-none border-input bg-background focus:bg-background transition-colors text-foreground placeholder:text-muted-foreground"
                disabled={dbDisabled}
              />
            </motion.div>

            <motion.div
              className="flex justify-between gap-3"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  variant="outline"
                  onClick={() => setQuery("")}
                  className="border-gray-300 dark:border-gray-600 hover:bg-gray-700 hover:text-white dark:hover:bg-gray-700 dark:hover:text-white text-gray-700 dark:text-gray-300 transition-colors"
                  disabled={dbDisabled}
                >
                  Clear
                </Button>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <TooltipProvider>
                  <Tooltip open={dbDisabled ? true : undefined}>
                    <TooltipTrigger asChild>
                      <span>
                        <Button
                          onClick={runQuery}
                          disabled={loading || !query.trim() || dbDisabled}
                          className="gap-2 bg-green-600 hover:bg-green-700 text-white shadow-lg"
                        >
                          <motion.div
                            animate={loading ? { rotate: 360 } : {}}
                            transition={{
                              duration: 1,
                              repeat: loading ? Number.POSITIVE_INFINITY : 0,
                            }}
                          >
                            <Play className="h-4 w-4" />
                          </motion.div>
                          <span style={{ color: "#fff" }}>Run Query</span>
                        </Button>
                      </span>
                    </TooltipTrigger>
                  </Tooltip>
                </TooltipProvider>
              </motion.div>
            </motion.div>

            <motion.div
              className="mt-6 text-sm"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              <p className="font-medium mb-2 text-foreground">
                Example queries:
              </p>
              <div className="max-h-[100px] overflow-y-auto overflow-x-hidden">
                <ul className="space-y-1">
                  {[
                    {
                      text: "Show all tables",
                      query:
                        "SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE();",
                    },
                    {
                      text: "Create test table",
                      query: `CREATE TABLE test (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255)
);`,
                    },
                  ].map((example, i) => (
                    <motion.li
                      key={i}
                      className="cursor-pointer transition-colors p-1 rounded text-black dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-black dark:hover:text-gray-100"
                      onClick={() => setQuery(example.query)}
                      whileHover={{ x: 4 }}
                      style={{ fontSize: "0.95rem", lineHeight: 1.3 }}
                    >
                      • {example.text}
                    </motion.li>
                  ))}
                </ul>
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="schema" className="flex-1 flex flex-col">
            <motion.div
              className="flex items-center gap-2 mb-6"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-lg font-semibold text-foreground">
                Database Schema
              </h2>
            </motion.div>

            {dbInfoLoading ? (
              <motion.div
                className="space-y-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <Skeleton className="h-4 w-full bg-gray-200 dark:bg-gray-800" />
                <Skeleton className="h-4 w-3/4 bg-gray-200 dark:bg-gray-800" />
                <Skeleton className="h-4 w-5/6 bg-gray-200 dark:bg-gray-800" />
              </motion.div>
            ) : dbInfo?.tables?.length > 0 ? (
              <motion.div
                className="space-y-4"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Your database contains {dbInfo.tableCount} table
                  {dbInfo.tableCount !== 1 ? "s" : ""}.
                </p>

                <div className="space-y-3">
                  {dbInfo.tables.map((table: string, index: number) => (
                    <motion.div
                      key={table}
                      className="border border-border rounded-xl p-4 bg-background"
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.7 + index * 0.1 }}
                      whileHover={{
                        y: -2,
                        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                      }}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Table className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <h3 className="font-medium text-foreground">{table}</h3>
                      </div>
                      <div className="flex gap-2">
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs border-border hover:bg-accent text-foreground"
                            onClick={() => handleTableAction("data", table)}
                          >
                            View Data
                          </Button>
                        </motion.div>
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs border-border hover:bg-accent text-foreground"
                            onClick={() =>
                              handleTableAction("structure", table)
                            }
                          >
                            View Structure
                          </Button>
                        </motion.div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                className="flex flex-col items-center justify-center h-full text-center p-4"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                    opacity: [0.3, 0.6, 0.3],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "easeInOut",
                  }}
                >
                  <Database className="h-16 w-16 text-muted-foreground mb-4" />
                </motion.div>
                <h3 className="text-lg font-medium text-foreground">
                  No tables found
                </h3>
                <p className="text-sm text-muted-foreground mt-2 mb-4">
                  Your database is empty. Create your first table to get
                  started.
                </p>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    className="bg-green-600 hover:bg-green-700 text-white shadow-lg"
                    onClick={() => {
                      setQuery(`CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`);
                      setActiveTab("query");
                    }}
                  >
                    Create Sample Table
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}
