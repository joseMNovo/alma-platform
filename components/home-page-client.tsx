"use client"

import { Loader2 } from "lucide-react"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import LoginForm from "@/components/auth/login-form"
import { toast } from "@/hooks/use-toast"

// Onboarding: un voluntario tiene el perfil "incompleto" si le faltan datos de
// contacto/identidad básicos (lo que queda vacío recién registrado).
function isVolunteerProfileIncomplete(u: any): boolean {
  if (!u || u.role !== "voluntario") return false
  const missing = (v: any) => v === null || v === undefined || String(v).trim() === ""
  // birth_date es opcional en todo el sistema; no la pedimos en el onboarding.
  return missing(u.phone)
}

export default function HomePageClient({
  gamesUrl,
  sesionValida,
}: {
  gamesUrl: string
  /** Lo dice el servidor leyendo la cookie firmada. Es LA autoridad: sin
   *  esto el cliente adivinaba con localStorage y se armaba el rebote. */
  sesionValida: boolean
}) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sesionVencida, setSesionVencida] = useState(false)
  const router = useRouter()

  /** Adónde mandar después de entrar. El middleware deja en la URL el módulo
   *  que la persona quiso abrir; si no hay ninguno, va a Inicio. Solo rutas
   *  internas: `//otro-sitio.com` parece interna y no lo es. */
  const destinoPostLogin = () => {
    if (typeof window === "undefined") return "/inicio"
    const pedido = new URLSearchParams(window.location.search).get("next")
    return pedido && pedido.startsWith("/") && !pedido.startsWith("//") ? pedido : "/inicio"
  }

  useEffect(() => {
    /**
     * El localStorage NO vence; la cookie del token sí (15 días), y además
     * muere si cambia JWT_SECRET o APP_TOKEN_VERSION. Cuando se desincronizan,
     * el middleware rebota a "/" y esta pantalla volvía a empujar adentro:
     * rebote infinito, que se veía como "queda cargando para siempre".
     *
     * El middleware ahora avisa el motivo en la URL. Con ese aviso se limpia
     * la sesión local en vez de reintentar.
     */
    if (new URLSearchParams(window.location.search).get("sesion") === "vencida") {
      localStorage.removeItem("alma_user")
      document.cookie = "alma_session=; path=/; max-age=0"
      setSesionVencida(true)
      setLoading(false)
      return
    }

    const savedUser = localStorage.getItem("alma_user")

    /**
     * Tres combinaciones posibles, y las tres terminan en algo estable.
     * La clave es que solo se entra cuando el SERVIDOR confirmó la cookie:
     * así "/" nunca puede empujar hacia adentro contra el criterio del
     * middleware, que era el origen del rebote.
     */
    if (sesionValida && savedUser) {
      try {
        setUser(JSON.parse(savedUser))
        document.cookie = "alma_session=1; path=/; SameSite=Strict; max-age=2592000"
        // Navegación dura: cualquier redirección del servidor termina en una
        // carga limpia, no en un estado a medias del router del cliente.
        window.location.replace(destinoPostLogin())
        return
      } catch {
        localStorage.removeItem("alma_user")
      }
    } else if (sesionValida && !savedUser) {
      // Cookie huérfana: hay sesión en el servidor pero el navegador no sabe
      // quién es (storage limpiado, otro dispositivo). Se cierra de verdad,
      // porque si no "/" y el módulo se la pasarían la pelota para siempre.
      fetch("/api/auth/logout", { method: "POST" }).catch(() => {})
      document.cookie = "alma_session=; path=/; max-age=0"
    } else if (savedUser) {
      // Al revés: quedó el usuario local pero la cookie ya no vale.
      localStorage.removeItem("alma_user")
      document.cookie = "alma_session=; path=/; max-age=0"
      setSesionVencida(true)
    }

    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, sesionValida])

  const handleLogin = (userData: any) => {
    setUser(userData)
    localStorage.setItem("alma_user", JSON.stringify(userData))
    document.cookie = "alma_session=1; path=/; SameSite=Strict; max-age=2592000"
    // Invitar a completar el perfil solo si es voluntario, tiene datos incompletos
    // y no descartó antes la invitación ("Hacerlo después").
    try {
      if (
        isVolunteerProfileIncomplete(userData) &&
        !localStorage.getItem("alma_profile_prompt_dismissed")
      ) {
        localStorage.setItem("alma_new_registration", userData.role)
      }
    } catch {}
    window.location.replace(destinoPostLogin())
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
      {sesionVencida && (
        <div className="bg-amber-50 px-4 py-2.5 text-center text-sm text-amber-900">
          Tu sesión se cerró por seguridad. Ingresá de nuevo.
        </div>
      )}
      {!user ? (
        <LoginForm onLogin={handleLogin} gamesUrl={gamesUrl} />
      ) : (
        /* Con sesión, "/" solo redirige a /inicio. Montar el dashboard acá
           haría que se vea el calendario un instante: sin ruta de módulo,
           resolveRoute cae en el primer grupo del registro (Agenda). */
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#4dd0e1]" />
        </div>
      )}
    </div>
  )
}
