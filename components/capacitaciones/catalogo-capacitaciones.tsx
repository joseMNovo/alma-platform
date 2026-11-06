"use client"

import { useMemo, useState } from "react"
import { ChevronDown, ChevronUp, ArrowDown } from "lucide-react"
import type { Training } from "@/lib/data-manager"
import TrainingCard, { groupByCategory, colorDeCategoria } from "./training-card"

/**
 * La vidriera de capacitaciones, con su filtro por categoría.
 *
 * Es la MISMA pieza en los dos lados:
 *
 *   - /academia (una sola ruta: vidriera sin sesión, módulo con sesión) → se le pasa `hrefBase`
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
  onReordenar,
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
  /**
   * Si viene, cada tarjeta muestra flechas para acomodarla. Recibe la lista
   * ENTERA de ids en el orden nuevo. Solo se le pasa a quien administra: el
   * orden que se guarda es el que ve todo el mundo, incluida la landing
   * pública, así que no es una preferencia de quien mira.
   */
  onReordenar?: (orden: number[]) => void
}) {
  /**
   * El orden mientras se acomoda.
   *
   * Las flechas tienen que mover la tarjeta en el acto: esperar a que vuelva
   * el guardado es medio segundo mirando una lista quieta, y ahí uno vuelve a
   * tocar la flecha pensando que no anduvo. Se reordena acá y el guardado va
   * por detrás.
   *
   * Se guardan ids y no objetos: cuando el padre recarga llegan objetos
   * nuevos con los datos frescos, y esto los reordena igual. Un id que no
   * esté en la lista local (una capacitación recién creada) queda al final
   * en vez de desaparecer.
   */
  const [ordenLocal, setOrdenLocal] = useState<number[] | null>(null)

  const ordenadas = useMemo(() => {
    if (!ordenLocal) return trainings
    const posicion = new Map(ordenLocal.map((id, i) => [id, i]))
    return [...trainings].sort(
      (a, b) => (posicion.get(a.id) ?? Infinity) - (posicion.get(b.id) ?? Infinity),
    )
  }, [trainings, ordenLocal])

  const grupos = useMemo(() => groupByCategory(ordenadas), [ordenadas])
  const [filtro, setFiltro] = useState<string | null>(null)
  const [plegadas, setPlegadas] = useState<string[]>([])

  /**
   * Mueve una capacitación un lugar dentro de SU categoría.
   *
   * Dentro de la categoría y no en la lista entera porque es lo que se ve: la
   * grilla está agrupada, así que una tarjeta que "subiera" hasta salirse de
   * su sección desaparecería de donde la estabas mirando.
   *
   * Después arma el orden global pegando todos los grupos tal como se
   * muestran. Así cada categoría ocupa un tramo propio de `sort_order` y el
   * agrupado no se desarma.
   */
  const mover = (categoria: string, indice: number, paso: -1 | 1) => {
    if (!onReordenar) return
    const destino = indice + paso

    const nuevos = grupos.map(([nombre, lista]): [string, Training[]] => {
      if (nombre !== categoria) return [nombre, lista]
      if (destino < 0 || destino >= lista.length) return [nombre, lista]
      const copia = [...lista]
      const guardada = copia[indice]
      copia[indice] = copia[destino]
      copia[destino] = guardada
      return [nombre, copia]
    })

    const orden = nuevos.flatMap(([, lista]) => lista.map((t) => t.id))
    setOrdenLocal(orden)
    onReordenar(orden)
  }

  // Sin categorías cargadas no hay nada que filtrar ni títulos que poner:
  // queda una grilla y listo.
  const sinCategorias = grupos.length === 1 && grupos[0][0] === ""
  const visibles = filtro === null ? grupos : grupos.filter(([nombre]) => nombre === filtro)

  const tarjeta = (t: Training, categoria: string, i: number, total: number) => (
    <div key={t.id} className="flex flex-col">
      <TrainingCard
        training={t}
        showAccess={showAccess}
        mostrarEstado={mostrarEstado}
        cta={cta}
        href={hrefBase ? `${hrefBase}/${t.slug}` : undefined}
        onClick={onSelect ? () => onSelect(t) : undefined}
      />

      {/* Las flechas van DEBAJO de la tarjeta y no encima de la portada: ahí
          arriba taparían la imagen, y además la tarjeta entera es un botón
          que abre la capacitación, así que una flecha flotando encima se
          tocaría sin querer al intentar entrar. */}
      {onReordenar && total > 1 && (
        <div className="mt-1.5 flex items-center gap-1.5">
          <Flecha
            etiqueta={`Subir ${t.title}`}
            Icono={ChevronUp}
            deshabilitada={i === 0}
            onClick={() => mover(categoria, i, -1)}
          />
          <Flecha
            etiqueta={`Bajar ${t.title}`}
            Icono={ArrowDown}
            deshabilitada={i === total - 1}
            onClick={() => mover(categoria, i, 1)}
          />
          <span className="ml-auto text-xs tabular-nums text-gray-400">
            {i + 1} de {total}
          </span>
        </div>
      )}
    </div>
  )

  const grilla = (categoria: string, list: Training[]) => (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {list.map((t, i) => tarjeta(t, categoria, i, list.length))}
    </div>
  )

  if (sinCategorias) return grilla(grupos[0][0], grupos[0][1])

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
          if (filtro !== null) return <div key={clave}>{grilla(nombre, list)}</div>

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
              {!plegada && grilla(nombre, list)}
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
          ? "bg-alma-fuerte text-white"
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

/** Una flecha de 44px: se usa con el pulgar, en el teléfono. */
function Flecha({
  etiqueta,
  Icono,
  deshabilitada,
  onClick,
}: {
  etiqueta: string
  Icono: typeof ChevronUp
  deshabilitada: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={deshabilitada}
      aria-label={etiqueta}
      title={etiqueta}
      className="flex h-11 w-11 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors active:bg-gray-100 disabled:opacity-30 sm:h-9 sm:w-9"
    >
      <Icono className="h-4 w-4" />
    </button>
  )
}
