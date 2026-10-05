"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { FileText, FileSpreadsheet, Loader2 } from "lucide-react"
import { descargarBase64 } from "@/lib/descargar"
import { toast } from "@/hooks/use-toast"

/**
 * Los dos botones de descarga de un informe.
 *
 * El rango de fechas NO lo maneja este componente: lo recibe. En el puesto de
 * venta los mismos campos de fecha filtran la lista en pantalla y alimentan el
 * informe, así que tener dos selectores diciendo cosas distintas sería la
 * forma más rápida de que alguien baje un período que no es el que está
 * mirando.
 */
export default function BotonesInforme({
  endpoint,
  rango,
  className = "",
}: {
  endpoint: string
  rango?: { desde?: string; hasta?: string }
  className?: string
}) {
  const [bajando, setBajando] = useState<"pdf" | "xlsx" | null>(null)

  const descargar = async (formato: "pdf" | "xlsx") => {
    setBajando(formato)
    try {
      const qs = new URLSearchParams({ formato })
      if (rango?.desde) qs.set("desde", rango.desde)
      if (rango?.hasta) qs.set("hasta", rango.hasta)

      const res = await fetch(`${endpoint}?${qs.toString()}`)
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error)
      descargarBase64(await res.json())
    } catch (error: any) {
      toast({
        title: "No se pudo generar el informe",
        description: error?.message || "Intentá de nuevo en un momento",
        variant: "destructive",
      })
    } finally {
      setBajando(null)
    }
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => descargar("pdf")}
        disabled={bajando !== null}
      >
        {bajando === "pdf"
          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
          : <FileText className="h-3.5 w-3.5" />}
        PDF
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => descargar("xlsx")}
        disabled={bajando !== null}
      >
        {bajando === "xlsx"
          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
          : <FileSpreadsheet className="h-3.5 w-3.5" />}
        Excel
      </Button>
    </div>
  )
}
