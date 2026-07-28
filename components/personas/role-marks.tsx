"use client"

import { UserCircle } from "lucide-react"

/**
 * Marcas de rol (voluntario/a, participante) — compartidas entre Base de
 * datos y Accesos para que una persona se identifique igual en toda la app.
 */

/** Flor del logo de ALMA como marca de voluntario/a: en color si es voluntaria,
 *  en gris (grayscale) si no. */
export function VolunteerFlower({ active, size = "w-4 h-4" }: { active?: boolean; size?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/images/flor.png"
      alt={active ? "Voluntario/a" : "No voluntario/a"}
      className={`${size} object-contain transition-all ${active ? "" : "grayscale opacity-40"}`}
    />
  )
}

/** Marca participante: coloreada si tiene login de participante. */
export function ParticipantMark({ active, size = "w-4 h-4" }: { active?: boolean; size?: string }) {
  return (
    <UserCircle
      className={`${size} ${active ? "text-[#0097a7]" : "text-gray-300"}`}
      aria-label={active ? "Participante" : "No participante"}
    />
  )
}
