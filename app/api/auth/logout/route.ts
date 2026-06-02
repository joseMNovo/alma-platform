import { NextResponse } from "next/server"
import { logInfo } from "@/lib/logger"
import { getSessionUser } from "@/lib/serverAuth"
import { type NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  const session = getSessionUser(request)
  const response = NextResponse.json({ success: true })
  response.cookies.set("alma_token", "", {
    httpOnly: true,
    sameSite: "strict",
    maxAge: 0,
    path: "/",
    secure: process.env.HTTPS_ENABLED === "true",
  })
  logInfo("Sesión cerrada", { module: "auth", action: "logout", user: session?.id })
  return response
}
