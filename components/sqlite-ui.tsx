"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CommandPanel } from "@/components/command-panel"
import { ResultsPanel } from "@/components/results-panel"
import { ThemeToggle } from "@/components/theme-toggle"
import { UserNav } from "@/components/user-nav"
import { executeQuery, getDatabaseInfo } from "@/lib/actions"
import { Loader2, Database } from "lucide-react"
import { useSession } from "next-auth/react"
import { Badge } from "@/components/ui/badge"

export function SQLiteUI() {
  const { data: session } = useSession()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<string[]>([])
  const [dbInfo, setDbInfo] = useState<any>(null)
  const [dbInfoLoading, setDbInfoLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("query")

  // Get the username from email
  const username = session?.user?.email ? session.user.email.split("@")[0] : "unknown"

  // Load database info on mount
  useEffect(() => {
    async function loadDbInfo() {
      try {
        const info = await getDatabaseInfo()
        setDbInfo(info)
      } catch (err) {
        console.error("Failed to load database info:", err)
      } finally {
        setDbInfoLoading(false)
      }
    }

    if (session?.user) {
      loadDbInfo()
    }
  }, [session])

  const runQuery = async () => {
    if (!query.trim()) return

    setLoading(true)
    setError(null)

    try {
      const data = await executeQuery(query)
      setResults(data)

      // Add to history if not already present
      if (!history.includes(query)) {
        setHistory((prev) => [query, ...prev].slice(0, 20))
      }

      // Refresh database info after mutation queries
      if (!query.trim().toLowerCase().startsWith("select")) {
        const info = await getDatabaseInfo()
        setDbInfo(info)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setResults(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-4">
          <div className="flex items-center gap-2 font-semibold">
            <motion.div whileHover={{ rotate: 10 }} className="text-primary">
              🗃️
            </motion.div>
            <span>SQLite Web UI</span>
          </div>

          <div className="flex items-center ml-4">
            <Badge variant="outline" className="gap-1.5">
              <Database className="h-3 w-3" />
              <span className="font-mono text-xs">{username}.db</span>
            </Badge>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <UserNav />
          </div>
        </div>
      </header>

      <motion.div
        className="flex flex-1 overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <CommandPanel
          query={query}
          setQuery={setQuery}
          runQuery={runQuery}
          history={history}
          loading={loading}
          dbInfo={dbInfo}
          dbInfoLoading={dbInfoLoading}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />

        <div className="flex-1 overflow-auto p-4">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex h-full items-center justify-center"
              >
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </motion.div>
            ) : error ? (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive"
              >
                <h3 className="font-semibold">Error</h3>
                <p className="mt-1 font-mono text-sm">{error}</p>
              </motion.div>
            ) : (
              <ResultsPanel key="results" results={results} />
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
