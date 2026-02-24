"use client"

import { useState, useEffect } from "react"
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
  Heart,
  CheckSquare,
  CalendarDays,
  UserCircle,
} from "lucide-react"
import TalleresManager from "@/components/talleres/talleres-manager"
import GruposManager from "@/components/grupos/grupos-manager"
import ActividadesManager from "@/components/actividades/actividades-manager"
import PagosManager from "@/components/pagos/pagos-manager"
import InventarioManager from "@/components/inventario/inventario-manager"
import VoluntariosManager from "@/components/voluntarios/voluntarios-manager"
import PendientesManager from "@/components/pendientes/pendientes-manager"
import CalendariosManager from "@/components/calendarios/calendarios-manager"
import MisDatos from "@/components/participantes/mis-datos"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import AlmaFooter from "@/components/ui/alma-footer"
import { Menu } from "lucide-react"

// Human-readable role labels (UI)
const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  voluntario: "Voluntario",
  participante: "Participante",
}

export default function Dashboard({ user, onLogout }: { user: any, onLogout: () => void }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  const isAdmin = user.role === "admin"
  const isParticipant = user.role === "participante"
  const roleLabel = ROLE_LABELS[user.role] ?? user.role

  // Tabs available for participants (read-only modules + Mis datos)
  const participantTabs = ["calendarios", "talleres", "grupos", "actividades", "mis-datos"]

  const getActiveTab = () => {
    if (pathname.includes('/inventario')) return 'inventario'
    if (pathname.includes('/voluntarios')) return 'voluntarios'
    if (pathname.includes('/pendientes')) return 'pendientes'
    if (pathname.includes('/calendarios')) return 'calendarios'
    if (pathname.includes('/talleres')) return 'talleres'
    if (pathname.includes('/grupos')) return 'grupos'
    if (pathname.includes('/actividades')) return 'actividades'
    if (pathname.includes('/pagos')) return 'pagos'
    if (pathname.includes('/mis-datos')) return 'mis-datos'
    return 'calendarios'
  }

  const activeTab = getActiveTab()

  const handleTabChange = (value: string) => {
    router.push(`/${value}`)
    setMobileMenuOpen(false)
  }

  const tabTriggerClass = "flex items-center space-x-2 data-[state=active]:bg-[#4dd0e1] data-[state=active]:text-white"

  return (
    <div className="min-h-screen bg-gray-50 relative overflow-hidden">
      {/* Flores decorativas de fondo distribuidas aleatoriamente */}
      <div className="absolute top-10 left-10 w-32 h-32 opacity-[0.01] pointer-events-none">
        <img src="/images/flor.png" alt="" className="w-full h-full object-contain" />
      </div>
      <div className="absolute top-32 right-20 w-24 h-24 opacity-[0.005] pointer-events-none">
        <img src="/images/flor.png" alt="" className="w-full h-full object-contain" />
      </div>
      <div className="absolute top-1/3 left-1/4 w-40 h-40 opacity-[0.015] pointer-events-none">
        <img src="/images/flor.png" alt="" className="w-full h-full object-contain" />
      </div>
      <div className="absolute bottom-20 right-10 w-28 h-28 opacity-[0.01] pointer-events-none">
        <img src="/images/flor.png" alt="" className="w-full h-full object-contain" />
      </div>
      <div className="absolute bottom-1/3 right-1/3 w-36 h-36 opacity-[0.005] pointer-events-none">
        <img src="/images/flor.png" alt="" className="w-full h-full object-contain" />
      </div>
      <div className="absolute top-1/2 left-1/2 w-20 h-20 opacity-[0.015] pointer-events-none">
        <img src="/images/flor.png" alt="" className="w-full h-full object-contain" />
      </div>
      <div className="absolute top-20 right-1/2 w-32 h-32 opacity-[0.01] pointer-events-none">
        <img src="/images/flor.png" alt="" className="w-full h-full object-contain" />
      </div>
      <div className="absolute bottom-10 left-1/3 w-24 h-24 opacity-[0.005] pointer-events-none">
        <img src="/images/flor.png" alt="" className="w-full h-full object-contain" />
      </div>

      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <img src="/images/flor.png" alt="ALMA" className="h-8 w-auto" />
            </div>

            {/* Título centrado */}
            <div className="flex-1 flex justify-center">
              <h1 className="text-lg sm:text-xl font-bold text-center">
                Plataforma <span className="text-[#4dd0e1]">ALMA</span>
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-[#4dd0e1]">{user.name}</p>
                {/* UI: always show human-readable role label */}
                <p className="text-xs text-gray-600">{roleLabel}</p>
              </div>
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
                  <div className="flex flex-col h-full">
                    <div className="p-4 border-b">
                      <div className="flex items-center space-x-3">
                        <img src="/images/flor.png" alt="ALMA" className="h-8 w-auto" />
                        <div>
                          <h2 className="text-lg font-bold">
                            Plataforma <span className="text-[#4dd0e1]">ALMA</span>
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
                        {isParticipant ? (
                          // Participante: solo ve calendarios, talleres, grupos, actividades y mis datos
                          <>
                            <Button
                              variant={activeTab === "calendarios" ? "default" : "ghost"}
                              className={`w-full justify-start ${activeTab === "calendarios" ? "bg-[#4dd0e1] text-white" : ""}`}
                              onClick={() => handleTabChange("calendarios")}
                            >
                              <CalendarDays className="w-5 h-5 mr-3" />
                              Calendarios
                            </Button>
                            <Button
                              variant={activeTab === "talleres" ? "default" : "ghost"}
                              className={`w-full justify-start ${activeTab === "talleres" ? "bg-[#4dd0e1] text-white" : ""}`}
                              onClick={() => handleTabChange("talleres")}
                            >
                              <Calendar className="w-5 h-5 mr-3" />
                              Talleres
                            </Button>
                            <Button
                              variant={activeTab === "grupos" ? "default" : "ghost"}
                              className={`w-full justify-start ${activeTab === "grupos" ? "bg-[#4dd0e1] text-white" : ""}`}
                              onClick={() => handleTabChange("grupos")}
                            >
                              <Users className="w-5 h-5 mr-3" />
                              Grupos
                            </Button>
                            <Button
                              variant={activeTab === "actividades" ? "default" : "ghost"}
                              className={`w-full justify-start ${activeTab === "actividades" ? "bg-[#4dd0e1] text-white" : ""}`}
                              onClick={() => handleTabChange("actividades")}
                            >
                              <Activity className="w-5 h-5 mr-3" />
                              Actividades
                            </Button>
                            <Button
                              variant={activeTab === "mis-datos" ? "default" : "ghost"}
                              className={`w-full justify-start ${activeTab === "mis-datos" ? "bg-[#4dd0e1] text-white" : ""}`}
                              onClick={() => handleTabChange("mis-datos")}
                            >
                              <UserCircle className="w-5 h-5 mr-3" />
                              Mis datos
                            </Button>
                          </>
                        ) : (
                          // Voluntario / Admin: vista completa
                          <>
                            <Button
                              variant={activeTab === "calendarios" ? "default" : "ghost"}
                              className={`w-full justify-start ${activeTab === "calendarios" ? "bg-[#4dd0e1] text-white" : ""}`}
                              onClick={() => handleTabChange("calendarios")}
                            >
                              <CalendarDays className="w-5 h-5 mr-3" />
                              Calendarios
                            </Button>
                            <Button
                              variant={activeTab === "inventario" ? "default" : "ghost"}
                              className={`w-full justify-start ${activeTab === "inventario" ? "bg-[#4dd0e1] text-white" : ""}`}
                              onClick={() => handleTabChange("inventario")}
                            >
                              <Package className="w-5 h-5 mr-3" />
                              Inventario
                            </Button>
                            <Button
                              variant={activeTab === "pendientes" ? "default" : "ghost"}
                              className={`w-full justify-start ${activeTab === "pendientes" ? "bg-[#4dd0e1] text-white" : ""}`}
                              onClick={() => handleTabChange("pendientes")}
                            >
                              <CheckSquare className="w-5 h-5 mr-3" />
                              Pendientes
                            </Button>
                            <Button
                              variant={activeTab === "voluntarios" ? "default" : "ghost"}
                              className={`w-full justify-start ${activeTab === "voluntarios" ? "bg-[#4dd0e1] text-white" : ""}`}
                              onClick={() => handleTabChange("voluntarios")}
                            >
                              <Heart className="w-5 h-5 mr-3" />
                              Voluntarios
                            </Button>
                            <Button
                              variant={activeTab === "talleres" ? "default" : "ghost"}
                              className={`w-full justify-start ${activeTab === "talleres" ? "bg-[#4dd0e1] text-white" : ""}`}
                              onClick={() => handleTabChange("talleres")}
                            >
                              <Calendar className="w-5 h-5 mr-3" />
                              Talleres
                            </Button>
                            <Button
                              variant={activeTab === "grupos" ? "default" : "ghost"}
                              className={`w-full justify-start ${activeTab === "grupos" ? "bg-[#4dd0e1] text-white" : ""}`}
                              onClick={() => handleTabChange("grupos")}
                            >
                              <Users className="w-5 h-5 mr-3" />
                              Grupos
                            </Button>
                            <Button
                              variant={activeTab === "actividades" ? "default" : "ghost"}
                              className={`w-full justify-start ${activeTab === "actividades" ? "bg-[#4dd0e1] text-white" : ""}`}
                              onClick={() => handleTabChange("actividades")}
                            >
                              <Activity className="w-5 h-5 mr-3" />
                              Actividades
                            </Button>
                            <Button
                              variant={activeTab === "pagos" ? "default" : "ghost"}
                              className={`w-full justify-start ${activeTab === "pagos" ? "bg-[#4dd0e1] text-white" : ""}`}
                              onClick={() => handleTabChange("pagos")}
                            >
                              <CreditCard className="w-5 h-5 mr-3" />
                              Pagos
                            </Button>
                          </>
                        )}
                      </nav>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
        {isParticipant ? (
          // ── Vista Participante ─────────────────────────────────────────
          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
            <TabsList className="hidden md:grid w-full grid-cols-5 bg-white border border-gray-200 p-1 rounded-lg">
              <TabsTrigger value="calendarios" className={tabTriggerClass}>
                <CalendarDays className="w-4 h-4" />
                <span className="hidden sm:inline">Calendarios</span>
              </TabsTrigger>
              <TabsTrigger value="talleres" className={tabTriggerClass}>
                <Calendar className="w-4 h-4" />
                <span className="hidden sm:inline">Talleres</span>
              </TabsTrigger>
              <TabsTrigger value="grupos" className={tabTriggerClass}>
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Grupos</span>
              </TabsTrigger>
              <TabsTrigger value="actividades" className={tabTriggerClass}>
                <Activity className="w-4 h-4" />
                <span className="hidden sm:inline">Actividades</span>
              </TabsTrigger>
              <TabsTrigger value="mis-datos" className={tabTriggerClass}>
                <UserCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Mis datos</span>
              </TabsTrigger>
            </TabsList>

            {/* Mobile breadcrumb */}
            <div className="md:hidden bg-white p-3 rounded-lg shadow-sm mb-4">
              <h2 className="text-lg font-medium flex items-center">
                {activeTab === "talleres" && <Calendar className="w-5 h-5 mr-2" />}
                {activeTab === "grupos" && <Users className="w-5 h-5 mr-2" />}
                {activeTab === "actividades" && <Activity className="w-5 h-5 mr-2" />}
                {activeTab === "calendarios" && <CalendarDays className="w-5 h-5 mr-2" />}
                {activeTab === "mis-datos" && <UserCircle className="w-5 h-5 mr-2" />}
                {activeTab === "mis-datos" ? "Mis datos" : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
              </h2>
            </div>

            <TabsContent value="calendarios" className="space-y-6">
              <CalendariosManager user={user} />
            </TabsContent>
            <TabsContent value="talleres" className="space-y-6">
              <TalleresManager user={user} />
            </TabsContent>
            <TabsContent value="grupos" className="space-y-6">
              <GruposManager user={user} />
            </TabsContent>
            <TabsContent value="actividades" className="space-y-6">
              <ActividadesManager user={user} />
            </TabsContent>
            <TabsContent value="mis-datos" className="space-y-6">
              <MisDatos user={user} />
            </TabsContent>
          </Tabs>
        ) : (
          // ── Vista Voluntario / Admin ───────────────────────────────────
          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
            <TabsList className="hidden md:grid w-full grid-cols-2 lg:grid-cols-8 bg-white border border-gray-200 p-1 rounded-lg">
              <TabsTrigger value="calendarios" className={tabTriggerClass}>
                <CalendarDays className="w-4 h-4" />
                <span className="hidden sm:inline">Calendarios</span>
              </TabsTrigger>
              <TabsTrigger value="inventario" className={tabTriggerClass}>
                <Package className="w-4 h-4" />
                <span className="hidden sm:inline">Inventario</span>
              </TabsTrigger>
              <TabsTrigger value="pendientes" className={tabTriggerClass}>
                <CheckSquare className="w-4 h-4" />
                <span className="hidden sm:inline">Pendientes</span>
              </TabsTrigger>
              <TabsTrigger value="voluntarios" className={tabTriggerClass}>
                <Heart className="w-4 h-4" />
                <span className="hidden sm:inline">Voluntarios</span>
              </TabsTrigger>
              <TabsTrigger value="talleres" className={tabTriggerClass}>
                <Calendar className="w-4 h-4" />
                <span className="hidden sm:inline">Talleres</span>
              </TabsTrigger>
              <TabsTrigger value="grupos" className={tabTriggerClass}>
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Grupos</span>
              </TabsTrigger>
              <TabsTrigger value="actividades" className={tabTriggerClass}>
                <Activity className="w-4 h-4" />
                <span className="hidden sm:inline">Actividades</span>
              </TabsTrigger>
              <TabsTrigger value="pagos" className={tabTriggerClass}>
                <CreditCard className="w-4 h-4" />
                <span className="hidden sm:inline">Pagos</span>
              </TabsTrigger>
            </TabsList>

            {/* Mobile breadcrumb */}
            <div className="md:hidden bg-white p-3 rounded-lg shadow-sm mb-4">
              <h2 className="text-lg font-medium flex items-center">
                {activeTab === "talleres" && <Calendar className="w-5 h-5 mr-2" />}
                {activeTab === "grupos" && <Users className="w-5 h-5 mr-2" />}
                {activeTab === "actividades" && <Activity className="w-5 h-5 mr-2" />}
                {activeTab === "pagos" && <CreditCard className="w-5 h-5 mr-2" />}
                {activeTab === "inventario" && <Package className="w-5 h-5 mr-2" />}
                {activeTab === "voluntarios" && <Heart className="w-5 h-5 mr-2" />}
                {activeTab === "pendientes" && <CheckSquare className="w-5 h-5 mr-2" />}
                {activeTab === "calendarios" && <CalendarDays className="w-5 h-5 mr-2" />}
                {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
              </h2>
            </div>

            <TabsContent value="talleres" className="space-y-6">
              <TalleresManager user={user} />
            </TabsContent>
            <TabsContent value="grupos" className="space-y-6">
              <GruposManager user={user} />
            </TabsContent>
            <TabsContent value="inventario" className="space-y-6">
              <InventarioManager user={user} />
            </TabsContent>
            <TabsContent value="pendientes" className="space-y-6">
              <PendientesManager user={user} />
            </TabsContent>
            <TabsContent value="voluntarios" className="space-y-6">
              <VoluntariosManager user={user} />
            </TabsContent>
            <TabsContent value="calendarios" className="space-y-6">
              <CalendariosManager user={user} />
            </TabsContent>
            <TabsContent value="actividades" className="space-y-6">
              <ActividadesManager user={user} />
            </TabsContent>
            <TabsContent value="pagos" className="space-y-6">
              <PagosManager user={user} />
            </TabsContent>
          </Tabs>
        )}
      </main>

      <AlmaFooter borderTop />
    </div>
  )
}
