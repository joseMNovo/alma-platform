"use client"

import { useEffect, useRef, useState } from "react"
import { HelpCircle } from "lucide-react"

/**
 * El signo de pregunta que explica un campo.
 *
 * Reemplaza a los párrafos de ayuda debajo de cada input: en un formulario
 * largo, esos textos ocupan más espacio que los campos y se leen una sola vez,
 * la primera. Acá la explicación está a un toque de distancia y el resto del
 * tiempo no estorba.
 *
 * No usa el Tooltip de Radix a propósito: ese abre con `hover`, y en el
 * celular no hay hover — el texto quedaría inalcanzable justo para quien más
 * lo necesita. Este abre con click/tap y también al pasar el mouse.
 */
export default function Ayuda({
  children,
  lado = "arriba",
}: {
  children: React.ReactNode
  /** Hacia dónde se abre la burbuja. Usar "abajo" cuando el campo está arriba de todo. */
  lado?: "arriba" | "abajo"
}) {
  const [abierto, setAbierto] = useState(false)
  const contenedor = useRef<HTMLSpanElement>(null)

  // Un click en cualquier otro lado la cierra. Sin esto quedan burbujas
  // abiertas por toda la pantalla al recorrer un formulario.
  useEffect(() => {
    if (!abierto) return
    const alClickear = (evento: MouseEvent) => {
      if (!contenedor.current?.contains(evento.target as Node)) setAbierto(false)
    }
    const alEscapar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setAbierto(false)
    }
    document.addEventListener("mousedown", alClickear)
    document.addEventListener("keydown", alEscapar)
    return () => {
      document.removeEventListener("mousedown", alClickear)
      document.removeEventListener("keydown", alEscapar)
    }
  }, [abierto])

  return (
    <span
      ref={contenedor}
      className="relative inline-flex align-middle"
      onMouseEnter={() => setAbierto(true)}
      onMouseLeave={() => setAbierto(false)}
    >
      <button
        type="button"
        aria-label="Qué es esto"
        aria-expanded={abierto}
        onClick={(e) => {
          // Suele vivir adentro de un <label>: sin esto, el click también
          // enfoca (o togglea) el campo asociado.
          e.preventDefault()
          e.stopPropagation()
          setAbierto((a) => !a)
        }}
        className="text-gray-300 transition hover:text-[#4dd0e1]"
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>

      {abierto && (
        // Anclada a la IZQUIERDA del ícono, no centrada. Centrada, la mitad de
        // la burbuja caía fuera del diálogo y quedaba cortada: los modales
        // tienen `overflow-y-auto`, y en CSS eso recorta también a lo ancho.
        // Como el ícono siempre va pegado a una etiqueta alineada a la
        // izquierda, hacia la derecha sobra lugar.
        <span
          role="tooltip"
          className={`absolute left-0 z-50 w-60 max-w-[min(15rem,calc(100vw-2rem))] rounded-lg bg-gray-800 px-3 py-2 text-xs font-normal leading-relaxed text-white shadow-lg ${
            lado === "abajo" ? "top-6" : "bottom-6"
          }`}
        >
          {children}
        </span>
      )}
    </span>
  )
}
