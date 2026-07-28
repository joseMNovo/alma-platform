"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
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
export default function AccesosManager({ user }: { user: any }) {
  const [moduleKey, setModuleKey] = useState("capacitaciones")
  const [rows, setRows] = useState<AccessMatrixRow[]>([])
  const [trainings, setTrainings] = useState<Training[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [wizard, setWizard] = useState<{ personIds: number[] } | null>(null)
  const [paymentTarget, setPaymentTarget] = useState<AccessMatrixRow | null>(null)
  const [revokeTarget, setRevokeTarget] = useState<{ row: AccessMatrixRow; resourceId: number; label: string } | null>(null)

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
    "flex items-center gap-2 transition-all duration-200 active:scale-95 data-[state=inactive]:hover:bg-[#4dd0e1]/10 data-[state=inactive]:hover:text-[#00838f] data-[state=active]:bg-[#4dd0e1] data-[state=active]:text-white"

  const toggleSelect = (personId: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(personId) ? next.delete(personId) : next.add(personId)
      return next
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <KeyRound className="h-6 w-6 text-[#4dd0e1]" />
          <h2 className="text-xl font-bold text-gray-900">Accesos</h2>
          <Badge variant="secondary">{rows.length}</Badge>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Quién puede ver cada capacitación paga, y el registro de pagos.
        </p>
      </div>

      <Tabs defaultValue="matriz" className="space-y-4">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-white border border-gray-200 p-1 rounded-lg sm:w-auto">
          <TabsTrigger value="matriz" className={subTabTriggerClass}>Habilitaciones</TabsTrigger>
          <TabsTrigger value="pagos" className={subTabTriggerClass}>Pagos</TabsTrigger>
          <TabsTrigger value="auditoria" className={subTabTriggerClass}>Auditoría</TabsTrigger>
          <TabsTrigger value="alertas" className={subTabTriggerClass}>Alertas</TabsTrigger>
        </TabsList>

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
                className="pl-9"
                placeholder="Buscar por nombre, apellido o email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {selected.size > 0 && (
              <Badge variant="secondary" className="shrink-0">{selected.size} seleccionadas</Badge>
            )}
            <Button
              size="sm"
              disabled={selected.size === 0}
              onClick={() => setWizard({ personIds: [...selected] })}
              className={`shrink-0 ${selected.size > 0 ? "bg-[#4dd0e1] hover:bg-[#3bb8c9]" : ""}`}
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

          {/* Filtros rápidos. El de capacitación es un <select>, no un chip
              por curso: con 50 capacitaciones un chip por cada una se vuelve
              inmanejable, un desplegable no. */}
          <div className="flex flex-wrap items-center gap-1.5">
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
                className={`h-7 w-auto gap-1 rounded-full border px-2.5 text-xs font-medium [&>svg]:h-3 [&>svg]:w-3 ${
                  trainingFilterId != null ? "border-[#4dd0e1] bg-[#4dd0e1]/10 text-[#00838f]" : "border-gray-300 text-gray-500"
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
              <Loader2 className="h-8 w-8 animate-spin text-[#4dd0e1]" />
            </div>
          ) : visibleRows.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                No se encontraron personas.
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-100">
                  {visibleRows.map((row) => {
                    const granted = columns.filter((c) => row.grants?.[String(c.id)] === true)
                    return (
                      <tr
                        key={row.person_id}
                        onClick={() => toggleSelect(row.person_id)}
                        className="cursor-pointer transition-colors hover:bg-[#4dd0e1]/5"
                      >
                        <td className="py-2 pl-3 pr-1" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            className="border-gray-300 data-[state=checked]:border-[#4dd0e1] data-[state=checked]:bg-[#4dd0e1]"
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
                              className={`ml-1 inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition ${
                                Number(row.total_paid) > 0
                                  ? "border-green-500 bg-green-50 text-green-700 hover:bg-green-100"
                                  : "border-gray-300 text-gray-400 hover:border-[#4dd0e1] hover:text-[#00838f]"
                              }`}
                              title={Number(row.total_paid) > 0 ? "Registrar otro pago" : "Marcar pago"}
                            >
                              <DollarSign className="h-3 w-3" />
                              {Number(row.total_paid) > 0 ? `$${Number(row.total_paid).toLocaleString("es-AR")}` : "Sin pago"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
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
          onOpenChange={(open) => !open && setRevokeTarget(null)}
          title="¿Revocar el acceso?"
          description={`${`${revokeTarget.row.name ?? ""} ${revokeTarget.row.last_name ?? ""}`.trim()} deja de ver «${revokeTarget.label}». Los pagos ya registrados no se tocan y la habilitación queda en la auditoría.`}
          action="delete"
          itemType="general"
          onConfirm={revoke}
        />
      )}
    </div>
  )
}

// ── Pagos ──────────────────────────────────────────────────────────────

function PagosTab() {
  const [payments, setPayments] = useState<PersonPayment[]>([])
  const [summary, setSummary] = useState<{ concept_type: string; label?: string | null; pagos: number; total: number }[]>([])
  const [year, setYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(true)
  const [toDelete, setToDelete] = useState<PersonPayment | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [list, sum] = await Promise.all([
        fetch(`/api/accesos/pagos?year=${year}`).then((r) => (r.ok ? r.json() : [])),
        fetch(`/api/accesos/pagos?summary=true&year=${year}`).then((r) => (r.ok ? r.json() : [])),
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
      <div className="flex flex-wrap items-center gap-3">
        <Input
          type="number"
          className="w-28"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
        />
        <Card className="flex-1">
          <CardContent className="flex items-center gap-3 py-3">
            <TrendingUp className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-xs text-gray-500">Recaudado en {year}</p>
              <p className="text-xl font-bold text-gray-900">${total.toLocaleString("es-AR")}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {summary.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {summary.map((s, i) => (
            <Card key={i}>
              <CardContent className="py-3">
                <p className="truncate text-sm font-medium text-gray-800">
                  {s.label || s.concept_type}
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
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-[#4dd0e1]" /></div>
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

function AuditoriaTab({ moduleKey }: { moduleKey: string }) {
  const [entries, setEntries] = useState<AccessAuditEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/accesos/auditoria?limit=150`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setEntries(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))
  }, [moduleKey])

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-[#4dd0e1]" /></div>
  }

  if (entries.length === 0) {
    return <Card><CardContent className="py-10 text-center text-gray-500">Todavía no hay movimientos.</CardContent></Card>
  }

  return (
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
              Personas que reprodujeron contenido desde muchas IPs distintas en la última
              semana. Es <strong>solo una señal para mirar</strong>: las conexiones móviles
              cambian de IP todo el tiempo, así que alguien honesto puede aparecer acá.
              Nunca se revoca nada automáticamente.
            </p>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-[#4dd0e1]" /></div>
      ) : alerts.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-gray-500">Nada raro en los últimos 7 días.</CardContent></Card>
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
