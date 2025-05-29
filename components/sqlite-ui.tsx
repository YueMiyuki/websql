"use client";

import { useState, useEffect } from "react";
import { AnimatedBackground } from "@/components/background";
import { FloatingNavbar } from "@/components/nav-float";
import { FloatingCommandPanel } from "@/components/command-panel";
import { FloatingResultsPanel } from "@/components/results-panel";
import { executeQuery, getDatabaseInfo } from "@/lib/actions";
import { useSession } from "next-auth/react";

export function SQLiteUI() {
  const { data: session } = useSession();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("sqlite_query_history");
        return stored ? JSON.parse(stored) : [];
      } catch {
        return [];
      }
    }
    return [];
  });
  const [dbInfo, setDbInfo] = useState<any>(null);
  const [dbInfoLoading, setDbInfoLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("query");

  // Persist history to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("sqlite_query_history", JSON.stringify(history));
    }
  }, [history]);

  // Load database info on mount
  useEffect(() => {
    async function loadDbInfo() {
      try {
        const info = await getDatabaseInfo();
        setDbInfo(info);
      } catch (err) {
        console.error("Failed to load database info:", err);
      } finally {
        setDbInfoLoading(false);
      }
    }

    if (session?.user) {
      loadDbInfo();
    }
  }, [session]);

  const runQuery = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const data = await executeQuery(query);
      setResults(data);

      // Add to history if not already present
      if (!history.includes(query)) {
        setHistory((prev) => {
          const newHistory = [query, ...prev].slice(0, 20);
          localStorage.setItem(
            "sqlite_query_history",
            JSON.stringify(newHistory),
          );
          return newHistory;
        });
      }

      // Refresh database info after mutation queries
      if (!query.trim().toLowerCase().startsWith("select")) {
        const info = await getDatabaseInfo();
        setDbInfo(info);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <AnimatedBackground />

      <FloatingNavbar />

      {session?.user && dbInfoLoading && (
        <div className="absolute left-1/2 top-24 z-50 -translate-x-1/2 bg-yellow-100 text-yellow-800 px-6 py-3 rounded-xl shadow-lg border border-yellow-300 font-medium flex items-center gap-2">
          <span className="animate-spin">⏳</span> Database is starting, please
          wait...
        </div>
      )}

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
        dbDisabled={dbInfoLoading}
      />

      <FloatingResultsPanel results={results} loading={loading} error={error} />
    </div>
  );
}
