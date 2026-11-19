"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import FilterChip from "@/components/ui/filter-chip"
import {
  Loader2, Mail, Bell, Send, Search, X, AlertTriangle, Check, Eye, EyeOff, Bot, Hand,
} from "lucide-react"

/**
 * Qué le mandó el sistema a quién.
 *
 * Es la pantalla que contesta "¿le llegó el recordatorio a Fulana?" sin
 * entrar por SSH. El dato ya existía repartido en dos tablas —`email_logs`
 * y `notifications`— y el backend las une en `/avisos`.
 *
 * Lo que esta pantalla NO contesta, y conviene tenerlo claro: si el cron
 * corrió (en pantalla nunca se lo nombra así: para quien la usa son "envíos
 * automáticos"). Un día sin envíos y un día sin cron se ven igual acá, porque los
 * dos son una lista vacía. Eso lo responde el monitor de la VPS, que lee
 * `logs/cron/alma_cron.log` y muestra las corridas con sus contadores. Por
 * eso el vacío de abajo lo dice en voz alta en vez de quedarse mudo: un
 * listado vacío sin explicación se lee como "algo está roto".
 */

interface Destinatario {
  nombre?: string | null
  email?: string | null
  tipo?: string | null
}

interface Aviso {
  id: string
  canal: "email" | "campanita"
  fecha?: string | null
  tarea?: string | null
  titulo?: string | null
  destinatario: Destinatario
  estado: "enviado" | "fallido" | "leido" | "sin_leer"
  error?: string | null
  automatico: boolean
}

/** Nombre legible de cada tarea. La clave es el `template` del mail o el
 *  `kind` de la campanita; las que no estén se muestran crudas, que es
 *  preferible a esconder un envío por no tener etiqueta. */
const TAREAS: Record<string, string> = {
  event_assignment: "Recordatorio de evento",
  calendar_reminder: "Recordatorio de evento",
  birthday: "Saludo de cumpleaños",
  compra_pendiente: "Aviso de pago pendiente",
  cron_alert: "Alerta del sistema",
  announcement: "Novedad",
  calendar_new: "Evento nuevo",
  system: "Del sistema",
}

const RANGOS = [
  { dias: 1, texto: "Hoy" },
  { dias: 7, texto: "7 días" },
  { dias: 14, texto: "14 días" },
  { dias: 30, texto: "30 días" },
]

function fechaHora(iso?: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString("es-AR", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  })
}

