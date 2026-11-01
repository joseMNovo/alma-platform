"use client"

import type { ReactNode } from "react"

/**
 * Chip de filtro (se prende y se apaga) — el mismo en toda la app.
 *
 * El relleno del activo es `alma-fuerte` y no el celeste: con texto blanco
 * sobre #5EC0CF el contraste da 2,14:1, o sea que al sol no se lee cuál está
 * prendido, que es justo lo único que el chip tiene que comunicar.
 *
 * Alto de 36px: más que los 24px de antes, que en el teléfono obligaban a
 * apuntar. No llega a los 44px de un botón porque los chips van de a varios
 * en una fila, pero con 36 ya se acierta sin mirar.
 */
export default function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition ${
        active
          ? "border-alma-fuerte bg-alma-fuerte text-white"
          : "border-gray-300 bg-white text-gray-600 hover:border-alma hover:text-alma-fuerte"
      }`}
    >
      {children}
    </button>
  )
}
