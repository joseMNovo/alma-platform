"use client"

import { useEffect, useState } from "react"
import { Loader2, LogOut, ShieldAlert } from "lucide-react"
import PuestoVentaManager from "@/components/stand/puesto-venta-manager"
import InstalarApp from "@/components/pwa/instalar-app"
import { can } from "@/lib/permissions"

/**
 * La caja del puesto, en su propia pantalla.
 *
 * Existe porque llegar a vender costaba cuatro navegaciones —login, panel,
 * Plata, Puesto de venta— incluso para alguien que YA tenía sesión. En una
 * feria, con gente esperando, eso no es una molestia: es el motivo por el que
 * alguien termina anotando las ventas en un papel.
 *
 * ── Por qué el login va acá adentro y no en /?next=/venta ─────────────
 *
 * El camino normal manda al login, vuelve, y en el medio la pantalla cambia
 * tres veces. Acá el formulario es un ESTADO de esta misma pantalla: se
 * completa, se entra, y lo único que pasa es que el formulario se va y
 * aparece la góndola. Misma URL, cero rebote.
 *
 * No hay autenticación nueva: postea al mismo `/api/auth` de siempre y queda
 * la misma cookie. Un voluntario que ya entró por la app no ve este
 * formulario nunca.
 *
 * ── Cómo se sabe si hay sesión ────────────────────────────────────────
 *
 * Pidiendo los productos, que es lo que hace falta igual para vender. Si
 * contesta, hay sesión; si da 401, no la hay. Un pedido que sirve para dos
 * cosas en vez de dos pedidos, que en una conexión mala es la diferencia
 * entre abrir en un segundo o en cuatro.
 */

type Estado = "probando" | "entrar" | "adentro" | "sin-permiso"

interface Usuario {
  id: number
  name: string
  last_name?: string
  role: string
  is_admin?: boolean
}

/** Alto mínimo de todo lo que se toca. Esto se usa parado, con una mano y
 *  con alguien enfrente esperando: 44px es el piso, no el objetivo. */
const TOCABLE = "h-12"

export default function VentaExpress() {
  const [estado, setEstado] = useState<Estado>("probando")
  const [usuario, setUsuario] = useState<Usuario | null>(null)

  const [email, setEmail] = useState("")
  const [pin, setPin] = useState("")
  const [error, setError] = useState("")
  const [entrando, setEntrando] = useState(false)

  const leerUsuarioGuardado = (): Usuario | null => {
    try {
      const crudo = localStorage.getItem("alma_user")
      return crudo ? JSON.parse(crudo) : null
    } catch {
      return null
    }
  }

  const acomodar = (u: Usuario | null) => {
    if (!u) return setEstado("entrar")
    setUsuario(u)
    // El participante tiene sesión válida pero no vende. Decírselo es mejor
    // que mostrarle una góndola que no va a poder usar.
    setEstado(can(u, "stand:sell") ? "adentro" : "sin-permiso")
  }

  useEffect(() => {
    fetch("/api/stand/productos")
      .then((r) => {
        if (r.status === 401) return setEstado("entrar")
        if (!r.ok) return setEstado("entrar")
        acomodar(leerUsuarioGuardado())
      })
      .catch(() => setEstado("entrar"))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setEntrando(true)
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // `remember` largo a propósito: la cookie tiene que sobrevivir entre
        // una feria y la siguiente. Volver a pedir el PIN cada vez es el
        // motivo por el que la gente deja de usar la herramienta.
        body: JSON.stringify({ email: email.trim(), pin, remember: true }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || "No pudimos entrar. Revisá el mail y el PIN.")
        return
      }
      localStorage.setItem("alma_user", JSON.stringify(data.user))
      acomodar(data.user)
    } catch {
      setError("Sin conexión. Para entrar la primera vez hace falta internet.")
    } finally {
      setEntrando(false)
    }
  }

  const salir = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {})
    localStorage.removeItem("alma_user")
    setUsuario(null)
    setPin("")
    setEstado("entrar")
  }

  if (estado === "probando") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#00838f]">
        <Loader2 className="h-10 w-10 animate-spin text-white/80" />
      </div>
    )
  }

  if (estado === "entrar") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#00838f] px-6 py-10">
        <img src="/images/flor-blanco.png" alt="" className="mb-4 h-20 w-auto" />
        <h1 className="text-2xl font-bold text-white">Puesto de venta</h1>
        <p className="mt-1 text-center text-sm text-white/70">
          Entrá con tu mail y tu PIN
        </p>

        <form onSubmit={entrar} className="mt-8 w-full max-w-sm space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@mail.com"
            autoComplete="username"
            inputMode="email"
            required
            // `text-base` (16px) y no más chico: por debajo de eso, iOS hace
            // zoom solo al enfocar el campo y te deja la pantalla corrida.
            className={`w-full rounded-xl border-0 bg-white px-4 text-base text-gray-900 outline-none ring-2 ring-transparent focus:ring-white/60 ${TOCABLE}`}
          />
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="PIN"
            autoComplete="current-password"
            inputMode="numeric"
            required
            className={`w-full rounded-xl border-0 bg-white px-4 text-center text-2xl tracking-[0.5em] text-gray-900 outline-none ring-2 ring-transparent focus:ring-white/60 ${TOCABLE}`}
          />

          {error && (
            <p className="rounded-lg bg-white/15 px-3 py-2 text-sm text-white">{error}</p>
          )}

          <button
            type="submit"
            disabled={entrando || pin.length < 4}
            className={`w-full rounded-xl bg-white text-base font-bold text-[#00838f] transition-opacity disabled:opacity-50 ${TOCABLE}`}
          >
            {entrando ? "Entrando…" : "Entrar"}
          </button>
        </form>

        {/* Instalar, acá y no después: este es el momento en que la persona
            está parada en la puerta de la feria con el teléfono en la mano. */}
        <div className="mt-8">
          <InstalarApp className="h-11 border-white/40 bg-transparent px-4 text-sm text-white hover:bg-white/10 hover:text-white" />
        </div>
      </div>
    )
  }

  if (estado === "sin-permiso") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#00838f] px-8 text-center">
        <ShieldAlert className="h-12 w-12 text-white/80" />
        <p className="text-lg font-semibold text-white">
          Tu cuenta no puede cobrar en el puesto
        </p>
        <p className="text-sm text-white/70">
          El puesto lo atienden voluntarios. Si tendrías que estar, pedile a un
          administrador que te lo habilite.
        </p>
        <button onClick={salir} className={`mt-2 rounded-xl bg-white/15 px-5 text-sm font-semibold text-white ${TOCABLE}`}>
          Entrar con otra cuenta
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Una barra mínima: quién está cobrando y cómo salir. Nada más, porque
          todo lo que ocupe lugar acá se lo saca a la góndola. */}
      <header className="sticky top-0 z-20 flex items-center gap-3 bg-[#00838f] px-4 py-2.5 text-white">
        <img src="/images/flor-blanco.png" alt="" className="h-7 w-auto shrink-0" />
        <span className="text-sm font-semibold">Puesto</span>
        <span className="ml-auto truncate text-sm text-white/80">{usuario?.name}</span>
        <button
          onClick={salir}
          aria-label="Salir"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors active:bg-white/15"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </header>

      <main className="px-3 py-3 sm:px-4">
        <PuestoVentaManager user={usuario as any} />
      </main>
    </div>
  )
}
