import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formatea una fecha "YYYY-MM-DD" (o datetime) sin desplazamiento de zona horaria.
 * new Date("YYYY-MM-DD") interpreta como UTC midnight → en Argentina (UTC-3) muestra el día anterior.
 * Esta función parsea la parte de fecha localmente para evitar ese problema.
 */
export function formatLocalDate(
  dateStr: string | null | undefined,
  options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit", year: "numeric" },
  locale = "es-AR"
): string {
  if (!dateStr) return "-"
  const [y, m, d] = dateStr.slice(0, 10).split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(locale, options)
}
