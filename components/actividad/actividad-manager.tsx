"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Loader2, BarChart3, LogIn, Eye, ChevronDown, ChevronRight, Clock,
  Users, MousePointerClick, Activity, ArrowUpDown, ArrowUp, ArrowDown,
} from "lucide-react"

interface CurrentUser {
  id: number
  name: string
  email: string
  role: string
  is_admin?: boolean
}

interface ActivitySummaryRow {
  user_type: string
  user_id: number
  role: string
  login_count: number
  last_login: string | null
  view_counts: Record<string, number>
  action_counts: Record<string, number>
  name: string | null
  last_name: string | null
}

interface ActivityEventRow {
  id: number
  event_type: string
  module: string | null
  action: string | null
  created_at: string
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  voluntario: "Voluntario",
  participante: "Participante",
}

/** Estilo de la insignia de rol, en la paleta ALMA */
const ROLE_STYLES: Record<string, string> = {
  admin: "bg-[#e0f7fa] text-[#00838f] border-[#4dd0e1]/40",
  voluntario: "bg-violet-50 text-violet-700 border-violet-200",
  participante: "bg-amber-50 text-amber-700 border-amber-200",
}

type SortKey = "name" | "login_count" | "last_login" | "actions"

function formatDateTime(value: string | null): string {
  if (!value) return "Nunca"
  return new Date(value).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

/** Fecha relativa amigable ("hace 5 min", "ayer", …) */
function relativeTime(value: string | null): string {
  if (!value) return "Sin ingresos"
  const then = new Date(value).getTime()
  const diff = Date.now() - then
  const min = Math.round(diff / 60000)
  if (min < 1) return "Recién"
  if (min < 60) return `Hace ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `Hace ${h} h`
  const d = Math.round(h / 24)
  if (d === 1) return "Ayer"
  if (d < 30) return `Hace ${d} días`
  const mo = Math.round(d / 30)
  if (mo < 12) return `Hace ${mo} ${mo === 1 ? "mes" : "meses"}`
  return `Hace ${Math.round(mo / 12)} año(s)`
}

function displayName(row: { name: string | null; last_name: string | null; user_id: number }): string {
  return row.name ? `${row.name} ${row.last_name || ""}`.trim() : `Usuario #${row.user_id}`
}

function initials(row: { name: string | null; last_name: string | null }): string {
  const a = (row.name ?? "").trim().charAt(0)
  const b = (row.last_name ?? "").trim().charAt(0)
  return (a + b).toUpperCase() || "?"
}

function totalActions(row: ActivitySummaryRow): number {
  return Object.values(row.action_counts).reduce((a, b) => a + b, 0)
}

/** Insignia de módulo visto */
function ModuleChip({ module, count }: { module: string; count: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
      <Eye className="w-3 h-3 text-gray-400" />
      {module}
      <span className="text-gray-400">·</span>
      <span className="tabular-nums text-gray-500">{count}</span>
    </span>
  )
}

/** Resumen compacto de módulos para la fila: mantiene la altura uniforme.
 *  Muestra "N módulos · M vistas" y el desglose completo al pasar el mouse. */
function ModulesSummary({ modules }: { modules: [string, number][] }) {
  if (modules.length === 0) return <span className="text-gray-300">—</span>
  const totalViews = modules.reduce((a, [, c]) => a + c, 0)
  const tooltip = modules.map(([m, c]) => `${m}: ${c}`).join("\n")
  return (
    <span
      title={tooltip}
      className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 cursor-default"
    >
      <Eye className="w-3.5 h-3.5 text-gray-400" />
      <span className="tabular-nums text-gray-800">{modules.length}</span>
      <span className="text-gray-500">{modules.length === 1 ? "módulo" : "módulos"}</span>
      <span className="text-gray-300">·</span>
      <span className="tabular-nums text-gray-800">{totalViews}</span>
      <span className="text-gray-500">vistas</span>
    </span>
  )
}

export default function ActividadManager({ user }: { user: CurrentUser }) {
  const [summary, setSummary] = useState<ActivitySummaryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "login_count", dir: "desc" })
  const [expandedId, setExpandedId] = useState<string | null>(null)   // card mobile expandida

  const [selected, setSelected] = useState<ActivitySummaryRow | null>(null)
  const [timeline, setTimeline] = useState<ActivityEventRow[]>([])
  const [timelineLoading, setTimelineLoading] = useState(false)

  useEffect(() => {
    fetchSummary()
  }, [])

  const fetchSummary = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/tracking/summary")
      if (response.ok) {
        setSummary(await response.json())
      }
    } catch (error) {
      console.error("Error fetching resumen de actividad:", error)
    } finally {
      setLoading(false)
    }
  }

  const openTimeline = async (row: ActivitySummaryRow) => {
    setSelected(row)
    setTimeline([])
    setTimelineLoading(true)
    try {
      const response = await fetch(`/api/tracking/timeline?user_type=${row.user_type}&user_id=${row.user_id}`)
      if (response.ok) {
        setTimeline(await response.json())
      }
    } catch (error) {
      console.error("Error fetching timeline de actividad:", error)
    } finally {
      setTimelineLoading(false)
    }
  }

  // ── KPIs sobre el total ──────────────────────────────────────────────
  const kpi = useMemo(() => {
    let logins = 0, actions = 0, active = 0
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000
    for (const r of summary) {
      logins += r.login_count
      actions += totalActions(r)
      if (r.last_login && new Date(r.last_login).getTime() >= dayAgo) active++
    }
    return { users: summary.length, logins, actions, active }
  }, [summary])

  // ── Orden ────────────────────────────────────────────────────────────
  const sorted = useMemo(() => {
    const dir = sort.dir === "asc" ? 1 : -1
    return [...summary].sort((a, b) => {
      switch (sort.key) {
        case "name":
          return displayName(a).localeCompare(displayName(b), "es", { sensitivity: "base" }) * dir
        case "login_count":
          return (a.login_count - b.login_count) * dir
        case "actions":
          return (totalActions(a) - totalActions(b)) * dir
        case "last_login": {
          const av = a.last_login ? new Date(a.last_login).getTime() : 0
          const bv = b.last_login ? new Date(b.last_login).getTime() : 0
          return (av - bv) * dir
        }
      }
    })
  }, [summary, sort])

  const toggleSort = (key: SortKey) =>
    setSort(s => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "name" ? "asc" : "desc" }))

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sort.key !== k) return <ArrowUpDown className="w-3.5 h-3.5 text-gray-300" />
    return sort.dir === "asc"
      ? <ArrowUp className="w-3.5 h-3.5 text-[#00838f]" />
      : <ArrowDown className="w-3.5 h-3.5 text-[#00838f]" />
  }

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Banner institucional */}
      <div className="rounded-2xl bg-gradient-to-br from-[#e0f7fa] to-[#b2ebf2] border border-[#4dd0e1]/40 px-6 py-5 flex items-center gap-4 shadow-sm">
        <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-xl bg-white/70 shadow-sm">
          <BarChart3 className="w-6 h-6 text-[#4dd0e1]" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-[#00838f] leading-tight">Actividad de usuarios</h2>
          <p className="text-sm text-[#00838f]/80 mt-0.5">
            Seguí quién usa la plataforma: ingresos, módulos visitados y últimas acciones de cada persona.
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={Users} label="Usuarios" value={kpi.users} tint="text-[#4dd0e1]" />
        <KpiCard icon={Activity} label="Activos (24 h)" value={kpi.active} tint="text-emerald-500" />
        <KpiCard icon={LogIn} label="Ingresos" value={kpi.logins} tint="text-violet-500" />
        <KpiCard icon={MousePointerClick} label="Acciones" value={kpi.actions} tint="text-amber-500" />
      </div>

      {/* Listado */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-[#4dd0e1]" />
        </div>
      ) : summary.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <BarChart3 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Sin actividad registrada todavía.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ── MOBILE/TABLET: cards acordeón (< lg) ── */}
          <div className="lg:hidden space-y-2">
            {sorted.map(row => {
              const key = `${row.user_type}-${row.user_id}`
              const isExpanded = expandedId === key
              const acts = totalActions(row)
              const modules = Object.entries(row.view_counts)
              return (
                <div key={key} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setExpandedId(isExpanded ? null : key)}
                    onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setExpandedId(isExpanded ? null : key) } }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-left cursor-pointer transition-colors active:bg-gray-50"
                  >
                    <Avatar row={row} />
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-gray-900 text-sm truncate leading-snug block">{displayName(row)}</span>
                      <span className="text-xs text-gray-400 truncate block mt-0.5 inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" />{relativeTime(row.last_login)}
                      </span>
                    </div>
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${ROLE_STYLES[row.role] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
                      {ROLE_LABELS[row.role] ?? row.role}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 flex-shrink-0 ${isExpanded ? "rotate-180" : ""}`} />
                  </div>

                  <div className={`grid transition-all duration-300 ease-in-out ${isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                    <div className="overflow-hidden">
                      <div className="px-4 pb-4 pt-3 border-t border-gray-100 space-y-3">
                        <div className="flex gap-4">
                          <Stat icon={LogIn} label="Ingresos" value={row.login_count} />
                          <Stat icon={MousePointerClick} label="Acciones" value={acts} />
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Módulos vistos</p>
                          {modules.length === 0 ? (
                            <span className="text-xs text-gray-400 italic">Ninguno todavía</span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {modules.map(([m, c]) => <ModuleChip key={m} module={m} count={c} />)}
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-gray-400">Último ingreso: {formatDateTime(row.last_login)}</p>
                        <Button variant="outline" size="sm" onClick={() => openTimeline(row)} className="w-full h-9 gap-1.5 text-gray-600">
                          <Eye className="w-3.5 h-3.5" /> Ver detalle
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* ── DESKTOP: tabla (≥ lg) ── */}
          <div className="hidden lg:block overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full min-w-[880px] text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/80 text-left text-gray-600">
                  <SortableTh label="Usuario" k="name" onClick={toggleSort} SortIcon={SortIcon} />
                  <th className="px-4 py-2 font-semibold">Rol</th>
                  <SortableTh label="Ingresos" k="login_count" onClick={toggleSort} SortIcon={SortIcon} />
                  <SortableTh label="Último ingreso" k="last_login" onClick={toggleSort} SortIcon={SortIcon} />
                  <th className="px-4 py-2 font-semibold">Módulos vistos</th>
                  <SortableTh label="Acciones" k="actions" onClick={toggleSort} SortIcon={SortIcon} />
                  <th className="px-4 py-2 font-semibold text-right"></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(row => {
                  const key = `${row.user_type}-${row.user_id}`
                  const modules = Object.entries(row.view_counts)
                  return (
                    <tr key={key} className="border-b border-gray-100 last:border-0 even:bg-gray-50/50 hover:bg-[#4dd0e1]/[0.06] transition-colors">
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-3">
                          <Avatar row={row} />
                          <span className="font-medium text-gray-900">{displayName(row)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${ROLE_STYLES[row.role] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
                          {ROLE_LABELS[row.role] ?? row.role}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <span className="inline-flex items-center gap-1.5 text-gray-700">
                          <LogIn className="w-3.5 h-3.5 text-gray-400" />
                          <span className="tabular-nums font-medium">{row.login_count}</span>
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex flex-col leading-tight">
                          <span className="text-gray-700">{relativeTime(row.last_login)}</span>
                          <span className="text-[11px] text-gray-400">{formatDateTime(row.last_login)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <ModulesSummary modules={modules} />
                      </td>
                      <td className="px-4 py-2 tabular-nums text-gray-700">{totalActions(row)}</td>
                      <td className="px-4 py-2 text-right">
                        <Button
                          variant="ghost" size="sm" onClick={() => openTimeline(row)}
                          className="h-8 gap-1 text-gray-500 hover:text-[#00838f] hover:bg-[#4dd0e1]/10"
                        >
                          Ver detalle <ChevronRight className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── Modal: timeline de eventos ──────────────────────────────────── */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selected && <Avatar row={selected} />}
              <div className="min-w-0">
                <span className="block truncate">{selected ? displayName(selected) : ""}</span>
                {selected && (
                  <span className="block text-xs font-normal text-gray-400">
                    {ROLE_LABELS[selected.role] ?? selected.role} · {selected.login_count} ingresos
                  </span>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>
          {selected && Object.keys(selected.view_counts).length > 0 && (
            <div className="mb-4">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Módulos vistos</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {Object.entries(selected.view_counts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([m, c]) => (
                    <div key={m} className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-2.5 py-1.5">
                      <span className="text-xs text-gray-600 truncate capitalize">{m}</span>
                      <span className="text-xs font-semibold text-[#00838f] tabular-nums">{c}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
          {timelineLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-[#4dd0e1]" />
            </div>
          ) : timeline.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">Sin eventos registrados.</p>
          ) : (
            <ul className="relative space-y-3 pl-4 mt-2 before:absolute before:left-[3px] before:top-1.5 before:bottom-1.5 before:w-px before:bg-gray-200">
              {timeline.map((event) => (
                <li key={event.id} className="relative">
                  <span className={`absolute -left-4 top-1.5 w-1.5 h-1.5 rounded-full ring-2 ring-white ${event.event_type === "login" ? "bg-violet-400" : "bg-[#4dd0e1]"}`} />
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="capitalize font-medium text-gray-700">{event.event_type}</span>
                      {event.module && <span className="text-gray-500 truncate">{event.module}</span>}
                      {event.action && <span className="text-gray-400 truncate">({event.action})</span>}
                    </div>
                    <span className="text-gray-400 whitespace-nowrap text-xs">{formatDateTime(event.created_at)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Subcomponentes ───────────────────────────────────────────────────────
function Avatar({ row }: { row: { name: string | null; last_name: string | null } }) {
  return (
    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#4dd0e1] to-[#3bc0d1] flex items-center justify-center flex-shrink-0">
      <span className="text-white font-semibold text-xs">{initials(row)}</span>
    </div>
  )
}

function KpiCard({ icon: Icon, label, value, tint }: { icon: typeof Users; label: string; value: number; tint: string }) {
  return (
    <Card className="border border-gray-200">
      <CardContent className="p-4 flex items-center gap-3">
        <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-gray-50">
          <Icon className={`w-5 h-5 ${tint}`} />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold text-gray-900 tabular-nums leading-none">{value}</p>
          <p className="text-xs text-gray-500 mt-1 truncate">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function Stat({ icon: Icon, label, value }: { icon: typeof LogIn; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4 text-gray-400" />
      <span className="text-sm">
        <span className="font-semibold text-gray-800 tabular-nums">{value}</span>{" "}
        <span className="text-gray-500">{label}</span>
      </span>
    </div>
  )
}

function SortableTh({
  label, k, onClick, SortIcon,
}: {
  label: string; k: SortKey
  onClick: (k: SortKey) => void; SortIcon: (p: { k: SortKey }) => React.ReactNode
}) {
  return (
    <th className="px-4 py-2 font-semibold">
      <button onClick={() => onClick(k)} className="inline-flex items-center gap-1.5 hover:text-[#00838f] transition-colors">
        {label}
        <SortIcon k={k} />
      </button>
    </th>
  )
}
