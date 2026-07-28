"use client"

import type { ReactNode } from "react"

/** Chip de filtro rápido (toggle) — mismo estilo en toda la app: Accesos,
 *  Participantes, etc. Activo = relleno teal; inactivo = contorno gris. */
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
      onClick={onClick}
      className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
        active
          ? "border-[#4dd0e1] bg-[#4dd0e1] text-white"
          : "border-gray-300 text-gray-500 hover:border-[#4dd0e1] hover:text-[#00838f]"
      }`}
    >
      {children}
    </button>
  )
}
