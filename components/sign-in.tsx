"use client"

import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { Database } from "lucide-react"

export function SignIn() {
  return (
    <motion.div
      className="w-full max-w-md p-8 space-y-8 bg-card rounded-xl shadow-lg"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="text-center">
        <motion.div
          className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center"
          whileHover={{ scale: 1.05 }}
        >
          <Database className="h-8 w-8 text-primary" />
        </motion.div>
        <h2 className="mt-6 text-3xl font-bold">SQLite Web UI</h2>
        <p className="mt-2 text-muted-foreground">Sign in to access your SQLite databases</p>
      </div>

      <Button className="w-full" onClick={() => signIn("google", { callbackUrl: "/" })}>
        Sign in with Google
      </Button>
    </motion.div>
  )
}
