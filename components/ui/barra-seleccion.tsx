"use client"

import { X } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * La barra que aparece abajo cuando hay filas tildadas.
 *
 * Reemplaza al botón de "Habilitar acceso" / "Emitir certificados" que vivía
 * arriba de la lista. El problema de tenerlo arriba es de orden: tildás diez
 * personas bajando por la lista y, cuando terminás, el botón que confirma
 * quedó tres pantallas más arriba. Peor todavía, no decía cuántas habías
 * tildado, así que no había forma de revisar antes de apretar.
 *
 * Acá la barra sube sola al tildar la primera, dice el número, y se va al
 * destildar la última. El botón nunca se busca: aparece donde está el dedo.
 */
export default function BarraSeleccion({
  cantidad,
  sustantivo = "seleccionados",
  onLimpiar,
  children,
  className,
}: {
  cantidad: number
  /** En plural. El singular se arma sacando la "s" final. */
  sustantivo?: string
  onLimpiar: () => void
  /** Los botones de acción. Van a la derecha, el principal último. */
  children: React.ReactNode
  className?: string
}) {
  // Nada tildado, nada que mostrar. Se desmonta en vez de esconderse para que
  // no quede capturando toques sobre la última fila de la lista.
  if (cantidad === 0) return null

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-gray-200",
        "bg-white px-4 pt-3 shadow-[0_-4px_16px_rgba(0,0,0,0.08)]",
        "animate-in slide-in-from-bottom duration-200",
        className
      )}
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      {/* Destildar todo de una. Sin esto, salir de una selección de treinta
          filas es destildar treinta veces o recargar la pantalla. */}
      <button
        type="button"
        onClick={onLimpiar}
        aria-label="Quitar la selección"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors active:bg-gray-100"
      >
        <X className="h-5 w-5" />
      </button>

      <span className="shrink-0 text-sm font-semibold text-gray-800">
        {cantidad}{" "}
        <span className="font-normal text-alma-tinta">
          {cantidad === 1 ? sustantivo.replace(/s$/, "") : sustantivo}
        </span>
      </span>

      <div className="ml-auto flex min-w-0 items-center gap-2">{children}</div>
    </div>
  )
}
