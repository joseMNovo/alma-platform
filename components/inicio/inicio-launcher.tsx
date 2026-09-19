"use client"

import type { ModuleDef } from "@/lib/modules"
import InstalarApp from "@/components/pwa/instalar-app"
import QrVidriera from "@/components/capacitaciones/qr-vidriera"

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
  hijos,
}: {
  nombre: string
  modules: ModuleDef[]
  onAbrir: (mod: ModuleDef) => void
  /** Los hijos visibles del grupo. Sin esto, "Gestión" no dice qué hay adentro. */
  hijos: (mod: ModuleDef) => ModuleDef[]
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
      <div className="flex flex-wrap gap-2">
        <InstalarApp />
        {/* Apunta a la app, no a la vidriera: esta es la pantalla donde le
            mostrás ALMA a alguien para que entre por primera vez. El de la
            vidriera vive en Academia, que es donde se necesita. */}
        <QrVidriera ruta="/" titulo="Comunidad ALMA" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {modules.map((mod) => {
          const Icono = mod.icon
          const subModulos = hijos(mod)
          return (
            /**
             * Un `div` y no un `button`: adentro hay otros botones (los hijos)
             * y un botón dentro de otro es HTML inválido — el navegador
             * desarma la estructura y se pierden los clicks.
             */
            <div
              key={mod.key}
              className="group flex min-h-[128px] flex-col items-center gap-1.5 rounded-2xl border border-gray-200 bg-white p-3 text-center shadow-sm transition-all hover:border-[#4dd0e1] hover:shadow-md"
            >
              <button
                onClick={() => onAbrir(mod)}
                className="flex flex-col items-center gap-2 transition-transform active:scale-[0.98]"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#4dd0e1]/10 transition-colors group-hover:bg-[#4dd0e1]/20">
                  <Icono className="h-6 w-6 text-[#4dd0e1]" />
                </span>
                <span className="text-sm font-semibold leading-tight text-gray-800">
                  {mod.label}
                </span>
              </button>

              {/*
                Los hijos. En escritorio son atajos de un click al destino
                exacto: antes estaban ahí escritos pero no se podían tocar, que
                es lo peor de los dos mundos — la información visible y muerta.
                En celular quedan como texto, porque son blancos demasiado
                chicos para el dedo y ahí conviene el recorrido por la baldosa.
              */}
              {subModulos.length > 0 && (
                <>
                  {/*
                    Escritorio: pastillas. Antes eran texto gris y, aunque se
                    podían clickear, nadie lo iba a descubrir — un subtítulo no
                    invita a tocarlo. Con un fondo tenue se lee como algo
                    tocable sin competir con el título de la baldosa.
                  */}
                  <div className="hidden flex-wrap justify-center gap-1 sm:flex">
                    {subModulos.map((hijo) => (
                      <button
                        key={hijo.key}
                        onClick={() => onAbrir(hijo)}
                        className="rounded-md bg-gray-50 px-1.5 py-0.5 text-[11px] leading-snug text-gray-500 transition-colors hover:bg-[#4dd0e1]/15 hover:text-[#00838f]"
                      >
                        {hijo.label}
                      </button>
                    ))}
                  </div>

                  {/*
                    Celular: solo texto. Son blancos demasiado chicos para el
                    dedo; ahí el recorrido de dos toques por la baldosa
                    funciona mejor que veinte pastillas diminutas.
                  */}
                  <p className="line-clamp-2 text-[11px] leading-snug text-gray-400 sm:hidden">
                    {subModulos.map((hijo) => hijo.label).join(" · ")}
                  </p>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
