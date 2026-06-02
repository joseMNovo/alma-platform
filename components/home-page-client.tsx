"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import LoginForm from "@/components/auth/login-form"
import Dashboard from "@/components/dashboard/dashboard"
import { toast } from "@/hooks/use-toast"

export default function HomePageClient({ gamesUrl }: { gamesUrl: string }) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const savedUser = localStorage.getItem("alma_user")
    if (savedUser) {
      const userData = JSON.parse(savedUser)
      setUser(userData)
      document.cookie = "alma_session=1; path=/; SameSite=Strict; max-age=2592000"
      router.push("/calendarios")
    }
    setLoading(false)
  }, [router])

  const handleLogin = (userData: any) => {
    setUser(userData)
    localStorage.setItem("alma_user", JSON.stringify(userData))
    document.cookie = "alma_session=1; path=/; SameSite=Strict; max-age=2592000"
    router.push("/calendarios")
  }

  const handleLogout = useCallback(async () => {
    setUser(null)
    localStorage.removeItem("alma_user")
    document.cookie = "alma_session=; path=/; max-age=0"
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {})
    router.push("/")
  }, [router])

  const handleSessionExpired = useCallback(() => {
    setUser(null)
    localStorage.removeItem("alma_user")
    document.cookie = "alma_session=; path=/; max-age=0"
    fetch("/api/auth/logout", { method: "POST" }).catch(() => {})
    toast({
      title: "Sesión expirada",
      description: "Tu sesión venció. Volvé a ingresar.",
      variant: "destructive",
    })
    router.push("/")
  }, [router])

  // Interceptor global: detecta 401 en rutas internas y cierra sesión automáticamente
  useEffect(() => {
    if (!user) return

    const originalFetch = window.fetch
    window.fetch = async (input, init) => {
      const response = await originalFetch(input, init)
      if (response.status === 401) {
        const url = typeof input === "string" ? input
          : input instanceof URL ? input.href
          : (input as Request).url
        const isInternal = url.includes("/api/")
        const isAuthRoute = url.includes("/api/auth")
        if (isInternal && !isAuthRoute) {
          handleSessionExpired()
        }
      }
      return response
    }

    return () => { window.fetch = originalFetch }
  }, [user, handleSessionExpired])

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-[#4dd0e1] text-xl flex items-center">
          <svg
            className="animate-spin -ml-1 mr-3 h-5 w-5 text-[#4dd0e1]"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          Cargando...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {!user ? <LoginForm onLogin={handleLogin} gamesUrl={gamesUrl} /> : <Dashboard user={user} onLogout={handleLogout} />}
    </div>
  )
}
