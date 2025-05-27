"use client";

import { motion } from "framer-motion";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserNav } from "@/components/user-nav";
import { Badge } from "@/components/ui/badge";
import { Database } from "lucide-react";
import { useSession } from "next-auth/react";

export function FloatingNavbar() {
  const { data: session } = useSession();
  const username = session?.user?.email
    ? session.user.email.split("@")[0]
    : "unknown";

  return (
    <motion.header
      className="fixed top-4 left-6 right-6 z-50"
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <motion.div
        className="bg-[var(--card)]/90 backdrop-blur-xl border border-gray-200 dark:border-gray-700 rounded-2xl px-6 py-3 shadow-lg mx-auto"
        style={{ maxWidth: "calc(100vw - 48px)" }}
        whileHover={{ y: -2, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)" }}
        transition={{ duration: 0.2 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <motion.div
                whileHover={{ rotate: 10, scale: 1.1 }}
                className="text-2xl"
                transition={{ duration: 0.2 }}
              >
                🗃️
              </motion.div>
              <span className="font-semibold text-foreground">
                SQLite Web UI
              </span>
            </div>

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, duration: 0.3 }}
            >
              <Badge
                variant="outline"
                className="gap-2 border-border bg-accent text-foreground"
              >
                <Database className="h-3 w-3" />
                <span className="font-mono text-xs">{username}.db</span>
              </Badge>
            </motion.div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <UserNav />
          </div>
        </div>
      </motion.div>
    </motion.header>
  );
}
