"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Dashboard from "@/components/dashboard/dashboard"

/**
 * La Academia de puertas adentro: el módulo dentro del dashboard.
 *
 * Vive en un componente aparte porque `/academia` es ahora una sola ruta que
 * sirve dos cosas: la vidriera pública si no hay sesión, y esto si la hay.
 * Esa decisión la toma la página (server component) mirando la cookie; acá
 * abajo ya se da por hecho que hay sesión.
 */
export default function AcademiaInterna() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const savedUser = localStorage.getItem("alma_user")
    if (savedUser) {
      setUser(JSON.parse(savedUser))
      document.cookie = "alma_session=1; path=/; SameSite=Strict; max-age=2592000"
    } else {
      // Cookie válida pero sin usuario en localStorage: sesión a medias
      // (otro navegador, storage limpiado). Al login, que lo resuelva ahí.
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
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-xl text-[#4dd0e1]">Cargando...</div>
      </div>
    )
  }

  if (!user) return null

  return <Dashboard user={user} onLogout={handleLogout} />
}
