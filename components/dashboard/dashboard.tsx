"use client"

import { useState, useEffect, useMemo, type ReactNode } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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

const GAMES_URL = process.env.NEXT_PUBLIC_GAMES_URL ?? ""
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
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import PuestoVentaManager from "@/components/stand/puesto-venta-manager"
import IngresosTablero from "@/components/ingresos/ingresos-tablero"
import InicioLauncher from "@/components/inicio/inicio-launcher"
import BarraModulos from "@/components/dashboard/barra-modulos"
import BuscadorModulos from "@/components/dashboard/buscador-modulos"
import AlmaFooter from "@/components/ui/alma-footer"
import MarcaAlma from "@/components/ui/marca-alma"
import ProfileCompletionModal from "@/components/auth/profile-completion-modal"
import ParticipanteOnboarding from "@/components/participantes/onboarding-modal"
import AnnouncementModal from "@/components/announcements/announcement-modal"
import ImpersonationBanner from "@/components/admin/impersonation-banner"
import { Menu, Bell } from "lucide-react"

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


export default function Dashboard({ user, onLogout }: { user: any, onLogout: () => void }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
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
  const ActiveIcon = activeModule.icon
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

  const subTabTriggerClass = "flex items-center space-x-2 transition-all duration-200 active:scale-95 data-[state=inactive]:hover:bg-[#4dd0e1]/10 data-[state=inactive]:hover:text-[#00838f] data-[state=active]:bg-[#4dd0e1]/15 data-[state=active]:text-[#4dd0e1] data-[state=active]:font-semibold"
  // Tercer nivel: más liviano que el segundo a propósito. Si los tres niveles
  // pesaran igual, tres barras apiladas no dejarían ver cuál manda.
  const subSubTabTriggerClass = "flex items-center gap-1.5 rounded-none border-b-2 border-transparent px-2.5 py-1.5 text-[13px] text-gray-500 transition-colors data-[state=inactive]:hover:text-[#00838f] data-[state=active]:border-[#4dd0e1] data-[state=active]:font-semibold data-[state=active]:text-[#00838f]"

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
          className="h-full bg-[#4dd0e1]"
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
              <MarcaAlma className="hidden text-2xl sm:inline-flex" />
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
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#4dd0e1]/15 text-xs font-bold uppercase text-[#00838f]">
                      {`${user.name?.[0] ?? ""}${user.last_name?.[0] ?? ""}` || "?"}
                    </span>
                    <span>
                      <span className="block text-sm font-medium text-[#4dd0e1]">{user.name}</span>
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
                  className="hidden sm:inline-flex items-center justify-center gap-2 rounded-md border border-[#4dd0e1] text-[#4dd0e1] bg-transparent hover:bg-[#4dd0e1] hover:text-white transition-colors text-sm font-medium h-9 px-3 no-underline"
                >
                  <Gamepad2 className="w-4 h-4 shrink-0" />
                  Juegos
                </a>
              )}

              {/* Mobile menu button */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Abrir menú</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[80%] sm:w-[350px] p-0">
                  <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
                  <div className="flex flex-col h-full">
                    <div className="p-4 border-b">
                      <div className="flex items-center space-x-3">
                        <MarcaAlma className="text-2xl" />
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-[#4dd0e1]">{user.name}</p>
                          <p className="text-xs text-gray-600">{roleLabel}</p>
                        </div>
                        <Button
                          onClick={onLogout}
                          variant="outline"
                          size="sm"
                          className="border-[#4dd0e1] text-[#4dd0e1] bg-transparent"
                        >
                          <LogOut className="w-4 h-4 mr-2" />
                          Salir
                        </Button>
                      </div>
                    </div>
                    <div className="flex-1 overflow-auto p-4">
                      <nav className="space-y-2">
                        {navModules.map((mod) => {
                          const Icon = mod.icon
                          const isActive = activeTab === mod.key
                          // Solo los hijos que este usuario puede ver: si no,
                          // un voluntario vería "Aprobaciones", que es de admin.
                          const kids = visibleChildren(user, mod, grants)

                          // Con varios hijos, el grupo es una sección con título.
                          // Con uno solo (Agenda) cae abajo y se dibuja plano:
                          // un encabezado con un único ítem debajo es ruido.
                          if (kids.length > 1) {
                            return (
                              <div key={mod.key}>
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 pt-2 pb-1">
                                  {mod.label}
                                </p>
                                {kids.map((child) => {
                                  const ChildIcon = child.icon
                                  const childActive = activeSubTab === child.key
                                  const nietos = visibleChildren(user, child, grants)

                                  // En el cajón mobile, un tercer nivel plegable
                                  // sería un toque más para llegar a lo mismo:
                                  // los nietos se listan derecho, indentados.
                                  if (nietos.length > 0) {
                                    return (
                                      <div key={child.key}>
                                        <p className="flex items-center gap-2 px-3 pt-2 pb-0.5 pl-8 text-xs font-medium text-gray-400">
                                          <ChildIcon className="h-4 w-4 shrink-0" />
                                          {child.label}
                                          {child.key === "accesos" && avisosPago > 0 && (
                                            <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" />
                                          )}
                                        </p>
                                        {nietos.map((nieto) => {
                                          const NietoIcon = nieto.icon
                                          const nietoActive = activeSubSubTab === nieto.key
                                          return (
                                            <Button
                                              key={nieto.key}
                                              variant={nietoActive ? "default" : "ghost"}
                                              className={`w-full justify-start pl-14 ${nietoActive ? "bg-[#4dd0e1] text-white" : ""}`}
                                              onClick={() => { navigateTo(nieto.route); setMobileMenuOpen(false) }}
                                            >
                                              <NietoIcon className="w-4 h-4 mr-3" />
                                              {nieto.label}
                                              {nieto.key === "pagos-capacitaciones" && avisosPago > 0 && (
                                                <span className="ml-auto inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                                                  {avisosPago}
                                                </span>
                                              )}
                                            </Button>
                                          )
                                        })}
                                      </div>
                                    )
                                  }

                                  return (
                                    <Button
                                      key={child.key}
                                      variant={childActive ? "default" : "ghost"}
                                      className={`w-full justify-start pl-8 ${childActive ? "bg-[#4dd0e1] text-white" : ""}`}
                                      onClick={() => { navigateTo(child.route); setMobileMenuOpen(false) }}
                                    >
                                      <ChildIcon className="w-5 h-5 mr-3" />
                                      {child.label}
                                      {/* El badge va en el HIJO: el grupo ya no dibuja botón propio */}
                                      {child.key === "aprobaciones" && pendingCount > 0 && (
                                        <span className="ml-auto inline-flex items-center justify-center w-5 h-5 text-xs font-bold rounded-full bg-red-500 text-white">
                                          {pendingCount}
                                        </span>
                                      )}
                                    </Button>
                                  )
                                })}
                              </div>
                            )
                          }

                          return (
                            <Button
                              key={mod.key}
                              variant={isActive ? "default" : "ghost"}
                              className={`w-full justify-start ${isActive ? "bg-[#4dd0e1] text-white" : ""}`}
                              onClick={() => handleTabChange(mod.key)}
                            >
                              <Icon className="w-5 h-5 mr-3" />
                              {mod.label}
                              {mod.key === "comunidad" && pendingCount > 0 && (
                                <span className="ml-auto inline-flex items-center justify-center w-5 h-5 text-xs font-bold rounded-full bg-red-500 text-white">
                                  {pendingCount}
                                </span>
                              )}
                            </Button>
                          )
                        })}

                        {/* Mi perfil, Anuncios y Actividad.
                            En escritorio viven en el menú del avatar, pero en
                            celular ese menú no existe: sin esto, un teléfono
                            se quedaba sin forma de llegar a sus propios datos.
                            Van abajo y separados, que es su jerarquía. */}
                        {menuModules.length > 0 && (
                          <div className="mt-2 space-y-1 border-t border-gray-100 pt-3">
                            {menuModules.map((mod) => {
                              const Icono = mod.icon
                              return (
                                <Button
                                  key={mod.key}
                                  variant={activeTab === mod.key ? "default" : "ghost"}
                                  className={`w-full justify-start ${activeTab === mod.key ? "bg-[#4dd0e1] text-white" : "text-gray-600"}`}
                                  onClick={() => { navigateTo(mod.route); setMobileMenuOpen(false) }}
                                >
                                  <Icono className="w-5 h-5 mr-3" />
                                  {mod.label}
                                </Button>
                              )
                            })}
                          </div>
                        )}
                      </nav>
                      {GAMES_URL && (
                        <a
                          href={GAMES_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md border border-[#4dd0e1] text-[#4dd0e1] bg-transparent hover:bg-[#4dd0e1] hover:text-white transition-colors text-sm font-medium h-9 px-3 no-underline"
                        >
                          <Gamepad2 className="w-4 h-4 shrink-0" />
                          Juegos
                        </a>
                      )}
                    </div>
                  </div>
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
              <Loader2 className="w-8 h-8 animate-spin text-[#4dd0e1]" />
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

          {/* Breadcrumb mobile */}
          <div className="md:hidden bg-white p-3 rounded-lg shadow-sm mb-4">
            <h2 className="text-lg font-medium flex items-center">
              {/* En el celular no hay pestañas a la vista, y el logo como botón
                  de Inicio es un gesto invisible: lo descubre quien ya sabe que
                  está. El chevron se lee como "salir de acá" sin ocupar alto
                  extra, que es el lugar más caro de una pantalla chica. */}
              <button
                type="button"
                onClick={() => navigateTo("/inicio")}
                aria-label="Volver al inicio"
                className="-ml-1 mr-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors active:bg-gray-100"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              {ActiveIcon && <ActiveIcon className="w-5 h-5 mr-2" />}
              {activeTabLabel}
            </h2>
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
                  <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-white border border-gray-200 p-1 rounded-lg sm:w-auto">
                    {children.map((child) => {
                      const ChildIcon = child.icon
                      return (
                        <TabsTrigger key={child.key} value={child.key} className={subTabTriggerClass}>
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
                  </TabsList>
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
                            <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-none border-b border-gray-200 bg-transparent p-0">
                              {nietos.map((nieto) => {
                                const NietoIcon = nieto.icon
                                return (
                                  <TabsTrigger key={nieto.key} value={nieto.key} className={subSubTabTriggerClass}>
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
                            </TabsList>
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
