"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LogOut, Users, Calendar, Activity, CreditCard, Package, Heart, Settings, Mail, BarChart3, CheckSquare } from "lucide-react"
import TalleresManager from "@/components/talleres/talleres-manager"
import GruposManager from "@/components/grupos/grupos-manager"
import ActividadesManager from "@/components/actividades/actividades-manager"
import PagosManager from "@/components/pagos/pagos-manager"
import InventarioManager from "@/components/inventario/inventario-manager"
import VoluntariosManager from "@/components/voluntarios/voluntarios-manager"
import PendientesManager from "@/components/pendientes/pendientes-manager"
import AjustesManager from "@/components/ajustes/ajustes-manager"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import DevelopmentNotice from "@/components/ui/development-notice"
import { Menu } from "lucide-react"

export default function Dashboard({ user, onLogout }: { user: any, onLogout: () => void }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  
  let [ajustesAuthenticated, setAjustesAuthenticated] = useState(false)

  const isAdmin = user.rol === "admin"
  const isJose = user?.email === "jose@alma.com"
  ajustesAuthenticated = isJose

  // Obtener el tab activo basado en la URL
  const getActiveTab = () => {
    if (pathname.includes('/inventario')) return 'inventario'
    if (pathname.includes('/voluntarios')) return 'voluntarios'
    if (pathname.includes('/pendientes')) return 'pendientes'
    if (pathname.includes('/ajustes')) return 'ajustes'
    if (pathname.includes('/talleres')) return 'talleres'
    if (pathname.includes('/grupos')) return 'grupos'
    if (pathname.includes('/actividades')) return 'actividades'
    if (pathname.includes('/pagos')) return 'pagos'
    return 'inventario' // default
  }

  const activeTab = getActiveTab()

  const handleTabChange = (value: string) => {
    // Permitir acceso a Inventario, Pendientes y Voluntarios para todos
    if (value === "inventario" || value === "pendientes" || value === "voluntarios") {
      router.push(`/${value}`)
      setMobileMenuOpen(false)
    }
    // Para Ajustes, siempre verificar autenticación y solo si es Jose
    else if (value === "ajustes" && isJose) {
      if (ajustesAuthenticated) {
        router.push('/ajustes')
        setMobileMenuOpen(false)
      } else {
        setMobileMenuOpen(false)
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <img src="/images/flor.png" alt="ALMA" className="h-8 w-auto" />
            </div>
            
            {/* Título centrado */}
            <div className="flex-1 flex justify-center">
              <h1 className="text-xl font-bold">
                <span className="text-[#4dd0e1]">ALMA</span> - Plataforma de gestión
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-[#4dd0e1]">{user.nombre}</p>
                <p className="text-xs text-gray-600 capitalize">{user.rol}</p>
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
                          <span className="text-[#4dd0e1]">ALMA</span> - Plataforma de gestión
                        </h2>
                      </div>
                    </div>
                      <div className="mt-4 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-[#4dd0e1]">{user.nombre}</p>
                          <p className="text-xs text-gray-600 capitalize">{user.rol}</p>
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
                        {/* Inventario, Pendientes y Voluntarios para todos */}
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
                          variant="ghost"
                          disabled
                          className="w-full justify-start opacity-50 cursor-not-allowed"
                        >
                          <Calendar className="w-5 h-5 mr-3" />
                          Talleres
                        </Button>
                        <Button
                          variant="ghost"
                          disabled
                          className="w-full justify-start opacity-50 cursor-not-allowed"
                        >
                          <Users className="w-5 h-5 mr-3" />
                          Grupos
                        </Button>
                        <Button
                          variant="ghost"
                          disabled
                          className="w-full justify-start opacity-50 cursor-not-allowed"
                        >
                          <Activity className="w-5 h-5 mr-3" />
                          Actividades
                        </Button>
                        <Button
                          variant="ghost"
                          disabled
                          className="w-full justify-start opacity-50 cursor-not-allowed"
                        >
                          <CreditCard className="w-5 h-5 mr-3" />
                          Pagos
                        </Button>
                        {isAdmin && (
                          <>
                            {/* Ajustes: si es Jose, botón habilitado (según autenticación); si no, opaco y deshabilitado */}
                            {isJose ? (
                              <Button
                                variant={activeTab === "ajustes" ? "default" : "ghost"}
                                disabled={!ajustesAuthenticated}
                                className={`w-full justify-start ${activeTab === "ajustes" ? "bg-[#4dd0e1] text-white" : ""} ${!ajustesAuthenticated ? "opacity-50 cursor-not-allowed" : ""}`}
                                onClick={() => handleTabChange("ajustes")}
                              >
                                <Settings className="w-5 h-5 mr-3" />
                                Ajustes
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                disabled
                                className="w-full justify-start opacity-50 cursor-not-allowed"
                              >
                                <Settings className="w-5 h-5 mr-3" />
                                Ajustes
                              </Button>
                            )}
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
        <DevelopmentNotice isAdmin={isAdmin} />
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="hidden md:grid w-full grid-cols-2 lg:grid-cols-8 bg-white border border-gray-200 p-1 rounded-lg">
            {/* Inventario, Pendientes y Voluntarios para todos */}
            <TabsTrigger
              value="inventario"
              className="flex items-center space-x-2 data-[state=active]:bg-[#4dd0e1] data-[state=active]:text-white"
            >
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">Inventario</span>
            </TabsTrigger>
            <TabsTrigger
              value="pendientes"
              className="flex items-center space-x-2 data-[state=active]:bg-[#4dd0e1] data-[state=active]:text-white"
            >
              <CheckSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Pendientes</span>
            </TabsTrigger>
            <TabsTrigger
              value="voluntarios"
              className="flex items-center space-x-2 data-[state=active]:bg-[#4dd0e1] data-[state=active]:text-white"
            >
              <Heart className="w-4 h-4" />
              <span className="hidden sm:inline">Voluntarios</span>
            </TabsTrigger>
            {/* Todos los demás */}
            <TabsTrigger
              value="talleres"
              disabled
              className="flex items-center space-x-2 opacity-50 cursor-not-allowed"
            >
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Talleres</span>
            </TabsTrigger>
            <TabsTrigger
              value="grupos"
              disabled
              className="flex items-center space-x-2 opacity-50 cursor-not-allowed"
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Grupos</span>
            </TabsTrigger>
            <TabsTrigger
              value="actividades"
              disabled
              className="flex items-center space-x-2 opacity-50 cursor-not-allowed"
            >
              <Activity className="w-4 h-4" />
              <span className="hidden sm:inline">Actividades</span>
            </TabsTrigger>
            <TabsTrigger
              value="pagos"
              disabled
              className="flex items-center space-x-2 opacity-50 cursor-not-allowed"
            >
              <CreditCard className="w-4 h-4" />
              <span className="hidden sm:inline">Pagos</span>
            </TabsTrigger>
            {isAdmin && (
              <>
                {/* Ajustes al final */}
                {isJose ? (
                  <TabsTrigger
                    value="ajustes"
                    disabled={!ajustesAuthenticated}
                    className={`flex items-center space-x-2 ${ajustesAuthenticated ? 'data-[state=active]:bg-[#4dd0e1] data-[state=active]:text-white' : 'opacity-50 cursor-not-allowed'}`}
                  >
                    <Settings className="w-4 h-4" />
                    <span className="hidden sm:inline">Ajustes</span>
                  </TabsTrigger>
                ) : (
                  <TabsTrigger
                    value="ajustes"
                    disabled
                    className="flex items-center space-x-2 opacity-50 cursor-not-allowed"
                  >
                    <Settings className="w-4 h-4" />
                    <span className="hidden sm:inline">Ajustes</span>
                  </TabsTrigger>
                )}
              </>
            )}
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
              {activeTab === "ajustes" && <Settings className="w-5 h-5 mr-2" />}
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            </h2>
          </div>

          {/* Pestañas en desarrollo - temporalmente deshabilitadas */}
          {false && (
            <>
              <TabsContent value="talleres" className="space-y-6">
                <TalleresManager user={user} />
              </TabsContent>

              <TabsContent value="grupos" className="space-y-6">
                <GruposManager user={user} />
              </TabsContent>

              <TabsContent value="actividades" className="space-y-6">
                <ActividadesManager user={user} />
              </TabsContent>

              <TabsContent value="pagos" className="space-y-6">
                <PagosManager user={user} />
              </TabsContent>


            </>
          )}

          {/* Inventario, Pendientes y Voluntarios disponibles para todos */}
          <TabsContent value="inventario" className="space-y-6">
            <InventarioManager user={user} />
          </TabsContent>
          
          <TabsContent value="pendientes" className="space-y-6">
            <PendientesManager user={user} />
          </TabsContent>
          
          <TabsContent value="voluntarios" className="space-y-6">
            <VoluntariosManager user={user} />
          </TabsContent>
              
          {/* Ajustes solo para isJose */}
          {isJose && (
            <TabsContent value="ajustes" className="space-y-6">
              <AjustesManager user={user} />
            </TabsContent>
          )}
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="text-center flex-1">
              <p className="text-sm text-gray-600">Creado con amor por ALMA Rosario - 2025</p>
            </div>
            <div className="text-sm text-gray-500">
              v1.0.2
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}
