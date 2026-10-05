"use client"

import { useEffect, useMemo, useState } from "react"
import { Clock } from "lucide-react"
import { SECCIONES_INICIO, type ModuleDef } from "@/lib/modules"
import InstalarApp from "@/components/pwa/instalar-app"
import QrVidriera from "@/components/capacitaciones/qr-vidriera"

/** Un módulo al que se puede volver de un click, con el grupo del que cuelga. */
export interface Destino {
  mod: ModuleDef
  /** "Personas", "Plata"… Dos hojas pueden llamarse parecido; el grupo desempata. */
  grupo: string
}

/** Algo que está esperando a que alguien lo resuelva. */
export interface Atencion {
  key: string
  cantidad: number
  /** En minúscula: "aprobaciones", "pagos". Se lee pegado al número, como una
   *  frase corta: "3 aprobaciones". */
  que: string
  /** Dónde se resuelve: "Personas", "Plata". */
  grupo: string
  route: string
}

/** Lo reciente, con cuándo fue. */
interface Reciente extends Destino {
  cuando: string
}

/**
 * Pantalla de Inicio.
 *
 * Tres bloques, de lo urgente a lo general:
 *
 *   1. **Para revisar**, al lado del saludo. Lo que espera a que alguien lo
 *      resuelva. Casi siempre es cosa del admin.
 *   2. **Lo último que abriste** — los módulos a los que esta persona volvió
 *      hace poco.
 *   3. **Todas las funciones** — el mapa completo, agrupado por tema.
 *
 * La misma pantalla para los tres roles, y lo único que cambia es lo que cada
 * uno PUEDE ver: al participante le quedan dos columnas y tres tarjetas donde
 * el admin tiene siete, las secciones que quedarían vacías no se dibujan, y
 * "para revisar" solo existe para quien puede resolver algo. Dos pantallas
 * distintas serían dos pantallas para mantener, y la segunda siempre queda
 * vieja.
 *
 * ── Por qué los avisos son chicos ─────────────────────────────────────
 *
 * Fueron tarjetas rojas de ancho completo. El problema es que están casi
 * siempre: en una ONG donde cada semana se anota alguien, "3 aprobaciones" es
 * el estado normal, no una emergencia. Una alarma permanente deja de leerse a
 * la semana, y además empujaba hacia abajo lo que la persona vino a hacer.
 * Ahora es una línea al lado del saludo: se ve, se toca, y no ocupa la
 * pantalla.
 *
 * ── Por qué columnas por tema y no el orden del nav ───────────────────
 *
 * La barra de pestañas ordena por frecuencia: lo de todos los días, a mano.
 * Eso sirve cuando ya sabés qué buscás. Inicio es la pantalla del que todavía
 * no sabe dónde está algo, y ahí lo que ayuda es el tema. Son dos vistas del
 * mismo registro de módulos, no dos listas que haya que sincronizar.
 */
