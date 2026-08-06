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
import { Loader2, Search, ChevronLeft, ChevronRight, GraduationCap, Users, CheckCircle2, CreditCard } from "lucide-react"
import type { AccessMatrixRow, Training } from "@/lib/data-manager"

export interface WizardColumn {
  id: number
  label: string
}

const STEP_META = {
  trainings: { label: "Capacitaciones", Icon: GraduationCap },
  people: { label: "Personas", Icon: Users },
  payment: { label: "Pago", Icon: CreditCard },
  confirm: { label: "Confirmar", Icon: CheckCircle2 },
} as const

type StepKey = keyof typeof STEP_META

/**
 * Habilitar acceso — wizard. Reemplaza al viejo click-en-celda de la matriz:
 * con pocas capacitaciones daba igual, pero con muchas ("¿y si tengo 50?") una
 * grilla de columnas deja de ser usable. Acá se elige QUÉ, después QUIÉN,
 * después si pagó, y recién ahí se confirma todo junto.
 *
 * El pago tiene paso propio y no una casilla escondida en el resumen: es una
 * decisión de plata, y una casilla en el medio de un formulario se pasa por
 * alto. Preguntarlo de frente obliga a contestar sí o no.
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
  // preselecciona y ese paso no existe.
  const skipTrainingStep = columns.length <= 1
  const pasos: StepKey[] = skipTrainingStep
    ? ["people", "payment", "confirm"]
    : ["trainings", "people", "payment", "confirm"]
  const [indice, setIndice] = useState(0)
  const paso = pasos[indice]

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
    if (paso !== "people") return
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
  }, [paso, personSearch, moduleKey])

  // Si vino gente preseleccionada pero todavía no está en `people` (recién
  // fetcheado), igual cuenta para el resumen: guardamos su cantidad aparte.
  const filteredTrainings = useMemo(() => {
    const q = trainingSearch.trim().toLowerCase()
    if (!q) return columns
    return columns.filter((c) => c.label.toLowerCase().includes(q))
  }, [columns, trainingSearch])

  const selectedTrainings = columns.filter((c) => trainingIds.has(c.id))
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

  // El monto arranca con el precio de la capacitación: es el caso normal y
  // evita tener que buscarlo. Sigue siendo editable (descuentos, pagos
  // parciales).
  useEffect(() => {
    if (paso !== "payment" || !withPayment || amount) return
    const precio = Number(singleTraining?.price ?? 0)
    if (precio > 0) setAmount(String(precio))
  }, [paso, withPayment, amount, singleTraining])

  const goNext = () => {
    if (paso === "trainings" && trainingIds.size === 0) {
      toast({ title: "Elegí al menos una capacitación", variant: "destructive" })
      return
    }
    if (paso === "people" && personIds.size === 0) {
      toast({ title: "Elegí al menos una persona", variant: "destructive" })
      return
    }
    if (paso === "payment" && withPayment && !(Number(amount) > 0)) {
      toast({ title: "Poné el monto que pagó", variant: "destructive" })
      return
    }
    setIndice((i) => Math.min(i + 1, pasos.length - 1))
  }
  const goBack = () => {
    if (indice === 0) return onClose()
    setIndice((i) => i - 1)
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

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Habilitar acceso</DialogTitle>
        </DialogHeader>

        {/* Indicador de pasos */}
        <div className="flex items-center gap-2">
          {pasos.map((clave, i) => (
            <div key={clave} className="flex flex-1 items-center gap-2">
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                  i < indice
                    ? "bg-[#4dd0e1] text-white"
                    : i === indice
                    ? "bg-[#4dd0e1] text-white ring-4 ring-[#4dd0e1]/20"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {i < indice ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              <span className={`hidden text-xs font-medium sm:inline ${i === indice ? "text-gray-800" : "text-gray-400"}`}>
                {STEP_META[clave].label}
              </span>
              {i < pasos.length - 1 && <div className="h-px flex-1 bg-gray-200" />}
            </div>
          ))}
        </div>

        <div className="min-h-[280px] flex-1 overflow-y-auto">
          {/* Capacitaciones */}
          {paso === "trainings" && (
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

          {/* Personas */}
          {paso === "people" && (
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

          {/* ¿Pagó? */}
          {paso === "payment" && (
            <div className="space-y-4">
              <p className="font-medium text-gray-900">
                {isSingleCombo && singleTraining
                  ? `¿Pagó «${singleTraining.title}»?`
                  : "¿Pagó?"}
              </p>

              {isSingleCombo ? (
                <>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <OpcionPago
                      activa={withPayment}
                      titulo="Sí, registrar el pago"
                      detalle="Queda asentado el monto y el medio"
                      onClick={() => setWithPayment(true)}
                    />
                    <OpcionPago
                      activa={!withPayment}
                      titulo="No hace falta"
                      detalle="Beca, cortesía o ya está registrado"
                      onClick={() => setWithPayment(false)}
                    />
                  </div>

                  {withPayment && (
                    <div className="space-y-3 rounded-lg border border-gray-200 p-3">
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
                </>
              ) : (
                /* Un pago es de una persona por una capacitación. Con varias
                   seleccionadas no hay forma de saber quién pagó cuánto. */
                <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
                  Los pagos se registran de a uno. Elegí una sola persona y una sola capacitación
                  para cargar el monto acá, o registralos después desde Pagos.
                </p>
              )}
            </div>
          )}

          {/* Confirmar */}
          {paso === "confirm" && (
            <div className="space-y-4">
              {/* Dos listas con el mismo color no se distinguen. Cada una
                  con su rótulo y su color: quién y qué. */}
              <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    A quién {personIds.size > 1 && `(${personIds.size})`}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {selectedPeopleLabels.map((label, i) => (
                      <span
                        key={i}
                        className="rounded-full bg-[#4dd0e1]/15 px-2 py-0.5 text-xs font-medium text-[#00838f]"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Qué van a poder ver {trainingIds.size > 1 && `(${trainingIds.size})`}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {selectedTrainings.map((c) => (
                      <span
                        key={c.id}
                        className="rounded-full bg-[#9A8BC2]/15 px-2 py-0.5 text-xs font-medium text-[#5F5088]"
                      >
                        {c.label}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Pago</p>
                  <p className="mt-1 text-gray-800">
                    {withPayment && isSingleCombo
                      ? `$${Number(amount || 0).toLocaleString("es-AR")} · ${method}`
                      : "Sin registrar"}
                  </p>
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
            {indice === 0 ? "Cancelar" : "Atrás"}
          </Button>
          {paso === "confirm" ? (
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

/** Sí / No del paso de pago. Dos botones grandes, no una casilla al pasar. */
function OpcionPago({
  activa,
  titulo,
  detalle,
  onClick,
}: {
  activa: boolean
  titulo: string
  detalle: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border p-3 text-left transition ${
        activa
          ? "border-[#4dd0e1] bg-[#4dd0e1]/5 ring-1 ring-[#4dd0e1]"
          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
      }`}
    >
      <span className={`block text-sm font-medium ${activa ? "text-[#00838f]" : "text-gray-800"}`}>
        {titulo}
      </span>
      <span className="mt-0.5 block text-xs text-gray-500">{detalle}</span>
    </button>
  )
}
