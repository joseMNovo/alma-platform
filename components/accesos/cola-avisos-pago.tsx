"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import CamposPago, { datosPagoIniciales, type DatosPago } from "@/components/accesos/campos-pago"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"
import { Loader2, Receipt, FileText, Check, X } from "lucide-react"
import type { PaymentClaim } from "@/lib/data-manager"

/**
 * Cola de avisos de "ya pagué".
 *
 * Es el punto donde la plata pasa de ser un dicho a ser un hecho: alguien abre
 * el comprobante, lo compara con el panel de MercadoPago y decide. Confirmar
 * habilita Y registra el pago en la misma transacción; rechazar solo deja el
 * rastro.
 *
 * Vive arriba de la lista de pagos porque es trabajo pendiente, no historial:
 * lo que hay que hacer va antes de lo que ya se hizo.
 */
export default function ColaAvisosPago({ onResuelto }: { onResuelto?: () => void }) {
  const [avisos, setAvisos] = useState<PaymentClaim[]>([])
  const [cargando, setCargando] = useState(true)
  const [confirmando, setConfirmando] = useState<PaymentClaim | null>(null)
  // Los mismos campos que pide el wizard de habilitación: un pago se carga
  // igual venga de donde venga.
  const [pago, setPago] = useState<DatosPago>(datosPagoIniciales())
  const [guardando, setGuardando] = useState(false)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const res = await fetch("/api/accesos/avisos-de-pago?status=pendiente")
      setAvisos(res.ok ? await res.json() : [])
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const resolver = async (aviso: PaymentClaim, accion: "confirmar" | "rechazar") => {
    setGuardando(true)
    try {
      const res = await fetch(`/api/accesos/avisos-de-pago?id=${aviso.id}&accion=${accion}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          accion === "confirmar"
            ? {
                amount: Number(pago.amount) || null,
                method: pago.method || null,
                reference: pago.reference || null,
                paid_at: pago.paidAt || null,
              }
            : {},
        ),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error)
      toast({
        title: accion === "confirmar" ? "Habilitado y pago registrado" : "Aviso rechazado",
      })
      setConfirmando(null)
      setPago(datosPagoIniciales())
      cargar()
      onResuelto?.()
    } catch (error: any) {
      toast({ title: "Error", description: error?.message, variant: "destructive" })
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-[#4dd0e1]" />
      </div>
    )
  }

  // Sin nada pendiente no se dibuja: un cartel de "no hay avisos" ocuparía
  // lugar todos los días para decir que no pasa nada.
  if (avisos.length === 0) return null

  return (
    <>
      <Card className="border-amber-200 bg-amber-50/40">
        <CardContent className="space-y-3 p-4">
          <p className="flex items-center gap-2 font-semibold text-gray-900">
            <Receipt className="h-4 w-4 text-amber-500" />
            Avisaron que pagaron
            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">
              {avisos.length}
            </span>
          </p>

          {/* Tope de alto con scroll propio: sin esto la tarjeta crecía sin
              límite y con muchos avisos empujaba los pagos fuera de pantalla.
              El contador del título ya dice cuántos hay en total. */}
          <div className="max-h-[22rem] space-y-2 overflow-y-auto pr-1">
            {avisos.map((a) => (
              <div
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="font-medium text-gray-900">{a.person_name ?? "Sin nombre"}</p>
                  <p className="text-xs text-gray-500">
                    {a.concept_label ?? "Capacitación"}
                    {a.person_email ? ` · ${a.person_email}` : ""}
                    {a.created_at
                      ? ` · ${new Date(a.created_at).toLocaleDateString("es-AR", {
                          day: "2-digit", month: "2-digit",
                        })}`
                      : ""}
                  </p>
                  {a.message && <p className="mt-0.5 text-xs italic text-gray-500">"{a.message}"</p>}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {a.file_guid ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => window.open(`/api/files/${a.file_guid}/raw`, "_blank")}
                    >
                      <FileText className="h-3.5 w-3.5" /> Comprobante
                    </Button>
                  ) : (
                    <span className="text-xs text-gray-400">Sin comprobante</span>
                  )}
                  <Button
                    size="sm"
                    className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => setConfirmando(a)}
                  >
                    <Check className="h-3.5 w-3.5" /> Confirmar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-red-200 text-red-600 hover:bg-red-50"
                    onClick={() => resolver(a, "rechazar")}
                    disabled={guardando}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* El monto se pide acá y no se toma del precio: pudo pagar con descuento,
          en cuotas, o un importe viejo. Lo sabe quien está mirando el
          comprobante, no la tabla de precios. */}
      <Dialog open={!!confirmando} onOpenChange={(abierto) => !abierto && setConfirmando(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar el pago de {confirmando?.person_name}</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-gray-600">
            Esto habilita <strong>{confirmando?.concept_label}</strong> y registra el
            ingreso. Las dos cosas quedan juntas.
          </p>

          <CamposPago datos={pago} onChange={setPago} />

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmando(null)}>
              Cancelar
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => confirmando && resolver(confirmando, "confirmar")}
              disabled={guardando}
            >
              {guardando ? "Guardando..." : "Habilitar y registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
