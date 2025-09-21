"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import LoginForm from "@/components/auth/login-form"
import Dashboard from "@/components/dashboard/dashboard"

// Forzar renderizado dinámico para evitar problemas de prerendering
export const dynamic = 'force-dynamic'

export default function HomePage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Verificar si hay una sesión activa
    const savedUser = localStorage.getItem("alma_user")
    if (savedUser) {
      const userData = JSON.parse(savedUser)
      setUser(userData)
      
      // Si es admin, ir directo a inventario
      if (userData.rol === "admin") {
        router.push('/inventario')
      }
    }
    setLoading(false)
  }, [router])

  const handleLogin = (userData) => {
    setUser(userData)
    localStorage.setItem("alma_user", JSON.stringify(userData))
    
    // Después del login, redirigir a inventario
    if (userData.rol === "admin") {
      router.push('/inventario')
    }
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem("alma_user")
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

  return (
    <div className="min-h-screen bg-white">
      {!user ? <LoginForm onLogin={handleLogin} /> : <Dashboard user={user} onLogout={handleLogout} />}
    </div>
  )
}
