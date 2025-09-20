"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LogOut, Users, Calendar, Activity, CreditCard, Package, Heart, Settings, Mail, BarChart3 } from "lucide-react"
import TalleresManager from "@/components/talleres/talleres-manager"
import GruposManager from "@/components/grupos/grupos-manager"
import ActividadesManager from "@/components/actividades/actividades-manager"
import PagosManager from "@/components/pagos/pagos-manager"
import InventarioManager from "@/components/inventario/inventario-manager"
import VoluntariosManager from "@/components/voluntarios/voluntarios-manager"
import AjustesManager from "@/components/ajustes/ajustes-manager"
import EmailManager from "@/components/emails/email-manager"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import DevelopmentNotice from "@/components/ui/development-notice"
import { Menu } from "lucide-react"

export default function Dashboard({ user, onLogout }: { user: any, onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState("inventario")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  let [ajustesAuthenticated, setAjustesAuthenticated] = useState(false)

  const isAdmin = user.rol === "admin"
  const isJose = user?.email === "jose@alma.com"
  ajustesAuthenticated = isJose

  const handleTabChange = (value: string) => {
    // Permitir acceso a Inventario y Voluntarios
    if (value === "inventario" || value === "voluntarios") {
      setActiveTab(value)
      setMobileMenuOpen(false)
    }
    // Para Ajustes, siempre verificar autenticación y solo si es Jose
    else if (value === "ajustes" && isJose) {
      if (ajustesAuthenticated) {
        setActiveTab(value)
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
              <img src="/images/alma-logo.png" alt="ALMA" className="h-8 w-auto" />
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-gray-900">ALMA</h1>
                <p className="text-sm text-gray-600">Plataforma de Gestión</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900">{user.nombre}</p>
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
                        <img src="/images/alma-logo.png" alt="ALMA" className="h-8 w-auto" />
                        <div>
                          <h2 className="text-lg font-bold">ALMA</h2>
                          <p className="text-sm text-gray-600">Plataforma de Gestión</p>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{user.nombre}</p>
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
                            <Button
                              variant={activeTab === "inventario" ? "default" : "ghost"}
                              className={`w-full justify-start ${activeTab === "inventario" ? "bg-[#4dd0e1] text-white" : ""}`}
                              onClick={() => handleTabChange("inventario")}
                            >
                              <Package className="w-5 h-5 mr-3" />
                              Inventario
                            </Button>
                            <Button
                              variant={activeTab === "voluntarios" ? "default" : "ghost"}
                              className={`w-full justify-start ${activeTab === "voluntarios" ? "bg-[#4dd0e1] text-white" : ""}`}
                              onClick={() => handleTabChange("voluntarios")}
                            >
                              <Heart className="w-5 h-5 mr-3" />
                              Voluntarios
                            </Button>
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
                            <Button
                              variant="ghost"
                              disabled
                              className="w-full justify-start opacity-50 cursor-not-allowed"
                            >
                              <Mail className="w-5 h-5 mr-3" />
                              Emails
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
        <DevelopmentNotice isAdmin={isAdmin} />
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="hidden md:grid w-full grid-cols-2 lg:grid-cols-8 bg-white border border-gray-200 p-1 rounded-lg">
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
                <TabsTrigger
                  value="inventario"
                  className="flex items-center space-x-2 data-[state=active]:bg-[#4dd0e1] data-[state=active]:text-white"
                >
                  <Package className="w-4 h-4" />
                  <span className="hidden sm:inline">Inventario</span>
                </TabsTrigger>
                <TabsTrigger
                  value="voluntarios"
                  className="flex items-center space-x-2 data-[state=active]:bg-[#4dd0e1] data-[state=active]:text-white"
                >
                  <Heart className="w-4 h-4" />
                  <span className="hidden sm:inline">Voluntarios</span>
                </TabsTrigger>
                {/* Ajustes: si es Jose, habilitado según autenticación; si no, opaco y deshabilitado */}
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
                <TabsTrigger
                  value="emails"
                  disabled
                  className="flex items-center space-x-2 opacity-50 cursor-not-allowed"
                >
                  <Mail className="w-4 h-4" />
                  <span className="hidden sm:inline">Emails</span>
                </TabsTrigger>
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
              {activeTab === "ajustes" && <Settings className="w-5 h-5 mr-2" />}
              {activeTab === "emails" && <Mail className="w-5 h-5 mr-2" />}
              {activeTab === "configuracion" && <Settings className="w-5 h-5 mr-2" />}
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

              <TabsContent value="emails" className="space-y-6">
                <EmailManager user={user} />
              </TabsContent>

            </>
          )}

          {/* Solo Inventario y Voluntarios están disponibles para admins */}
          {isAdmin && (
            <>
              <TabsContent value="inventario" className="space-y-6">
                <InventarioManager user={user} />
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
            </>
          )}

          {/* Mensaje para usuarios no admin */}
          {!isAdmin && (
            <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center">
              <div className="max-w-md mx-auto">
                <div className="mb-4">
                  <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    Módulos en Desarrollo
                  </h2>
                  <p className="text-gray-600 mb-4">
                    Los módulos de Talleres, Grupos, Actividades y Pagos están actualmente en desarrollo.
                  </p>
                  <p className="text-sm text-gray-500">
                    Solo los módulos de Inventario, Voluntarios y Ajustes están disponibles para administradores. Ajustes requiere autenticación adicional.
                  </p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Próximamente:</strong> Pronto tendrás acceso a todas las funcionalidades de la plataforma ALMA.
                  </p>
                </div>
              </div>
            </div>
          )}
        </Tabs>
      </main>

    </div>
  )
}
