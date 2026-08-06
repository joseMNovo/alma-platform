"use client"

import { useEffect, useState } from "react"
import { toast } from "@/hooks/use-toast"
import { Bell, Loader2, Check } from "lucide-react"

/**
 * Los avisos que una persona quiere para un evento al que se anotó.
 *
 * Aparece SOLO si ya está anotada: ofrecerle recordatorios de algo a lo que no
 * va no tiene sentido.
 *
 * Guarda al instante, sin botón: son tres casillas y obligar a confirmar un
 * tilde es pedir dos gestos para uno. Si el guardado falla, la casilla vuelve
 * sola a como estaba, así lo que se ve siempre es lo que quedó guardado.
 */

const OPCIONES = [
  { offset: 7, label: "Una semana antes" },
  { offset: 1, label: "El día antes" },
  { offset: 0, label: "El mismo día" },
] as const

export default function RecordatoriosEvento({ eventId }: { eventId: number }) {
  const [offsets, setOffsets] = useState<number[]>([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    let vigente = true
    setCargando(true)
    fetch(`/api/recordatorios/${eventId}`)
      .then((r) => (r.ok ? r.json() : { offsets: [] }))
      .then((data) => {
        // Si mientras tanto abrieron otro evento, esta respuesta ya no aplica.
        if (vigente) setOffsets(Array.isArray(data?.offsets) ? data.offsets : [])
      })
      .catch(() => {})
      .finally(() => {
        if (vigente) setCargando(false)
      })
    return () => {
      vigente = false
    }
  }, [eventId])

  const alternar = async (offset: number) => {
    const anterior = offsets
    const nuevos = offsets.includes(offset)
      ? offsets.filter((o) => o !== offset)
      : [...offsets, offset]

    setOffsets(nuevos)
    setGuardando(true)
    try {
      const res = await fetch(`/api/recordatorios/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offsets: nuevos }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "No se pudo guardar")
      setOffsets(Array.isArray(data?.offsets) ? data.offsets : nuevos)
    } catch (error: any) {
      setOffsets(anterior)
      toast({ title: "No se pudo guardar", description: error?.message, variant: "destructive" })
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-gray-50 p-3 text-sm text-gray-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando tus avisos…
      </div>
    )
  }

  return (
    <div className="space-y-2 rounded-lg border border-gray-200 bg-white p-3">
      <p className="flex items-center gap-2 text-sm font-medium text-gray-800">
        <Bell className="h-4 w-4 text-[#4dd0e1]" />
        Avisame de este evento
        {guardando && <Loader2 className="h-3 w-3 animate-spin text-gray-400" />}
        {!guardando && offsets.length > 0 && (
          <Check className="h-3.5 w-3.5 text-green-500" />
        )}
      </p>

      <div className="space-y-1">
        {OPCIONES.map((opcion) => (
          <label
            key={opcion.offset}
            className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-gray-700 transition hover:bg-gray-50"
          >
            <input
              type="checkbox"
              checked={offsets.includes(opcion.offset)}
              onChange={() => alternar(opcion.offset)}
              className="h-4 w-4 rounded border-gray-300 accent-[#4dd0e1]"
            />
            {opcion.label}
          </label>
        ))}
      </div>

      <p className="text-xs text-gray-500">Te llega por mail a las 6 de la mañana.</p>
    </div>
  )
}
