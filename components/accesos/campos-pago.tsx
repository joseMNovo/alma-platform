"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

/**
 * Los campos con los que se registra un pago: monto, medio, fecha y
 * comprobante.
 *
 * Están acá y no repetidos en cada pantalla porque un pago se carga desde dos
 * lugares —el wizard de habilitación y la confirmación de un aviso— y tienen
 * que pedir exactamente lo mismo. Cuando eran dos formularios distintos, uno
 * ofrecía un desplegable con tres medios y el otro un campo libre: dos personas
 * cargando "MercadoPago" y "mercadopago" el mismo día, y una recaudación que
 * no se puede agrupar.
 */

export interface DatosPago {
  amount: string
  method: string
  paidAt: string
  reference: string
}

/** Los tres medios por los que cobra ALMA. Lista cerrada a propósito: con
 *  texto libre, agrupar la recaudación por medio deja de ser posible. */
export const MEDIOS_DE_PAGO = [
  { valor: "transferencia", texto: "Transferencia" },
  { valor: "efectivo", texto: "Efectivo" },
  { valor: "mercadopago", texto: "Mercado Pago" },
] as const

export function datosPagoIniciales(monto = ""): DatosPago {
  return {
    amount: monto,
    method: "transferencia",
    paidAt: new Date().toISOString().slice(0, 10),
    reference: "",
  }
}

export default function CamposPago({
  datos,
  onChange,
}: {
  datos: DatosPago
  onChange: (datos: DatosPago) => void
}) {
  const set = (campo: keyof DatosPago, valor: string) =>
    onChange({ ...datos, [campo]: valor })

  return (
    <div className="space-y-3 rounded-lg border border-gray-200 p-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Monto *</Label>
          <Input
            type="number"
            min={0}
            value={datos.amount}
            onChange={(e) => set("amount", e.target.value)}
          />
        </div>
        <div>
          <Label className="text-xs">Medio</Label>
          <Select value={datos.method} onValueChange={(v) => set("method", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {MEDIOS_DE_PAGO.map((m) => (
                <SelectItem key={m.valor} value={m.valor}>{m.texto}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Fecha</Label>
          <Input type="date" value={datos.paidAt} onChange={(e) => set("paidAt", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Comprobante</Label>
          <Input
            value={datos.reference}
            onChange={(e) => set("reference", e.target.value)}
            placeholder="0012-4471"
          />
        </div>
      </div>
    </div>
  )
}
