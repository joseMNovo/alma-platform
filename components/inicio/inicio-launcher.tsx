"use client"

import type { ModuleDef } from "@/lib/modules"
import InstalarApp from "@/components/pwa/instalar-app"

/**
 * Pantalla de Inicio: una baldosa por módulo.
 *
 * Existe porque al entrar caías directamente en un módulo cualquiera y la
 * única forma de moverte era leer la fila de pestañas. Una grilla de íconos se
 * escanea mucho más rápido, sobre todo para quien entra cada quince días.
 *
 * Las baldosas NO son una lista aparte: salen de los mismos `navModules` que
 * alimentan las pestañas, así nunca se desincronizan ni aparece acá un módulo
 * que la persona no puede abrir.
 *
 * Acá no se dibujan las pestañas (lo decide el dashboard): una pantalla de
 * inicio con una barra de navegación arriba que dice lo mismo es ruido. Por
 * eso el logo del header vuelve siempre a esta pantalla.
 */
export default function InicioLauncher({
  nombre,
  modules,
  onAbrir,
  subtitulo,
}: {
  nombre: string
  modules: ModuleDef[]
  onAbrir: (mod: ModuleDef) => void
  /** Qué hay adentro del grupo. Sin esto, "Gestión" no dice nada. */
  subtitulo: (mod: ModuleDef) => string
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          Hola{nombre ? `, ${nombre}` : ""}
        </h2>
        <p className="mt-1 text-gray-500">¿Con qué querés empezar?</p>
      </div>

      {/* Solo aparece si se puede instalar y todavía no lo está: si ya abriste
          la app desde el ícono, el componente no dibuja nada. */}
      <InstalarApp />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {modules.map((mod) => {
          const Icono = mod.icon
          return (
            <button
              key={mod.key}
              onClick={() => onAbrir(mod)}
              className="group flex min-h-[128px] flex-col items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white p-3 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#4dd0e1] hover:shadow-md active:scale-[0.98]"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#4dd0e1]/10 transition-colors group-hover:bg-[#4dd0e1]/20">
                <Icono className="h-6 w-6 text-[#4dd0e1]" />
              </span>
              <span className="text-sm font-semibold leading-tight text-gray-800">
                {mod.label}
              </span>
              {/* Los hijos visibles del grupo: es la diferencia entre "Gestión"
                  y "Gestión — Pendientes, Inventario, Ideas". Se recorta a dos
                  renglones para que la baldosa no crezca. */}
              {subtitulo(mod) && (
                <span className="line-clamp-2 text-[11px] leading-snug text-gray-400">
                  {subtitulo(mod)}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
