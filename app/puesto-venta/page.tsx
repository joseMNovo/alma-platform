"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Dashboard from "@/components/dashboard/dashboard"

export const dynamic = 'force-dynamic'

export default function PuestoVentaPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const savedUser = localStorage.getItem("alma_user")
    if (savedUser) {
      setUser(JSON.parse(savedUser))
      document.cookie = "alma_session=1; path=/; SameSite=Strict; max-age=2592000"
    } else {
      router.push("/")
    }
    setLoading(false)
  }, [router])

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem("alma_user")
    document.cookie = "alma_session=; path=/; max-age=0"
    router.push("/")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-[#4dd0e1] text-xl">Cargando...</div>
      </div>
    )
  }

  if (!user) return null

  return <Dashboard user={user} onLogout={handleLogout} />
}
