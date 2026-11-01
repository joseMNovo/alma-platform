"use client"

import { useEffect, useState } from "react"
import type { LucideIcon } from "lucide-react"
import { Plus } from "lucide-react"

/**
 * El botón de la acción principal, flotando abajo a la derecha.
 *
 * Existe porque en el teléfono el botón de "Nuevo" estaba arriba de todo, y
 * una vez que bajabas tres filas de la lista dejaba de existir. Acá siempre
 * está, y además cae justo donde llega el pulgar de una mano sola.
 *
 * ── Por qué se SUBE cuando aparece el pie ─────────────────────────────
 *
 * Flotando fijo abajo a la derecha, el botón tapaba el "Creado con amor por
 * ALMA Rosario".
 *
 * El primer intento fue desvanecerlo cuando el pie entraba en pantalla, con
 * el razonamiento de que si ves el pie ya llegaste al final y no hay nada
 * más que crear desde ahí. Estaba mal: en una pantalla corta —dos historiales,
 * un inventario recién empezado— el pie se ve SIEMPRE, así que el botón
 * desaparecía para no volver nunca. Justo en las pantallas más vacías, que
 * son exactamente en las que hace falta crear algo.
 *
 * Ahora se corre hacia arriba lo que mida la parte visible del pie. Nunca se
 * va, nunca tapa, y en una lista larga —mientras el pie está fuera de
 * pantalla— se queda abajo del todo, que es donde se lo busca.
 */
export default function BotonFlotante({
  onClick,
  children,
  icono: Icono = Plus,
  className = "",
  /** Lo que lee un lector de pantalla si el botón es solo el ícono. */
  etiqueta,
}: {
  onClick: () => void
  children?: React.ReactNode
  icono?: LucideIcon
  className?: string
  etiqueta?: string
}) {
  /** Cuántos píxeles del pie hay a la vista; es lo que hay que subir. */
  const [subir, setSubir] = useState(0)

  useEffect(() => {
    const pie = document.querySelector("[data-alma-pie]")
    // Sin pie no hay nada que esquivar (pasa en /venta, que es pantalla
    // completa). El botón se queda abajo y listo.
    if (!pie) return

    let pedido = 0

    const medir = () => {
      pedido = 0
      const caja = pie.getBoundingClientRect()
      // Cuánto del pie entró por abajo. Negativo = todavía no se ve.
      const invasion = window.innerHeight - caja.top
      setSubir(invasion > 0 ? Math.round(invasion) : 0)
    }

    // Agrupado en un cuadro de animación: el scroll dispara decenas de veces
    // por segundo y medir en cada una fuerza al navegador a recalcular el
    // diseño, que es justo lo que se nota como tirones al arrastrar.
    const alCambiar = () => {
      if (!pedido) pedido = requestAnimationFrame(medir)
    }

    medir()
    window.addEventListener("scroll", alCambiar, { passive: true })
    window.addEventListener("resize", alCambiar)

    // La página puede cambiar de alto sin que nadie scrollee: al filtrar, al
    // terminar de cargar la lista, al abrirse un acordeón. Ahí el pie se
    // mueve y la cuenta de arriba queda vieja.
    const observador = new ResizeObserver(alCambiar)
    observador.observe(document.body)

    return () => {
      window.removeEventListener("scroll", alCambiar)
      window.removeEventListener("resize", alCambiar)
      observador.disconnect()
      if (pedido) cancelAnimationFrame(pedido)
    }
  }, [])

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={etiqueta ?? (typeof children === "string" ? children : "Nuevo")}
      className={`
        fixed right-4 z-30 flex h-14 items-center gap-2 rounded-full
        bg-alma-fuerte text-white shadow-lg shadow-alma-fuerte/30
        transition-[bottom] duration-150 active:scale-95 active:bg-alma-oscuro
        ${children ? "px-5" : "w-14 justify-center"}
        ${className}
      `}
      style={{
        // La barra de gestos del iPhone se come el borde de abajo. `max()`
        // deja los 20px de siempre donde no hay barra.
        bottom: `calc(max(1.25rem, env(safe-area-inset-bottom)) + ${subir}px)`,
      }}
    >
      <Icono className="h-6 w-6 shrink-0" />
      {children && <span className="text-[15px] font-semibold">{children}</span>}
    </button>
  )
}
