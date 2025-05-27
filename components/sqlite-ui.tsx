"use client"

import { useState, useEffect } from "react"
import { AnimatedBackground } from "@/components/background"
import { FloatingNavbar } from "@/components/nav-float"
import { FloatingCommandPanel } from "@/components/command-panel"
import { FloatingResultsPanel } from "@/components/results-panel"
import { executeQuery, getDatabaseInfo } from "@/lib/actions"
import { useSession } from "next-auth/react"

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
    <div className="min-h-screen relative overflow-hidden">
      <AnimatedBackground />

      <FloatingNavbar />

      <FloatingCommandPanel
        query={query}
        setQuery={setQuery}
        runQuery={runQuery}
        history={history}
        loading={loading}
        dbInfo={dbInfo}
        dbInfoLoading={dbInfoLoading}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        result={results ? results : error ? { error: true, message: error } : null}
      />

      <FloatingResultsPanel results={results} loading={loading} error={error} />
    </div>
  )
}
