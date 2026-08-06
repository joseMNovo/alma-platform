"use client"

import { useState, useEffect, useMemo, useRef, type ReactNode } from "react"
import { createPortal } from "react-dom"
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
import { visibleModules, visibleChildren, type Grant } from "@/lib/access"
import { getModule, resolveRoute, MODULES, type ModuleDef } from "@/lib/modules"
import NotificationBell from "@/components/notifications/notification-bell"
import BroadcastManager from "@/components/notifications/broadcast-manager"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import AlmaFooter from "@/components/ui/alma-footer"
import ProfileCompletionModal from "@/components/auth/profile-completion-modal"
import ParticipanteOnboarding from "@/components/participantes/onboarding-modal"
import AnnouncementModal from "@/components/announcements/announcement-modal"
import ImpersonationBanner from "@/components/admin/impersonation-banner"
import { Menu } from "lucide-react"

// Human-readable role labels (UI)
const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  voluntario: "Voluntario",
  participante: "Participante",
}


export default function Dashboard({ user, onLogout }: { user: any, onLogout: () => void }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
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

  // Dropdown de sub-módulos al hacer hover (desktop). Se porta a document.body
  // porque la barra de módulos tiene overflow-x-auto/overflow-y-hidden (scroll
  // horizontal cuando hay muchas pestañas) y eso recorta cualquier hijo
  // posicionado absoluto que sobresalga hacia abajo.
  const [navSubmenu, setNavSubmenu] = useState<{ key: string; left: number; top: number } | null>(null)
  const navSubmenuCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const openNavSubmenu = (key: string, el: HTMLElement) => {
    if (navSubmenuCloseTimer.current) { clearTimeout(navSubmenuCloseTimer.current); navSubmenuCloseTimer.current = null }
    const rect = el.getBoundingClientRect()
    setNavSubmenu({ key, left: rect.left + rect.width / 2, top: rect.bottom })
  }
  const scheduleCloseNavSubmenu = () => {
    navSubmenuCloseTimer.current = setTimeout(() => setNavSubmenu(null), 150)
  }
  const cancelCloseNavSubmenu = () => {
    if (navSubmenuCloseTimer.current) { clearTimeout(navSubmenuCloseTimer.current); navSubmenuCloseTimer.current = null }
  }

  const isAdmin = user.role === "admin"

  useEffect(() => {
    setNavigating(false)
    if (!isAdmin) return
    fetch("/api/voluntarios?status=pendiente")
      .then(r => r.ok ? r.json() : [])
      .then(data => setPendingCount(Array.isArray(data) ? data.length : 0))
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
    "mis-datos": <MiCuenta user={user} />,
  }

  // Tailwind necesita las clases completas en el código para generarlas:
  // `grid-cols-${n}` interpolado no existiría en el CSS final.
  const GRID_COLS: Record<number, string> = {
    1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4",
  }


  // Tracking de uso: registra una vista por cada módulo/sub-módulo que el usuario realmente abre.
  useEffect(() => {
    const r = resolveRoute(pathname)
    const module = r?.grandchild?.key ?? r?.child?.key ?? r?.group.key ?? "desconocido"
    fetch("/api/tracking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ module }),
    }).catch(() => {})
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

  const tabTriggerClass = "flex items-center gap-1 px-2 text-[13px] transition-all duration-200 active:scale-95 data-[state=inactive]:hover:bg-[#4dd0e1]/10 data-[state=inactive]:hover:text-[#00838f] data-[state=active]:bg-[#4dd0e1] data-[state=active]:text-white"
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <img src="/images/flor.png" alt="ALMA" className="h-8 w-auto" />
            </div>

            {/* Título centrado */}
            <div className="flex-1 flex justify-center">
              <h1 className="text-lg sm:text-xl font-bold text-center">
                Comunidad <span className="text-[#4dd0e1]">ALMA</span>
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              <NotificationBell />
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-[#4dd0e1]">{user.name}</p>
                {/* UI: always show human-readable role label */}
                <p className="text-xs text-gray-600">{roleLabel}</p>
              </div>
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
              <Button
                onClick={onLogout}
                variant="outline"
                size="sm"
                className="border-[#4dd0e1] text-[#4dd0e1] hover:bg-[#4dd0e1] hover:text-white bg-transparent hidden sm:flex"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Salir
              </Button>

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
                        <img src="/images/flor.png" alt="ALMA" className="h-8 w-auto" />
                        <div>
                          <h2 className="text-lg font-bold">
                            Comunidad <span className="text-[#4dd0e1]">ALMA</span>
                          </h2>
                        </div>
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

      {/* Main Content */}
      <main className="relative flex-1 max-w-[1600px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 md:py-8">
        {navigating && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-gray-50/70 backdrop-blur-[1px] rounded-lg min-h-[200px]">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#4dd0e1]" />
              <span className="text-sm text-gray-500">Cargando...</span>
            </div>
          </div>
        )}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          {/*
            Las pestañas salen del registro de módulos (lib/modules.ts) filtrado
            por rol + habilitaciones (lib/access.ts). Agregar un módulo nuevo es
            una entrada en el registro y una en MODULE_CONTENT — no hay que tocar
            el nav mobile, ni la lista, ni el breadcrumb.
          */}
          <TabsList
            className={
              GRID_COLS[navModules.length]
                ? `hidden md:grid w-full ${GRID_COLS[navModules.length]} bg-white border border-gray-200 p-1 rounded-lg`
                : "hidden md:flex md:flex-nowrap md:justify-center w-full bg-white border border-gray-200 p-1 rounded-lg gap-0.5 overflow-x-auto overflow-y-hidden"
            }
          >
            {navModules.map((mod) => {
              const Icon = mod.icon
              const submenu = visibleChildren(user, mod, grants)
              const hasSubmenu = submenu.length > 1
              return (
                <div
                  key={mod.key}
                  className="relative"
                  onMouseEnter={hasSubmenu ? (e) => openNavSubmenu(mod.key, e.currentTarget) : undefined}
                  onMouseLeave={hasSubmenu ? scheduleCloseNavSubmenu : undefined}
                >
                  <TabsTrigger value={mod.key} className={tabTriggerClass + " w-full"}>
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="hidden sm:inline">{mod.label}</span>
                    {mod.key === "aprobaciones" && pendingCount > 0 && (
                      <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold rounded-full bg-red-500 text-white">
                        {pendingCount}
                      </span>
                    )}
                  </TabsTrigger>
                </div>
              )
            })}
          </TabsList>

          {typeof document !== "undefined" && navSubmenu && createPortal(
            (() => {
              const mod = navModules.find((m) => m.key === navSubmenu.key)
              if (!mod) return null
              const submenu = visibleChildren(user, mod, grants)
              return (
                <div
                  className="fixed z-[100] -translate-x-1/2 pt-1"
                  style={{ left: navSubmenu.left, top: navSubmenu.top }}
                  onMouseEnter={cancelCloseNavSubmenu}
                  onMouseLeave={scheduleCloseNavSubmenu}
                >
                  <div className="flex min-w-[170px] flex-col overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                    {submenu.map((child) => {
                      const ChildIcon = child.icon
                      return (
                        <button
                          key={child.key}
                          type="button"
                          // Si es una sección, entra por su primera pantalla:
                          // el atajo tiene que llevar a algo que se vea.
                          onClick={() => { setNavSubmenu(null); navigateTo(rutaVisible(child, child.route)) }}
                          className="flex items-center gap-2 px-3 py-2 text-left text-[13px] text-gray-700 transition-colors hover:bg-[#4dd0e1]/10 hover:text-[#00838f]"
                        >
                          <ChildIcon className="w-4 h-4 shrink-0" />
                          {child.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })(),
            document.body,
          )}

          {/* Breadcrumb mobile */}
          <div className="md:hidden bg-white p-3 rounded-lg shadow-sm mb-4">
            <h2 className="text-lg font-medium flex items-center">
              {ActiveIcon && <ActiveIcon className="w-5 h-5 mr-2" />}
              {activeTabLabel}
            </h2>
          </div>

          {/* Los módulos del menú del avatar no están en la barra, pero SÍ
              necesitan su TabsContent: si no, /mis-datos quedaría en blanco. */}
          {navModules.map((mod) => {
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
