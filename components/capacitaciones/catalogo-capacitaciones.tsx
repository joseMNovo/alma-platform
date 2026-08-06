"use client"

import { useMemo, useState } from "react"
import { ChevronDown } from "lucide-react"
import type { Training } from "@/lib/data-manager"
import TrainingCard, { groupByCategory, colorDeCategoria } from "./training-card"

/**
 * La vidriera de capacitaciones, con su filtro por categoría.
 *
 * Es la MISMA pieza en los dos lados:
 *
 *   - /academia (pública, sin sesión) → se le pasa `hrefBase`
 *   - el catálogo de adentro del módulo → se le pasa `onSelect`
 *
 * La academia es un server component y no puede pasarle una función, por eso el
 * destino se puede definir con un string. Lo demás es idéntico: quien entra
 * desde Instagram y quien entra logueado ven la misma vidriera.
 *
 * La categoría es texto libre cargado en cada capacitación. Lo que se cargue
 * aparece acá solo: no hay lista de categorías que mantener en ningún lado.
 */
export default function CatalogoCapacitaciones({
  trainings,
  hrefBase,
  onSelect,
  showAccess = false,
  mostrarEstado = false,
  cta,
}: {
  trainings: Training[]
  /** Prefijo del link de cada tarjeta, ej. "/capacitacion". Excluyente con onSelect. */
  hrefBase?: string
  /** Selección dentro del módulo. Excluyente con hrefBase. */
  onSelect?: (training: Training) => void
  /** Muestra el estado de habilitación de quien mira (solo con sesión). */
  showAccess?: boolean
  /** Marca las que no están publicadas (vista de administración). */
  mostrarEstado?: boolean
  /** Texto del pie de cada tarjeta. */
  cta?: string
}) {
  const grupos = useMemo(() => groupByCategory(trainings), [trainings])
  const [filtro, setFiltro] = useState<string | null>(null)
  const [plegadas, setPlegadas] = useState<string[]>([])

  // Sin categorías cargadas no hay nada que filtrar ni títulos que poner:
  // queda una grilla y listo.
  const sinCategorias = grupos.length === 1 && grupos[0][0] === ""
  const visibles = filtro === null ? grupos : grupos.filter(([nombre]) => nombre === filtro)

  const tarjeta = (t: Training) => (
    <TrainingCard
      key={t.id}
      training={t}
      showAccess={showAccess}
      mostrarEstado={mostrarEstado}
      cta={cta}
      href={hrefBase ? `${hrefBase}/${t.slug}` : undefined}
      onClick={onSelect ? () => onSelect(t) : undefined}
    />
  )

  const grilla = (list: Training[]) => (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{list.map(tarjeta)}</div>
  )

  if (sinCategorias) return grilla(grupos[0][1])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Chip activo={filtro === null} onClick={() => setFiltro(null)}>
          Todas
          <Contador>{trainings.length}</Contador>
        </Chip>
        {grupos.map(([nombre, list]) => (
          <Chip
            key={nombre || "otras"}
            activo={filtro === nombre}
            color={nombre ? colorDeCategoria(nombre) : undefined}
            onClick={() => setFiltro(filtro === nombre ? null : nombre)}
          >
            {nombre || "Otras"}
            <Contador>{list.length}</Contador>
          </Chip>
        ))}
      </div>

      <div className="space-y-8">
        {visibles.map(([nombre, list]) => {
          const clave = nombre || "otras"
          // Con el filtro puesto queda una sola sección y el título repetiría
          // la pastilla ya marcada arriba: en ese caso va la grilla sola.
          if (filtro !== null) return <div key={clave}>{grilla(list)}</div>

          const plegada = plegadas.includes(clave)
          return (
            <section key={clave} className="space-y-3">
              <button
                type="button"
                onClick={() =>
                  setPlegadas((previas) =>
                    plegada ? previas.filter((c) => c !== clave) : [...previas, clave],
                  )
                }
                className="flex w-full items-center gap-2 border-b border-gray-100 pb-2 text-left transition hover:border-gray-200"
              >
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${
                    plegada ? "-rotate-90" : ""
                  }`}
                />
                <span className="text-sm font-semibold uppercase tracking-wide text-gray-600">
                  {nombre || "Otras"}
                </span>
                <span className="text-sm text-gray-400">{list.length}</span>
              </button>
              {!plegada && grilla(list)}
            </section>
          )
        })}
      </div>
    </div>
  )
}

function Chip({
  activo,
  color,
  onClick,
  children,
}: {
  activo: boolean
  color?: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition ${
        activo
          ? "bg-[#4dd0e1] text-white"
          : color
            ? `${color} hover:brightness-95`
            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
      }`}
    >
      {children}
    </button>
  )
}

/** El número de la pastilla, siempre un punto más apagado que el texto. */
function Contador({ children }: { children: React.ReactNode }) {
  return <span className="text-xs opacity-60">{children}</span>
}
