"use client"

import { useState } from "react"
import { Ban, Clock, RotateCcw, TriangleAlert } from "lucide-react"

export interface FilaVenta {
  /** Identidad para la pantalla: el uuid del teléfono si todavía no está
   *  confirmada, o el id del servidor si ya entró. */
  clave: string
  hora: string
  detalle: string
  total: string
  estado: "enviada" | "pendiente" | "rechazada" | "anulada"
  motivo?: string
}

/**
 * Las últimas ventas, abajo de la barra de cobro.
 *
 * El caso que resuelve es concreto y pasa seguido: cobrás un mate, confirmás,
 * y en ese momento te dicen "no, no queda ninguno". Con gente esperando, hay
 * que poder arreglarlo sin pensar.
 *
 * ── Por qué no hay un modal de "¿estás seguro?" ───────────────────────
 *
 * Un cartel que tapa la pantalla en medio de una cola es exactamente la
 * fricción que esto viene a sacar: te saca del flujo y después tenés que
 * volver a ubicarte. La confirmación pasa EN LA FILA, sin tapar nada: un
 * toque la abre, otro la resuelve. Dos toques, cero navegación, y un roce
 * accidental no anula nada.
 *
 * ── Por qué "Corregir" está primero ───────────────────────────────────
 *
 * Casi nunca la venta entera está mal: falta o sobra una cosa. "Anular" te
 * deja después volviendo a tocar los cuatro productos que sí llevaba.
 * "Corregir" anula y te devuelve todo al carrito, sacás el mate y cobrás de
 * nuevo. Un toque en vez de cinco.
 */
export default function TiraVentas({
  filas,
  onCorregir,
  onAnular,
  onVerTodas,
}: {
  filas: FilaVenta[]
  onCorregir: (clave: string) => void
  onAnular: (clave: string) => void
  onVerTodas?: () => void
}) {
  const [confirmando, setConfirmando] = useState<string | null>(null)

  if (filas.length === 0) return null

  return (
    <section className="space-y-1.5">
      <p className="px-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
        Últimas ventas
      </p>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        {filas.map((f, i) => {
          const anulada = f.estado === "anulada"
          const abierta = confirmando === f.clave

          return (
            <div key={f.clave} className={i > 0 ? "border-t border-gray-100" : ""}>
              <div className={`flex items-center gap-2 px-3 py-2.5 ${anulada ? "bg-gray-50" : ""}`}>
                <span className="w-11 shrink-0 text-[11px] text-gray-400">{f.hora}</span>

                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-sm ${anulada ? "text-gray-400 line-through" : "text-gray-800"}`}>
                    {f.detalle}
                  </span>
                  {f.estado === "pendiente" && (
                    <span className="flex items-center gap-1 text-[11px] text-amber-700">
                      <Clock className="h-3 w-3" /> guardada en el teléfono
                    </span>
                  )}
                  {f.estado === "rechazada" && (
                    <span className="flex items-center gap-1 text-[11px] text-red-700">
                      <TriangleAlert className="h-3 w-3" /> {f.motivo || "no se pudo cargar"}
                    </span>
                  )}
                </span>

                <span className={`shrink-0 text-sm font-semibold tabular-nums ${anulada ? "text-gray-400 line-through" : "text-gray-900"}`}>
                  {f.total}
                </span>

                {!anulada && !abierta && (
                  <span className="flex shrink-0 gap-0.5">
                    {/* 44px de lado los dos: se tocan con el pulgar, apurado. */}
                    <button
                      onClick={() => onCorregir(f.clave)}
                      aria-label="Corregir: anula y devuelve los productos al carrito"
                      title="Corregir"
                      className="flex h-11 w-11 items-center justify-center rounded-lg text-[#00838f] transition-colors active:bg-[#4dd0e1]/15"
                    >
                      <RotateCcw className="h-[18px] w-[18px]" />
                    </button>
                    <button
                      onClick={() => setConfirmando(f.clave)}
                      aria-label="Anular venta"
                      title="Anular"
                      className="flex h-11 w-11 items-center justify-center rounded-lg text-red-500 transition-colors active:bg-red-50"
                    >
                      <Ban className="h-[18px] w-[18px]" />
                    </button>
                  </span>
                )}
              </div>

              {/* La confirmación, en el lugar de la fila. Sin overlay, sin
                  tapar la góndola, sin sacarte de donde estabas. */}
              {abierta && (
                <div className="flex items-center gap-2 border-t border-gray-100 bg-red-50/60 px-3 py-2">
                  <span className="min-w-0 flex-1 text-sm font-medium text-red-900">
                    ¿Anular esta venta?
                  </span>
                  <button
                    onClick={() => setConfirmando(null)}
                    className="h-11 rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700"
                  >
                    No
                  </button>
                  <button
                    onClick={() => { setConfirmando(null); onAnular(f.clave) }}
                    className="h-11 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white"
                  >
                    Sí, anular
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* El historial completo no tiene nada que hacer en la pantalla donde se
          cobra: acá van las últimas, el resto está a un toque. */}
      {onVerTodas && (
        <button
          onClick={onVerTodas}
          className="px-1 text-xs font-medium text-[#00838f] hover:underline"
        >
          Ver todas
        </button>
      )}
    </section>
  )
}
