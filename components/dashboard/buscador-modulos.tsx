"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Search } from "lucide-react"
import type { ModuleDef } from "@/lib/modules"
import { visibleChildren, type Grant } from "@/lib/access"

/**
 * Buscador de secciones (Ctrl K).
 *
 * Con ocho grupos, veintipico de pantallas y tres niveles de profundidad, saber
 * DÓNDE está algo se volvió un requisito para usar la app. "Link de pago" vive
 * en Academia y "Puesto de venta" en Plata: razonable una vez que lo sabés,
 * imposible de adivinar la primera vez.
 *
 * Esto no es una búsqueda de datos —no busca personas ni pagos—, es un índice
 * de secciones. Mezclar las dos cosas en un solo campo obligaría a decidir en
 * cada tecleo si "Pagos" es una pantalla o el nombre de algo, y la respuesta
 * correcta cambia según el día.
 *
 * Lo que se lista sale de los módulos VISIBLES para esta persona: nadie
 * encuentra acá una pantalla a la que después no puede entrar.
 */

interface Destino {
  key: string
  label: string
  /** De dónde cuelga, para poder distinguir dos hojas con nombre parecido. */
  contexto: string
  route: string
  icon: ModuleDef["icon"]
  /** Cómo le dice la gente cuando no se acuerda del nombre. No se muestra:
   *  solo hace que "cobrar" encuentre "Link de pago". Ver lib/modules.ts. */
  sinonimos: string[]
}

export default function BuscadorModulos({
  user,
  grants,
  modules,
  navegar,
  rutaDe,
}: {
  user: any
  grants: Grant[]
  modules: ModuleDef[]
  navegar: (ruta: string) => void
  rutaDe: (mod: ModuleDef) => string
}) {
  const [abierto, setAbierto] = useState(false)
  const [q, setQ] = useState("")
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  /** Todas las HOJAS visibles, más los grupos que son pantalla por sí mismos
   *  (Inventario). Un grupo con hijos no entra: llevaría al mismo lugar que
   *  su primer hijo y duplicaría cada resultado. */
  const destinos = useMemo<Destino[]>(() => {
    const salida: Destino[] = []
    const recorrer = (mod: ModuleDef, contexto: string) => {
      const hijos = visibleChildren(user, mod, grants)
      if (hijos.length === 0) {
        salida.push({
          key: mod.key,
          label: mod.label,
          contexto,
          route: rutaDe(mod),
          icon: mod.icon,
          sinonimos: mod.sinonimos ?? [],
        })
        return
      }
      for (const hijo of hijos) recorrer(hijo, contexto ? `${contexto} › ${mod.label}` : mod.label)
    }
    for (const mod of modules) recorrer(mod, "")
    return salida
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modules, grants, user])

  /** Sin tildes y en minúscula de los dos lados: nadie escribe "Auditoría"
   *  con el acento puesto cuando está apurado. */
  const normalizar = (texto: string) =>
    texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")

  const resultados = useMemo(() => {
    const t = normalizar(q.trim())
    if (!t) return destinos
    return destinos.filter(
      (d) =>
        normalizar(d.label).includes(t) ||
        normalizar(d.contexto).includes(t) ||
        d.sinonimos.some((s) => normalizar(s).includes(t)),
    )
  }, [q, destinos])

  // Ctrl/Cmd + K abre y cierra desde cualquier pantalla.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setAbierto((v) => !v)
      }
      if (e.key === "Escape") setAbierto(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  useEffect(() => {
    if (!abierto) return
    setQ("")
    setCursor(0)
    // El foco va después del montaje del diálogo, si no el input todavía no existe.
    const t = setTimeout(() => inputRef.current?.focus(), 30)
    return () => clearTimeout(t)
  }, [abierto])

  const elegir = (d: Destino) => {
    setAbierto(false)
    navegar(d.route)
  }

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setCursor((c) => Math.min(c + 1, resultados.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setCursor((c) => Math.max(c - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      const d = resultados[cursor]
      if (d) elegir(d)
    }
  }

  return (
    <>
      {/*
        El disparador es un BOTÓN con pinta de campo, no un input de verdad.
        Un input acá abriría el diálogo al primer tecleo y la letra se perdería
        en el camino: escribías "pa" y en el buscador aparecía "a".
      */}
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="flex h-9 w-full max-w-md items-center gap-2 rounded-lg border border-gray-200 bg-gray-50/70 px-3 text-left text-[13px] text-gray-400 transition-colors hover:border-[#4dd0e1] hover:bg-white"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="truncate">Buscar sección…</span>
        <kbd className="ml-auto hidden shrink-0 rounded border border-gray-200 bg-white px-1.5 py-0.5 font-sans text-[10px] font-medium text-gray-400 lg:inline">
          Ctrl K
        </kbd>
      </button>

      {abierto && (
        <div
          className="fixed inset-0 z-[120] flex items-start justify-center bg-black/30 px-4 pt-[12vh]"
          onClick={() => setAbierto(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Buscar sección"
            className="w-full max-w-lg overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 border-b border-gray-100 px-4">
              <Search className="h-4 w-4 shrink-0 text-gray-400" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => { setQ(e.target.value); setCursor(0) }}
                onKeyDown={onInputKey}
                placeholder="Ir a… (ej. cobrar, stock, anotados)"
                className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
              />
            </div>

            <div className="max-h-[320px] overflow-y-auto py-1">
              {resultados.length === 0 && (
                <p className="px-4 py-6 text-center text-sm text-gray-400">
                  No encontramos secciones con ese nombre.
                </p>
              )}
              {resultados.map((d, i) => {
                const Icono = d.icon
                return (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => elegir(d)}
                    onMouseEnter={() => setCursor(i)}
                    className={`flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm transition-colors ${
                      i === cursor ? "bg-[#4dd0e1]/10 text-[#00838f]" : "text-gray-700"
                    }`}
                  >
                    <Icono className="h-4 w-4 shrink-0 text-[#4dd0e1]" />
                    <span className="truncate font-medium">{d.label}</span>
                    {d.contexto && (
                      <span className="ml-auto shrink-0 truncate pl-3 text-xs text-gray-400">
                        {d.contexto}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

          </div>
        </div>
      )}
    </>
  )
}
