"use client"

import { useEffect, useRef, useState } from "react"
import { Home, ChevronDown } from "lucide-react"
import type { ModuleDef } from "@/lib/modules"
import { visibleChildren, type Grant } from "@/lib/access"

/**
 * Barra de módulos: la fila de pestañas, debajo del encabezado.
 *
 * Dos cosas cambiaron respecto de la versión anterior:
 *
 * 1. El desplegable abre al TOCAR, no al pasar el mouse. Antes, para ver qué
 *    había adentro de Academia tenías que entrar a Academia y esperar a que
 *    cargara la pantalla. Mirar qué hay no debería costar una navegación.
 * 2. Vive fuera de `<Tabs>` y son botones comunes. La pestaña activa la
 *    decide la URL (`resolveRoute`), así que no hacía falta que Radix
 *    manejara ningún estado: lo único que hacía era obligar a que el nav
 *    estuviera adentro del contenedor del contenido.
 *
 * Lo que NO cambió: las pestañas salen del registro de módulos filtrado por
 * rol y habilitaciones. Un módulo nuevo aparece acá solo, sin tocar este
 * archivo.
 */
export default function BarraModulos({
  user,
  grants,
  modules,
  activeTab,
  esInicio,
  navegar,
  rutaDe,
  badges = {},
}: {
  user: any
  grants: Grant[]
  modules: ModuleDef[]
  activeTab: string
  esInicio: boolean
  navegar: (ruta: string) => void
  /** Adónde lleva una pestaña: su primera hoja visible, nunca una pantalla vacía. */
  rutaDe: (mod: ModuleDef) => string
  /** Cuántas cosas esperan, por `key` de módulo. */
  badges?: Record<string, number>
}) {
  /** Qué grupo tiene el desplegable abierto. Uno solo: dos menúes abiertos a
   *  la vez tapan la pantalla y ninguno se lee como "el que elegí". */
  const [abierto, setAbierto] = useState<string | null>(null)
  const barraRef = useRef<HTMLDivElement>(null)

  // Cerrar al tocar afuera o con Escape. Sin esto, el menú queda colgado
  // encima del contenido y hay que volver a tocar la misma pestaña para
  // sacarlo, que no se le ocurre a nadie.
  useEffect(() => {
    if (!abierto) return
    const afuera = (e: MouseEvent) => {
      if (!barraRef.current?.contains(e.target as Node)) setAbierto(null)
    }
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(null)
    }
    document.addEventListener("mousedown", afuera)
    document.addEventListener("keydown", escape)
    return () => {
      document.removeEventListener("mousedown", afuera)
      document.removeEventListener("keydown", escape)
    }
  }, [abierto])

  const itemBase =
    "flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-[13.5px] transition-colors"

  return (
    <div
      ref={barraRef}
      className="hidden border-b border-gray-200 bg-white md:block"
    >
      {/*
        Sin `overflow-x-auto`, y no es un olvido: limitar un eje hace que el
        navegador ponga el otro en `auto`, así que el scroll horizontal traía
        de regalo una barra vertical a la derecha y, peor, recortaba el
        desplegable — que es un hijo absoluto que sobresale hacia abajo.

        La alternativa era portar el menú a document.body y calcularle la
        posición a mano. Esto es más barato: en una pantalla angosta las
        pestañas pasan a dos renglones, que se lee igual de bien y no esconde
        ninguna.
      */}
      <div className="relative mx-auto flex max-w-[1600px] flex-wrap items-center gap-0.5 px-4 sm:px-6 lg:px-8">
        {/* Inicio no es un módulo del registro: es la pantalla de bienvenida.
            Va primero porque es a donde se vuelve, no a donde se entra. */}
        <button
          onClick={() => { setAbierto(null); navegar("/inicio") }}
          className={`${itemBase} ${
            esInicio
              ? "border-[#4dd0e1] font-semibold text-[#00838f]"
              : "border-transparent text-gray-600 hover:text-[#00838f]"
          }`}
        >
          <Home className="h-4 w-4 shrink-0" />
          Inicio
        </button>

        {modules.map((mod) => {
          const Icono = mod.icon
          const hijos = visibleChildren(user, mod, grants)
          // Con un solo hijo (Agenda → Calendarios) no hay nada que desplegar:
          // un menú de una sola opción es un click de más para llegar a lo mismo.
          const desplegable = hijos.length > 1
          const activo = !esInicio && activeTab === mod.key
          const esperando = badges[mod.key] ?? 0
          const estaAbierto = abierto === mod.key

          return (
            <div key={mod.key} className="relative">
              <button
                onClick={() =>
                  desplegable
                    ? setAbierto(estaAbierto ? null : mod.key)
                    : (setAbierto(null), navegar(rutaDe(mod)))
                }
                aria-expanded={desplegable ? estaAbierto : undefined}
                className={`${itemBase} ${
                  activo
                    ? "border-[#4dd0e1] font-semibold text-[#00838f]"
                    : "border-transparent text-gray-600 hover:text-[#00838f]"
                }`}
              >
                <Icono className="h-4 w-4 shrink-0" />
                {mod.label}
                {/* Un punto y no el número: el número exacto está adentro, en
                    el hijo que lo genera. Acá solo hace falta saber que hay
                    algo, y un punto no empuja al resto de la fila. */}
                {esperando > 0 && (
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                )}
                {desplegable && (
                  <ChevronDown
                    className={`h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform ${
                      estaAbierto ? "rotate-180" : ""
                    }`}
                  />
                )}
              </button>

              {estaAbierto && (
                <div className="absolute left-0 top-full z-50 mt-px flex min-w-[200px] flex-col overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                  {hijos.map((hijo) => {
                    const HijoIcono = hijo.icon
                    const esperandoHijo = badges[hijo.key] ?? 0
                    return (
                      <button
                        key={hijo.key}
                        type="button"
                        // Si el hijo es a su vez una sección, entra por su
                        // primera pantalla: el atajo tiene que llevar a algo
                        // que se pueda ver.
                        onClick={() => { setAbierto(null); navegar(rutaDe(hijo)) }}
                        className="flex items-center gap-2 px-3 py-2 text-left text-[13px] text-gray-700 transition-colors hover:bg-[#4dd0e1]/10 hover:text-[#00838f]"
                      >
                        <HijoIcono className="h-4 w-4 shrink-0 text-gray-400" />
                        <span className="truncate">{hijo.label}</span>
                        {esperandoHijo > 0 && (
                          <span className="ml-auto inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
                            {esperandoHijo}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
