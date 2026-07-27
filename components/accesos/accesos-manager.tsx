"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ConfirmationDialog from "@/components/ui/confirmation-dialog"
import GrantDialog, { type GrantTarget } from "@/components/accesos/grant-dialog"
import { toast } from "@/hooks/use-toast"
import { GRANTABLE_MODULES } from "@/lib/modules"
import type { AccessMatrixRow, Training, PersonPayment, AccessAuditEntry, SharedAccountAlert } from "@/lib/data-manager"
import {
  KeyRound, Search, Loader2, UserCheck, UserX, Check, X, DollarSign,
  History, AlertTriangle, TrendingUp, Trash2, HeartHandshake,
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
  const [grantTarget, setGrantTarget] = useState<GrantTarget | null>(null)
  const [revokeTarget, setRevokeTarget] = useState<{ row: AccessMatrixRow; resourceId: number; label: string } | null>(null)

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

  const openGrant = (row: AccessMatrixRow, resourceId: number, label: string) => {
    const training = trainings.find((t) => t.id === resourceId)
    setGrantTarget({
      personIds: [row.person_id],
      personLabel: `${row.name ?? ""} ${row.last_name ?? ""}`.trim() || row.email || `Persona #${row.person_id}`,
      moduleKey,
      resourceId,
      resourceLabel: label,
      suggestedDays: training?.default_access_days ?? null,
      suggestedAmount: training ? Number(training.price) || null : null,
    })
  }

  const openBulkGrant = (resourceId: number, label: string) => {
    if (selected.size === 0) {
      toast({ title: "Seleccioná al menos una persona", variant: "destructive" })
      return
    }
    const training = trainings.find((t) => t.id === resourceId)
    setGrantTarget({
      personIds: [...selected],
      personLabel: `${selected.size} personas seleccionadas`,
      moduleKey,
      resourceId,
      resourceLabel: label,
      suggestedDays: training?.default_access_days ?? null,
    })
  }

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
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Quién puede ver cada capacitación paga, y el registro de pagos.
        </p>
      </div>

      <Tabs defaultValue="matriz" className="space-y-4">
        <TabsList className="bg-white">
          <TabsTrigger value="matriz">Habilitaciones</TabsTrigger>
          <TabsTrigger value="pagos">Pagos</TabsTrigger>
          <TabsTrigger value="auditoria">Auditoría</TabsTrigger>
          <TabsTrigger value="alertas">Alertas</TabsTrigger>
        </TabsList>

        {/* ── Matriz ────────────────────────────────────────────────── */}
        <TabsContent value="matriz" className="space-y-4">
          <div className="rounded-lg border border-[#4dd0e1]/30 bg-[#e0f7fa]/40 p-3 text-sm text-gray-600">
            Cada fila es una persona; cada columna, una capacitación.{" "}
            <strong className="text-gray-800">Tocá un casillero para darle acceso</strong> (y, si querés,
            registrar el pago). Verde = tiene acceso — tocalo de nuevo para quitárselo. La última columna
            muestra cuánto pagó esa persona en total.
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Desplegable solo si hubiera más de un módulo habilitable. Hoy la
                única cosa que se habilita por persona es Capacitaciones. */}
            {GRANTABLE_MODULES.length > 1 && (
              <select
                className="h-10 rounded-md border border-gray-200 px-3 text-sm"
                value={moduleKey}
                onChange={(e) => { setModuleKey(e.target.value); setSelected(new Set()) }}
              >
                {GRANTABLE_MODULES.map((m) => (
                  <option key={m.key} value={m.key}>{m.label}</option>
                ))}
              </select>
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
              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                <Badge variant="secondary">{selected.size} seleccionadas</Badge>
                {columns.map((c) => (
                  <Button key={c.id} size="sm" variant="outline" onClick={() => openBulkGrant(c.id, c.label)}>
                    Habilitar «{c.label}»
                  </Button>
                ))}
                <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#4dd0e1]" />
            </div>
          ) : rows.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                No se encontraron personas.
              </CardContent>
            </Card>
          ) : (
            <>
            {/* Mobile: una tarjeta por persona. Una tabla de N columnas es
                inusable en un teléfono, y este módulo se usa desde el celular. */}
            <div className="space-y-2 md:hidden">
              {rows.map((row) => (
                <Card key={row.person_id}>
                  <CardContent className="space-y-3 py-3">
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={selected.has(row.person_id)}
                        onChange={() => toggleSelect(row.person_id)}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium text-gray-800">
                            {`${row.name ?? ""} ${row.last_name ?? ""}`.trim() || "Sin nombre"}
                          </span>
                          {row.has_login ? (
                            <UserCheck className="h-3.5 w-3.5 shrink-0 text-green-500" />
                          ) : (
                            <UserX className="h-3.5 w-3.5 shrink-0 text-gray-300" />
                          )}
                          {row.is_volunteer && <HeartHandshake className="h-3.5 w-3.5 shrink-0 text-[#4dd0e1]" />}
                        </div>
                        <p className="truncate text-xs text-gray-400">{row.email || "sin email"}</p>
                      </div>
                      {Number(row.total_paid) > 0 && (
                        <Badge variant="secondary" className="shrink-0">
                          ${Number(row.total_paid).toLocaleString("es-AR")}
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {columns.map((c) => {
                        const live = row.grants?.[String(c.id)] === true
                        return (
                          <button
                            key={c.id}
                            onClick={() =>
                              live
                                ? setRevokeTarget({ row, resourceId: c.id, label: c.label })
                                : openGrant(row, c.id, c.label)
                            }
                            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition ${
                              live
                                ? "border-green-500 bg-green-50 text-green-700"
                                : "border-gray-300 text-gray-500"
                            }`}
                          >
                            {live ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                            <span className="max-w-[140px] truncate">{c.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="hidden md:block">
              <CardContent className="overflow-x-auto p-0">
                <table className="w-full text-sm">
                  <thead className="border-b bg-gray-50 text-left">
                    <tr>
                      <th className="w-8 px-3 py-1.5"></th>
                      <th className="px-3 py-2 font-medium text-gray-600">Persona</th>
                      {columns.map((c) => (
                        <th key={c.id} className="px-3 py-2 text-center font-medium text-gray-600">
                          <span className="block max-w-[140px] truncate" title={c.label}>{c.label}</span>
                        </th>
                      ))}
                      <th className="px-3 py-2 text-right font-medium text-gray-600">Total pagado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.person_id} className="border-b border-gray-100 last:border-0 even:bg-gray-50/50 hover:bg-[#4dd0e1]/5 transition-colors">
                        <td className="px-3 py-1.5">
                          <input
                            type="checkbox"
                            checked={selected.has(row.person_id)}
                            onChange={() => toggleSelect(row.person_id)}
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-800">
                              {`${row.name ?? ""} ${row.last_name ?? ""}`.trim() || "Sin nombre"}
                            </span>
                            {row.has_login ? (
                              <UserCheck className="h-3.5 w-3.5 text-green-500" aria-label="Con usuario" />
                            ) : (
                              <UserX className="h-3.5 w-3.5 text-gray-300" aria-label="Sin usuario" />
                            )}
                            {row.is_volunteer && <HeartHandshake className="h-3.5 w-3.5 text-[#4dd0e1]" />}
                          </div>
                          <span className="text-xs text-gray-400">{row.email || "sin email"}</span>
                        </td>

                        {columns.map((c) => {
                          const live = row.grants?.[String(c.id)] === true
                          return (
                            <td key={c.id} className="px-3 py-1.5 text-center">
                              <button
                                onClick={() =>
                                  live
                                    ? setRevokeTarget({ row, resourceId: c.id, label: c.label })
                                    : openGrant(row, c.id, c.label)
                                }
                                className={`inline-flex h-6 w-6 items-center justify-center rounded border transition ${
                                  live
                                    ? "border-green-500 bg-green-500 text-white hover:bg-green-600"
                                    : "border-gray-300 text-transparent hover:border-[#4dd0e1] hover:bg-[#4dd0e1]/10"
                                }`}
                                title={live ? "Revocar acceso" : "Habilitar acceso"}
                              >
                                <Check className="h-4 w-4" />
                              </button>
                            </td>
                          )
                        })}

                        <td className="px-3 py-1.5 text-right text-gray-600">
                          {Number(row.total_paid) > 0
                            ? `$${Number(row.total_paid).toLocaleString("es-AR")}`
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
            </>
          )}

          <p className="text-xs text-gray-400">
            Habilitar cualquier capacitación ya le muestra la pestaña a la persona. Revocar
            no borra los pagos registrados.
          </p>
        </TabsContent>

        <TabsContent value="pagos"><PagosTab /></TabsContent>
        <TabsContent value="auditoria"><AuditoriaTab moduleKey={moduleKey} /></TabsContent>
        <TabsContent value="alertas"><AlertasTab /></TabsContent>
      </Tabs>

      {grantTarget && (
        <GrantDialog
          target={grantTarget}
          onClose={() => setGrantTarget(null)}
          onDone={() => { setGrantTarget(null); setSelected(new Set()); loadMatrix() }}
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
                {ACTION_LABELS[e.action] ?? e.action} · persona #{e.person_id}
                {e.resource_id > 0 && ` · recurso #${e.resource_id}`}
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
