"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"
import { Loader2, KeyRound, Users } from "lucide-react"

export interface GrantTarget {
  /** Una persona, o varias si es habilitación masiva */
  personIds: number[]
  personLabel: string
  moduleKey: string
  resourceId: number
  resourceLabel: string
  /** Vencimiento sugerido de la capacitación (default_access_days) */
  suggestedDays?: number | null
  /** Precio de referencia, para precargar el monto */
  suggestedAmount?: number | null
}

/**
 * Modal de habilitación.
 *
 * Un solo gesto para el admin, dos tablas por detrás: la habilitación
 * (person_access_grants) y el pago (person_payments), que el backend guarda
 * en la MISMA transacción. El bloque de pago es opcional a propósito: existen
 * becas y cortesías, y en esos casos no hay ningún pago que registrar.
 */
export default function GrantDialog({
  target,
  onClose,
  onDone,
}: {
  target: GrantTarget
  onClose: () => void
  onDone: () => void
}) {
  const isBulk = target.personIds.length > 1

  const [expiryMode, setExpiryMode] = useState<"never" | "days" | "date">(
    target.suggestedDays ? "days" : "never",
  )
  const [days, setDays] = useState<number>(target.suggestedDays ?? 365)
  const [date, setDate] = useState("")
  const [notes, setNotes] = useState("")

  const [withPayment, setWithPayment] = useState(false)
  const [amount, setAmount] = useState<string>(
    target.suggestedAmount ? String(target.suggestedAmount) : "",
  )
  const [method, setMethod] = useState("transferencia")
  const [reference, setReference] = useState("")
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10))
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (withPayment && !(Number(amount) > 0)) {
      toast({ title: "El monto debe ser mayor a cero", variant: "destructive" })
      return
    }

    setSaving(true)
    try {
      const base = {
        module_key: target.moduleKey,
        resource_id: target.resourceId,
        expires_at: expiryMode === "date" && date ? new Date(date).toISOString() : null,
        access_days: expiryMode === "days" ? days : null,
        notes: notes.trim() || null,
      }

      if (isBulk) {
        // El bulk no registra pagos: son montos distintos por persona.
        const res = await fetch("/api/accesos/revocar", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...base, person_ids: target.personIds }),
        })
        if (!res.ok) throw new Error((await res.json())?.error || "No se pudo habilitar")
        toast({ title: `${target.personIds.length} personas habilitadas` })
      } else {
        const res = await fetch("/api/accesos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...base,
            person_id: target.personIds[0],
            payment: withPayment
              ? {
                  concept_type: "capacitacion",
                  concept_id: target.resourceId,
                  concept_label: target.resourceLabel,
                  amount: Number(amount),
                  method,
                  reference: reference.trim() || null,
                  paid_at: paidAt || null,
                }
              : null,
          }),
        })
        if (!res.ok) throw new Error((await res.json())?.error || "No se pudo habilitar")
        toast({
          title: "Acceso habilitado",
          description: withPayment ? `Pago de $${Number(amount).toLocaleString("es-AR")} registrado` : undefined,
        })
      }

      onDone()
    } catch (error: any) {
      toast({ title: "Error", description: error?.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isBulk ? <Users className="h-5 w-5 text-[#4dd0e1]" /> : <KeyRound className="h-5 w-5 text-[#4dd0e1]" />}
            Habilitar acceso
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-gray-50 p-3 text-sm">
            <p className="font-medium text-gray-800">{target.personLabel}</p>
            <p className="text-gray-500">{target.resourceLabel}</p>
          </div>

          <div>
            <Label>Vencimiento</Label>
            <div className="mt-1 flex gap-2">
              <select
                className="h-10 flex-1 rounded-md border border-gray-200 px-3 text-sm"
                value={expiryMode}
                onChange={(e) => setExpiryMode(e.target.value as any)}
              >
                <option value="never">Sin vencimiento</option>
                <option value="days">Por cantidad de días</option>
                <option value="date">Hasta una fecha</option>
              </select>
              {expiryMode === "days" && (
                <Input
                  type="number"
                  min={1}
                  className="w-24"
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                />
              )}
              {expiryMode === "date" && (
                <Input type="date" className="w-40" value={date} onChange={(e) => setDate(e.target.value)} />
              )}
            </div>
          </div>

          {!isBulk && (
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
                      <select
                        className="h-10 w-full rounded-md border border-gray-200 px-2 text-sm"
                        value={method}
                        onChange={(e) => setMethod(e.target.value)}
                      >
                        <option value="transferencia">Transferencia</option>
                        <option value="efectivo">Efectivo</option>
                        <option value="mercadopago">Mercado Pago</option>
                      </select>
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

          <div>
            <Label>Nota (opcional)</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={saving} className="bg-[#4dd0e1] hover:bg-[#3bb8c9]">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Habilitar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
