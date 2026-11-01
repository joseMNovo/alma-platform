"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import FilterChip from "@/components/ui/filter-chip"
import { HojaFiltros, ChipsActivos } from "@/components/ui/filtros-mobile"
import Ayuda from "@/components/ui/ayuda"
import { toast } from "@/hooks/use-toast"
import type { ParticipanteGestion } from "@/lib/data-manager"
import {
  UserCircle, Search, Loader2, KeyRound, MailCheck, MailWarning,
  GraduationCap, ClipboardList, Send,
} from "lucide-react"

/**
 * Pestaña "Participantes" — la gemela de Voluntarios dentro del grupo Personas.
 *
 * Muestra SOLO las personas que se registraron como participante (tienen login),
 * no todo el directorio (eso es Base de datos). Foco en lo propio del rol:
 * verificación del email, fecha de registro, inscripciones y acceso a
 * capacitaciones. Acciones: fijar PIN (admin) y reenviar la verificación.
 */
export default function ParticipantesManager({ user }: { user: any }) {
  const [rows, setRows] = useState<ParticipanteGestion[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [pinTarget, setPinTarget] = useState<ParticipanteGestion | null>(null)
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [enrolledOnly, setEnrolledOnly] = useState(false)
  const [trainingOnly, setTrainingOnly] = useState(false)

  const isAdmin = user.role === "admin"

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/participantes/gestion")
      if (!res.ok) throw new Error("No se pudo cargar")
      setRows(await res.json())
    } catch {
      toast({ title: "Error", description: "No se pudieron cargar los participantes", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows
      .filter((r) => !q || `${r.name ?? ""} ${r.last_name ?? ""} ${r.email ?? ""}`.toLowerCase().includes(q))
      .filter((r) => !verifiedOnly || r.email_verified)
      .filter((r) => !enrolledOnly || r.enrollments_count > 0)
      .filter((r) => !trainingOnly || r.has_training_access)
      .sort((a, b) =>
        `${a.name ?? ""} ${a.last_name ?? ""}`.trim().toLowerCase().localeCompare(
          `${b.name ?? ""} ${b.last_name ?? ""}`.trim().toLowerCase(),
        ),
      )
  }, [rows, search, verifiedOnly, enrolledOnly, trainingOnly])

  const hayFiltros = !!search.trim() || verifiedOnly || enrolledOnly || trainingOnly
  const clearFilters = () => {
    setSearch("")
    setVerifiedOnly(false)
    setEnrolledOnly(false)
    setTrainingOnly(false)
  }

  const resend = async (r: ParticipanteGestion) => {
    if (!r.email) return
    try {
      const res = await fetch("/api/registro", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: r.email }),
      })
      if (!res.ok) throw new Error()
      toast({ title: "Verificación reenviada", description: `Se le mandó el link a ${r.email}.` })
    } catch {
      toast({ title: "Error", description: "No se pudo reenviar el email", variant: "destructive" })
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Oculto en el teléfono: el encabezado de sección, arriba, ya dice
            "Participantes". Al irse, el buscador se queda con toda la fila. */}
        <div className="hidden sm:flex items-center gap-2">
          <UserCircle className="h-6 w-6 text-[#5ec0cf]" />
          <h2 className="text-xl font-bold text-gray-900">Participantes</h2>
        </div>
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input className="h-11 pl-9 sm:h-10" placeholder="Buscar participante…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <HojaFiltros
          className="sm:hidden"
          cantidad={[verifiedOnly, enrolledOnly, trainingOnly].filter(Boolean).length}
          resultados={filtered.length}
          onLimpiar={() => { setVerifiedOnly(false); setEnrolledOnly(false); setTrainingOnly(false) }}
          sustantivo="participantes"
        >
          <div className="flex flex-wrap gap-2">
            <FilterChip active={verifiedOnly} onClick={() => setVerifiedOnly((v) => !v)}>Verificado</FilterChip>
            <FilterChip active={enrolledOnly} onClick={() => setEnrolledOnly((v) => !v)}>Con inscripción</FilterChip>
            <FilterChip active={trainingOnly} onClick={() => setTrainingOnly((v) => !v)}>Capacitación</FilterChip>
          </div>
        </HojaFiltros>
      </div>

      {/* Teléfono: el conteo y los filtros puestos, en una línea. */}
      <ChipsActivos
        className="sm:hidden"
        total={filtered.length}
        sustantivo="participantes"
        filtros={[
          ...(verifiedOnly ? [{ id: "ver", texto: "Verificado", quitar: () => setVerifiedOnly(false) }] : []),
          ...(enrolledOnly ? [{ id: "ins", texto: "Con inscripción", quitar: () => setEnrolledOnly(false) }] : []),
          ...(trainingOnly ? [{ id: "cap", texto: "Capacitación", quitar: () => setTrainingOnly(false) }] : []),
        ]}
      />

      {/* Escritorio: las tres pastillas a la vista, que hay lugar. */}
      <div className="hidden flex-wrap items-center gap-1.5 sm:flex">
        <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-600">
          {filtered.length} {filtered.length === 1 ? "participante" : "participantes"}
          {hayFiltros && <span className="text-xs font-normal text-gray-400">de {rows.length}</span>}
        </span>
        <FilterChip active={verifiedOnly} onClick={() => setVerifiedOnly((v) => !v)}>
          Verificado
        </FilterChip>
        <FilterChip active={enrolledOnly} onClick={() => setEnrolledOnly((v) => !v)}>
          Con inscripción
        </FilterChip>
        <FilterChip active={trainingOnly} onClick={() => setTrainingOnly((v) => !v)}>
          Capacitación
        </FilterChip>
        {hayFiltros && (
          <button onClick={clearFilters} className="text-xs text-gray-400 underline hover:text-gray-600">
            Limpiar
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-[#5ec0cf]" /></div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-14 text-center text-gray-500">
            <UserCircle className="h-10 w-10 text-gray-300" />
            <p className="font-medium">{rows.length === 0 ? "Todavía no hay participantes registrados" : "Sin resultados"}</p>
            {rows.length === 0 && <p className="text-sm">Aparecen acá cuando alguien se registra desde la plataforma.</p>}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile: tarjetas. La tabla no entra cómoda en un teléfono. */}
          <div className="space-y-2 md:hidden">
            {filtered.map((r) => (
              <Card key={r.person_id}>
                <CardContent className="space-y-2 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-gray-800">
                        {`${r.name ?? ""} ${r.last_name ?? ""}`.trim() || "Sin nombre"}
                      </p>
                      <p className="truncate text-xs text-gray-400">{r.email}</p>
                    </div>
                    <VerifiedBadge verified={r.email_verified} />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <MetaChip icon={ClipboardList} label={`${r.enrollments_count} inscrip.`} />
                    {r.has_training_access && <MetaChip icon={GraduationCap} label="Capacitación" highlight />}
                    <MetaChip label={fmtDate(r.created_at)} />
                  </div>
                  <div className="flex gap-2 pt-1">
                    {!r.email_verified && (
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => resend(r)}>
                        <Send className="mr-1 h-3.5 w-3.5" /> Reenviar
                      </Button>
                    )}
                    {isAdmin && (
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => setPinTarget(r)}>
                        <KeyRound className="mr-1 h-3.5 w-3.5" /> PIN
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop: tabla */}
          <Card className="hidden md:block">
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead className="border-b bg-gray-50 text-left">
                  <tr>
                    <th className="px-3 py-2 font-medium text-gray-600">Participante</th>
                    <th className="px-3 py-2 font-medium text-gray-600">Email</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-600">Verificado</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-600">Inscrip.</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-600">Capacitación</th>
                    <th className="px-3 py-2 font-medium text-gray-600">Registro</th>
                    <th className="px-3 py-1.5 text-right font-medium text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.person_id} className="border-b border-gray-100 last:border-0 even:bg-gray-50/50 hover:bg-[#5ec0cf]/5 transition-colors">
                      <td className="px-3 py-1.5 font-medium text-gray-800">
                        {`${r.name ?? ""} ${r.last_name ?? ""}`.trim() || "Sin nombre"}
                      </td>
                      <td className="px-3 py-1.5 text-gray-500">{r.email}</td>
                      <td className="px-3 py-1.5 text-center"><VerifiedBadge verified={r.email_verified} /></td>
                      <td className="px-3 py-1.5 text-center text-gray-600">{r.enrollments_count || "—"}</td>
                      <td className="px-3 py-1.5 text-center">
                        {r.has_training_access
                          ? <GraduationCap className="mx-auto h-4 w-4 text-[#5ec0cf]" aria-label="Con capacitación" />
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-1.5 text-gray-500">{fmtDate(r.created_at)}</td>
                      <td className="px-3 py-1.5">
                        <div className="flex justify-end gap-1">
                          {!r.email_verified && (
                            <Button size="sm" variant="ghost" onClick={() => resend(r)} title="Reenviar verificación">
                              <Send className="h-4 w-4" />
                            </Button>
                          )}
                          {isAdmin && (
                            <Button size="sm" variant="ghost" onClick={() => setPinTarget(r)} title="Fijar PIN">
                              <KeyRound className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}

      {pinTarget && (
        <PinDialog participante={pinTarget} onClose={() => setPinTarget(null)} />
      )}
    </div>
  )
}

// ── Sub-componentes ─────────────────────────────────────────────────────

function VerifiedBadge({ verified }: { verified: boolean }) {
  return verified ? (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
      <MailCheck className="h-3 w-3" /> Verificado
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
      <MailWarning className="h-3 w-3" /> Pendiente
    </span>
  )
}

function MetaChip({ icon: Icon, label, highlight }: { icon?: any; label: string; highlight?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${
      highlight ? "border-[#5ec0cf]/40 bg-[#5ec0cf]/10 text-alma-fuerte" : "border-gray-200 text-gray-500"
    }`}>
      {Icon && <Icon className="h-3 w-3" />}
      {label}
    </span>
  )
}

function PinDialog({ participante, onClose }: { participante: ParticipanteGestion; onClose: () => void }) {
  const [pin, setPin] = useState("")
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!/^\d{4}$/.test(pin)) {
      toast({ title: "PIN inválido", description: "Tienen que ser 4 dígitos.", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/participantes/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: participante.participant_id, pin }),
      })
      if (!res.ok) throw new Error((await res.json())?.error)
      toast({ title: "PIN actualizado", description: `${participante.name ?? "El participante"} ya puede ingresar con el PIN nuevo.` })
      onClose()
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "No se pudo fijar el PIN", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-[#5ec0cf]" /> Fijar PIN
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-lg bg-gray-50 p-3 text-sm">
            <p className="font-medium text-gray-800">
              {`${participante.name ?? ""} ${participante.last_name ?? ""}`.trim() || "Participante"}
            </p>
            <p className="text-gray-500">{participante.email}</p>
          </div>
          <div>
            <Label>
              PIN nuevo (4 dígitos)
              <Ayuda lado="abajo">
                Decíselo por un canal seguro. La persona puede cambiarlo después desde
                su cuenta.
              </Ayuda>
            </Label>
            <Input
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="••••"
              className="text-center text-lg tracking-widest"
            />
          </div>
        </div>
        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving} className="bg-alma-fuerte hover:bg-alma-oscuro">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function fmtDate(d: string | null): string {
  if (!d) return "—"
  try {
    return new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" })
  } catch {
    return "—"
  }
}
