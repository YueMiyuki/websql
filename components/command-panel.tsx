"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Play, History, X, ChevronRight, Database, Table, Info } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { useRouter } from "next/navigation"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface CommandPanelProps {
  query: string
  setQuery: (query: string) => void
  runQuery: () => Promise<void>
  history: string[]
  loading: boolean
  dbInfo: any
  dbInfoLoading: boolean
  activeTab: string
  setActiveTab: (tab: string) => void
}

export function CommandPanel({
  query,
  setQuery,
  runQuery,
  history,
  loading,
  dbInfo,
  dbInfoLoading,
  activeTab,
  setActiveTab,
}: CommandPanelProps) {
  const [showHistory, setShowHistory] = useState(false)
  const router = useRouter()

  // Function to handle viewing table data or structure
  const handleTableAction = (action: string, table: string) => {
    if (action === "data") {
      setQuery(`SELECT * FROM ${table} LIMIT 100;`)
    } else if (action === "structure") {
      setQuery(`PRAGMA table_info(${table});`)
    }
    setActiveTab("query")
    // Force a rerender to ensure the tab change takes effect
    router.refresh()
  }

  return (
    <motion.div
      className="w-[400px] border-r bg-muted/40 p-4 flex flex-col"
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid grid-cols-2 mb-4">
          <TabsTrigger value="query">SQL Query</TabsTrigger>
          <TabsTrigger value="schema">Database Schema</TabsTrigger>
        </TabsList>

        <TabsContent value="query" className="flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">SQL Commands</h2>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm">
                    <p>Make sure your SQL statements end with a semicolon (;)</p>
                    <p className="mt-1">For CREATE TABLE statements, include column definitions in parentheses.</p>
                    <p className="mt-1">Example: CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT);</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setShowHistory(!showHistory)}>
              <History className="h-4 w-4" />
            </Button>
          </div>

          {showHistory && (
            <motion.div
              className="mb-4 border rounded-md bg-card"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
            >
              <div className="p-2 border-b flex items-center justify-between">
                <span className="text-sm font-medium">History</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowHistory(false)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <div className="max-h-[200px] overflow-y-auto">
                {history.length === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground">No history yet</p>
                ) : (
                  <ul className="divide-y">
                    {history.map((item, i) => (
                      <motion.li
                        key={i}
                        whileHover={{ backgroundColor: "rgba(0,0,0,0.05)" }}
                        className="p-2 text-sm cursor-pointer flex items-center"
                        onClick={() => setQuery(item)}
                      >
                        <ChevronRight className="h-3 w-3 mr-1 text-muted-foreground" />
                        <span className="truncate">{item}</span>
                      </motion.li>
                    ))}
                  </ul>
                )}
              </div>
            </motion.div>
          )}

          <Textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter SQL query..."
            className="flex-1 min-h-[200px] font-mono text-sm resize-none mb-4"
          />

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setQuery("")}>
              Clear
            </Button>
            <Button onClick={runQuery} disabled={loading || !query.trim()} className="gap-2">
              <Play className="h-4 w-4" />
              Run Query
            </Button>
          </div>

          <div className="mt-4 text-sm text-muted-foreground">
            <p className="font-medium">Example queries:</p>
            <ul className="mt-1 space-y-1">
              <li
                className="cursor-pointer hover:text-foreground"
                onClick={() => setQuery("SELECT name FROM sqlite_master WHERE type='table';")}
              >
                • Show all tables
              </li>
              <li
                className="cursor-pointer hover:text-foreground"
                onClick={() => setQuery("SELECT * FROM users LIMIT 10;")}
              >
                • View users
              </li>
              <li
                className="cursor-pointer hover:text-foreground"
                onClick={() => setQuery("SELECT * FROM products LIMIT 10;")}
              >
                • View products
              </li>
              <li
                className="cursor-pointer hover:text-foreground"
                onClick={() => setQuery("CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT);")}
              >
                • Create test table
              </li>
            </ul>
          </div>
        </TabsContent>

        <TabsContent value="schema" className="flex-1 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <Database className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-semibold">Database Schema</h2>
          </div>

          {dbInfoLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          ) : dbInfo?.tables?.length > 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Your database contains {dbInfo.tableCount} table{dbInfo.tableCount !== 1 ? "s" : ""}.
              </p>

              <div className="space-y-3">
                {dbInfo.tables.map((table: string) => (
                  <motion.div
                    key={table}
                    className="border rounded-md p-3 bg-card"
                    whileHover={{ y: -2, boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}
                  >
                    <div className="flex items-center gap-2">
                      <Table className="h-4 w-4 text-primary" />
                      <h3 className="font-medium">{table}</h3>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => handleTableAction("data", table)}
                      >
                        View Data
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => handleTableAction("structure", table)}
                      >
                        View Structure
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <Database className="h-12 w-12 text-muted-foreground mb-2 opacity-20" />
              <h3 className="text-lg font-medium">No tables found</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Your database is empty. Create your first table to get started.
              </p>
              <Button
                className="mt-4"
                onClick={() => {
                  setQuery(`CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`)
                  setActiveTab("query")
                }}
              >
                Create Sample Table
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </motion.div>
  )
}
