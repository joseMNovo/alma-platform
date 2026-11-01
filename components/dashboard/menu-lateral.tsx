"use client"

import { useEffect, useMemo, useState } from "react"
import { ChevronDown, Eye, Gamepad2, LogOut } from "lucide-react"
import type { ModuleDef } from "@/lib/modules"
import { visibleChildren, type Grant } from "@/lib/access"

/**
 * El cajón de navegación del teléfono, por bloques.
 *
 * ── Qué estaba mal ────────────────────────────────────────────────────
 *
 * Era una lista corrida de 27 ítems. El nombre de cada grupo era un texto
 * gris chico, así que no se veía dónde terminaba uno y empezaba el otro, y
 * para llegar a lo de abajo había que recorrer todo. Encima "Salir" vivía
 * arriba, a un centímetro de la X de cerrar: dos botones pegados que hacen
 * cosas muy distintas.
 *
 * ── Qué hace ahora ────────────────────────────────────────────────────
 *
 * Cada grupo es una tarjeta blanca que se pliega. Plegado todo son seis
 * tarjetas y entra en una pantalla sin desplazar. Para que plegar no se
 * sienta como esconder, el grupo cerrado dice cuántas cosas tiene (`PLATA · 3`)
 * y arrastra el globito rojo de lo que está esperando adentro: así se sabe
 * qué hay sin abrirlo.
 *
 * ── Un solo "activo" ──────────────────────────────────────────────────
 *
 * La pantalla donde estás parado es la única que se pinta llena. El grupo que
 * la contiene solo se pone en turquesa en su título. Si los dos se pintaran
 * igual, la pantalla estaría diciendo que estás en dos lugares a la vez.
 *
 * ── Por qué recuerda ──────────────────────────────────────────────────
 *
 * Lo que está abierto se guarda en el teléfono. Sin eso, plegar molesta más
 * de lo que ayuda: cada vez que abrís el menú tenés que volver a desplegar lo
 * mismo. Y el grupo de la pantalla en la que estás se abre solo, porque si
 * abrís el menú y no ves dónde estás parado, el menú te perdió.
 */

const LLAVE = "alma_menu_abierto"

