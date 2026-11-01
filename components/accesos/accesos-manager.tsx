"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { SegmentadoSimple } from "@/components/ui/pestanas-mobile"
import BarraSeleccion from "@/components/ui/barra-seleccion"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ConfirmationDialog from "@/components/ui/confirmation-dialog"
import FilterChip from "@/components/ui/filter-chip"
import GrantWizard from "@/components/accesos/grant-wizard"
import PaymentDialog from "@/components/accesos/payment-dialog"
import { VolunteerFlower, ParticipantMark } from "@/components/personas/role-marks"
import { toast } from "@/hooks/use-toast"
import ColaAvisosPago from "@/components/accesos/cola-avisos-pago"
import HistorialAvisosPago from "@/components/accesos/historial-avisos-pago"
import { GRANTABLE_MODULES } from "@/lib/modules"
import type { AccessMatrixRow, Training, PersonPayment, AccessAuditEntry, SharedAccountAlert } from "@/lib/data-manager"
import {
  KeyRound, Search, Loader2, X, DollarSign,
  History, AlertTriangle, TrendingUp, Trash2, UserPlus,
} from "lucide-react"

/**
 * Módulo Accesos — el "switchboard": qué ve cada persona más allá de su rol.
 *
 * Tres vistas sobre los mismos endpoints:
 *   Matriz     → personas × recursos, el tablero para tildar
 *   Pagos      → los ingresos registrados y la recaudación
 *   Auditoría  → la historia de quién habilitó o revocó a quién
 *   Alertas    → posibles cuentas compartidas (SOLO informativo)
 */
/** Cuál de las cuatro pantallas de Accesos mostrar. */
export type VistaAccesos = "habilitaciones" | "pagos" | "auditoria" | "alertas"