export default function InicioLauncher({
  nombre,
  modules,
  onAbrir,
  navegar,
  hijos,
  atencion = [],
  destinos,
  badges = {},
}: {
  nombre: string
  modules: ModuleDef[]
  onAbrir: (mod: ModuleDef) => void
  /** Ir a una ruta suelta. Los avisos apuntan a una pantalla concreta, no a un
   *  módulo del registro. */
  navegar: (ruta: string) => void
  /** Los hijos visibles del grupo. Sin esto, "Plata" no dice qué hay adentro. */
  hijos: (mod: ModuleDef) => ModuleDef[]
  atencion?: Atencion[]
  /** Key de módulo → a dónde lleva y de qué grupo cuelga. Resuelve lo que
   *  devuelve /api/inicio/recientes, que son keys y nada más. */
  destinos: Record<string, Destino>
  /** Cuántas cosas esperan, por `key` de módulo. Pinta el globito rojo al lado
   *  del sub-módulo que las tiene. */
  badges?: Record<string, number>
}) {
  const [recientes, setRecientes] = useState<Reciente[]>([])

  useEffect(() => {
    fetch("/api/inicio/recientes")
      .then((r) => (r.ok ? r.json() : { modules: [] }))
      .then((data) => {
        const filas: { key: string; at: string | null }[] = Array.isArray(data?.modules)
          ? data.modules
          : []
        setRecientes(
          filas
            // El filtro es el que hace que esto no se pudra: una key que ya no
            // existe, o una a la que esta persona dejó de tener acceso, se cae
            // sola en vez de quedar como un atajo que lleva a un 403.
            .filter((f) => destinos[f.key])
            .map((f) => ({ ...destinos[f.key], cuando: cuandoFue(f.at) })),
        )
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pendientes = atencion.filter((a) => a.cantidad > 0)

  /**
   * Las columnas por tema, armadas sobre los módulos que esta persona ve.
   *
   * Un módulo que no figure en SECCIONES_INICIO cae en la última columna en
   * vez de desaparecer: la lista de secciones es una preferencia de orden, no
   * una lista de permitidos. Sin esto, agregar un módulo nuevo y olvidarse de
   * anotarlo acá lo borraba de Inicio sin que nadie se enterara.
   */
  const secciones = useMemo(() => {
    const porKey = new Map(modules.map((m) => [m.key, m]))
    const ubicados = new Set<string>()

    const armadas = SECCIONES_INICIO.map((sec) => {
      const mods = sec.modulos
        .map((k) => porKey.get(k))
        .filter((m): m is ModuleDef => {
          if (!m) return false
          ubicados.add(m.key)
          return true
        })
      return { titulo: sec.titulo, mods }
    })

    const sueltos = modules.filter((m) => !ubicados.has(m.key))
    if (sueltos.length > 0) {
      const ultima = armadas[armadas.length - 1]
      if (ultima) ultima.mods.push(...sueltos)
      else armadas.push({ titulo: "Otros", mods: sueltos })
    }

    return armadas.filter((sec) => sec.mods.length > 0)
  }, [modules])

  return (
    <div className="space-y-7">
      {/* Saludo y avisos en el mismo renglón: lo que espera no merece una
          franja propia, pero sí estar donde el ojo ya está mirando. */}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            Hola{nombre ? `, ${nombre}` : ""}
          </h2>
          <p className="mt-1 text-gray-500">¿Con qué querés empezar?</p>
        </div>

        {pendientes.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-400">Para revisar</span>
            {pendientes.map((a) => (
              <button
                key={a.key}
                onClick={() => navegar(a.route)}
                className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white py-1 pl-1 pr-3 text-[13px] transition-colors hover:border-[#4dd0e1] hover:bg-[#4dd0e1]/5"
              >
                <span className="flex h-[19px] min-w-[19px] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
                  {a.cantidad}
                </span>
                <span className="font-medium text-gray-700">{a.que}</span>
                <span className="text-xs text-gray-400">{a.grupo}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/*
        Lo último que abriste.

        Sobre fondo teal y no suelto en la página: es la única parte de Inicio
        que cambia sola, y el recuadro la separa del mapa de abajo, que siempre
        dice lo mismo.

        Sale de activity_events, que ya se escribía en cada navegación. Se
        eligió esto antes que una lista de atajos fijos porque no cuesta
        ninguna tabla, ninguna pantalla de configuración y ningún primer día
        pidiéndote que elijas cuatro cosas antes de saber cuáles usás. Lo que
        se paga a cambio es que la fila se mueve sola.

        No aparece el primer día de alguien, y está bien: una fila vacía con un
        texto explicando por qué está vacía ocupa más de lo que vale.
      */}
      {recientes.length > 0 && (
        <section className="rounded-2xl border border-[#4dd0e1]/30 bg-[#4dd0e1]/[0.07] p-4">
          <p className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#00838f]">
            <Clock className="h-3.5 w-3.5" />
            Lo último que abriste
          </p>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {recientes.map(({ mod, grupo, cuando }) => {
              const Icono = mod.icon
              return (
                <button
                  key={mod.key}
                  onClick={() => onAbrir(mod)}
                  className="flex items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-left transition-colors hover:border-[#4dd0e1]"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#4dd0e1]/10">
                    <Icono className="h-[15px] w-[15px] text-[#4dd0e1]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-semibold text-gray-800">
                      {mod.label}
                    </span>
                    {grupo && (
                      <span className="block truncate text-[11px] text-gray-400">{grupo}</span>
                    )}
                  </span>
                  <span className="shrink-0 text-[11px] text-gray-400">{cuando}</span>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {/* El mapa. El título con la línea al costado lo separa de lo de arriba
          sin meter otra caja: abajo ya hay tres. */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <h3 className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Todas las funciones
          </h3>
          <span className="h-px flex-1 bg-gray-200" />
        </div>

        {/* En celular las columnas se apilan y queda una sola lista larga, que
            es exactamente lo que servía ahí. */}
        <div className="grid items-start gap-5 lg:grid-cols-3">
          {secciones.map((sec) => (
            <div key={sec.titulo} className="space-y-2.5">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                {sec.titulo}
              </h4>
              {/* Una tarjeta por columna con filas divididas, no una tarjeta
                  por módulo: siete cajas flotando generaban más bordes que
                  contenido. */}
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                {sec.mods.map((mod, i) => {
                  const Icono = mod.icon
                  const subModulos = hijos(mod)

                  return (
                    /**
                     * Un `div` y no un `button`: adentro hay otros botones (los
                     * hijos) y un botón dentro de otro es HTML inválido — el
                     * navegador desarma la estructura y se pierden los clicks.
                     */
                    <div
                      key={mod.key}
                      className={`px-4 py-3.5 ${i > 0 ? "border-t border-gray-100" : ""}`}
                    >
                      <button
                        onClick={() => onAbrir(mod)}
                        className="group flex w-full items-center gap-2.5 text-left"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#4dd0e1]/10 transition-colors group-hover:bg-[#4dd0e1]/20">
                          <Icono className="h-[17px] w-[17px] text-[#4dd0e1]" />
                        </span>
                        <span className="truncate text-[15px] font-semibold text-gray-800 transition-colors group-hover:text-[#00838f]">
                          {mod.label}
                        </span>
                      </button>

                      {/* Los sub-módulos van como links y no como texto: antes
                          estaban escritos pero no se podían tocar, que es lo
                          peor de los dos mundos — información visible y
                          muerta. */}
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3.5 gap-y-1 pl-[42px]">
                        {subModulos.length > 0 ? (
                          subModulos.map((hijo) => {
                            const esperando = badges[hijo.key] ?? 0
                            return (
                              <button
                                key={hijo.key}
                                onClick={() => onAbrir(hijo)}
                                className="flex items-center gap-1 text-[13px] text-[#00838f] transition-colors hover:underline"
                              >
                                {hijo.label}
                                {esperando > 0 && (
                                  <span className="inline-flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white no-underline">
                                    {esperando}
                                  </span>
                                )}
                              </button>
                            )
                          })
                        ) : (
                          /* Sin hijos la fila quedaba como un título solo en el
                             aire, sin decir qué pasa si lo tocás. */
                          <button
                            onClick={() => onAbrir(mod)}
                            className="text-[13px] text-[#00838f] transition-colors hover:underline"
                          >
                            Abrir {mod.label.toLowerCase()} →
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Instalar y el QR, al final.
          Son acciones de una vez en la vida: arriba ocupaban el lugar más caro
          de la pantalla para algo que casi nadie vuelve a tocar. `InstalarApp`
          no dibuja nada si la app ya está instalada, así que lo habitual es que
          acá solo quede el QR. */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 lg:max-w-sm">
        <span className="mr-auto text-sm font-medium text-gray-700">alma en tu celular</span>
        <InstalarApp className="h-8 px-3 text-[13px]" />
        {/* Apunta a la app, no a la vidriera: esta es la pantalla donde le
            mostrás ALMA a alguien para que entre por primera vez. El de la
            vidriera vive en Academia, que es donde se necesita. */}
        <QrVidriera ruta="/" titulo="Comunidad ALMA" className="h-8 px-3 text-[13px]" />
      </div>
    </div>
  )
}

/**
 * "Hoy", "Ayer", "Hace 3 días".
 *
 * Una fecha exacta no agrega nada acá: lo único que hace falta saber es si
 * esto es de recién o de la semana pasada. Y se compara por DÍA DEL CALENDARIO
 * y no por horas transcurridas — algo de anoche a las 23 es "ayer" aunque
 * hayan pasado nueve horas, que es como lo cuenta la gente.
 */
function cuandoFue(iso: string | null): string {
  if (!iso) return ""
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return ""

  const soloDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const dias = Math.round((soloDia(new Date()) - soloDia(fecha)) / 86_400_000)

  if (dias <= 0) return "Hoy"
  if (dias === 1) return "Ayer"
  if (dias < 7) return `Hace ${dias} días`
  if (dias < 30) return `Hace ${Math.floor(dias / 7)} sem`
  return fecha.toLocaleDateString("es-AR", { day: "numeric", month: "short" })
}
