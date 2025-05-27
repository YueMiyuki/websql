"use client"

import { signOut, useSession } from "next-auth/react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LogOut, User, Database } from "lucide-react"
import { motion } from "framer-motion"

export function UserNav() {
  const { data: session } = useSession()

  if (!session?.user) {
    return null
  }

  const { name, email, image } = session.user
  const username = email?.split("@")[0] || "user"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button variant="ghost" className="relative h-9 w-9 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
            <Avatar className="h-9 w-9 border-2 border-gray-200 dark:border-gray-600">
              <AvatarImage src={image || ""} alt={name || "User"} />
              <AvatarFallback className="bg-accent text-foreground">
                {name?.charAt(0) || email?.charAt(0) || <User className="h-4 w-4" />}
              </AvatarFallback>
            </Avatar>
          </Button>
        </motion.div>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-56 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-gray-200 dark:border-gray-700 dropdown-menu-content"
        align="end"
        forceMount
      >
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none text-foreground">{name}</p>
            <p className="text-xs leading-none text-muted-foreground">{email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-700" />
        <DropdownMenuItem className="text-xs text-muted-foreground flex items-center gap-2 focus:bg-accent">
          <Database className="h-3 w-3" />
          <span>Database: {username}.db</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-700" />
        <DropdownMenuItem
          className="cursor-pointer text-foreground focus:bg-red-50 focus:text-red-600"
          onClick={() => signOut({ callbackUrl: "/auth/signin" })}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
