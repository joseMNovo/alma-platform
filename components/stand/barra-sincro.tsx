"use client"

import { Check, CloudOff, Loader2, RefreshCw, Share2, TriangleAlert, WifiOff } from "lucide-react"

export type EstadoEnvio = "quieto" | "enviando" | "ok" | "falló"

/**
 * El estado de la cola, siempre a la vista.
 *
 * Dos decisiones que parecen de detalle y no lo son:
 *
 * **Nunca desaparece.** Podría mostrarse solo cuando hay ventas pendientes,
 * pero entonces faltaría justo en el caso en que se la necesita: cuando el
 * contador quedó mal, cuando no estás seguro, cuando querés apretar algo
 * antes de guardar el teléfono. Un botón de emergencia no puede depender del
 * estado que viene a rescatar.
 *
 * **Con todo al día, "Enviar" no queda muerto**: revisa la cola igual y de
 * paso recarga catálogo y stock. O sea que el botón de pánico es además el de
 * "actualizame esto", que es lo que uno quiere apretar cuando desconfía de lo
 * que ve en pantalla.
 */
export default function BarraSincro({
  pendientes,
  rechazadas,
  estado,
  modoOffline,
  onEnviar,
  onExportar,
  onAlternarModo,
  onReintentarRechazadas,
}: {
  pendientes: number
  rechazadas: number
  estado: EstadoEnvio
  modoOffline: boolean
  onEnviar: () => void
  onExportar: () => void
  onAlternarModo: () => void
  onReintentarRechazadas: () => void
}) {
  const hayPendientes = pendientes > 0

  const { fondo, borde, texto, icono, mensaje } = (() => {
    if (estado === "enviando")
      return {
        fondo: "bg-sky-50", borde: "border-sky-200", texto: "text-sky-900",
        icono: <Loader2 className="h-4 w-4 animate-spin" />,
        mensaje: `Enviando ${pendientes}…`,
      }
    if (modoOffline)
      return {
        fondo: "bg-amber-50", borde: "border-amber-300", texto: "text-amber-900",
        icono: <CloudOff className="h-4 w-4" />,
        mensaje: hayPendientes
          ? `Sin conexión · ${pendientes} guardada${pendientes === 1 ? "" : "s"} acá`
          : "Sin conexión · las ventas se guardan en el teléfono",
      }
    if (estado === "falló")
      return {
        fondo: "bg-red-50", borde: "border-red-200", texto: "text-red-900",
        icono: <WifiOff className="h-4 w-4" />,
        mensaje: `No se pudo enviar. ${pendientes} sigue${pendientes === 1 ? "" : "n"} guardada${pendientes === 1 ? "" : "s"} acá.`,
      }
    if (hayPendientes)
      return {
        fondo: "bg-amber-50", borde: "border-amber-300", texto: "text-amber-900",
        icono: <TriangleAlert className="h-4 w-4" />,
        mensaje: `${pendientes} venta${pendientes === 1 ? "" : "s"} sin enviar`,
      }
    return {
      fondo: "bg-emerald-50", borde: "border-emerald-200", texto: "text-emerald-900",
      icono: <Check className="h-4 w-4" />,
      mensaje: "Todo enviado",
    }
  })()

  /** 44px de alto mínimo: esto se toca parado, con una mano y con alguien
   *  esperando enfrente. */
  const boton =
    "inline-flex h-11 items-center justify-center gap-1.5 rounded-lg border px-3 text-sm font-semibold transition-colors active:scale-[0.98]"

  return (
    <div className={`rounded-xl border ${borde} ${fondo} px-3 py-2.5`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className={`flex min-w-0 items-center gap-2 text-sm font-medium ${texto}`}>
          {icono}
          <span className="truncate">{mensaje}</span>
        </span>

        {/* Los botones solo cuando hay algo que hacer. Con todo al día, la
            franja es puro estado: una línea que dice que no hay nada
            pendiente, y nada para apretar. */}
        {hayPendientes && (
          <>
            <button
              onClick={onEnviar}
              disabled={estado === "enviando"}
              className={`${boton} border-gray-300 bg-white text-gray-800 disabled:opacity-50`}
            >
              <RefreshCw className="h-4 w-4" />
              Enviar ahora
            </button>
            <button onClick={onExportar} className={`${boton} border-gray-300 bg-white text-gray-800`}>
              <Share2 className="h-4 w-4" />
              Exportar
            </button>
          </>
        )}

        {/* El interruptor manual, a la derecha y en gris: está siempre, pero
            no compite con el estado ni con los botones. No reemplaza a la
            detección automática — está para cuando hay UNA barra de señal y
            cada pedido tarda treinta segundos en morir, que se cobra peor que
            no tener señal. */}
        <label className="ml-auto flex shrink-0 cursor-pointer items-center gap-2 text-xs text-gray-500">
          <input
            type="checkbox"
            checked={modoOffline}
            onChange={onAlternarModo}
            className="h-[22px] w-[22px] cursor-pointer rounded border-gray-300 accent-[#00838f]"
          />
          Trabajar sin conexión
        </label>
      </div>

      {/* Las apartadas van aparte: el servidor las rechazó por su contenido,
          así que reintentarlas solas fallaría siempre. Solo a pedido. */}
      {rechazadas > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-red-200 pt-2">
          <span className="min-w-0 flex-1 text-sm font-medium text-red-900">
            {rechazadas} venta{rechazadas === 1 ? "" : "s"} con problemas
          </span>
          <button
            onClick={onReintentarRechazadas}
            className={`${boton} border-red-300 bg-white text-red-700`}
          >
            Reintentar igual
          </button>
        </div>
      )}
    </div>
  )
}