export default function AvisosEnviados() {
  const [avisos, setAvisos] = useState<Aviso[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState("")

  const [dias, setDias] = useState(14)
  const [canal, setCanal] = useState<"todos" | "email" | "campanita">("todos")
  const [soloAutomaticos, setSoloAutomaticos] = useState(false)
  const [soloFallidos, setSoloFallidos] = useState(false)
  const [busqueda, setBusqueda] = useState("")

  useEffect(() => {
    let vigente = true
    setCargando(true)
    setError("")
    const query = new URLSearchParams({ days: String(dias), limit: "500" })
    if (canal !== "todos") query.set("canal", canal)
    if (soloAutomaticos) query.set("solo_automaticos", "true")

    fetch(`/api/avisos?${query.toString()}`)
      .then(async r => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "No se pudo cargar")
        return r.json()
      })
      .then(data => { if (vigente) setAvisos(Array.isArray(data) ? data : []) })
      .catch(e => { if (vigente) setError(e.message) })
      .finally(() => { if (vigente) setCargando(false) })

    return () => { vigente = false }
  }, [dias, canal, soloAutomaticos])

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    return avisos.filter(a => {
      if (soloFallidos && a.estado !== "fallido") return false
      if (!texto) return true
      return [
        a.destinatario.nombre, a.destinatario.email, a.titulo,
        a.tarea, TAREAS[a.tarea ?? ""],
      ].some(v => v?.toLowerCase().includes(texto))
    })
  }, [avisos, busqueda, soloFallidos])

  const resumen = useMemo(() => ({
    total: filtrados.length,
    fallidos: filtrados.filter(a => a.estado === "fallido").length,
    mails: filtrados.filter(a => a.canal === "email").length,
  }), [filtrados])

  return (
    <div className="space-y-4">
      {/* Banner — solo escritorio, como el resto del módulo. */}
      <div className="hidden sm:flex rounded-2xl bg-gradient-to-br from-[#dff2f5] to-[#bbe5eb] border border-[#5ec0cf]/40 px-6 py-5 items-center gap-4 shadow-sm">
        <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-xl bg-white/70 shadow-sm">
          <Send className="w-6 h-6 text-[#5ec0cf]" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-alma-fuerte leading-tight">Avisos enviados</h2>
          <p className="text-sm text-alma-fuerte/80 mt-0.5">
            Cada mail y cada campanita que salió del sistema, con el nombre de quien lo recibió.
          </p>
        </div>
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por persona, email o asunto…"
          className="h-11 pl-9 pr-9"
        />
        {!!busqueda && (
          <button
            onClick={() => setBusqueda("")}
            aria-label="Borrar la búsqueda"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-1.5">
        {RANGOS.map(r => (
          <FilterChip key={r.dias} active={dias === r.dias} onClick={() => setDias(r.dias)}>
            {r.texto}
          </FilterChip>
        ))}
        <span className="mx-1 h-5 w-px bg-gray-200" />
        <FilterChip active={canal === "email"} onClick={() => setCanal(canal === "email" ? "todos" : "email")}>
          <Mail className="h-3.5 w-3.5" /> Mails
        </FilterChip>
        <FilterChip active={canal === "campanita"} onClick={() => setCanal(canal === "campanita" ? "todos" : "campanita")}>
          <Bell className="h-3.5 w-3.5" /> Campanita
        </FilterChip>
        <span className="mx-1 h-5 w-px bg-gray-200" />
        <FilterChip active={soloAutomaticos} onClick={() => setSoloAutomaticos(!soloAutomaticos)}>
          <Bot className="h-3.5 w-3.5" /> Automáticos
        </FilterChip>
        <FilterChip active={soloFallidos} onClick={() => setSoloFallidos(!soloFallidos)}>
          <AlertTriangle className="h-3.5 w-3.5" /> Con error
        </FilterChip>
      </div>

      {/* Conteo */}
      {!cargando && !error && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-600">
            {resumen.total} {resumen.total === 1 ? "aviso" : "avisos"}
          </span>
          <span className="text-gray-400">{resumen.mails} por mail</span>
          {resumen.fallidos > 0 && (
            <span className="font-medium text-red-600">{resumen.fallidos} con error</span>
          )}
        </div>
      )}

      {error ? (
        <Card><CardContent className="py-10 text-center text-red-600">{error}</CardContent></Card>
      ) : cargando ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-[#5ec0cf]" />
        </div>
      ) : filtrados.length === 0 ? (
        <VacioExplicado hayFiltros={!!busqueda || soloFallidos || soloAutomaticos || canal !== "todos"} />
      ) : (
        <>
          {/* ── Teléfono: tarjetas ── */}
          <div className="space-y-2 lg:hidden">
            {filtrados.map(a => <TarjetaAviso key={a.id} a={a} />)}
          </div>

          {/* ── Escritorio: tabla ── */}
          <div className="hidden overflow-x-clip rounded-xl border border-gray-200 bg-white shadow-sm lg:block">
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col className="w-[13%]" />{/* Cuándo */}
                <col className="w-[10%]" />{/* Canal */}
                <col className="w-[19%]" />{/* Tarea */}
                <col className="w-[24%]" />{/* Para */}
                <col className="w-[22%]" />{/* Asunto */}
                <col className="w-[12%]" />{/* Estado */}
              </colgroup>
              <thead>
                <tr className="bg-[#f7f8f9] text-left text-gray-600">
                  <th className="px-3 py-2 font-semibold whitespace-nowrap">Cuándo</th>
                  <th className="px-3 py-2 font-semibold whitespace-nowrap">Canal</th>
                  <th className="px-3 py-2 font-semibold whitespace-nowrap">Tarea</th>
                  <th className="px-3 py-2 font-semibold whitespace-nowrap">Para</th>
                  <th className="px-3 py-2 font-semibold whitespace-nowrap">Asunto</th>
                  <th className="px-3 py-2 font-semibold whitespace-nowrap">Estado</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((a, i) => (
                  <tr
                    key={a.id}
                    className={`border-b border-gray-100 last:border-0 transition-colors hover:bg-[#f5fbfc] ${
                      i % 2 === 1 ? "bg-[#fafafa]" : "bg-white"
                    }`}
                  >
                    <td className="px-3 py-2 tabular-nums text-gray-500 whitespace-nowrap">{fechaHora(a.fecha)}</td>
                    <td className="px-3 py-2"><Canal canal={a.canal} /></td>
                    <td className="truncate px-3 py-2 text-gray-700">
                      <span className="inline-flex items-center gap-1.5">
                        <Origen automatico={a.automatico} />
                        {TAREAS[a.tarea ?? ""] ?? a.tarea ?? "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2"><Para d={a.destinatario} /></td>
                    <td className="truncate px-3 py-2 text-gray-500" title={a.titulo ?? ""}>{a.titulo || "—"}</td>
                    <td className="px-3 py-2"><Estado a={a} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

// ── Subcomponentes ───────────────────────────────────────────────────────

function TarjetaAviso({ a }: { a: Aviso }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <Para d={a.destinatario} />
        <Estado a={a} />
      </div>
      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-600">
        <Canal canal={a.canal} />
        <Origen automatico={a.automatico} />
        {TAREAS[a.tarea ?? ""] ?? a.tarea ?? "—"}
      </p>
      {a.titulo && <p className="mt-1 truncate text-xs text-gray-400">{a.titulo}</p>}
      <p className="mt-1 text-[11px] tabular-nums text-gray-400">{fechaHora(a.fecha)}</p>
      {a.error && <p className="mt-1 text-[11px] text-red-600">{a.error}</p>}
    </div>
  )
}

function Canal({ canal }: { canal: Aviso["canal"] }) {
  const esMail = canal === "email"
  const Icono = esMail ? Mail : Bell
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-gray-500">
      <Icono className="h-3.5 w-3.5 text-alma-fuerte/60" />
      {esMail ? "Mail" : "Campanita"}
    </span>
  )
}

/** Si lo disparó el cron o una persona apretando un botón. Es la diferencia
 *  entre "el sistema anda" y "alguien hizo algo", y se confunden fácil. */
function Origen({ automatico }: { automatico: boolean }) {
  const Icono = automatico ? Bot : Hand
  return (
    <Icono
      className={`h-3.5 w-3.5 shrink-0 ${automatico ? "text-alma-fuerte/60" : "text-gray-300"}`}
      aria-label={automatico ? "Lo mandó el sistema solo" : "Lo mandó una persona"}
    />
  )
}

function Para({ d }: { d: Destinatario }) {
  // Sin nombre se muestra el email solo. Poner "Desconocido" haría pensar que
  // el envío falló, cuando lo único que pasa es que esa dirección no está
  // cargada como persona.
  if (!d.nombre && !d.email) return <span className="text-gray-300">—</span>
  return (
    <span className="block min-w-0">
      <span className="block truncate text-gray-800" title={d.nombre ?? d.email ?? ""}>
        {d.nombre || d.email}
      </span>
      {d.nombre && d.email && (
        <span className="block truncate text-[11px] text-gray-400" title={d.email}>{d.email}</span>
      )}
    </span>
  )
}

function Estado({ a }: { a: Aviso }) {
  const mapa = {
    enviado:  { texto: "Enviado",  cls: "border-emerald-200 bg-emerald-50 text-emerald-700", Icono: Check },
    fallido:  { texto: "Falló",    cls: "border-red-200 bg-red-50 text-red-700",             Icono: AlertTriangle },
    leido:    { texto: "Leída",    cls: "border-emerald-200 bg-emerald-50 text-emerald-700", Icono: Eye },
    sin_leer: { texto: "Sin leer", cls: "border-gray-200 bg-gray-100 text-gray-500",         Icono: EyeOff },
  }[a.estado]

  return (
    <span
      title={a.error ?? undefined}
      className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium leading-none ${mapa.cls}`}
    >
      <mapa.Icono className="h-2.5 w-2.5" />
      {mapa.texto}
    </span>
  )
}

/**
 * El vacío, explicado.
 *
 * Una lista vacía sin texto se lee como una falla. Y acá hay una ambigüedad
 * real que conviene decir en voz alta en vez de esconder: desde esta pantalla
 * no se puede distinguir "no había nada que mandar" de "el cron no corrió".
 */
function VacioExplicado({ hayFiltros }: { hayFiltros: boolean }) {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <Send className="mx-auto mb-3 h-10 w-10 text-gray-300" />
        {hayFiltros ? (
          <p className="text-gray-500">No hay avisos que coincidan con los filtros.</p>
        ) : (
          <>
            <p className="text-gray-500">No salió ningún aviso en este período.</p>
            <p className="mx-auto mt-2 max-w-md text-xs text-gray-400">
              Puede ser que no hubiera nada que mandar. Esta pantalla muestra lo
              que salió; que los envíos automáticos hayan corrido se mira en el
              servidor.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