export default function MenuLateral({
  user,
  grants,
  roleLabel,
  modules,
  menuModules,
  activeTab,
  activeSubTab = "",
  // Vacío cuando la pantalla no tiene tercer nivel, que es casi siempre:
  // solo Accesos y Certificados lo usan.
  activeSubSubTab = "",
  navegar,
  rutaDe,
  onLogout,
  badges = {},
  juegosUrl,
  vistaComo,
  onVistaComo,
  cerrar,
}: {
  user: any
  grants: Grant[]
  roleLabel: string
  /** Los grupos de la barra. */
  modules: ModuleDef[]
  /** Mi perfil, Anuncios, Actividad: los del menú del avatar en escritorio. */
  menuModules: ModuleDef[]
  activeTab: string
  activeSubTab?: string
  activeSubSubTab?: string
  navegar: (ruta: string) => void
  rutaDe: (mod: ModuleDef) => string
  onLogout: () => void
  /** Cuántas cosas esperan, por `key` de módulo. */
  badges?: Record<string, number>
  juegosUrl?: string
  /** Con qué rol está mirando un admin, si es que eligió mirar con otros ojos. */
  vistaComo?: "voluntario" | "participante" | null
  /** Solo viene si quien mira es admin de verdad. */
  onVistaComo?: (v: "voluntario" | "participante" | null) => void
  cerrar: () => void
}) {
  const [abiertos, setAbiertos] = useState<string[]>([])

  // Lo guardado, más el grupo de la pantalla actual.
  useEffect(() => {
    let guardados: string[] = []
    try {
      guardados = JSON.parse(localStorage.getItem(LLAVE) ?? "[]")
    } catch {
      // Navegación privada, o el valor quedó corrupto. Arrancar plegado es
      // un estado válido, así que no hay nada que avisar.
    }
    setAbiertos(Array.from(new Set([...guardados, activeTab, activeSubTab])))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    setAbiertos((a) =>
      [activeTab, activeSubTab].every((k) => !k || a.includes(k))
        ? a
        : Array.from(new Set([...a, activeTab, activeSubTab].filter(Boolean)))
    )
  }, [activeTab, activeSubTab])

  const alternar = (clave: string) =>
    setAbiertos((a) => {
      const nuevo = a.includes(clave) ? a.filter((x) => x !== clave) : [...a, clave]
      try {
        localStorage.setItem(LLAVE, JSON.stringify(nuevo))
      } catch {
        // Ver arriba: que no se pueda guardar no rompe nada, solo se olvida.
      }
      return nuevo
    })

  const ir = (ruta: string) => {
    navegar(ruta)
    cerrar()
  }

  /** Lo que espera adentro de un módulo, sumando lo de sus hijos y nietos. */
  const esperando = (mod: ModuleDef): number => {
    const hijos = visibleChildren(user, mod, grants)
    return (badges[mod.key] ?? 0) + hijos.reduce((suma, h) => suma + esperando(h), 0)
  }

  /**
   * Los que son grupo y los que no.
   *
   * "Grupo" es tener más de un hijo visible: con uno solo (Agenda →
   * Calendarios) el encabezado plegable escondería un único ítem, que es un
   * toque de más para llegar a lo mismo.
   */
  const { sueltos, grupos } = useMemo(() => {
    const sueltos: { mod: ModuleDef; hoja: ModuleDef }[] = []
    const grupos: ModuleDef[] = []
    for (const mod of modules) {
      const hijos = visibleChildren(user, mod, grants)
      if (hijos.length <= 1) sueltos.push({ mod, hoja: hijos[0] ?? mod })
      else grupos.push(mod)
    }
    return { sueltos, grupos }
  }, [modules, user, grants])

  const iniciales =
    ((user.name ?? "").trim().charAt(0) + (user.last_name ?? "").trim().charAt(0))
      .toUpperCase() || "?"

  return (
    /*
      Todo sobre blanco.

      Antes era gris de fondo con una tarjeta blanca y sombra por grupo:
      seis rectángulos flotando, cada uno con su borde redondeado y su
      sombrita, para una lista de links. El contorno no agregaba nada que no
      dijera ya el espacio entre grupos, y era casi toda la tinta del menú.

      Lo que queda marcando los bordes es el aire y una línea de un píxel.
    */
    <div className="flex h-full flex-col bg-white">
      {/* ── Quién sos ─────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center gap-3 px-4 pb-4 pt-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-alma-suave text-sm font-bold text-alma-fuerte">
          {iniciales}
        </div>
        <div className="min-w-0 flex-1 pr-8">
          <p className="truncate font-semibold text-gray-900">
            {[user.name, user.last_name].filter(Boolean).join(" ") || "Sin nombre"}
          </p>
          {/* El rol era una pastilla rellena al lado de un círculo relleno:
              dos formas pintadas para dos datos que se leen igual en texto. */}
          <p className="truncate text-[12px] text-gray-500">{roleLabel}</p>
        </div>
      </div>

      {/* ── Los bloques ───────────────────────────────────────────── */}
      <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-gray-100 px-2.5 pb-3 pt-1">
        {/*
          Los módulos que no son grupo, todos en la misma tarjeta.

          Antes cada uno tenía la suya, y como el orden sale del registro,
          Inventario caía solo entre TAREAS y PLATA: una tarjeta blanca con un
          único renglón adentro, que se leía como un grupo al que le faltan
          cosas. Juntos se leen por lo que son: los destinos que no cuelgan de
          ningún grupo.
        */}
        {sueltos.length > 0 && (
          <div className="pb-1.5">
            {sueltos.map(({ mod, hoja }) => (
              <Item
                key={mod.key}
                icono={mod.icon}
                texto={mod.label}
                activo={activeTab === mod.key}
                pendientes={esperando(mod)}
                onClick={() => ir(rutaDe(hoja))}
              />
            ))}
          </div>
        )}

        {grupos.map((mod) => {
          const hijos = visibleChildren(user, mod, grants)
          const abierto = abiertos.includes(mod.key)
          const pendientes = esperando(mod)
          const tieneElActivo = activeTab === mod.key

          return (
            /* La línea de arriba es lo único que separa un grupo del
               anterior. `first:border-0` para que el primero no arranque con
               una raya suelta debajo del nombre. */
            <div key={mod.key} className="border-t border-gray-100 py-1 first:border-0">
              <button
                type="button"
                onClick={() => alternar(mod.key)}
                aria-expanded={abierto}
                className="flex h-10 w-full items-center gap-2 px-2.5 text-left"
              >
                <span
                  className={`text-[11px] font-semibold uppercase tracking-[0.09em] ${
                    tieneElActivo ? "text-alma-fuerte" : "text-gray-400"
                  }`}
                >
                  {mod.label}
                </span>
                {/* Cuántos hay adentro, solo cuando está cerrado: es lo que
                    convierte "plegado" en "resumido". */}
                {!abierto && (
                  <span className="text-[11px] text-gray-300">{hijos.length}</span>
                )}
                {!abierto && pendientes > 0 && <Globo n={pendientes} />}
                <ChevronDown
                  className={`ml-auto h-4 w-4 shrink-0 text-gray-300 transition-transform ${
                    abierto ? "rotate-180" : ""
                  }`}
                />
              </button>

              {abierto && (
                <div className="space-y-0.5 pb-1">
                  {hijos.map((hijo) => {
                    const nietos = visibleChildren(user, hijo, grants)

                    if (nietos.length === 0) {
                      return (
                        <Item
                          key={hijo.key}
                          icono={hijo.icon}
                          texto={hijo.label}
                          activo={activeSubTab === hijo.key}
                          pendientes={badges[hijo.key] ?? 0}
                          onClick={() => ir(hijo.route)}
                        />
                      )
                    }

                    const subAbierto = abiertos.includes(hijo.key)
                    const contieneActivo = activeSubTab === hijo.key
                    return (
                      <div key={hijo.key}>
                        <Item
                          icono={hijo.icon}
                          texto={hijo.label}
                          // El padre del activo NO se pinta lleno: solo se
                          // pone en turquesa. Lleno hay uno solo.
                          activo={false}
                          resaltado={contieneActivo}
                          pendientes={esperando(hijo)}
                          chevron={subAbierto}
                          onClick={() => alternar(hijo.key)}
                        />
                        {subAbierto && (
                          /* La línea de la izquierda es lo que dice "esto
                             cuelga de lo de arriba" sin tener que indentar
                             tanto que el texto se quede sin ancho. */
                          <div className="ml-5 space-y-0.5 border-l border-gray-200 pl-1.5">
                            {nietos.map((nieto) => (
                              <Item
                                key={nieto.key}
                                icono={nieto.icon}
                                texto={nieto.label}
                                activo={activeSubSubTab === nieto.key}
                                pendientes={badges[nieto.key] ?? 0}
                                onClick={() => ir(nieto.route)}
                                chico
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* ── El pie ────────────────────────────────────────────────────

          Mi perfil, Anuncios y Actividad viven acá porque en escritorio están
          en el menú del avatar, que en el teléfono no existe: sin esto, un
          celular se queda sin forma de llegar a sus propios datos.

          Pero apilados uno debajo del otro se comían cuatro renglones del pie
          —más que varios grupos enteros— para tres cosas que se usan una vez
          por semana. En grilla de a cuatro, con el ícono arriba y el nombre
          abajo, ocupan un solo renglón y encima entra Juegos.

          Y "Salir" vive acá abajo y no arriba. Antes estaba al lado del
          nombre, a un centímetro de la X de cerrar el menú: dos botones
          pegados que hacen cosas muy distintas, y uno de los dos te saca de la
          sesión. */}
      <div
        className="shrink-0 space-y-2 border-t border-gray-100 px-3 pt-2.5"
        style={{ paddingBottom: "max(0.625rem, env(safe-area-inset-bottom))" }}
      >
        <div className="grid grid-cols-4 gap-1">
          {menuModules.map((mod) => {
            const Icono = mod.icon
            const activo = activeTab === mod.key
            const esperan = badges[mod.key] ?? 0
            return (
              <button
                key={mod.key}
                type="button"
                onClick={() => ir(mod.route)}
                aria-current={activo ? "page" : undefined}
                className={`relative flex h-14 flex-col items-center justify-center gap-1 rounded-lg px-1 transition-colors ${
                  activo ? "bg-alma-suave text-alma-fuerte" : "text-gray-600 active:bg-gray-100"
                }`}
              >
                <Icono className={`h-[18px] w-[18px] shrink-0 ${activo ? "text-alma-fuerte" : "text-gray-400"}`} />
                {/* `leading-tight` y dos líneas: "Mi perfil" no entra en una
                    sola en un cuarto de pantalla angosta. */}
                <span className="w-full text-center text-[10.5px] font-medium leading-tight">
                  {mod.label}
                </span>
                {esperan > 0 && (
                  <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
                )}
              </button>
            )
          })}

          {juegosUrl && (
            <a
              href={juegosUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-14 flex-col items-center justify-center gap-1 rounded-lg px-1 text-gray-600 no-underline active:bg-gray-100"
            >
              <Gamepad2 className="h-[18px] w-[18px] shrink-0 text-gray-400" />
              <span className="w-full text-center text-[10.5px] font-medium leading-tight">
                Juegos
              </span>
            </a>
          )}
        </div>

        {/* Ver la app con los ojos de otro rol. Solo lo recibe un admin.
            Es una vista previa de lo que se DIBUJA: la sesión sigue siendo la
            de admin y la API autoriza por la sesión, así que no sirve para
            comprobar que un voluntario no pueda hacer algo. */}
        {onVistaComo && (
          <div>
            <p className="pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              Ver la app como
            </p>
            <div className="flex gap-1.5">
              {(["voluntario", "participante"] as const).map((rol) => {
                const puesto = vistaComo === rol
                return (
                  <button
                    key={rol}
                    type="button"
                    onClick={() => { onVistaComo(puesto ? null : rol); cerrar() }}
                    className={`flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border text-[12px] font-medium capitalize transition-colors ${
                      puesto
                        ? "border-alma-lavanda bg-alma-lavanda text-white"
                        : "border-gray-300 text-gray-600 active:bg-gray-100"
                    }`}
                  >
                    <Eye className="h-3.5 w-3.5 shrink-0" />
                    {rol}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Botón de verdad y no un renglón más de la lista: cerrar sesión es
            la única acción del menú que no se deshace volviendo atrás. */}
        <button
          type="button"
          onClick={onLogout}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 text-[13.5px] font-semibold text-red-600 transition-colors active:bg-red-100"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}

/** El globito rojo de lo que está esperando. */
function Globo({ n }: { n: number }) {
  return (
    <span className="inline-flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
      {n > 99 ? "99+" : n}
    </span>
  )
}

function Item({
  icono: Icono,
  texto,
  activo,
  resaltado = false,
  pendientes = 0,
  onClick,
  chico = false,
  chevron,
}: {
  icono: React.ComponentType<{ className?: string }>
  texto: string
  /** Es LA pantalla donde estás parado. Solo una en todo el menú. */
  activo: boolean
  /** Contiene a la pantalla activa, pero no es ella. */
  resaltado?: boolean
  pendientes?: number
  onClick: () => void
  chico?: boolean
  /** Si viene, el ítem abre y cierra: muestra la flecha en este estado. */
  chevron?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={activo ? "page" : undefined}
      aria-expanded={chevron === undefined ? undefined : chevron}
      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 text-left transition-colors ${
        chico ? "h-9 text-[13px]" : "h-10 text-[13.5px]"
      } ${
        activo
          ? "bg-alma-fuerte font-semibold text-white"
          : resaltado
            ? "font-semibold text-alma-fuerte active:bg-gray-100"
            : "text-gray-700 active:bg-gray-100"
      }`}
    >
      <Icono
        className={`${chico ? "h-4 w-4" : "h-[17px] w-[17px]"} shrink-0 ${
          activo ? "text-white" : resaltado ? "text-alma-fuerte" : "text-gray-400"
        }`}
      />
      <span className="min-w-0 flex-1 truncate">{texto}</span>
      {pendientes > 0 && !activo && <Globo n={pendientes} />}
      {chevron !== undefined && (
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${
            chevron ? "rotate-180" : ""
          }`}
        />
      )}
    </button>
  )
}
