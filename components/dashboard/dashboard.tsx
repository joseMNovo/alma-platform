"use client"

import { useState, useEffect, useMemo, type ReactNode } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PestanasFila, clasePestana, Segmentado, claseSegmento } from "@/components/ui/pestanas-mobile"
import {
  LogOut,
  Users,
  Calendar,
  Activity,
  CreditCard,
  Package,
  CheckSquare,
  CalendarDays,
  UserCircle,
  Lightbulb,
  Gamepad2,
  ClipboardCheck,
  Database,
  Loader2,
  BarChart3,
  Megaphone,
  GraduationCap,
  KeyRound,
  ChevronDown,
  ChevronLeft,
  Home,
} from "lucide-react"

// Filtrado: un valor que no sea http(s) —una ruta de Windows, por ejemplo—
// se lo come el sistema operativo y abre el cartel de "elegí una aplicación".
// Ver lib/enlaces.ts.
const GAMES_URL = urlWebSegura(process.env.NEXT_PUBLIC_GAMES_URL)
import TalleresManager from "@/components/talleres/talleres-manager"
import GruposManager from "@/components/grupos/grupos-manager"
import ActividadesManager from "@/components/actividades/actividades-manager"
import InventarioManager from "@/components/inventario/inventario-manager"
import VoluntariosManager from "@/components/voluntarios/voluntarios-manager"
import PendientesManager from "@/components/pendientes/pendientes-manager"
import CalendariosManager from "@/components/calendarios/calendarios-manager"
import IdeasManager from "@/components/ideas/ideas-manager"
import PersonasDbManager from "@/components/personas/personas-db-manager"
import ParticipantesManager from "@/components/participantes/participantes-manager"
import InscripcionesManager from "@/components/espacios/inscripciones-manager"
import MiCuenta from "@/components/cuenta/mi-cuenta"
import AprobacionesManager from "@/components/voluntarios/aprobaciones-manager"
import ActividadManager from "@/components/actividad/actividad-manager"
import CapacitacionesManager from "@/components/capacitaciones/capacitaciones-manager"
import AccesosManager from "@/components/accesos/accesos-manager"
import CertificadosAdmin from "@/components/capacitaciones/certificados-admin"
import LinkPagoAdmin from "@/components/capacitaciones/link-pago-admin"
import EncuestasManager from "@/components/encuestas/encuestas-manager"
import EntregaCertificados from "@/components/capacitaciones/entrega-certificados"
import HistorialCertificados from "@/components/capacitaciones/historial-certificados"
import { visibleModules, userMenuModules, visibleChildren, type Grant } from "@/lib/access"
import { getModule, resolveRoute, MODULES, type ModuleDef } from "@/lib/modules"
import NotificationBell from "@/components/notifications/notification-bell"
import BroadcastManager from "@/components/notifications/broadcast-manager"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import MenuLateral from "@/components/dashboard/menu-lateral"
import PuestoVentaManager from "@/components/stand/puesto-venta-manager"
import IngresosTablero from "@/components/ingresos/ingresos-tablero"
import InicioLauncher from "@/components/inicio/inicio-launcher"
import BarraModulos from "@/components/dashboard/barra-modulos"
import BuscadorModulos from "@/components/dashboard/buscador-modulos"
import AlmaFooter from "@/components/ui/alma-footer"
import { urlWebSegura } from "@/lib/enlaces"
import MarcaAlma from "@/components/ui/marca-alma"
import ProfileCompletionModal from "@/components/auth/profile-completion-modal"
import ParticipanteOnboarding from "@/components/participantes/onboarding-modal"
import AnnouncementModal from "@/components/announcements/announcement-modal"
import ImpersonationBanner from "@/components/admin/impersonation-banner"
import { Menu, Bell, Eye } from "lucide-react"

// Human-readable role labels (UI)
const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  voluntario: "Voluntario",
  participante: "Participante",
}

/** Inactividad que corta una sesión de uso. Espeja SESSION_GAP_MINUTES del
 *  backend (app/routers/activity.py): si los dos no coinciden, el ping de
 *  "volví a la pestaña" no abre un ingreso nuevo o abre uno de más. */
const SESSION_GAP_MS = 30 * 60 * 1000


