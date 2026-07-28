"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"
import { Loader2, Search, ChevronLeft, ChevronRight, GraduationCap, Users, CheckCircle2 } from "lucide-react"
import type { AccessMatrixRow, Training } from "@/lib/data-manager"

export interface WizardColumn {
  id: number
  label: string
}

const STEP_META = [
  { key: "trainings", label: "Capacitaciones", Icon: GraduationCap },
  { key: "people", label: "Personas", Icon: Users },
  { key: "confirm", label: "Confirmar", Icon: CheckCircle2 },
] as const

/**
 * Habilitar acceso — wizard de 3 pasos (o 2, si el módulo no tiene más de un
 * recurso habilitable). Reemplaza al viejo click-en-celda de la matriz: con
 * pocas capacitaciones daba igual, pero con muchas ("¿y si tengo 50?") una
 * grilla de columnas deja de ser usable. Acá se elige primero QUÉ, después
 * QUIÉN, y se confirma todo junto.
 */
export default function GrantWizard({
  moduleKey,
  columns,
  trainings,
  initialPersonIds,
  onClose,
  onDone,
}: {
  moduleKey: string
  columns: WizardColumn[]
  trainings: Training[]
  initialPersonIds?: number[]
  onClose: () => void
  onDone: () => void
}) {
  // Si el módulo solo tiene un recurso habilitable (no es "capacitaciones"),
  // no tiene sentido un paso para elegir entre una sola opción: se
  // preselecciona y se arranca directo en personas.
  const skipTrainingStep = columns.length <= 1
  const [step, setStep] = useState<1 | 2 | 3>(skipTrainingStep ? 2 : 1)

  const [trainingIds, setTrainingIds] = useState<Set<number>>(
    new Set(skipTrainingStep ? columns.map((c) => c.id) : []),
  )
  const [trainingSearch, setTrainingSearch] = useState("")

  const [personIds, setPersonIds] = useState<Set<number>>(new Set(initialPersonIds ?? []))
  const [personSearch, setPersonSearch] = useState("")
  const [people, setPeople] = useState<AccessMatrixRow[]>([])
  const [loadingPeople, setLoadingPeople] = useState(false)

  const [expiryMode, setExpiryMode] = useState<"never" | "days" | "date">("never")
  const [days, setDays] = useState(365)
  const [date, setDate] = useState("")
  const [notes, setNotes] = useState("")
  const [withPayment, setWithPayment] = useState(false)
  const [amount, setAmount] = useState("")
  const [method, setMethod] = useState("transferencia")
  const [reference, setReference] = useState("")
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10))
  const [saving, setSaving] = useState(false)

  // Personas: se busca en vivo contra el mismo endpoint de la matriz.
  useEffect(() => {
    if (step !== 2) return
    setLoadingPeople(true)
    const timer = setTimeout(() => {
      const q = new URLSearchParams({ module_key: moduleKey })
      if (personSearch.trim()) q.set("search", personSearch.trim())
      fetch(`/api/accesos?${q.toString()}`)
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => {
          const list: AccessMatrixRow[] = Array.isArray(data) ? data : []
          list.sort((a, b) =>
            `${a.name ?? ""} ${a.last_name ?? ""}`.trim().toLowerCase().localeCompare(
              `${b.name ?? ""} ${b.last_name ?? ""}`.trim().toLowerCase(),
            ),
          )
          setPeople(list)
        })
        .catch(() => setPeople([]))
        .finally(() => setLoadingPeople(false))
    }, personSearch ? 300 : 0)
    return () => clearTimeout(timer)
  }, [step, personSearch, moduleKey])

  // Si vino gente preseleccionada pero todavía no está en `people` (recién
  // fetcheado), igual cuenta para el resumen: guardamos su cantidad aparte.
  const filteredTrainings = useMemo(() => {
    const q = trainingSearch.trim().toLowerCase()
    if (!q) return columns
    return columns.filter((c) => c.label.toLowerCase().includes(q))
  }, [columns, trainingSearch])

  const selectedTrainings = columns.filter((c) => trainingIds.has(c.id))
  const selectedPeopleFromList = people.filter((p) => personIds.has(p.person_id))
  // Muestra a los preseleccionados aunque la búsqueda actual no los traiga.
  const selectedPeopleLabels = personIds.size > 0
    ? [...personIds].map((id) => {
        const found = people.find((p) => p.person_id === id)
        if (found) return `${found.name ?? ""} ${found.last_name ?? ""}`.trim() || found.email || `#${id}`
        return `#${id}`
      })
    : []

  const toggleTraining = (id: number) => {
    setTrainingIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  const togglePerson = (id: number) => {
    setPersonIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const isSingleCombo = trainingIds.size === 1 && personIds.size === 1
  const singleTraining = isSingleCombo ? trainings.find((t) => t.id === [...trainingIds][0]) : null

  const goNext = () => {
    if (step === 1 && trainingIds.size === 0) {
      toast({ title: "Elegí al menos una capacitación", variant: "destructive" })
      return
    }
    if (step === 2 && personIds.size === 0) {
      toast({ title: "Elegí al menos una persona", variant: "destructive" })
      return
    }
    setStep((s) => (s === 1 ? 2 : 3) as 1 | 2 | 3)
  }
  const goBack = () => {
    if (step === 2 && skipTrainingStep) return onClose()
    setStep((s) => (s === 3 ? 2 : 1) as 1 | 2 | 3)
  }

  const submit = async () => {
    if (withPayment && !(Number(amount) > 0)) {
      toast({ title: "El monto debe ser mayor a cero", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const base = {
        module_key: moduleKey,
        expires_at: expiryMode === "date" && date ? new Date(date).toISOString() : null,
        access_days: expiryMode === "days" ? days : null,
        notes: notes.trim() || null,
      }
      const trainingIdList = [...trainingIds]
      const personIdList = [...personIds]

      if (isSingleCombo) {
        const res = await fetch("/api/accesos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...base,
            resource_id: trainingIdList[0],
            person_id: personIdList[0],
            payment: withPayment
              ? {
                  concept_type: "capacitacion",
                  concept_id: trainingIdList[0],
                  concept_label: singleTraining?.title ?? columns.find((c) => c.id === trainingIdList[0])?.label,
                  amount: Number(amount),
                  method,
                  reference: reference.trim() || null,
                  paid_at: paidAt || null,
                }
              : null,
          }),
        })
        if (!res.ok) throw new Error((await res.json())?.error || "No se pudo habilitar")
      } else {
        for (const resourceId of trainingIdList) {
          const res = await fetch("/api/accesos/revocar", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...base, resource_id: resourceId, person_ids: personIdList }),
          })
          if (!res.ok) throw new Error((await res.json())?.error || "No se pudo habilitar")
        }
      }

      toast({
        title: "Acceso habilitado",
        description: `${personIdList.length} persona(s) · ${trainingIdList.length} capacitación(es)`,
      })
      onDone()
    } catch (error: any) {
      toast({ title: "Error", description: error?.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const visibleSteps = skipTrainingStep ? STEP_META.slice(1) : STEP_META
  const currentIndex = skipTrainingStep ? step - 2 : step - 1

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Habilitar acceso</DialogTitle>
        </DialogHeader>

        {/* Indicador de pasos */}
        <div className="flex items-center gap-2">
          {visibleSteps.map((s, i) => (
            <div key={s.key} className="flex flex-1 items-center gap-2">
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                  i < currentIndex
                    ? "bg-[#4dd0e1] text-white"
                    : i === currentIndex
                    ? "bg-[#4dd0e1] text-white ring-4 ring-[#4dd0e1]/20"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {i < currentIndex ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              <span className={`hidden text-xs font-medium sm:inline ${i === currentIndex ? "text-gray-800" : "text-gray-400"}`}>
                {s.label}
              </span>
              {i < visibleSteps.length - 1 && <div className="h-px flex-1 bg-gray-200" />}
            </div>
          ))}
        </div>

        <div className="min-h-[280px] flex-1 overflow-y-auto">
          {/* Paso 1: capacitaciones */}
          {step === 1 && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  className="pl-9"
                  placeholder="Buscar capacitación…"
                  value={trainingSearch}
                  onChange={(e) => setTrainingSearch(e.target.value)}
                />
              </div>
              <div className="max-h-72 space-y-1 overflow-y-auto rounded-lg border border-gray-100 p-1">
                {filteredTrainings.length === 0 ? (
                  <p className="p-3 text-center text-sm text-gray-400">Sin resultados.</p>
                ) : (
                  filteredTrainings.map((c) => {
                    const t = trainings.find((tr) => tr.id === c.id)
                    return (
                      <label
                        key={c.id}
                        className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-sm hover:bg-[#4dd0e1]/5"
                      >
                        <Checkbox
                          checked={trainingIds.has(c.id)}
                          onCheckedChange={() => toggleTraining(c.id)}
                          className="border-gray-300 data-[state=checked]:border-[#4dd0e1] data-[state=checked]:bg-[#4dd0e1]"
                        />
                        <span className="min-w-0 flex-1 truncate text-gray-800">{c.label}</span>
                        {t && Number(t.price) > 0 && (
                          <span className="shrink-0 text-xs text-gray-400">${Number(t.price).toLocaleString("es-AR")}</span>
                        )}
                      </label>
                    )
                  })
                )}
              </div>
              <p className="text-xs text-gray-400">{trainingIds.size} seleccionada{trainingIds.size === 1 ? "" : "s"}</p>
            </div>
          )}

          {/* Paso 2: personas */}
          {step === 2 && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  className="pl-9"
                  placeholder="Buscar por nombre, apellido o email…"
                  value={personSearch}
                  onChange={(e) => setPersonSearch(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="max-h-72 space-y-1 overflow-y-auto rounded-lg border border-gray-100 p-1">
                {loadingPeople ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-[#4dd0e1]" /></div>
                ) : people.length === 0 ? (
                  <p className="p-3 text-center text-sm text-gray-400">Sin resultados.</p>
                ) : (
                  people.map((p) => (
                    <label
                      key={p.person_id}
                      className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-sm hover:bg-[#4dd0e1]/5"
                    >
                      <Checkbox
                        checked={personIds.has(p.person_id)}
                        onCheckedChange={() => togglePerson(p.person_id)}
                        className="border-gray-300 data-[state=checked]:border-[#4dd0e1] data-[state=checked]:bg-[#4dd0e1]"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-gray-800">
                          {`${p.name ?? ""} ${p.last_name ?? ""}`.trim() || "Sin nombre"}
                        </p>
                        <p className="truncate text-xs text-gray-400">{p.email || "sin email"}</p>
                      </div>
                    </label>
                  ))
                )}
              </div>
              <p className="text-xs text-gray-400">{personIds.size} seleccionada{personIds.size === 1 ? "" : "s"}</p>
            </div>
          )}

          {/* Paso 3: confirmar */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-lg bg-gray-50 p-3 text-sm">
                <p className="text-gray-800">
                  Vas a habilitar a <strong>{personIds.size}</strong> persona{personIds.size === 1 ? "" : "s"} en{" "}
                  <strong>{trainingIds.size}</strong> capacitación{trainingIds.size === 1 ? "" : "es"}.
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {selectedTrainings.map((c) => (
                    <span key={c.id} className="rounded-full bg-white px-2 py-0.5 text-xs text-gray-600 ring-1 ring-gray-200">
                      {c.label}
                    </span>
                  ))}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {selectedPeopleLabels.map((label, i) => (
                    <span key={i} className="rounded-full bg-white px-2 py-0.5 text-xs text-gray-600 ring-1 ring-gray-200">
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <Label>Vencimiento</Label>
                <div className="mt-1 flex gap-2">
                  <Select value={expiryMode} onValueChange={(v) => setExpiryMode(v as any)}>
                    <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="never">Sin vencimiento</SelectItem>
                      <SelectItem value="days">Por cantidad de días</SelectItem>
                      <SelectItem value="date">Hasta una fecha</SelectItem>
                    </SelectContent>
                  </Select>
                  {expiryMode === "days" && (
                    <Input type="number" min={1} className="w-24" value={days} onChange={(e) => setDays(Number(e.target.value))} />
                  )}
                  {expiryMode === "date" && (
                    <Input type="date" className="w-40" value={date} onChange={(e) => setDate(e.target.value)} />
                  )}
                </div>
              </div>

              {isSingleCombo && (
                <div className="rounded-lg border border-gray-200 p-3">
                  <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700">
                    <input type="checkbox" checked={withPayment} onChange={(e) => setWithPayment(e.target.checked)} />
                    Registrar pago
                  </label>
                  <p className="mt-1 text-xs text-gray-400">
                    Dejalo sin tildar si es una beca o cortesía: el acceso se da igual.
                  </p>

                  {withPayment && (
                    <div className="mt-3 space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Monto *</Label>
                          <Input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-xs">Medio</Label>
                          <Select value={method} onValueChange={setMethod}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="transferencia">Transferencia</SelectItem>
                              <SelectItem value="efectivo">Efectivo</SelectItem>
                              <SelectItem value="mercadopago">Mercado Pago</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Fecha</Label>
                          <Input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-xs">Comprobante</Label>
                          <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="0012-4471" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {!isSingleCombo && (
                <p className="text-xs text-gray-400">
                  Los pagos se registran de a uno: elegí una sola persona y una sola capacitación si necesitás
                  cargar un monto acá. Para varias personas, registralos después desde la pestaña Pagos.
                </p>
              )}

              <div>
                <Label>Nota (opcional)</Label>
                <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between gap-2 border-t pt-3">
          <Button variant="outline" onClick={goBack}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            {step === 1 || (step === 2 && skipTrainingStep) ? "Cancelar" : "Atrás"}
          </Button>
          {step === 3 ? (
            <Button onClick={submit} disabled={saving} className="bg-[#4dd0e1] hover:bg-[#3bb8c9]">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Habilitar
            </Button>
          ) : (
            <Button onClick={goNext} className="bg-[#4dd0e1] hover:bg-[#3bb8c9]">
              Siguiente
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