export default function AccesosManager({
  user,
  vista = "habilitaciones",
}: {
  user: any
  /** Cada una es una pestaña del nav; antes eran sub-pestañas de acá adentro. */
  vista?: VistaAccesos
}) {
  const [moduleKey, setModuleKey] = useState("capacitaciones")
  const [rows, setRows] = useState<AccessMatrixRow[]>([])
  const [trainings, setTrainings] = useState<Training[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [wizard, setWizard] = useState<{ personIds: number[] } | null>(null)
  const [paymentTarget, setPaymentTarget] = useState<AccessMatrixRow | null>(null)
  const [revokeTarget, setRevokeTarget] = useState<{ row: AccessMatrixRow; resourceId: number; label: string } | null>(null)
  // Revocar pega contra el servidor: sin esto, el diálogo se cerraba al
  // instante y no había forma de saber si la baja llegó a hacerse.
  const [revoking, setRevoking] = useState(false)

  // Filtros rápidos. `trainingFilterId` es un <select> (no un chip por curso):
  // con pocas capacitaciones un chip por cada una anda bien, pero con muchas
  // se vuelve una fila infinita — un desplegable escala sin cambiar de forma.
  const [roleFilter, setRoleFilter] = useState<"all" | "voluntario" | "participante">("all")
  const [noAccessOnly, setNoAccessOnly] = useState(false)
  const [trainingFilterId, setTrainingFilterId] = useState<number | null>(null)

  /** Columnas de la matriz: las capacitaciones, o una sola columna de acceso
   *  para los módulos que se habilitan enteros. */
  const columns = useMemo(() => {
    if (moduleKey !== "capacitaciones") return [{ id: 0, label: "Acceso" }]
    return trainings.map((t) => ({ id: t.id, label: t.title }))
  }, [moduleKey, trainings])

  const loadMatrix = useCallback(async () => {
    setLoading(true)
    try {
      const q = new URLSearchParams({ module_key: moduleKey })
      if (search.trim()) q.set("search", search.trim())
      const res = await fetch(`/api/accesos?${q.toString()}`)
      if (!res.ok) throw new Error("No se pudo cargar")
      setRows(await res.json())
    } catch {
      toast({ title: "Error", description: "No se pudo cargar la matriz de accesos", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [moduleKey, search])

  useEffect(() => {
    fetch("/api/capacitaciones")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setTrainings(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const timer = setTimeout(loadMatrix, search ? 350 : 0)
    return () => clearTimeout(timer)
  }, [loadMatrix, search])

  const revoke = async () => {
    if (!revokeTarget) return
    setRevoking(true)
    try {
      const res = await fetch("/api/accesos/revocar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          person_id: revokeTarget.row.person_id,
          module_key: moduleKey,
          resource_id: revokeTarget.resourceId,
        }),
      })
      if (!res.ok) throw new Error((await res.json())?.error)
      toast({ title: "Acceso revocado", description: "Los pagos registrados no se tocaron." })
      loadMatrix()
    } catch (error: any) {
      toast({ title: "Error", description: error?.message, variant: "destructive" })
    } finally {
      setRevoking(false)
      setRevokeTarget(null)
    }
  }

  /** Sin acceso primero (son los que probablemente hay que atender), y
   *  alfabético dentro de cada grupo. */
  const sortedRows = useMemo(() => {
    const hasAny = (row: AccessMatrixRow) => columns.some((c) => row.grants?.[String(c.id)] === true)
    const nameOf = (row: AccessMatrixRow) => `${row.name ?? ""} ${row.last_name ?? ""}`.trim().toLowerCase()
    return [...rows].sort((a, b) => {
      const diff = Number(hasAny(a)) - Number(hasAny(b))
      return diff !== 0 ? diff : nameOf(a).localeCompare(nameOf(b))
    })
  }, [rows, columns])

  const visibleRows = useMemo(() => {
    return sortedRows.filter((row) => {
      if (roleFilter === "voluntario" && !row.is_volunteer) return false
      if (roleFilter === "participante" && !row.has_login) return false
      const hasAny = columns.some((c) => row.grants?.[String(c.id)] === true)
      if (noAccessOnly && hasAny) return false
      if (trainingFilterId != null && row.grants?.[String(trainingFilterId)] !== true) return false
      return true
    })
  }, [sortedRows, roleFilter, noAccessOnly, trainingFilterId, columns])

  const filtersActive = roleFilter !== "all" || noAccessOnly || trainingFilterId != null
  const clearFilters = () => { setRoleFilter("all"); setNoAccessOnly(false); setTrainingFilterId(null) }

  const subTabTriggerClass =
    "flex items-center gap-2 transition-all duration-200 active:scale-95 data-[state=inactive]:hover:bg-[#5ec0cf]/10 data-[state=inactive]:hover:text-alma-fuerte data-[state=active]:bg-alma-fuerte data-[state=active]:text-white"

  const toggleSelect = (personId: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(personId) ? next.delete(personId) : next.add(personId)
      return next
    })
  }

  return (
    <div className="space-y-6">
      {vista === "habilitaciones" && (
        <div>
          <div className="flex items-center gap-2">
            <KeyRound className="h-6 w-6 text-[#5ec0cf]" />
            <h2 className="text-xl font-bold text-gray-900">Accesos</h2>
            {/* El número dice cuántas personas hay en la lista de abajo. */}
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-sm font-medium text-gray-600">
              {rows.length} {rows.length === 1 ? "persona" : "personas"}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Quién puede ver cada capacitación paga.
          </p>
        </div>
      )}

      <Tabs value={vista === "habilitaciones" ? "matriz" : vista} className="space-y-4">
        {/* ── Matriz ────────────────────────────────────────────────── */}
        <TabsContent value="matriz" className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {/* Desplegable solo si hubiera más de un módulo habilitable. Hoy la
                única cosa que se habilita por persona es Capacitaciones. */}
            {GRANTABLE_MODULES.length > 1 && (
              <Select value={moduleKey} onValueChange={(v) => { setModuleKey(v); setSelected(new Set()) }}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GRANTABLE_MODULES.map((m) => (
                    <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                className="h-11 pl-9 sm:h-10"
                placeholder="Buscar persona…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/*
              El conteo y el boton de habilitar se fueron a la barra de abajo
              (BarraSeleccion). Aca arriba el boton quedaba fuera de pantalla
              apenas empezabas a tildar gente, que es exactamente cuando hace
              falta; y encima, deshabilitado y gris, ocupaba lugar permanente
              sin hacer nada el 95% del tiempo.

              En escritorio se queda donde estaba: ahi la lista entra entera y
              el boton nunca se va de la vista.
            */}
            <div className="hidden shrink-0 items-center gap-2 sm:flex">
              {selected.size > 0 && (
                <Badge variant="secondary" className="shrink-0">{selected.size} seleccionadas</Badge>
              )}
              <Button
                size="sm"
                disabled={selected.size === 0}
                onClick={() => setWizard({ personIds: [...selected] })}
                className={`shrink-0 ${selected.size > 0 ? "bg-alma-fuerte hover:bg-alma-oscuro text-white" : ""}`}
              >
                <UserPlus className="mr-1.5 h-4 w-4" />
                Habilitar acceso
              </Button>
              {selected.size > 0 && (
                <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Filtros rápidos. El de capacitación es un <select>, no un chip
              por curso: con 50 capacitaciones un chip por cada una se vuelve
              inmanejable, un desplegable no. */}
          {/* Una sola línea que se arrastra. Envolviendo, cuatro filtros se comían tres renglones
          antes del primer resultado; y la barra de scroll va escondida, que si no
          descuadra la fila. */}
          <div className="sin-barra flex items-center gap-1.5 overflow-x-auto pb-0.5 sm:flex-wrap sm:overflow-visible">
            <FilterChip active={roleFilter === "voluntario"} onClick={() => setRoleFilter((f) => (f === "voluntario" ? "all" : "voluntario"))}>
              Voluntarios
            </FilterChip>
            <FilterChip active={roleFilter === "participante"} onClick={() => setRoleFilter((f) => (f === "participante" ? "all" : "participante"))}>
              Participantes
            </FilterChip>
            <FilterChip active={noAccessOnly} onClick={() => setNoAccessOnly((v) => !v)}>
              Sin accesos
            </FilterChip>
            <Select
              value={trainingFilterId != null ? String(trainingFilterId) : "todas"}
              onValueChange={(v) => setTrainingFilterId(v === "todas" ? null : Number(v))}
            >
              <SelectTrigger
                className={`h-10 sm:h-7 w-auto gap-1 rounded-full border px-2.5 text-xs font-medium [&>svg]:h-3 [&>svg]:w-3 ${
                  trainingFilterId != null ? "border-[#5ec0cf] bg-[#5ec0cf]/10 text-alma-fuerte" : "border-gray-300 text-gray-500"
                }`}
              >
                <SelectValue placeholder="Acceso a…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Acceso a…</SelectItem>
                {columns.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {filtersActive && (
              <button onClick={clearFilters} className="text-xs text-gray-400 underline hover:text-gray-600">
                Limpiar filtros
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#5ec0cf]" />
            </div>
          ) : visibleRows.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                No se encontraron personas.
              </CardContent>
            </Card>
          ) : (
            <>
            {/*
              ── Telefono: tarjetas ──────────────────────────────────────

              La tabla de abajo tiene `whitespace-nowrap` en cada celda, que
              en escritorio es lo correcto (que no se parta un nombre) y en
              360px de ancho es la causa del arrastre lateral: la fila mide
              900px y la pantalla 360. Arrastrabas para ver el mail y perdias
              de vista el nombre.

              En tarjeta cada persona ocupa dos renglones y nada se corta.
            */}
            <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white sm:hidden">
              {visibleRows.map((row) => {
                const granted = columns.filter((c) => row.grants?.[String(c.id)] === true)
                const nombre = `${row.name ?? ""} ${row.last_name ?? ""}`.trim() || "Sin nombre"
                const iniciales = ((row.name ?? "").trim().charAt(0) + (row.last_name ?? "").trim().charAt(0)).toUpperCase() || "?"
                const tildada = selected.has(row.person_id)
                return (
                  <div
                    key={row.person_id}
                    onClick={() => toggleSelect(row.person_id)}
                    className={`flex items-start gap-3 px-3 py-3 transition-colors ${tildada ? "bg-alma-suave" : "active:bg-gray-50"}`}
                  >
                    <div onClick={(e) => e.stopPropagation()} className="pt-2.5">
                      <Checkbox
                        className="h-5 w-5 border-gray-300 data-[state=checked]:border-alma-fuerte data-[state=checked]:bg-alma-fuerte"
                        checked={tildada}
                        onCheckedChange={() => toggleSelect(row.person_id)}
                      />
                    </div>

                    {/* 40px: el tamano en el que una inicial se lee de un
                        vistazo mientras se recorre la lista con el pulgar. */}
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-alma-suave text-[13px] font-bold text-alma-fuerte">
                      {iniciales}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="min-w-0 truncate font-medium text-gray-900">{nombre}</p>
                        <VolunteerFlower active={row.is_volunteer} size="w-3.5 h-3.5" />
                        <ParticipantMark active={row.has_login} size="w-3.5 h-3.5" />
                      </div>
                      {/* `truncate` y no `whitespace-nowrap`: un mail largo se
                          corta con puntos suspensivos en vez de empujar la
                          tarjeta fuera de la pantalla. */}
                      <p className="truncate text-[12.5px] text-alma-tinta">{row.email || "sin email"}</p>

                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {granted.map((c) => (
                          <span
                            key={c.id}
                            className="inline-flex max-w-full items-center gap-1 rounded-full border border-green-500 bg-green-50 py-0.5 pl-2.5 pr-1 text-xs font-medium text-green-700"
                          >
                            <span className="truncate">{c.label}</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); setRevokeTarget({ row, resourceId: c.id, label: c.label }) }}
                              className="shrink-0 rounded-full p-1 active:bg-green-200/60"
                              aria-label={`Revocar ${c.label}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                        <button
                          onClick={(e) => { e.stopPropagation(); setPaymentTarget(row) }}
                          className={`inline-flex h-8 shrink-0 items-center gap-1 rounded-md border px-2.5 text-xs font-medium transition ${
                            Number(row.total_paid) > 0
                              ? "border-green-500 bg-green-50 text-green-700"
                              : "border-alma/50 bg-white text-alma-fuerte"
                          }`}
                        >
                          <DollarSign className="h-3 w-3" />
                          {Number(row.total_paid) > 0
                            ? `$${Number(row.total_paid).toLocaleString("es-AR")}`
                            : "Registrar pago"}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* ── Escritorio: la tabla de siempre ──────────────────────── */}
            <div className="hidden overflow-x-auto rounded-lg border border-gray-200 bg-white sm:block">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-100">
                  {visibleRows.map((row) => {
                    const granted = columns.filter((c) => row.grants?.[String(c.id)] === true)
                    return (
                      <tr
                        key={row.person_id}
                        onClick={() => toggleSelect(row.person_id)}
                        className="cursor-pointer transition-colors hover:bg-[#5ec0cf]/5"
                      >
                        <td className="py-2 pl-3 pr-1" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            className="border-gray-300 data-[state=checked]:border-[#5ec0cf] data-[state=checked]:bg-[#5ec0cf]"
                            checked={selected.has(row.person_id)}
                            onCheckedChange={() => toggleSelect(row.person_id)}
                          />
                        </td>
                        <td className="whitespace-nowrap px-2 py-2 font-medium text-gray-800">
                          {`${row.name ?? ""} ${row.last_name ?? ""}`.trim() || "Sin nombre"}
                        </td>
                        <td className="whitespace-nowrap px-2 py-2">
                          <span className="flex items-center gap-1">
                            <VolunteerFlower active={row.is_volunteer} size="w-3.5 h-3.5" />
                            <ParticipantMark active={row.has_login} size="w-3.5 h-3.5" />
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-2 py-2 text-xs text-gray-400">
                          {row.email || "sin email"}
                        </td>
                        <td className="w-full px-2 py-2">
                          <div className="flex flex-wrap items-center justify-end gap-1.5">
                            {granted.length === 0 ? (
                              <span className="text-xs text-gray-300">Sin accesos</span>
                            ) : (
                              granted.map((c) => (
                                <span
                                  key={c.id}
                                  className="inline-flex max-w-[180px] items-center gap-1 rounded-full border border-green-500 bg-green-50 py-0.5 pl-2.5 pr-1 text-xs font-medium text-green-700"
                                >
                                  <span className="truncate">{c.label}</span>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setRevokeTarget({ row, resourceId: c.id, label: c.label }) }}
                                    className="shrink-0 rounded-full p-0.5 hover:bg-green-200/60"
                                    title="Revocar acceso"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </span>
                              ))
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); setPaymentTarget(row) }}
                              className={`ml-1 inline-flex shrink-0 items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium shadow-sm transition ${
                                Number(row.total_paid) > 0
                                  ? "border-green-500 bg-green-50 text-green-700 hover:bg-green-100"
                                  : "border-[#5ec0cf]/50 bg-white text-alma-fuerte hover:border-[#5ec0cf] hover:bg-[#5ec0cf]/10"
                              }`}
                              title={Number(row.total_paid) > 0 ? "Registrar otro pago" : "Marcar pago"}
                            >
                              <DollarSign className="h-3 w-3" />
                              {Number(row.total_paid) > 0
                                ? `$${Number(row.total_paid).toLocaleString("es-AR")}`
                                : "Registrar pago"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            </>
          )}

          {/*
            La barra de abajo: aparece sola al tildar la primera persona y se
            va al destildar la ultima. Dice cuantas van —antes no lo decia en
            ningun lado— y tiene el boton que confirma, que es lo que se
            buscaba a tres pantallas de scroll de distancia.
          */}
          <BarraSeleccion
            className="sm:hidden"
            cantidad={selected.size}
            sustantivo="personas"
            onLimpiar={() => setSelected(new Set())}
          >
            <Button
              onClick={() => setWizard({ personIds: [...selected] })}
              className="h-11 gap-1.5 bg-alma-fuerte px-4 text-white hover:bg-alma-oscuro"
            >
              <UserPlus className="h-4 w-4 shrink-0" />
              Habilitar acceso
            </Button>
          </BarraSeleccion>
        </TabsContent>

        <TabsContent value="pagos"><PagosTab /></TabsContent>
        <TabsContent value="auditoria"><AuditoriaTab moduleKey={moduleKey} /></TabsContent>
        <TabsContent value="alertas"><AlertasTab /></TabsContent>
      </Tabs>

      {wizard && (
        <GrantWizard
          moduleKey={moduleKey}
          columns={columns}
          trainings={trainings}
          initialPersonIds={wizard.personIds}
          onClose={() => setWizard(null)}
          onDone={() => { setWizard(null); setSelected(new Set()); loadMatrix() }}
        />
      )}

      {paymentTarget && (
        <PaymentDialog
          person={paymentTarget}
          trainings={trainings}
          grantedTrainingIds={columns.filter((c) => paymentTarget.grants?.[String(c.id)] === true).map((c) => c.id)}
          onClose={() => setPaymentTarget(null)}
          onDone={() => { setPaymentTarget(null); loadMatrix() }}
        />
      )}

      {revokeTarget && (
        <ConfirmationDialog
          open
          onOpenChange={(open) => !open && !revoking && setRevokeTarget(null)}
          title="¿Revocar el acceso?"
          description={`${`${revokeTarget.row.name ?? ""} ${revokeTarget.row.last_name ?? ""}`.trim()} deja de ver «${revokeTarget.label}». Los pagos ya registrados no se tocan y la habilitación queda en la auditoría.`}
          action="delete"
          itemType="general"
          loading={revoking}
          onConfirm={revoke}
        />
      )}
    </div>
  )
}

// ── Pagos ──────────────────────────────────────────────────────────────

/**
 * Los años que se pueden mirar: el actual y los tres anteriores.
 *
 * Se calcula al cargar el módulo y no se toca más. Cuatro alcanzan: la
 * plataforma no tiene pagos más viejos, y si algún día hacen falta, esto es un
 * número.
 */
const ANIOS = Array.from({ length: 4 }, (_, i) => new Date().getFullYear() - i)

function PagosTab() {
  /** Dos miradas del mismo tema: la plata que entró, y quién dijo que pagó.
   *  Van juntas porque confirmar un aviso crea un pago; separarlas en pestañas
   *  del nav habría escondido la relación. */
  const [subVista, setSubVista] = useState<"pagos" | "avisos">("pagos")
  const [payments, setPayments] = useState<PersonPayment[]>([])
  const [summary, setSummary] = useState<{ concept_type: string; label?: string | null; pagos: number; total: number }[]>([])
  const [year, setYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(true)
  const [toDelete, setToDelete] = useState<PersonPayment | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [list, sum] = await Promise.all([
        fetch(`/api/accesos/pagos?year=${year}&concept_type=capacitacion`).then((r) => (r.ok ? r.json() : [])),
        fetch(`/api/accesos/pagos?summary=true&year=${year}&concept_type=capacitacion`).then((r) => (r.ok ? r.json() : [])),
      ])
      setPayments(Array.isArray(list) ? list : [])
      setSummary(Array.isArray(sum) ? sum : [])
    } finally {
      setLoading(false)
    }
  }, [year])

  useEffect(() => { load() }, [load])

  const total = summary.reduce((acc, s) => acc + Number(s.total || 0), 0)

  const remove = async () => {
    if (!toDelete) return
    try {
      const res = await fetch(`/api/accesos/pagos?id=${toDelete.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error((await res.json())?.error)
      toast({ title: "Pago eliminado", description: "Queda registrado en la auditoría." })
      load()
    } catch (error: any) {
      toast({ title: "Error", description: error?.message, variant: "destructive" })
    } finally {
      setToDelete(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Arriba de todo: es trabajo pendiente, no historial. Al confirmar uno
          se recarga la lista de abajo, porque acaba de entrar un pago. */}
      <ColaAvisosPago onResuelto={load} />

      {/* Elegir entre la plata y los avisos. La cola de arriba queda visible en
          las dos: es lo único accionable de la pantalla. */}
      <SegmentadoSimple
        valor={subVista}
        onCambio={setSubVista}
        opciones={[
          { valor: "pagos" as const, etiqueta: "Pagos registrados" },
          { valor: "avisos" as const, etiqueta: "Avisos resueltos" },
        ]}
      />

      {subVista === "avisos" && <HistorialAvisosPago />}

      {subVista === "pagos" && (
      <>
      {/* Pastillas y no un campo numérico: los años son cuatro botones, no un
          número que haya que escribir. Con el input se podía tipear 3026 y
          quedar mirando una pantalla vacía sin entender por qué. */}
      <div className="sin-barra flex items-center gap-1.5 overflow-x-auto pb-0.5 sm:flex-wrap sm:overflow-visible">
        {ANIOS.map((a) => (
          <FilterChip key={a} active={year === a} onClick={() => setYear(a)}>
            {a}
          </FilterChip>
        ))}
      </div>

      <Card>
        <CardContent className="flex items-center gap-3 py-3">
          <TrendingUp className="h-5 w-5 text-green-500" />
          <div>
            <p className="text-xs text-gray-500">Recaudado en {year}</p>
            <p className="text-xl font-bold text-gray-900">${total.toLocaleString("es-AR")}</p>
          </div>
        </CardContent>
      </Card>

      {/* El desglose por capacitación. Con una sola no se muestra: repetiría
          el total de arriba.

          Nunca cae en `concept_type` como antes: acá TODO es una capacitación,
          así que un cartel que decía «capacitacion» no informaba nada — solo
          hacía dudar de si había otra cosa mezclada. */}
      {summary.length > 1 && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {summary.map((s, i) => (
            <Card key={i}>
              <CardContent className="py-3">
                <p className="truncate text-sm font-medium text-gray-800">
                  {s.label || "Capacitación eliminada"}
                </p>
                <p className="text-xs text-gray-500">
                  {s.pagos} {s.pagos === 1 ? "pago" : "pagos"} · ${Number(s.total).toLocaleString("es-AR")}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-[#5ec0cf]" /></div>
      ) : payments.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-gray-500">Sin pagos registrados en {year}.</CardContent></Card>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium text-gray-600">Fecha</th>
                  <th className="px-3 py-2 font-medium text-gray-600">Persona</th>
                  <th className="px-3 py-2 font-medium text-gray-600">Concepto</th>
                  <th className="px-3 py-2 font-medium text-gray-600">Medio</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">Monto</th>
                  <th className="w-10 p-3"></th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="px-3 py-1.5 text-gray-600">
                      {p.paid_at ? new Date(p.paid_at).toLocaleDateString("es-AR") : "—"}
                    </td>
                    <td className="px-3 py-1.5 font-medium text-gray-800">{p.person_name || `#${p.person_id}`}</td>
                    <td className="px-3 py-1.5 text-gray-600">{p.concept_label || p.concept_type}</td>
                    <td className="px-3 py-1.5 text-gray-500">{p.method || "—"}</td>
                    <td className="px-3 py-1.5 text-right font-medium">${Number(p.amount).toLocaleString("es-AR")}</td>
                    <td className="px-3 py-1.5">
                      <Button size="sm" variant="ghost" onClick={() => setToDelete(p)}>
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
      </>
      )}

      {toDelete && (
        <ConfirmationDialog
          open
          onOpenChange={(open) => !open && setToDelete(null)}
          title="¿Eliminar el pago?"
          description={`Se elimina el pago de $${Number(toDelete.amount).toLocaleString("es-AR")}. Usalo solo para corregir una carga equivocada: queda registrado en la auditoría.`}
          action="delete"
          itemType="pago"
          onConfirm={remove}
        />
      )}
    </div>
  )
}

// ── Auditoría ──────────────────────────────────────────────────────────

const ACTION_LABELS: Record<string, string> = {
  grant: "Habilitó",
  revoke: "Revocó",
  extend: "Extendió",
  payment: "Registró un pago",
  payment_deleted: "Eliminó un pago",
}

/** Movimientos por tanda. */
const TANDA_AUDITORIA = 50

/**
 * El registro de movimientos, de a tandas.
 *
 * Antes pedía 150 de una y ahí terminaba: la tabla es append-only y no para
 * de crecer, así que el movimiento 151 no se podía ver desde la aplicación
 * —y, peor, la pantalla no daba ninguna señal de que existiera—. Justo la
 * tabla que se mira el día que hay que reconstruir qué pasó.
 */
function AuditoriaTab({ moduleKey }: { moduleKey: string }) {
  const [entries, setEntries] = useState<AccessAuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [cargandoMas, setCargandoMas] = useState(false)
  const [hayMas, setHayMas] = useState(false)

  const traer = async (desde: number): Promise<AccessAuditEntry[]> => {
    try {
      const r = await fetch(`/api/accesos/auditoria?limit=${TANDA_AUDITORIA}&offset=${desde}`)
      const data = r.ok ? await r.json() : []
      const tanda: AccessAuditEntry[] = Array.isArray(data) ? data : []
      // Una tanda corta es el final seguro. Una completa puede o no tener
      // continuación: averiguarlo costaría una consulta extra por página, y
      // equivocarse cuesta un "Cargar más" que no trae nada.
      setHayMas(tanda.length === TANDA_AUDITORIA)
      return tanda
    } catch {
      setHayMas(false)
      return []
    }
  }

  useEffect(() => {
    let vigente = true
    setLoading(true)
    traer(0)
      .then((tanda) => { if (vigente) setEntries(tanda) })
      .finally(() => { if (vigente) setLoading(false) })
    // Cambiar de módulo con una pestaña a medio cargar dejaba entrar la
    // respuesta vieja encima de la nueva.
    return () => { vigente = false }
  }, [moduleKey])

  const cargarMas = async () => {
    setCargandoMas(true)
    try {
      const tanda = await traer(entries.length)
      // Sin el filtro por id, un movimiento registrado entre dos tandas
      // corre la lista un lugar y el último de la anterior vuelve a salir
      // —repetido en pantalla y con la clave duplicada en React—.
      setEntries((previas) => {
        const vistos = new Set(previas.map((e) => e.id))
        return [...previas, ...tanda.filter((e) => !vistos.has(e.id))]
      })
    } finally {
      setCargandoMas(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-[#5ec0cf]" /></div>
  }

  if (entries.length === 0) {
    return <Card><CardContent className="py-10 text-center text-gray-500">Sin movimientos registrados.</CardContent></Card>
  }

  return (
    <div className="space-y-3">
    <Card>
      <CardContent className="divide-y p-0">
        {entries.map((e) => (
          <div key={e.id} className="flex items-start gap-3 p-3 text-sm">
            <History className="mt-0.5 h-4 w-4 shrink-0 text-gray-300" />
            <div className="min-w-0 flex-1">
              <p className="text-gray-800">
                <span className="font-medium">{e.actor_name || "Sistema"}</span>{" "}
                {ACTION_LABELS[e.action] ?? e.action} · {e.person_name || `persona #${e.person_id}`}
                {e.resource_id > 0 && ` · ${e.resource_label || `recurso #${e.resource_id}`}`}
              </p>
              {e.detail && (
                <p className="truncate text-xs text-gray-400">
                  {e.detail.amount ? `$${Number(e.detail.amount).toLocaleString("es-AR")} ` : ""}
                  {e.detail.expires_at ? `vence ${new Date(e.detail.expires_at).toLocaleDateString("es-AR")}` : ""}
                  {e.detail.notes ? ` — ${e.detail.notes}` : ""}
                </p>
              )}
            </div>
            <span className="shrink-0 text-xs text-gray-400">
              {e.created_at ? new Date(e.created_at).toLocaleString("es-AR") : ""}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>

    {hayMas && (
      <Button
        variant="outline"
        onClick={cargarMas}
        disabled={cargandoMas}
        className="h-11 w-full"
      >
        {cargandoMas ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Cargar más
      </Button>
    )}

    <p className="text-center text-xs text-gray-400">
      {entries.length} {entries.length === 1 ? "movimiento" : "movimientos"}
      {hayMas ? " en pantalla" : ""}
    </p>
    </div>
  )
}

// ── Alertas de cuentas compartidas ─────────────────────────────────────

function AlertasTab() {
  const [alerts, setAlerts] = useState<SharedAccountAlert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/capacitaciones/alertas?days=7&min_ips=4")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setAlerts(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-3">
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="flex items-start gap-3 py-4 text-sm">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <div className="text-amber-900">
            <p className="font-medium">Posibles cuentas compartidas</p>
            <p className="mt-1 text-xs">
              Reproducciones desde varias IPs distintas en los últimos 7 días. Es un
              indicio a revisar —las conexiones móviles cambian de IP con frecuencia— y
              no revoca ningún acceso.
            </p>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-[#5ec0cf]" /></div>
      ) : alerts.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-gray-500">Sin alertas en los últimos 7 días.</CardContent></Card>
      ) : (
        <Card>
          <CardContent className="divide-y p-0">
            {alerts.map((a) => (
              <div key={a.person_id} className="flex items-center justify-between gap-3 p-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-gray-800">{a.person_name || `Persona #${a.person_id}`}</p>
                  <p className="truncate text-xs text-gray-400">{a.person_email}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Badge variant="secondary">{a.views} reproducciones</Badge>
                  <Badge className="bg-amber-500">{a.distinct_ips} IPs</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
