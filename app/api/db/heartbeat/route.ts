import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import path from "path";
import fs from "fs";
import { NextRequest, NextResponse } from "next/server";

const DATA_DIR = path.join(process.cwd(), "data");
const LAST_USED_FILE = path.join(DATA_DIR, "last_used.json");

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const username = session.user.email.split("@")[0];
  let lastUsedMap: Record<string, number> = {};
  if (fs.existsSync(LAST_USED_FILE)) {
    try {
      lastUsedMap = JSON.parse(fs.readFileSync(LAST_USED_FILE, "utf-8"));
    } catch {
      lastUsedMap = {};
    }
  }
  lastUsedMap[username] = Math.floor(Date.now() / 1000);
  fs.writeFileSync(LAST_USED_FILE, JSON.stringify(lastUsedMap, null, 2));
  console.log(
    "[MariaDB] Last use for user",
    username,
    "updated to",
    lastUsedMap[username],
  );
  return NextResponse.json({ success: true });
}
