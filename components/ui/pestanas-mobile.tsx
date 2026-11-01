"use client"

import { useEffect, useRef } from "react"
import { TabsList } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

/**
 * Las dos barras de pestañas de adentro de un módulo, pensadas para el dedo.
 *
 * Antes las dos eran la misma cosa con distinto tamaño de letra, y en el
 * teléfono las dos se partían en varios renglones. Tres niveles de navegación
 * apilados comían media pantalla antes de mostrar un solo dato.
 *
 * Ahora cada nivel se ve distinto y ocupa UN renglón:
 *
 *   Nivel 2 (Personas → Voluntarios · Participantes · Aprobaciones)
 *     texto corrido, subrayado en el activo, se arrastra de costado.
 *
 *   Nivel 3 (Accesos → Habilitaciones · Auditoría · Alertas)
 *     control segmentado: fondo gris, el activo en blanco con sombra.
 *
 * Que se vean distinto no es decoración: es lo que permite saber de un
 * vistazo cuál manda sobre cuál sin leerlas.
 */

/** Centra la pestaña activa dentro de su fila. */
function useCentrarActiva(ref: React.RefObject<HTMLDivElement | null>, dep: unknown) {
  useEffect(() => {
    const fila = ref.current
    if (!fila) return
    const activa = fila.querySelector<HTMLElement>('[data-state="active"]')
    if (!activa) return

    // A mano y no con `scrollIntoView`: ese método también puede desplazar la
    // PÁGINA para dejar el elemento a la vista, y el efecto era que al entrar
    // a un módulo la pantalla arrancaba unos píxeles más abajo sin motivo.
    // Tocando `scrollLeft` solo se mueve esta fila.
    const destino = activa.offsetLeft - (fila.clientWidth - activa.offsetWidth) / 2
    fila.scrollTo({ left: Math.max(0, destino), behavior: "smooth" })
  }, [ref, dep])
}

/**
 * Nivel 2. Una sola línea que se arrastra, con subrayado en la activa.
 *
 * La fila se desborda a propósito: ver que la última pestaña queda cortada al
 * borde es lo que te dice que hay más para el costado. Si entraran todas
 * apretadas, nadie intentaría arrastrar.
 */
export function PestanasFila({
  valor,
  className,
  children,
}: {
  /** La pestaña activa; sirve para volver a centrarla cuando cambia. */
  valor: string
  className?: string
  children: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  useCentrarActiva(ref, valor)

  return (
    <div
      ref={ref}
      className={cn(
        "sin-barra -mx-4 overflow-x-auto overscroll-x-contain border-b border-gray-200 bg-white px-4",
        "sm:mx-0 sm:rounded-lg sm:border sm:px-1",
        className
      )}
    >
      <TabsList className="flex h-auto w-max justify-start gap-0 bg-transparent p-0 sm:gap-1 sm:p-1">
        {children}
      </TabsList>
    </div>
  )
}

/**
 * La pinta de cada pestaña del nivel 2.
 *
 * `snap-start` para que al soltar el arrastre quede una pestaña alineada al
 * borde en vez de cortada por la mitad.
 */
export const clasePestana = cn(
  "flex shrink-0 snap-start items-center gap-1.5 whitespace-nowrap rounded-none",
  // 44px de alto: el mínimo cómodo para el dedo.
  "border-b-[3px] border-transparent px-3 py-3 text-[14px] text-gray-500 transition-colors",
  "data-[state=inactive]:hover:text-alma-fuerte",
  "data-[state=active]:border-alma data-[state=active]:font-semibold data-[state=active]:text-alma-fuerte",
  // En escritorio vuelve a ser la pastilla de siempre, que ahí sí entra.
  "sm:rounded-md sm:border-b-0 sm:py-2",
  "sm:data-[state=active]:bg-alma/15 sm:data-[state=active]:text-alma-fuerte"
)

/**
 * Nivel 3. Control segmentado: todas las opciones a la vista, repartidas en
 * partes iguales.
 *
 * Es para juegos de 2 a 4 opciones que son VISTAS de lo mismo —Habilitaciones
 * / Auditoría / Alertas, Vender / Stock / Caja—, no destinos distintos. El
 * fondo gris que las encierra dice justamente eso: son una elección entre
 * hermanas, no un lugar nuevo.
 */
export function Segmentado({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <TabsList
      className={cn(
        "grid h-auto w-full auto-cols-fr grid-flow-col gap-1 rounded-xl bg-gray-100 p-1",
        className
      )}
    >
      {children}
    </TabsList>
  )
}

/** La pinta de cada opción del segmentado: la activa es la que está en blanco. */
export const claseSegmento = cn(
  "flex min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 py-2.5",
  "text-[13.5px] text-gray-500 transition-all",
  "data-[state=active]:bg-white data-[state=active]:font-semibold",
  "data-[state=active]:text-alma-fuerte data-[state=active]:shadow-sm"
)

/**
 * El mismo control segmentado, pero suelto: sin Radix, sin `<Tabs>`.
 *
 * Es para los conmutadores que viven DENTRO de una pantalla y mueven un
 * `useState`, no la URL: Pagos registrados / Avisos resueltos, Vender / Stock
 * / Caja / Historial, Todos / Taller / Grupo / Actividad.
 *
 * Antes cada uno era un puñado de botones sueltos con su propio tamaño,
 * redondeo y color: cinco pantallas, cinco formas de decir lo mismo. Y en el
 * teléfono varios se iban de ancho y había que arrastrarlos de costado para
 * descubrir que existía una cuarta opción.
 *
 * Acá las opciones se reparten el ancho en partes iguales: entran todas, se
 * ven todas, y ninguna queda escondida al borde.
 */
export function SegmentadoSimple<T extends string>({
  valor,
  onCambio,
  opciones,
  className,
}: {
  valor: T
  onCambio: (v: T) => void
  opciones: {
    valor: T
    etiqueta: string
    icono?: React.ComponentType<{ className?: string }>
    /** Para la opción que tiene que verse distinta (ej. "Administrar"). */
    claseActiva?: string
  }[]
  className?: string
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "grid w-full auto-cols-fr grid-flow-col gap-1 rounded-xl bg-gray-100 p-1 sm:w-auto",
        className
      )}
    >
      {opciones.map((o) => {
        const activa = o.valor === valor
        const Icono = o.icono
        return (
          <button
            key={o.valor}
            type="button"
            role="tab"
            aria-selected={activa}
            onClick={() => onCambio(o.valor)}
            className={cn(
              "flex min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 py-2.5",
              "text-[13.5px] transition-all sm:px-4",
              activa
                ? cn("bg-white font-semibold shadow-sm", o.claseActiva ?? "text-alma-fuerte")
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            {Icono && <Icono className="h-4 w-4 shrink-0" />}
            <span className="truncate">{o.etiqueta}</span>
          </button>
        )
      })}
    </div>
  )
}
