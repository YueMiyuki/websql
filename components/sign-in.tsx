"use client"

import { signIn } from "next-auth/react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"
import { Database, Moon, Sun, Sparkles, LogIn } from "lucide-react"
import { useTheme } from "next-themes"

export function SignIn() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3,
      },
    },
  }

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 },
  }

  // Decorative elements
  const decorElements = Array(5).fill(null)

  return (
    <div className="relative min-h-[500px] w-full flex items-center justify-center p-4">
      {/* Decorative elements */}
      {decorElements.map((_, i) => (
        <motion.div
          key={i}
          className="absolute z-0"
          initial={{
            x: Math.random() * 400 - 200,
            y: Math.random() * 400 - 200,
            opacity: 0,
          }}
          animate={{
            x: Math.random() * 400 - 200,
            y: Math.random() * 400 - 200,
            opacity: [0.2, 0.5, 0.2],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 5 + Math.random() * 5,
            repeat: Number.POSITIVE_INFINITY,
            repeatType: "reverse",
          }}
        >
          <div className={`w-24 h-24 rounded-full blur-3xl ${i % 2 === 0 ? "bg-primary/20" : "bg-secondary/20"}`} />
        </motion.div>
      ))}

      <motion.div
        className="w-full max-w-md p-8 space-y-8 bg-card/80 backdrop-blur-sm rounded-xl shadow-lg border border-border relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Theme switcher - now inside the card */}
        {mounted && (
          <motion.div
            className="absolute top-4 right-4 z-10"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
          >
            <motion.button
              className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center shadow-md"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={theme}
                  initial={{ rotate: -30, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 30, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {theme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                </motion.div>
              </AnimatePresence>
            </motion.button>
          </motion.div>
        )}
        <motion.div variants={container} initial="hidden" animate="show" className="text-center">
          <motion.div
            className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center relative"
            whileHover={{ scale: 1.05, rotate: 5 }}
            variants={item}
          >
            <Database className="h-8 w-8 text-primary" />
            <motion.div
              className="absolute -top-1 -right-1"
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, 10, 0],
              }}
              transition={{
                duration: 2,
                repeat: Number.POSITIVE_INFINITY,
                repeatType: "reverse",
              }}
            >
              <Sparkles className="h-5 w-5 text-primary" />
            </motion.div>
          </motion.div>

          <motion.h2
            className="mt-6 text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"
            variants={item}
          >
            SQLite Web UI
          </motion.h2>

          <motion.p className="mt-2 text-muted-foreground" variants={item}>
            Sign in to access your SQLite databases
          </motion.p>
        </motion.div>

        <motion.div variants={item} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="pt-4">
          <Button
            className="w-full relative overflow-hidden group bg-primary text-primary-foreground hover:bg-primary/90 border-2 border-primary/30 flex items-center justify-center gap-2"
            onClick={() => signIn("google", { callbackUrl: "/" })}
          >
            <motion.span
              className="absolute inset-0 w-full h-full bg-gradient-to-r from-white/10 to-white/20"
              animate={{
                x: ["0%", "100%"],
                opacity: [0, 0.5, 0],
              }}
              transition={{
                duration: 3,
                repeat: Number.POSITIVE_INFINITY,
                repeatType: "loop",
              }}
            />
            <LogIn className="h-5 w-5" />
            Sign in with Google
          </Button>
        </motion.div>

        {/* Animated border */}
        <div className="absolute inset-0 rounded-xl z-[-1] overflow-hidden">
          <motion.div
            className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/30 via-secondary/30 to-primary/30 opacity-50"
            animate={{
              backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
            }}
            transition={{
              duration: 15,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
            style={{
              backgroundSize: "200% 200%",
            }}
          />
        </div>
      </motion.div>
    </div>
  )
}
