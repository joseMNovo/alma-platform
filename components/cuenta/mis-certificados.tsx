"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import type { Certificate } from "@/lib/data-manager"
import { Award, Download, ExternalLink, Clock } from "lucide-react"

/**
 * Los certificados de quien está mirando.
 *
 * La lista la trae MiCuenta, que ya la necesita para decidir si muestra la
 * pestaña: pedirla dos veces sería un fetch al pedo.
 *
 * Cada certificado se ve y se descarga por su link público. Es el mismo que
 * le llegó por mail y el mismo que le puede pasar a un empleador para que lo
 * verifique — un solo objeto, no tres.
 */
export default function MisCertificados({ certificados }: { certificados: Certificate[] }) {
  const formatear = (valor?: string | null) => {
    if (!valor) return ""
    const fecha = new Date(valor)
    return Number.isNaN(fecha.getTime())
      ? ""
      : fecha.toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-900">Mis certificados</h3>

      <div className="grid gap-3 sm:grid-cols-2">
        {certificados.map((certificado) => (
          <Card key={certificado.id}>
            <CardContent className="space-y-3 py-4">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-[#4dd0e1]/10 p-2.5">
                  <Award className="h-5 w-5 text-[#4dd0e1]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900">
                    {certificado.training_title ?? "Capacitación"}
                  </p>
                  {certificado.hours && (
                    <p className="text-xs text-gray-500">{certificado.hours}</p>
                  )}
                  {certificado.issued_at && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="h-3 w-3" />
                      {formatear(certificado.issued_at)}
                    </p>
                  )}
                </div>
              </div>

              <p className="font-mono text-xs text-gray-400">{certificado.code}</p>

              <div className="flex flex-wrap gap-2">
                <a
                  href={`/api/publico/certificado/${certificado.code}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#4dd0e1] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#3bb8c9]"
                >
                  <Download className="h-4 w-4" />
                  Descargar
                </a>
                <Link
                  href={`/certificado/${certificado.code}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
                >
                  <ExternalLink className="h-4 w-4" />
                  Ver y compartir
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
