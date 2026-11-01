"use client"

import { useState } from "react"
import { SlidersHorizontal, X } from "lucide-react"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

/**
 * Los filtros de una lista, en el teléfono.
 *
 * ── El problema ───────────────────────────────────────────────────────
 *
 * Cada pantalla resolvía los filtros a su manera: Accesos tenía un botón
 * naranja, Personas uno celeste a todo lo ancho, y varias desparramaban diez
 * chips arriba de la lista. Esos chips ocupaban cuatro renglones —media
 * pantalla— ANTES del primer resultado, y encima quedaban prendidos sin que
 * nadie se diera cuenta: "no aparece Juana" casi siempre era un filtro
 * olvidado de la semana pasada.
 *
 * ── La forma ──────────────────────────────────────────────────────────
 *
 * Un renglón: buscador + un botón "Filtros" con el número de los que están
 * puestos. Las opciones viven en una hoja que sube desde abajo, con "Limpiar"
 * y "Ver N resultados". Y debajo del buscador quedan, en una línea que se
 * arrastra, SOLO los filtros activos, cada uno con su cruz.
 *
 * Así el estado nunca es invisible: si hay algo filtrado, está escrito; si no
 * hay nada, no ocupa un pixel.
 */

export function HojaFiltros({
  cantidad,
  resultados,
  onLimpiar,
  children,
  sustantivo = "resultados",
  className,
}: {
  /** Cuántos filtros están puestos. 0 = el botón va apagado. */
  cantidad: number
  /** Cuántas filas quedan con lo elegido. Se muestra en el botón de cerrar. */
  resultados: number
  onLimpiar: () => void
  children: React.ReactNode
  sustantivo?: string
  className?: string
}) {
  const [abierta, setAbierta] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierta(true)}
        className={cn(
          "flex h-11 shrink-0 items-center gap-2 rounded-lg border px-3.5 text-sm font-medium transition-colors",
          cantidad > 0
            ? "border-alma-fuerte bg-alma-suave text-alma-fuerte"
            : "border-gray-300 bg-white text-gray-600 hover:border-alma",
          className
        )}
      >
        <SlidersHorizontal className="h-4 w-4 shrink-0" />
        Filtros
        {cantidad > 0 && (
          <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-alma-fuerte px-1 text-[11px] font-bold text-white">
            {cantidad}
          </span>
        )}
      </button>

      <Sheet open={abierta} onOpenChange={setAbierta}>
        <SheetContent
          side="bottom"
          className="flex max-h-[85dvh] flex-col gap-0 rounded-t-[22px] p-0"
        >
          <div className="shrink-0 px-5 pb-3 pt-4">
            <div aria-hidden className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-gray-300" />
            <SheetTitle className="text-left text-lg font-semibold">Filtros</SheetTitle>
          </div>

          {/* El cuerpo es lo único que se desplaza: el título arriba y los dos
              botones abajo quedan siempre a la vista, así no hay que recorrer
              una lista larga de opciones para encontrar "Aplicar". */}
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overflow-x-hidden overscroll-contain px-5 pb-4">
            {children}
          </div>

          <div
            className="flex shrink-0 items-center gap-2 border-t bg-white px-5 pt-3"
            style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
          >
            <button
              type="button"
              onClick={onLimpiar}
              disabled={cantidad === 0}
              className="h-12 flex-1 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 transition-colors active:bg-gray-100 disabled:opacity-40"
            >
              Limpiar
            </button>
            {/* Dice cuántos quedan ANTES de cerrar: si el número es 0, te
                enterás acá y corregís, en vez de cerrar y encontrarte una
                lista vacía sin saber por qué. */}
            <button
              type="button"
              onClick={() => setAbierta(false)}
              className="h-12 flex-[2] rounded-xl bg-alma-fuerte text-sm font-semibold text-white transition-colors active:bg-alma-oscuro"
            >
              Ver {resultados} {resultados === 1 ? sustantivo.replace(/s$/, "") : sustantivo}
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

export interface FiltroActivo {
  id: string
  texto: string
  quitar: () => void
}

/**
 * La línea de abajo del buscador: cuántos hay y qué filtros están puestos.
 *
 * Se arrastra de costado en vez de partirse en varios renglones. Con cinco
 * filtros activos, envolver habría empujado la lista media pantalla hacia
 * abajo; arrastrando, siempre ocupa un renglón.
 */
export function ChipsActivos({
  total,
  sustantivo = "resultados",
  filtros,
  className,
}: {
  total: number
  sustantivo?: string
  filtros: FiltroActivo[]
  className?: string
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="shrink-0 text-[13px] text-alma-tinta">
        {total} {total === 1 ? sustantivo.replace(/s$/, "") : sustantivo}
      </span>

      {filtros.length > 0 && (
        <div className="sin-barra flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto">
          {filtros.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={f.quitar}
              className="flex h-7 shrink-0 items-center gap-1 rounded-full bg-alma-suave pl-2.5 pr-1.5 text-[12.5px] font-medium text-alma-fuerte"
            >
              <span className="max-w-[140px] truncate">{f.texto}</span>
              <X className="h-3.5 w-3.5 shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
