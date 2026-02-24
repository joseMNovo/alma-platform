"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { AlertCircle, Check, Save, RefreshCw, Mail, Building, Palette, Settings, Globe } from "lucide-react"
import { config } from "@/lib/config"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function ConfiguracionManager({ user }: { user: any }) {
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [activeTab, setActiveTab] = useState("general")

  // Configuración general
  const [generalConfig, setGeneralConfig] = useState({
    nombreOrganizacion: "ALMA - Alzheimer Rosario",
    direccion: "Av. Pellegrini 1234, Rosario, Santa Fe",
    telefono: "+54 341 123-4567",
    email: "contacto@almarosario.org",
    sitioWeb: "www.almarosario.org",
    limiteInscripciones: "3",
    recordatoriosPagos: true,
    diasAnticipacionRecordatorio: "3",
    moneda: "ARS",
  })

  // Configuración de emails
  const [emailConfig, setEmailConfig] = useState({
    servidorSMTP: "smtp.gmail.com",
    puerto: "587",
    usuario: "alma.rosario@gmail.com",
    password: "••••••••••••",
    usarSSL: true,
    emailRemitente: "alma.rosario@gmail.com",
    nombreRemitente: "ALMA Rosario",
    firmaEmail: `Saludos cordiales,
Equipo ALMA - Alzheimer Rosario
Tel: +54 341 123-4567
www.almarosario.org`,
    enviarCopiasAdmin: true,
  })

  // Configuración visual
  const [visualConfig, setVisualConfig] = useState({
    colorPrimario: "#4dd0e1",
    colorSecundario: "#ffffff",
    colorTexto: "#333333",
    fuente: "Raleway",
    tamanoFuente: "normal",
    mostrarLogo: true,
    modoOscuro: false,
  })

  // Configuración del sistema
  const [systemConfig, setSystemConfig] = useState({
    backupAutomatico: true,
    frecuenciaBackup: "semanal",
    retencionBackups: "30",
    logActividad: true,
    nivelLog: "info",
    mantenimiento: false,
    mensajeMantenimiento: "El sistema está en mantenimiento. Por favor, vuelva más tarde.",
    cacheTiempo: "60",
  })

  const handleSaveConfig = async () => {
    setSaving(true)

    try {
      // Simulación de guardado
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Aquí iría la lógica real para guardar la configuración
      // const response = await fetch("/api/configuracion", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({
      //     general: generalConfig,
      //     email: emailConfig,
      //     visual: visualConfig,
      //     system: systemConfig
      //   })
      // });

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (error) {
      console.error("Error al guardar configuración:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleTestEmail = async () => {
    try {
      // Simulación de envío de email de prueba
      await new Promise((resolve) => setTimeout(resolve, 1000))
      alert("Email de prueba enviado correctamente a " + user.email)
    } catch (error) {
      console.error("Error al enviar email de prueba:", error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Configuración del Sistema</h2>
          <p className="text-gray-600">Personaliza los parámetros de la plataforma alma</p>
        </div>
        <Button onClick={handleSaveConfig} className="bg-[#4dd0e1] hover:bg-[#3bc0d1] text-white" disabled={saving}>
          {saving ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Guardar Cambios
            </>
          )}
        </Button>
      </div>

      {saveSuccess && (
        <Alert className="bg-green-50 border-green-200">
          <Check className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Configuración guardada</AlertTitle>
          <AlertDescription className="text-green-700">Los cambios han sido guardados correctamente.</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 bg-white border border-gray-200 p-1 rounded-lg">
          <TabsTrigger
            value="general"
            className="data-[state=active]:bg-[#4dd0e1] data-[state=active]:text-white"
            onClick={() => setActiveTab("general")}
          >
            <Building className="w-4 h-4 mr-2 hidden sm:block" />
            Organización
          </TabsTrigger>
          <TabsTrigger
            value="email"
            className="data-[state=active]:bg-[#4dd0e1] data-[state=active]:text-white"
            onClick={() => setActiveTab("email")}
          >
            <Mail className="w-4 h-4 mr-2 hidden sm:block" />
            Email
          </TabsTrigger>
          <TabsTrigger
            value="visual"
            className="data-[state=active]:bg-[#4dd0e1] data-[state=active]:text-white"
            onClick={() => setActiveTab("visual")}
          >
            <Palette className="w-4 h-4 mr-2 hidden sm:block" />
            Apariencia
          </TabsTrigger>
          <TabsTrigger
            value="system"
            className="data-[state=active]:bg-[#4dd0e1] data-[state=active]:text-white"
            onClick={() => setActiveTab("system")}
          >
            <Settings className="w-4 h-4 mr-2 hidden sm:block" />
            Sistema
          </TabsTrigger>
        </TabsList>

        {/* Configuración General */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building className="w-5 h-5 mr-2" />
                Información de la Organización
              </CardTitle>
              <CardDescription>Configura los datos principales de la institución</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombreOrganizacion">Nombre de la Organización</Label>
                  <Input
                    id="nombreOrganizacion"
                    value={generalConfig.nombreOrganizacion}
                    onChange={(e) => setGeneralConfig({ ...generalConfig, nombreOrganizacion: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email de Contacto</Label>
                  <Input
                    id="email"
                    type="email"
                    value={generalConfig.email}
                    onChange={(e) => setGeneralConfig({ ...generalConfig, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefono">Teléfono</Label>
                  <Input
                    id="telefono"
                    value={generalConfig.telefono}
                    onChange={(e) => setGeneralConfig({ ...generalConfig, telefono: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sitioWeb">Sitio Web</Label>
                  <Input
                    id="sitioWeb"
                    value={generalConfig.sitioWeb}
                    onChange={(e) => setGeneralConfig({ ...generalConfig, sitioWeb: e.target.value })}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="direccion">Dirección</Label>
                  <Input
                    id="direccion"
                    value={generalConfig.direccion}
                    onChange={(e) => setGeneralConfig({ ...generalConfig, direccion: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                Parámetros Generales
              </CardTitle>
              <CardDescription>Configura los parámetros de funcionamiento de la plataforma</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="limiteInscripciones">Límite de inscripciones por usuario</Label>
                  <Input
                    id="limiteInscripciones"
                    type="number"
                    value={generalConfig.limiteInscripciones}
                    onChange={(e) => setGeneralConfig({ ...generalConfig, limiteInscripciones: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="moneda">Moneda</Label>
                  <Select
                    value={generalConfig.moneda}
                    onValueChange={(value) => setGeneralConfig({ ...generalConfig, moneda: value })}
                  >
                    <SelectTrigger id="moneda">
                      <SelectValue placeholder="Seleccionar moneda" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ARS">Peso Argentino (ARS)</SelectItem>
                      <SelectItem value="USD">Dólar Estadounidense (USD)</SelectItem>
                      <SelectItem value="EUR">Euro (EUR)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="recordatoriosPagos">Enviar recordatorios de pagos</Label>
                  <Switch
                    id="recordatoriosPagos"
                    checked={generalConfig.recordatoriosPagos}
                    onCheckedChange={(checked) => setGeneralConfig({ ...generalConfig, recordatoriosPagos: checked })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="diasAnticipacionRecordatorio">Días de anticipación para recordatorios</Label>
                  <Input
                    id="diasAnticipacionRecordatorio"
                    type="number"
                    value={generalConfig.diasAnticipacionRecordatorio}
                    onChange={(e) =>
                      setGeneralConfig({ ...generalConfig, diasAnticipacionRecordatorio: e.target.value })
                    }
                    disabled={!generalConfig.recordatoriosPagos}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configuración de Email */}
        <TabsContent value="email" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Mail className="w-5 h-5 mr-2" />
                Configuración del Servidor de Email
              </CardTitle>
              <CardDescription>Configura los parámetros para el envío de emails</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="servidorSMTP">Servidor SMTP</Label>
                  <Input
                    id="servidorSMTP"
                    value={emailConfig.servidorSMTP}
                    onChange={(e) => setEmailConfig({ ...emailConfig, servidorSMTP: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="puerto">Puerto</Label>
                  <Input
                    id="puerto"
                    value={emailConfig.puerto}
                    onChange={(e) => setEmailConfig({ ...emailConfig, puerto: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="usuario">Usuario</Label>
                  <Input
                    id="usuario"
                    value={emailConfig.usuario}
                    onChange={(e) => setEmailConfig({ ...emailConfig, usuario: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    value={emailConfig.password}
                    onChange={(e) => setEmailConfig({ ...emailConfig, password: e.target.value })}
                  />
                </div>
                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="usarSSL">Usar SSL/TLS</Label>
                  <Switch
                    id="usarSSL"
                    checked={emailConfig.usarSSL}
                    onCheckedChange={(checked) => setEmailConfig({ ...emailConfig, usarSSL: checked })}
                  />
                </div>
              </div>

              <Separator className="my-4" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emailRemitente">Email del Remitente</Label>
                  <Input
                    id="emailRemitente"
                    value={emailConfig.emailRemitente}
                    onChange={(e) => setEmailConfig({ ...emailConfig, emailRemitente: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nombreRemitente">Nombre del Remitente</Label>
                  <Input
                    id="nombreRemitente"
                    value={emailConfig.nombreRemitente}
                    onChange={(e) => setEmailConfig({ ...emailConfig, nombreRemitente: e.target.value })}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="firmaEmail">Firma de Email</Label>
                  <Textarea
                    id="firmaEmail"
                    rows={4}
                    value={emailConfig.firmaEmail}
                    onChange={(e) => setEmailConfig({ ...emailConfig, firmaEmail: e.target.value })}
                  />
                </div>
                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="enviarCopiasAdmin">Enviar copias al administrador</Label>
                  <Switch
                    id="enviarCopiasAdmin"
                    checked={emailConfig.enviarCopiasAdmin}
                    onCheckedChange={(checked) => setEmailConfig({ ...emailConfig, enviarCopiasAdmin: checked })}
                  />
                </div>
              </div>

              <div className="pt-4">
                <Button
                  onClick={handleTestEmail}
                  variant="outline"
                  className="border-[#4dd0e1] text-[#4dd0e1] hover:bg-[#4dd0e1] hover:text-white bg-transparent"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Enviar Email de Prueba
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configuración Visual */}
        <TabsContent value="visual" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Palette className="w-5 h-5 mr-2" />
                Personalización Visual
              </CardTitle>
              <CardDescription>Personaliza la apariencia de la plataforma</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="colorPrimario">Color Primario</Label>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-md border"
                      style={{ backgroundColor: visualConfig.colorPrimario }}
                    />
                    <Input
                      id="colorPrimario"
                      value={visualConfig.colorPrimario}
                      onChange={(e) => setVisualConfig({ ...visualConfig, colorPrimario: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="colorSecundario">Color Secundario</Label>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-md border"
                      style={{ backgroundColor: visualConfig.colorSecundario }}
                    />
                    <Input
                      id="colorSecundario"
                      value={visualConfig.colorSecundario}
                      onChange={(e) => setVisualConfig({ ...visualConfig, colorSecundario: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="colorTexto">Color de Texto</Label>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-md border" style={{ backgroundColor: visualConfig.colorTexto }} />
                    <Input
                      id="colorTexto"
                      value={visualConfig.colorTexto}
                      onChange={(e) => setVisualConfig({ ...visualConfig, colorTexto: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fuente">Fuente Principal</Label>
                  <Select
                    value={visualConfig.fuente}
                    onValueChange={(value) => setVisualConfig({ ...visualConfig, fuente: value })}
                  >
                    <SelectTrigger id="fuente">
                      <SelectValue placeholder="Seleccionar fuente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Raleway">Raleway</SelectItem>
                      <SelectItem value="Roboto">Roboto</SelectItem>
                      <SelectItem value="Open Sans">Open Sans</SelectItem>
                      <SelectItem value="Montserrat">Montserrat</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tamanoFuente">Tamaño de Fuente</Label>
                  <Select
                    value={visualConfig.tamanoFuente}
                    onValueChange={(value) => setVisualConfig({ ...visualConfig, tamanoFuente: value })}
                  >
                    <SelectTrigger id="tamanoFuente">
                      <SelectValue placeholder="Seleccionar tamaño" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pequeno">Pequeño</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="grande">Grande</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="mostrarLogo">Mostrar Logo</Label>
                  <Switch
                    id="mostrarLogo"
                    checked={visualConfig.mostrarLogo}
                    onCheckedChange={(checked) => setVisualConfig({ ...visualConfig, mostrarLogo: checked })}
                  />
                </div>
                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="modoOscuro">Modo Oscuro</Label>
                  <Switch
                    id="modoOscuro"
                    checked={visualConfig.modoOscuro}
                    onCheckedChange={(checked) => setVisualConfig({ ...visualConfig, modoOscuro: checked })}
                  />
                </div>
              </div>

              <div className="mt-6 p-4 border rounded-md">
                <h3 className="text-lg font-medium mb-2">Vista Previa</h3>
                <div
                  className="p-4 rounded-md border"
                  style={{
                    backgroundColor: visualConfig.modoOscuro ? "#333" : visualConfig.colorSecundario,
                    color: visualConfig.modoOscuro ? "#fff" : visualConfig.colorTexto,
                    fontFamily: visualConfig.fuente,
                    fontSize:
                      visualConfig.tamanoFuente === "pequeno"
                        ? "0.9rem"
                        : visualConfig.tamanoFuente === "grande"
                          ? "1.1rem"
                          : "1rem",
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {visualConfig.mostrarLogo && (
                      <div className="w-8 h-8 rounded-full bg-[#4dd0e1] flex items-center justify-center text-white font-bold">
                        A
                      </div>
                    )}
                    <h4 style={{ color: visualConfig.colorPrimario }}>ALMA - Alzheimer Rosario</h4>
                  </div>
                  <p>Este es un texto de ejemplo para visualizar la configuración.</p>
                  <button
                    className="mt-2 px-3 py-1 rounded-md text-white"
                    style={{ backgroundColor: visualConfig.colorPrimario }}
                  >
                    Botón de Ejemplo
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configuración del Sistema */}
        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                Configuración del Sistema
              </CardTitle>
              <CardDescription>Configura los parámetros técnicos de la plataforma</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="backupAutomatico">Backup Automático</Label>
                  <Switch
                    id="backupAutomatico"
                    checked={systemConfig.backupAutomatico}
                    onCheckedChange={(checked) => setSystemConfig({ ...systemConfig, backupAutomatico: checked })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="frecuenciaBackup">Frecuencia de Backup</Label>
                  <Select
                    value={systemConfig.frecuenciaBackup}
                    onValueChange={(value) => setSystemConfig({ ...systemConfig, frecuenciaBackup: value })}
                    disabled={!systemConfig.backupAutomatico}
                  >
                    <SelectTrigger id="frecuenciaBackup">
                      <SelectValue placeholder="Seleccionar frecuencia" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="diario">Diario</SelectItem>
                      <SelectItem value="semanal">Semanal</SelectItem>
                      <SelectItem value="mensual">Mensual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="retencionBackups">Días de retención de backups</Label>
                  <Input
                    id="retencionBackups"
                    type="number"
                    value={systemConfig.retencionBackups}
                    onChange={(e) => setSystemConfig({ ...systemConfig, retencionBackups: e.target.value })}
                    disabled={!systemConfig.backupAutomatico}
                  />
                </div>
                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="logActividad">Registrar actividad de usuarios</Label>
                  <Switch
                    id="logActividad"
                    checked={systemConfig.logActividad}
                    onCheckedChange={(checked) => setSystemConfig({ ...systemConfig, logActividad: checked })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nivelLog">Nivel de Log</Label>
                  <Select
                    value={systemConfig.nivelLog}
                    onValueChange={(value) => setSystemConfig({ ...systemConfig, nivelLog: value })}
                    disabled={!systemConfig.logActividad}
                  >
                    <SelectTrigger id="nivelLog">
                      <SelectValue placeholder="Seleccionar nivel" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="error">Solo errores</SelectItem>
                      <SelectItem value="warning">Advertencias y errores</SelectItem>
                      <SelectItem value="info">Información general</SelectItem>
                      <SelectItem value="debug">Depuración (detallado)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cacheTiempo">Tiempo de caché (minutos)</Label>
                  <Input
                    id="cacheTiempo"
                    type="number"
                    value={systemConfig.cacheTiempo}
                    onChange={(e) => setSystemConfig({ ...systemConfig, cacheTiempo: e.target.value })}
                  />
                </div>
                <div className="flex items-center justify-between space-x-2">
                  <div>
                    <Label htmlFor="mantenimiento" className="block">
                      Modo Mantenimiento
                    </Label>
                    <p className="text-xs text-gray-500">Bloquea el acceso a usuarios no administradores</p>
                  </div>
                  <Switch
                    id="mantenimiento"
                    checked={systemConfig.mantenimiento}
                    onCheckedChange={(checked) => setSystemConfig({ ...systemConfig, mantenimiento: checked })}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="mensajeMantenimiento">Mensaje de Mantenimiento</Label>
                  <Textarea
                    id="mensajeMantenimiento"
                    value={systemConfig.mensajeMantenimiento}
                    onChange={(e) => setSystemConfig({ ...systemConfig, mensajeMantenimiento: e.target.value })}
                    disabled={!systemConfig.mantenimiento}
                  />
                </div>
              </div>

              {systemConfig.mantenimiento && (
                <Alert className="mt-4 bg-yellow-50 border-yellow-200">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <AlertTitle className="text-yellow-800">Modo mantenimiento activado</AlertTitle>
                  <AlertDescription className="text-yellow-700">
                    Los usuarios no administradores no podrán acceder al sistema mientras esté en modo mantenimiento.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Globe className="w-5 h-5 mr-2" />
                Información del Sistema
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Versión del Sistema</p>
                    <p className="text-base">{config.app.version}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Última Actualización</p>
                    <p className="text-base">24/07/2025</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Último Backup</p>
                    <p className="text-base">24/07/2025 08:30</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Espacio en Disco</p>
                    <p className="text-base">245 MB / 1 GB</p>
                  </div>
                </div>

                <div className="mt-4">
                  <Button variant="outline" className="mr-2 bg-transparent">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Actualizar Sistema
                  </Button>
                  <Button variant="outline">
                    <Save className="w-4 h-4 mr-2" />
                    Crear Backup Manual
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
