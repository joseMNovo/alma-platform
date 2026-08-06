import Link from "next/link"
import { GraduationCap, Lock, PlayCircle, CheckCircle2, Clock } from "lucide-react"
import type { Training } from "@/lib/data-manager"

/**
 * Tarjeta de una capacitación. La misma pieza para las dos vidrieras:
 *
 *   - /academia (pública, sin sesión) → se le pasa `href`
 *   - el catálogo de adentro del módulo → se le pasa `onClick`
 *
 * A propósito SIN "use client": no usa hooks, así el mismo archivo se puede
 * renderizar desde un server component (la academia) y desde uno cliente (el
 * manager). Quien la importa define de qué lado corre.
 *
 * Las que no tienen acceso se muestran igual, con candado y precio: es la
 * vidriera. El contenido real nunca viaja — de eso se encarga el backend.
 */
const PALETA = [
  "bg-violet-100 text-violet-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-sky-100 text-sky-700",
  "bg-fuchsia-100 text-fuchsia-700",
  "bg-teal-100 text-teal-700",
  "bg-orange-100 text-orange-700",
]

/**
 * Color de una categoría, derivado de su NOMBRE.
 *
 * Ideas lo hace con un contador y el color depende del orden en que se
 * cargaron: la misma categoría puede salir violeta en una pantalla y verde en
 * otra. Acá se calcula del texto, así "Cuidadores" es siempre del mismo color
 * en todas partes y en todas las sesiones.
 */
export function colorDeCategoria(categoria: string): string {
  let suma = 0
  for (const caracter of categoria.trim().toLowerCase()) {
    suma = (suma + caracter.charCodeAt(0)) % 997
  }
  return PALETA[suma % PALETA.length]
}

/**
 * Agrupa por categoría para armar las secciones del catálogo. Las que no
 * tienen categoría quedan al final, bajo "Otras".
 *
 * Vive acá y no en el manager porque el manager es "use client" y la academia
 * pública es un server component: importar de un módulo cliente la arrastraría
 * entera al bundle del navegador.
 */
export function groupByCategory(trainings: Training[]): [string, Training[]][] {
  const groups = new Map<string, Training[]>()
  for (const t of trainings) {
    const key = t.category?.trim() || ""
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(t)
  }
  // Alfabético, con las sin categoría siempre al final. Si el orden dependiera
  // de cómo vinieron de la base, las secciones se moverían de lugar cada vez
  // que se agrega una capacitación.
  return [...groups.entries()].sort(([a], [b]) =>
    a === "" ? 1 : b === "" ? -1 : a.localeCompare(b, "es"),
  )
}

export default function TrainingCard({
  training,
  href,
  onClick,
  showAccess = false,
  mostrarEstado = false,
  cta: ctaFijo,
}: {
  training: Training
  /** Navegación (vista pública). Excluyente con onClick. */
  href?: string
  /** Selección dentro del módulo. Excluyente con href. */
  onClick?: () => void
  /** Muestra el estado de habilitación de quien mira (solo con sesión). */
  showAccess?: boolean
  /** Marca las que no están publicadas (vista de administración). */
  mostrarEstado?: boolean
  /** Texto del pie. Por defecto sale solo según haya acceso o no. */
  cta?: string
}) {
  const totalMinutes = training.items.reduce((acc, i) => acc + (i.duration_minutes ?? 0), 0)
  const price = Number(training.price)
  const locked = showAccess && !training.has_access
  const progress =
    training.item_count > 0 ? Math.round((training.completed_items / training.item_count) * 100) : 0
  // "Entrar" solo cuando hay contenido para ver del otro lado. Sin sesión
  // (vista pública) el click lleva a la landing, no al reproductor.
  const cta = ctaFijo ?? (showAccess && !locked ? "Entrar" : "Ver detalle")

  const body = (
    <>
      <div className="relative aspect-video w-full overflow-hidden bg-gray-100">
        {training.cover_file_guid ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            // Ruta pública de portadas: la misma para la vidriera sin sesión y
            // para el catálogo de adentro. /api/files/... exige login y dejaba
            // la imagen rota para el visitante.
            src={`/api/capacitaciones/portada/${training.cover_file_guid}`}
            alt={training.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#4dd0e1]/15 to-[#9A8BC2]/15">
            <GraduationCap className="h-10 w-10 text-[#4dd0e1]" />
          </div>
        )}

        {/* Arriba a la IZQUIERDA para no chocar con el candado. Solo cuando no
            está publicada: si está publicada, la ausencia de cartel ya lo dice
            y llenar la grilla de etiquetas verdes no agrega nada. */}
        {mostrarEstado && training.status !== "publicada" && (
          <span
            className={`absolute left-2 top-2 rounded-full px-2 py-1 text-xs font-medium capitalize text-white ${
              training.status === "borrador" ? "bg-amber-500" : "bg-gray-500"
            }`}
          >
            {training.status}
          </span>
        )}

        {locked && (
          <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
            <Lock className="h-3 w-3" />
            Sin acceso
          </span>
        )}
        {showAccess && training.has_access && (
          <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-[#4dd0e1] px-2 py-1 text-xs font-medium text-white">
            <PlayCircle className="h-3 w-3" />
            Disponible
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        {training.category && (
          <span
            className={`w-fit rounded-full px-2 py-0.5 text-xs font-medium ${colorDeCategoria(
              training.category,
            )}`}
          >
            {training.category}
          </span>
        )}

        <h3 className="line-clamp-2 font-semibold leading-snug text-gray-900">{training.title}</h3>

        {training.description && (
          <p className="line-clamp-2 text-sm text-gray-500">{training.description}</p>
        )}

        <p className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs text-gray-500">
          <span>
            {training.item_count} {training.item_count === 1 ? "módulo" : "módulos"}
          </span>
          {totalMinutes > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {totalMinutes} min
            </span>
          )}
        </p>

        {/* Avance: solo tiene sentido en las que ya se pueden ver. */}
        {showAccess && training.has_access && training.item_count > 0 && (
          <div className="space-y-1">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div className="h-full bg-[#4dd0e1] transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="flex items-center gap-1 text-xs text-gray-500">
              {progress === 100 ? (
                <>
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  Completada
                </>
              ) : (
                <>
                  {training.completed_items} de {training.item_count} vistos
                </>
              )}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-gray-100 pt-3">
          {price > 0 ? (
            <span className="font-bold text-gray-900">
              ${price.toLocaleString("es-AR")}
              <span className="ml-1 text-xs font-normal text-gray-400">{training.currency}</span>
            </span>
          ) : (
            <span className="font-semibold text-green-600">Gratuita</span>
          )}
          <span className="text-sm font-medium text-[#4dd0e1]">{cta}</span>
        </div>
      </div>
    </>
  )

  const shell =
    "group flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white text-left transition hover:border-[#4dd0e1] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4dd0e1]"

  if (href) {
    return (
      <Link href={href} className={shell}>
        {body}
      </Link>
    )
  }

  return (
    <button type="button" onClick={onClick} className={shell}>
      {body}
    </button>
  )
}
