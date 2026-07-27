"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ClipboardList, Loader2, Search, Calendar, Users, Activity } from "lucide-react"
import type { EventEnrollment } from "@/lib/data-manager"

/**
 * Sub-pestaña "Inscripciones" de Espacios.
 *
 * Reemplaza al viejo "número de inscriptos" del programa: acá se ve QUIÉN va a
 * CADA encuentro. La inscripción es por evento del calendario, así que este
 * listado refleja la asistencia real, no una membresía perpetua.
 */

const TYPE_META: Record<string, { label: string; icon: any; cls: string }> = {
  taller: { label: "Taller", icon: Calendar, cls: "bg-blue-50 text-blue-700 border-blue-200" },
  grupo: { label: "Grupo", icon: Users, cls: "bg-purple-50 text-purple-700 border-purple-200" },
  actividad: { label: "Actividad", icon: Activity, cls: "bg-amber-50 text-amber-700 border-amber-200" },
}

// Receta de tabla fina + zebra (solo desktop). Minimalista.
const TH = "px-3 py-2 font-medium text-[11px] uppercase tracking-wide text-gray-500"
const TR = "border-b border-gray-100 last:border-0 even:bg-gray-50/50 hover:bg-[#4dd0e1]/5 transition-colors"
const TD = "px-3 py-1.5"

export default function InscripcionesManager() {
  const [rows, setRows] = useState<EventEnrollment[]>([])
  const [loading, setLoading] = useState(true)
  const [type, setType] = useState<"all" | "taller" | "grupo" | "actividad">("all")
  const [search, setSearch] = useState("")

  useEffect(() => {
    setLoading(true)
    const q = type === "all" ? "" : `?type=${type}`
    fetch(`/api/calendarios/inscripciones${q}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }, [type])

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    if (!s) return rows
    return rows.filter(
      (r) => r.person_name.toLowerCase().includes(s) || (r.event_title ?? "").toLowerCase().includes(s),
    )
  }, [rows, search])

  const fmt = (d: string | null) => (d ? new Date(d + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" }) : "—")

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-[#4dd0e1]" />
          <h3 className="text-lg font-semibold text-gray-900">Inscripciones por encuentro</h3>
          <Badge variant="secondary">{filtered.length}</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-gray-200 p-0.5">
            {(["all", "taller", "grupo", "actividad"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                  type === t ? "bg-[#4dd0e1] text-white" : "text-gray-500 hover:text-gray-800"
                }`}
              >
                {t === "all" ? "Todos" : TYPE_META[t].label}
              </button>
            ))}
          </div>
          <div className="relative min-w-[180px]">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input className="h-9 pl-8" placeholder="Persona o evento…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-14"><Loader2 className="h-7 w-7 animate-spin text-[#4dd0e1]" /></div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center text-gray-500">
            <ClipboardList className="h-9 w-9 text-gray-300" />
            <p className="font-medium">No hay inscripciones{type !== "all" ? " de este tipo" : ""}</p>
            <p className="text-sm">Los participantes se anotan a cada encuentro desde el Calendario.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile: tarjetas */}
          <div className="space-y-2 md:hidden">
            {filtered.map((r) => {
              const meta = TYPE_META[r.type] ?? TYPE_META.taller
              return (
                <Card key={r.id}>
                  <CardContent className="flex items-start justify-between gap-2 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-gray-800">{r.person_name}</p>
                      <p className="truncate text-xs text-gray-500">{r.event_title}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Badge variant="outline" className={`text-[10px] ${meta.cls}`}>{meta.label}</Badge>
                      <span className="text-xs text-gray-400">{fmt(r.event_date)}</span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Desktop: tabla fina + zebra */}
          <Card className="hidden md:block">
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead className="border-b bg-gray-50">
                  <tr className="text-left">
                    <th className={TH}>Participante</th>
                    <th className={TH}>Tipo</th>
                    <th className={TH}>Encuentro</th>
                    <th className={TH}>Fecha</th>
                    <th className={TH}>Anotado</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => {
                    const meta = TYPE_META[r.type] ?? TYPE_META.taller
                    return (
                      <tr key={r.id} className={TR}>
                        <td className={`${TD} font-medium text-gray-800`}>{r.person_name}</td>
                        <td className={TD}>
                          <Badge variant="outline" className={`text-[10px] ${meta.cls}`}>{meta.label}</Badge>
                        </td>
                        <td className={`${TD} text-gray-600`}>{r.event_title || "—"}</td>
                        <td className={`${TD} text-gray-500`}>{fmt(r.event_date)}</td>
                        <td className={`${TD} text-gray-400`}>
                          {r.enrolled_at ? new Date(r.enrolled_at).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" }) : "—"}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
