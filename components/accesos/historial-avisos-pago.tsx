"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, FileText } from "lucide-react"
import type { PaymentClaim } from "@/lib/data-manager"

/**
 * Avisos de pago ya resueltos.
 *
 * Los pendientes NO se muestran acá: viven en la tarjeta de arriba, que es lo
 * accionable. Repetirlos obligaba a mirar dos veces lo mismo.
 *
 * Confirmados y rechazados van mezclados y no en dos filtros: cada fila ya
 * dice en qué terminó, y separarlos hacía elegir dónde buscar antes de poder
 * buscar. Guarda lo que la auditoría no tiene — el comprobante y lo que
 * escribió la persona al avisar.
 */

const COLOR: Record<string, string> = {
  confirmado: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rechazado: "bg-red-50 text-red-600 border-red-200",
}

export default function HistorialAvisosPago() {
  const [avisos, setAvisos] = useState<PaymentClaim[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    fetch("/api/accesos/avisos-de-pago?status=resueltos")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setAvisos(Array.isArray(d) ? d : []))
      .catch(() => setAvisos([]))
      .finally(() => setCargando(false))
  }, [])

  if (cargando) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-[#4dd0e1]" />
      </div>
    )
  }

  if (avisos.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-gray-500">
          Todavía no se resolvió ningún aviso.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-2">
      {avisos.map((a) => (
        <div
          key={a.id}
          className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5"
        >
          <div className="min-w-0">
            <p className="font-medium text-gray-900">
              {a.person_name ?? "Sin nombre"}
              <span
                className={`ml-2 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                  COLOR[a.status] ?? "border-gray-200 bg-gray-50 text-gray-600"
                }`}
              >
                {a.status}
              </span>
            </p>
            <p className="text-xs text-gray-500">
              {a.concept_label ?? "Capacitación"}
              {a.person_email ? ` · ${a.person_email}` : ""}
            </p>
            {a.message && <p className="mt-1 text-xs italic text-gray-500">"{a.message}"</p>}
            {a.resolution_notes && (
              <p className="mt-1 text-xs text-gray-600">
                <strong>Resolución:</strong> {a.resolution_notes}
              </p>
            )}
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1 text-xs text-gray-400">
            {a.resolved_at && <p>Resuelto el {new Date(a.resolved_at).toLocaleDateString("es-AR")}</p>}
            {a.file_guid && (
              <Button
                variant="outline"
                size="sm"
                className="mt-1 gap-1.5"
                onClick={() => window.open(`/api/files/${a.file_guid}/raw`, "_blank")}
              >
                <FileText className="h-3.5 w-3.5" /> Comprobante
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