export default function Dashboard({ user: usuarioReal, onLogout }: { user: any, onLogout: () => void }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  /**
   * ── Mirar la app como la ve otro rol ────────────────────────────────
   *
   * Un admin ve veintisiete módulos; un voluntario ve doce y un participante
   * cuatro. Hasta ahora, la única forma de saber qué ve el otro era crearse
   * una cuenta falsa, o preguntarle por teléfono. Eso hacía que los cambios
   * de permisos se probaran poco y mal.
   *
   * ── OJO: esto es una vista previa, no una prueba de seguridad ───────
   *
   * Lo único que cambia es qué DIBUJA la pantalla. La sesión sigue siendo la
   * de admin, y la API autoriza por la sesión, no por esto. O sea: sirve para
   * ver cómo se ve, y NO sirve para verificar que un voluntario no pueda
   * hacer algo. Para eso hay que entrar con una cuenta de voluntario.
   *
   * Vive en `sessionStorage` y no en el estado: cada navegación desmonta este
   * componente, así que en memoria se perdería al primer click. Al cerrar la
   * pestaña se borra solo, que es el comportamiento que se quiere: nadie se
   * queda atrapado mirando media app sin saber por qué.
   */
  const [vistaComo, setVistaComo] = useState<"voluntario" | "participante" | null>(null)

  useEffect(() => {
    try {
      const v = sessionStorage.getItem("alma_vista_como")
      if (v === "voluntario" || v === "participante") setVistaComo(v)
    } catch {
      // Navegación privada. Arrancar en admin es el estado correcto.
    }
  }, [])

  const cambiarVista = (v: "voluntario" | "participante" | null) => {
    setVistaComo(v)
    try {
      if (v) sessionStorage.setItem("alma_vista_como", v)
      else sessionStorage.removeItem("alma_vista_como")
    } catch {
      // Ver arriba.
    }
  }

  const esAdminReal = usuarioReal?.role === "admin"

  /**
   * El usuario que ve el resto de la app. Es el real, salvo que un admin haya
   * pedido mirar con otros ojos. Se llama `user` para que las doscientas
   * referencias de abajo no tengan que enterarse de que esto existe.
   */
  const user = useMemo(
    () =>
      esAdminReal && vistaComo
        ? { ...usuarioReal, role: vistaComo, is_admin: false }
        : usuarioReal,
    [usuarioReal, esAdminReal, vistaComo]
  )
  /** Con qué pestaña abrir Mi perfil. El menú del avatar entra directo a
   *  Notificaciones, que si no queda escondida adentro del módulo. */
  const [seccionPerfil, setSeccionPerfil] = useState("perfil")
  const [pendingCount, setPendingCount] = useState(0)
  /** Avisos de "ya pagué" sin resolver. Se muestran en el nav para que no haya
   *  que entrar a Accesos todos los días a ver si alguien está esperando. */
  const [avisosPago, setAvisosPago] = useState(0)
  const [navigating, setNavigating] = useState(false)
  // Habilitaciones del usuario (person_access_grants). Se usan SOLO para
  // decidir qué pestañas pintar; el acceso real lo verifica el servidor en
  // cada endpoint. Ver lib/access.ts.
  const [grants, setGrants] = useState<Grant[]>([])
  const router = useRouter()
  const pathname = usePathname()

  /** Navega mostrando la barra de progreso — salvo que el destino sea la
   *  ruta actual: ahí Next no dispara ningún cambio, pathname nunca vuelve a
   *  actualizarse, y el efecto que apaga `navigating` (depende de pathname)
   *  no se vuelve a correr — quedaba la barra cargando para siempre al
   *  tocar la pestaña en la que ya estás. */
  const navigateTo = (target: string) => {
    if (target === pathname) return
    setNavigating(true)
    router.push(target)
  }


  const isAdmin = user.role === "admin"

  /** Inicio no es un módulo del registro: es la pantalla de bienvenida con las
   *  baldosas. Por eso se decide por la ruta y no por `navModules`. */
  const esInicio = pathname === "/inicio"

  useEffect(() => {
    setNavigating(false)
    if (!isAdmin) return
    fetch("/api/voluntarios?status=pendiente")
      .then(r => r.ok ? r.json() : [])
      .then(data => setPendingCount(Array.isArray(data) ? data.length : 0))
      .catch(() => {})
    fetch("/api/accesos/avisos-de-pago?status=pendiente")
      .then(r => r.ok ? r.json() : [])
      .then(data => setAvisosPago(Array.isArray(data) ? data.length : 0))
      .catch(() => {})
  }, [pathname, isAdmin])
  useEffect(() => {
    fetch("/api/accesos/mios")
      .then(r => r.ok ? r.json() : { grants: [] })
      .then(data => setGrants(Array.isArray(data?.grants) ? data.grants : []))
      .catch(() => {})
  }, [])

  const roleLabel = ROLE_LABELS[user.role] ?? user.role

  /**
   * Módulos que ve este usuario: rol (lib/permissions) OR habilitación
   * (person_access_grants). Una sola lista alimenta el nav mobile, las
   * pestañas de escritorio, el breadcrumb y el contenido.
   */
  const navModules = useMemo(() => visibleModules(user, grants), [user, grants])

  /**
   * Lo que vive en el menú del avatar: Mi perfil, Anuncios y Actividad.
   *
   * No son lugares donde se trabaja —son los datos propios, los avisos y las
   * métricas de uso, cosas que se miran cada tanto—, así que sacarlos de la
   * barra dejó ocho pestañas de trabajo diario en vez de once.
   */
  const menuModules = useMemo(() => userMenuModules(user, grants), [user, grants])

  /** Contenido de cada módulo. La clave tiene que coincidir con la del registro. */
  const MODULE_CONTENT: Record<string, ReactNode> = {
    calendarios: <CalendariosManager user={user} />,
    inventario: <InventarioManager user={user} />,
    pendientes: <PendientesManager user={user} />,
    voluntarios: <VoluntariosManager user={user} />,
    personas: <PersonasDbManager user={user} />,
    participantes: <ParticipantesManager user={user} />,
    talleres: <TalleresManager user={user} />,
    grupos: <GruposManager user={user} />,
    actividades: <ActividadesManager user={user} />,
    inscripciones: <InscripcionesManager />,
    capacitaciones: <CapacitacionesManager user={user} />,
    habilitaciones: <AccesosManager user={user} vista="habilitaciones" />,
    "pagos-capacitaciones": <AccesosManager user={user} vista="pagos" />,
    auditoria: <AccesosManager user={user} vista="auditoria" />,
    alertas: <AccesosManager user={user} vista="alertas" />,
    emision: <EntregaCertificados />,
    "historial-certificados": <HistorialCertificados />,
    certificados: <CertificadosAdmin />,
    "link-pago": <LinkPagoAdmin />,
    encuestas: <EncuestasManager user={user} />,
    ideas: <IdeasManager user={user} />,
    aprobaciones: <AprobacionesManager user={user} onPendingCount={setPendingCount} />,
    actividad: <ActividadManager user={user} />,
    anuncios: <BroadcastManager user={user} />,
    "puesto-venta": <PuestoVentaManager user={user} />,
    ingresos: <IngresosTablero esAdmin={isAdmin} />,
    // `key` fuerza el remonte: sin eso, entrar desde el menú a
    // Notificaciones con Mi perfil ya abierto no cambiaba de pestaña.
    "mis-datos": <MiCuenta key={seccionPerfil} user={user} seccionInicial={seccionPerfil} />,
  }



  /**
   * Tracking de uso: registra una vista por cada módulo/sub-módulo que el usuario realmente abre.
   *
   * El backend deduce los "ingresos" a partir de estos pings (ver
   * activity.py): la sesión guardada en el navegador hace que casi nadie
   * vuelva a pasar por /api/auth, así que el login solo no alcanza para
   * saber cuándo entró alguien. Por eso también pingueamos cuando la
   * pestaña vuelve del fondo tras un rato largo: la PWA del teléfono puede
   * quedar días abierta en el mismo módulo sin navegar a ningún lado.
   */
  useEffect(() => {
    const r = resolveRoute(pathname)
    const module = r?.grandchild?.key ?? r?.child?.key ?? r?.group.key ?? (esInicio ? "inicio" : "desconocido")
    const ping = () => {
      fetch("/api/tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module }),
      }).catch(() => {})
    }
    ping()

    let hiddenSince = 0
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        hiddenSince = Date.now()
        return
      }
      const away = hiddenSince ? Date.now() - hiddenSince : 0
      hiddenSince = 0
      if (away > SESSION_GAP_MS) ping()
    }
    document.addEventListener("visibilitychange", onVisibilityChange)
    return () => document.removeEventListener("visibilitychange", onVisibilityChange)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  /**
   * Ruta → grupo activo + sub-módulo activo.
   *
   * Todo sale del registro (lib/modules.ts): agregar un módulo no obliga a
   * tocar esta función. Antes había una cadena de ifs que había que ampliar
   * a mano en cada alta.
   */
  const resolved = resolveRoute(pathname)
  const activeGroup = resolved?.group ?? MODULES[0]
  const activeTab = activeGroup.key
  const activeChild = resolved?.child
  const activeGrandchild = resolved?.grandchild

  /** Sub-módulo activo dentro del grupo (primero visible si la ruta no lo dice). */
  const groupChildren = visibleChildren(user, activeGroup, grants)
  const activeSubTab = activeChild?.key ?? groupChildren[0]?.key ?? activeGroup.key
  /** Tercer nivel: solo existe en las sub-pestañas que a su vez tienen hijos. */
  const activeSubSubTab =
    activeGrandchild?.key ?? (activeChild ? visibleChildren(user, activeChild, grants)[0]?.key : undefined)

  const activeModule = activeGrandchild ?? activeChild ?? activeGroup
  const activeTabLabel = activeModule.label

  /**
   * Adónde lleva tocar una pestaña de cualquier nivel: siempre a la primera
   * hoja que este usuario pueda ver. Así nunca cae en una pantalla vacía por
   * no tener permiso sobre el primer hijo.
   */
  const rutaVisible = (mod: ModuleDef | undefined, fallback: string): string => {
    let actual = mod
    while (actual?.children?.length) {
      const siguiente = visibleChildren(user, actual, grants)[0]
      if (!siguiente) break
      actual = siguiente
    }
    return actual?.route ?? fallback
  }

  const handleTabChange = (value: string) => {
    navigateTo(rutaVisible(getModule(value), `/${value}`))
    setMobileMenuOpen(false)
  }

  /**
   * Key de módulo → a dónde lleva y de qué grupo cuelga.
   *
   * Solo HOJAS: son las únicas que el tracking escribe (resolveRoute siempre
   * baja al nivel más profundo). Lo consume Inicio para resolver las keys que
   * devuelve /api/inicio/recientes, que no sabe nada de etiquetas ni rutas.
   */
  const destinos = useMemo(() => {
    const salida: Record<string, { mod: ModuleDef; grupo: string }> = {}
    const recorrer = (mod: ModuleDef, grupo: string) => {
      const kids = visibleChildren(user, mod, grants)
      if (kids.length === 0) {
        salida[mod.key] = { mod, grupo }
        return
      }
      // El grupo que se muestra es el de PRIMER nivel: "Plata", no
      // "Plata › Accesos". Es lo que hace falta para desempatar dos nombres
      // parecidos, y más que eso no entra en el renglón.
      for (const kid of kids) recorrer(kid, grupo || mod.label)
    }
    for (const mod of navModules) recorrer(mod, "")
    return salida
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navModules, grants, user])

  /**
   * Lo que está esperando que alguien lo resuelva, para la franja de arriba
   * de Inicio.
   *
   * Son los mismos contadores que pintan el globo rojo del sidebar. La
   * diferencia es que acá se dice QUÉ es: un número al lado de "Personas" no
   * alcanza para saber si hay que aprobar a alguien o si falta cargar un dato.
   */
  //
  // Solo admin: los dos contadores (aprobar voluntarios, revisar avisos de
  // pago) son de cosas que únicamente un admin puede resolver. Pasarle la
  // lista a un voluntario le dibujaba un "todo al día" permanente, que es
  // decoración y no información.
  const atencion = !isAdmin ? [] : [
    { key: "aprobaciones", cantidad: pendingCount, que: pendingCount === 1 ? "aprobación" : "aprobaciones", grupo: "Personas", route: "/aprobaciones" },
    { key: "pagos", cantidad: avisosPago, que: avisosPago === 1 ? "pago" : "pagos", grupo: "Plata", route: "/pagos-capacitaciones" },
  ]

  /**
   * ¿El módulo abierto tiene sub-pestañas?
   *
   * Lo usa el encabezado del teléfono para saber si le toca a ÉL cerrar el
   * bloque blanco con una línea, o si abajo viene la fila de pestañas y la
   * línea la pone ella. Sin esto quedaban dos líneas pegadas, o ninguna.
   */
  const hayPestanas = useMemo(() => {
    const mod = [...navModules, ...menuModules].find((m) => m.key === activeTab)
    return mod ? visibleChildren(user, mod, grants).length > 1 : false
  }, [activeTab, navModules, menuModules, user, grants])

  /** A qué altura se clava la fila de pestañas: debajo del encabezado (64px),
   *  más la franja de suplantación si está puesta (36px). */
  const altoDeArriba = user.impersonating ? "top-[100px]" : "top-16"


  // Tabs que muestran la flor arriba a la derecha; el resto la muestran abajo a la derecha
  const flowerTop = ['voluntarios', 'espacios', 'pendientes', 'ideas'].includes(activeTab)


  return (
    <div className="min-h-screen bg-gray-50 relative overflow-hidden">
      {/* Flor decorativa — solo desktop, fixed en el viewport, alterna posición por módulo */}
      <div className={`hidden md:block fixed top-0 right-0 w-[700px] h-[700px] pointer-events-none select-none translate-x-1/3 -translate-y-1/3 -rotate-[20deg] transition-opacity duration-700 ${flowerTop ? 'opacity-[0.07]' : 'opacity-0'}`}>
        <img src="/images/flor.png" alt="" className="w-full h-full object-contain" />
      </div>
      <div className={`hidden md:block fixed bottom-0 right-0 w-[700px] h-[700px] pointer-events-none select-none translate-x-1/3 translate-y-1/3 rotate-[20deg] transition-opacity duration-700 ${!flowerTop ? 'opacity-[0.07]' : 'opacity-0'}`}>
        <img src="/images/flor.png" alt="" className="w-full h-full object-contain" />
      </div>

      {/* Progress bar de navegación */}
      <div className={`fixed top-0 left-0 right-0 z-50 h-[2px] overflow-hidden transition-opacity duration-300 ${navigating ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div
          className="h-full bg-[#5ec0cf]"
          style={{ animation: navigating ? 'alma-nav-bar 1.4s ease-in-out infinite' : 'none', width: '45%' }}
        />
      </div>
      <style>{`
        @keyframes alma-nav-bar {
          0%   { transform: translateX(-120%); }
          100% { transform: translateX(350%); }
        }
      `}</style>

      {/* Todo el contenido por encima de la flor */}
      <div className={`relative z-[1] flex min-h-screen flex-col ${user.impersonating ? "pt-9" : ""}`}>
      {user.impersonating && <ImpersonationBanner user={user} />}

      {/* Imposible de pasar por alto, y con la salida al lado: si no, se
          olvida puesto y después "me desapareció la mitad del menú". */}
      {vistaComo && (
        <div className="sticky top-0 z-40 flex items-center gap-2 bg-alma-lavanda px-4 py-2 text-white">
          <Eye className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate text-sm">
            Estás viendo la app como <strong>{vistaComo}</strong>
          </span>
          <button
            onClick={() => cambiarVista(null)}
            className="shrink-0 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold active:bg-white/30"
          >
            Volver a admin
          </button>
        </div>
      )}
      {/* Header */}
      <header className={`bg-white shadow-sm border-b border-gray-200 sticky z-10 ${user.impersonating ? "top-9" : "top-0"}`}>
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 gap-4">
            {/* Logo + marca, juntos y a la izquierda. El logo además vuelve
                a Inicio: es el gesto que ya tenía y conviene no perderlo. */}
            <button
              onClick={() => navigateTo("/inicio")}
              title="Ir a Inicio"
              className="flex shrink-0 items-center gap-2.5 transition-transform active:scale-95"
            >
              <img src="/images/flor.png" alt="Inicio" className="h-8 w-auto" />
              <MarcaAlma className="text-xl sm:text-2xl" />
            </button>

            <div className="flex min-w-0 flex-1 justify-center">
              {/* El buscador de secciones ocupa el lugar que dejó la marca.
                  Es lo que reemplaza al hover de la barra de pestañas: la
                  única forma de llegar a una pantalla sin saber de antemano
                  en qué grupo la guardamos. */}
              <div className="hidden w-full max-w-md md:block">
                <BuscadorModulos
                  user={user}
                  grants={grants}
                  modules={navModules}
                  navegar={navigateTo}
                  rutaDe={(mod) => rutaVisible(mod, mod.route)}
                />
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <NotificationBell />
              {/* El nombre era texto muerto y "Salir" un botón suelto al lado.
                  Ahora el nombre abre el menú de la cuenta, que absorbe los
                  tres módulos que no son de trabajo diario más el logout. */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="hidden items-center gap-2 rounded-md px-2 py-1 text-left transition-colors hover:bg-gray-50 sm:flex">
                    {/* Iniciales. Es lo que distingue de un vistazo "estoy yo"
                        de "quedó la sesión de otro" en una compu compartida,
                        que en ALMA son casi todas. */}
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#5ec0cf]/15 text-xs font-bold uppercase text-alma-fuerte">
                      {`${user.name?.[0] ?? ""}${user.last_name?.[0] ?? ""}` || "?"}
                    </span>
                    <span>
                      <span className="block text-sm font-medium text-[#5ec0cf]">{user.name}</span>
                      <span className="block text-xs text-gray-600">{roleLabel}</span>
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  {menuModules.map((mod) => {
                    const Icono = mod.icon
                    return (
                      <DropdownMenuItem
                        key={mod.key}
                        onClick={() => {
                          if (mod.key === "mis-datos") setSeccionPerfil("perfil")
                          navigateTo(mod.route)
                        }}
                        className="cursor-pointer gap-2"
                      >
                        <Icono className="h-4 w-4 text-gray-500" />
                        {mod.label}
                      </DropdownMenuItem>
                    )
                  })}

                  {/* Solo para admin: el resto no tiene otros ojos con los
                      que mirar. */}
                  {esAdminReal && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                        Ver la app como
                      </DropdownMenuLabel>
                      {(["voluntario", "participante"] as const).map((rol) => (
                        <DropdownMenuItem
                          key={rol}
                          onClick={() => cambiarVista(vistaComo === rol ? null : rol)}
                          className="cursor-pointer gap-2 capitalize"
                        >
                          <Eye className={`h-4 w-4 ${vistaComo === rol ? "text-alma-fuerte" : "text-gray-500"}`} />
                          {rol}
                          {vistaComo === rol && (
                            <span className="ml-auto text-xs font-semibold text-alma-fuerte">viendo</span>
                          )}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                    </>
                  )}

                  {/* Notificaciones no es un módulo: es una pestaña adentro de
                      Mi perfil, donde se prende y apaga el aviso al celular.
                      Entrar a buscarla ahí adentro no se le ocurre a nadie, así
                      que el menú lleva directo. */}
                  <DropdownMenuItem
                    onClick={() => { setSeccionPerfil("notificaciones"); navigateTo("/mis-datos") }}
                    className="cursor-pointer gap-2"
                  >
                    <Bell className="h-4 w-4 text-gray-500" />
                    Notificaciones
                  </DropdownMenuItem>
                  {menuModules.length > 0 && <DropdownMenuSeparator />}
                  <DropdownMenuItem onClick={onLogout} className="cursor-pointer gap-2 text-red-600 focus:text-red-600">
                    <LogOut className="h-4 w-4" />
                    Salir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {GAMES_URL && (
                <a
                  href={GAMES_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden sm:inline-flex items-center justify-center gap-2 rounded-md border border-[#5ec0cf] text-[#5ec0cf] bg-transparent hover:bg-alma-fuerte hover:text-white transition-colors text-sm font-medium h-9 px-3 no-underline"
                >
                  <Gamepad2 className="w-4 h-4 shrink-0" />
                  Juegos
                </a>
              )}

              {/* La misma búsqueda de secciones que en escritorio, de lupa.
                  Va ANTES del menú y no adentro: el diálogo se dibuja fijo a
                  la pantalla, y adentro de la hoja —que entra deslizándose,
                  o sea con `transform`— quedaría clavado a la hoja en vez de
                  a la ventana. Y además obligaría a abrir el menú para poder
                  buscar, que es justo el camino que la búsqueda evita. */}
              <BuscadorModulos
                user={user}
                grants={grants}
                modules={navModules}
                navegar={navigateTo}
                rutaDe={(mod) => rutaVisible(mod, mod.route)}
                soloIcono
                className="md:hidden"
              />

              {/* Mobile menu button */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Abrir menú</span>
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="left"
                  className="flex w-[86%] max-w-[340px] flex-col gap-0 p-0 sm:w-[340px]"
                >
                  <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
                  <MenuLateral
                    user={user}
                    grants={grants}
                    roleLabel={roleLabel}
                    modules={navModules}
                    menuModules={menuModules}
                    activeTab={activeTab}
                    activeSubTab={activeSubTab}
                    activeSubSubTab={activeSubSubTab}
                    navegar={navigateTo}
                    rutaDe={(mod) => rutaVisible(mod, mod.route)}
                    onLogout={onLogout}
                    /* El número en el hijo que lo genera y en el grupo que lo
                       contiene: el grupo lo suma solo recorriendo sus hijos. */
                    badges={{ aprobaciones: pendingCount, "pagos-capacitaciones": avisosPago }}
                    juegosUrl={GAMES_URL}
                    vistaComo={esAdminReal ? vistaComo : undefined}
                    onVistaComo={esAdminReal ? cambiarVista : undefined}
                    cerrar={() => setMobileMenuOpen(false)}
                  />
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      {/* Las pestañas, en su propia fila. Fuera de <Tabs> a propósito: la
          pestaña activa la decide la URL, no un estado de Radix. */}
      <BarraModulos
        user={user}
        grants={grants}
        modules={navModules}
        activeTab={activeTab}
        esInicio={esInicio}
        navegar={navigateTo}
        rutaDe={(mod) => rutaVisible(mod, mod.route)}
        /* El punto en el grupo, el número en el hijo: desde afuera se ve que
           Personas tiene algo, y al abrirla se ve que es Aprobaciones. */
        badges={{
          comunidad: pendingCount,
          aprobaciones: pendingCount,
          plata: avisosPago,
          "pagos-capacitaciones": avisosPago,
        }}
      />

      {/* Main Content */}
      <main className="relative flex-1 max-w-[1600px] mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4 pb-8 md:pt-6">
        {navigating && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-gray-50/70 backdrop-blur-[1px] rounded-lg min-h-[200px]">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#5ec0cf]" />
              <span className="text-sm text-gray-500">Cargando...</span>
            </div>
          </div>
        )}
        {esInicio ? (
          <InicioLauncher
            nombre={user.name ?? ""}
            modules={navModules}
            onAbrir={(mod) => navigateTo(rutaVisible(mod, mod.route))}
            navegar={navigateTo}
            hijos={(mod) => visibleChildren(user, mod, grants)}
            atencion={atencion}
            destinos={destinos}
            /* El globito al lado del sub-módulo que lo genera: en el mapa, el
               número tiene que estar sobre "Aprobaciones", no sobre
               "Personas" — si no hay que entrar para saber qué era. */
            badges={{ aprobaciones: pendingCount, "pagos-capacitaciones": avisosPago }}
            juegosUrl={GAMES_URL}
          />
        ) : (
        /*
          Sin `space-y-6`: el primer hijo de acá adentro es el breadcrumb, que
          en escritorio está oculto pero sigue siendo un hijo — así que el
          espaciado le ponía un margen de 24px a la pantalla que viene abajo
          por un elemento que no se ve. Sumado al padding del <main>, dejaba
          una franja vacía arriba de casi todos los módulos.

          Lo que queda de <Tabs> es el ruteo del contenido: la barra de
          pestañas vive afuera (components/dashboard/barra-modulos.tsx) y el
          valor lo fija la URL, no un click. Cada TabsContent trae su propio
          `space-y-6` para lo de adentro.
        */
        <Tabs value={activeTab} onValueChange={handleTabChange}>

          {/*
            Encabezado de sección (solo teléfono).

            Era una tarjeta flotante con sombra y bordes redondeados, que se
            leía como "una cosa más adentro de la pantalla". Ahora es una
            banda de lado a lado pegada al encabezado de la app: se lee como
            la cabecera de donde estás parado, que es lo que es.

            El chevron vuelve a Inicio. En el celular no hay barra de módulos
            —está escondida detrás del menú—, así que este botón es la única
            salida visible, y por eso tiene 44px y no los 36 de antes.

            Sin el ícono del módulo: el título ya lo dice, y en 360px de ancho
            cada elemento de más le come letras a un nombre como "Pagos de
            capacitaciones".
          */}
          <div
            className={`md:hidden -mx-4 flex items-center gap-1 bg-white px-2 ${
              hayPestanas ? "" : "mb-4 border-b border-gray-200"
            }`}
          >
            <button
              type="button"
              onClick={() => navigateTo("/inicio")}
              aria-label="Volver al inicio"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors active:bg-gray-100"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <h1 className="min-w-0 flex-1 truncate py-2 text-[19px] font-bold text-gray-900">
              {activeTabLabel}
            </h1>
          </div>

          {/* Los módulos del menú del avatar no están en la barra, pero SÍ
              necesitan su TabsContent: si no, /mis-datos quedaría en blanco.

              Por eso el recorrido es sobre navModules + menuModules y NO sobre
              navModules solo. Pasó exactamente lo que este comentario avisaba:
              al mover Mi perfil al menú del avatar salió de `navModules`, se
              quedó sin su TabsContent y la pantalla apareció en blanco. */}
          {[...navModules, ...menuModules].map((mod) => {
            const children = visibleChildren(user, mod, grants)

            // Sin hijos visibles: el grupo es el módulo.
            if (children.length === 0) {
              return (
                <TabsContent key={mod.key} value={mod.key} className="space-y-6">
                  {MODULE_CONTENT[mod.key] ?? null}
                </TabsContent>
              )
            }

            // Un solo hijo (ej. Agenda → Calendarios): no tiene sentido dibujar
            // una barra de sub-pestañas con una sola opción.
            if (children.length === 1) {
              return (
                <TabsContent key={mod.key} value={mod.key} className="space-y-6">
                  {MODULE_CONTENT[children[0].key] ?? null}
                </TabsContent>
              )
            }

            return (
              <TabsContent key={mod.key} value={mod.key} className="space-y-4">
                <Tabs
                  value={activeSubTab}
                  onValueChange={(v) => navigateTo(getModule(v)?.route ?? `/${v}`)}
                  className="space-y-4"
                >
                  {/*
                    Un solo renglón que se arrastra, en vez de envolverse en
                    tres. Con cinco pestañas (Academia) el envolver dejaba la
                    navegación ocupando un tercio de la pantalla antes del
                    primer dato. Además queda clavada arriba: se cambia de
                    pestaña sin volver a subir.
                  */}
                  <PestanasFila
                    valor={activeSubTab}
                    className={`sticky ${altoDeArriba} z-[9] md:static`}
                  >
                    {children.map((child) => {
                      const ChildIcon = child.icon
                      return (
                        <TabsTrigger key={child.key} value={child.key} className={clasePestana}>
                          <ChildIcon className="w-4 h-4 shrink-0" />
                          <span>{child.label}</span>
                          {child.key === "aprobaciones" && pendingCount > 0 && (
                            <span className="ml-1 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold rounded-full bg-red-500 text-white">
                              {pendingCount}
                            </span>
                          )}
                          {/* Punto y no número: el padre avisa que hay algo, el
                              nieto dice cuánto. Repetir el mismo número en dos
                              niveles no agrega nada. */}
                          {child.key === "accesos" && avisosPago > 0 && (
                            <span className="ml-1 h-2 w-2 shrink-0 rounded-full bg-red-500" />
                          )}
                        </TabsTrigger>
                      )
                    })}
                  </PestanasFila>
                  {children.map((child) => {
                    // Tercer nivel: Accesos y Certificados agrupan varias
                    // pantallas. El resto es hoja y se monta directo.
                    const nietos = visibleChildren(user, child, grants)
                    return (
                      <TabsContent key={child.key} value={child.key}>
                        {/* Solo se monta el sub-módulo activo: evita fetches en paralelo */}
                        {activeSubTab !== child.key ? null : nietos.length === 0 ? (
                          MODULE_CONTENT[child.key]
                        ) : (
                          <Tabs
                            value={activeSubSubTab}
                            onValueChange={(v) => navigateTo(getModule(v)?.route ?? `/${v}`)}
                            className="space-y-4"
                          >
                            {/*
                              Control segmentado y no otra fila de pestañas.
                              Habilitaciones / Auditoría / Alertas son tres
                              VISTAS de lo mismo, no tres destinos: el marco
                              gris que las encierra dice eso de un vistazo, y
                              evita que el tercer nivel se confunda con el
                              segundo.
                            */}
                            <Segmentado>
                              {nietos.map((nieto) => {
                                const NietoIcon = nieto.icon
                                return (
                                  <TabsTrigger key={nieto.key} value={nieto.key} className={claseSegmento}>
                                    <NietoIcon className="h-3.5 w-3.5 shrink-0" />
                                    <span>{nieto.label}</span>
                                    {nieto.key === "pagos-capacitaciones" && avisosPago > 0 && (
                                      <span className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                                        {avisosPago}
                                      </span>
                                    )}
                                  </TabsTrigger>
                                )
                              })}
                            </Segmentado>
                            {nietos.map((nieto) => (
                              <TabsContent key={nieto.key} value={nieto.key}>
                                {activeSubSubTab === nieto.key && MODULE_CONTENT[nieto.key]}
                              </TabsContent>
                            ))}
                          </Tabs>
                        )}
                      </TabsContent>
                    )
                  })}
                </Tabs>
              </TabsContent>
            )
          })}
        </Tabs>
        )}
      </main>

      <AlmaFooter borderTop />
      </div>{/* fin z-[1] */}

      {/* Participante: onboarding inline (pide nombre/apellido). Para el resto,
          la invitación clásica a completar el perfil. Uno u otro, nunca los dos. */}
      {user.role === "participante"
        ? <ParticipanteOnboarding user={user} />
        : <ProfileCompletionModal user={user} />}
      <AnnouncementModal user={user} />
    </div>
  )
}
