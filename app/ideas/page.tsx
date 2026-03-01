"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Dashboard from "@/components/dashboard/dashboard"

export const dynamic = 'force-dynamic'

export default function IdeasPage() {
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

  if (!user) return null

  const hasAccess = user.role === "admin" || user.role === "voluntario"

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Acceso Denegado</h1>
          <p className="text-gray-600">No tenés permisos para acceder a esta página.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden">
      <div className="absolute top-16 left-16 w-34 h-34 opacity-[0.01] pointer-events-none">
        <img src="/images/flor.png" alt="" className="w-full h-full object-contain" />
      </div>
      <div className="absolute top-38 right-20 w-30 h-30 opacity-[0.005] pointer-events-none">
        <img src="/images/flor.png" alt="" className="w-full h-full object-contain" />
      </div>
      <div className="absolute top-1/3 left-1/7 w-46 h-46 opacity-[0.015] pointer-events-none">
        <img src="/images/flor.png" alt="" className="w-full h-full object-contain" />
      </div>
      <div className="absolute bottom-26 right-16 w-34 h-34 opacity-[0.01] pointer-events-none">
        <img src="/images/flor.png" alt="" className="w-full h-full object-contain" />
      </div>
      <Dashboard user={user} onLogout={handleLogout} />
    </div>
  )
}
