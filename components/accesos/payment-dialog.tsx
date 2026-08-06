"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"
import { Loader2, DollarSign } from "lucide-react"
import type { AccessMatrixRow, Training } from "@/lib/data-manager"

/**
 * Registrar pago — botón "$" por fila en Accesos. Un ingreso suelto: NO
 * habilita nada por sí mismo (para eso está el wizard), solo deja constancia
 * de que la persona pagó. Sirve tanto para dejar la plata registrada antes
 * de habilitar, como para sumar un pago sobre un acceso que ya tiene.
 */
export default function PaymentDialog({
  person,
  trainings,
  grantedTrainingIds,
  onClose,
  onDone,
}: {
  person: AccessMatrixRow
  trainings: Training[]
  grantedTrainingIds: number[]
  onClose: () => void
  onDone: () => void
}) {
  // Ordenadas alfabéticamente, con las que ya tiene habilitadas marcadas —
  // pero TODAS elegibles: lo más común es registrar el pago ANTES de
  // habilitar (alguien pagó, ahora hay que darle acceso), no al revés.
  const sortedTrainings = [...trainings].sort((a, b) => a.title.localeCompare(b.title))
  const defaultTraining = trainings.find((t) => grantedTrainingIds.includes(t.id)) ?? sortedTrainings[0]

  const [conceptId, setConceptId] = useState<number | "">(defaultTraining?.id ?? "")
  const [amount, setAmount] = useState(defaultTraining ? String(defaultTraining.price) : "")
  const [method, setMethod] = useState("transferencia")
  const [reference, setReference] = useState("")
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10))
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (!(Number(amount) > 0)) {
      toast({ title: "El monto debe ser mayor a cero", variant: "destructive" })
      return
    }
    if (!conceptId) {
      toast({ title: "Elegí a qué capacitación corresponde", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const training = trainings.find((t) => t.id === conceptId)
      const res = await fetch("/api/accesos/pagos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          person_id: person.person_id,
          // Siempre capacitación: es lo único que este módulo sabe mostrar
          // después. Las cuotas de socio y las donaciones esperan a que
          // exista su propio módulo de Pagos — registrarlas acá las dejaría
          // guardadas y sin ninguna pantalla que las liste.
          concept_type: "capacitacion",
          concept_id: conceptId,
          concept_label: training?.title ?? null,
          amount: Number(amount),
          method,
          reference: reference.trim() || null,
          paid_at: paidAt || null,
        }),
      })
      if (!res.ok) throw new Error((await res.json())?.error || "No se pudo registrar el pago")
      toast({ title: "Pago registrado", description: `$${Number(amount).toLocaleString("es-AR")}` })
      onDone()
    } catch (error: any) {
      toast({ title: "Error", description: error?.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-[#4dd0e1]" />
            Registrar pago
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-gray-50 p-3 text-sm">
            <p className="font-medium text-gray-800">
              {`${person.name ?? ""} ${person.last_name ?? ""}`.trim() || person.email || `Persona #${person.person_id}`}
            </p>
            {Number(person.total_paid) > 0 && (
              <p className="text-gray-500">Ya pagó ${Number(person.total_paid).toLocaleString("es-AR")} en total.</p>
            )}
          </div>

          <div>
              <Label>¿Qué capacitación?</Label>
              {sortedTrainings.length === 0 ? (
                <p className="text-sm text-gray-400">No hay capacitaciones publicadas.</p>
              ) : (
                <Select
                  value={conceptId ? String(conceptId) : undefined}
                  onValueChange={(v) => {
                    const id = Number(v)
                    setConceptId(id)
                    const t = trainings.find((tr) => tr.id === id)
                    if (t) setAmount(String(t.price))
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {sortedTrainings.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {t.title}{grantedTrainingIds.includes(t.id) ? " (ya habilitada)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
          </div>

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

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={saving} className="bg-[#4dd0e1] hover:bg-[#3bb8c9]">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Registrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
