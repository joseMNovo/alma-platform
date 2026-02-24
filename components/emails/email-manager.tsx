"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Mail, Send, Clock, CheckCircle, AlertCircle, Plus } from "lucide-react"

export default function EmailManager({ user }: { user: any }) {
  const [volunteers, setVolunteers] = useState<any[]>([])
  const [emailHistory, setEmailHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState([])
  const [formData, setFormData] = useState({
    tipo: "general",
    asunto: "",
    mensaje: "",
    destinatarios: "todos",
  })

  const tiposEmail = {
    general: "Comunicación General",
    recordatorio_pago: "Recordatorio de Pago",
    confirmacion_inscripcion: "Confirmación de Inscripción",
    nueva_actividad: "Nueva Actividad",
    cancelacion: "Cancelación",
  }

  const plantillas = {
    recordatorio_pago: {
      asunto: "Recordatorio de Pago - ALMA",
      mensaje: `Estimado/a {nombre},

Le recordamos que tiene un pago pendiente:

Concepto: {concepto}
Monto: ${"{monto}"}
Fecha de vencimiento: {fecha_vencimiento}

Por favor, realice el pago a la brevedad para evitar inconvenientes.

Saludos cordiales,
Equipo ALMA - Alzheimer Rosario`,
    },
    confirmacion_inscripcion: {
      asunto: "Confirmación de Inscripción - ALMA",
      mensaje: `Estimado/a {nombre},

Su inscripción ha sido confirmada exitosamente:

Actividad: {actividad}
Fecha: {fecha}
Horario: {horario}
Lugar: {lugar}

Nos vemos pronto!

Saludos cordiales,
Equipo ALMA - Alzheimer Rosario`,
    },
    nueva_actividad: {
      asunto: "Nueva Actividad Disponible - ALMA",
      mensaje: `Estimado/a {nombre},

Tenemos una nueva actividad que puede ser de su interés:

{descripcion_actividad}

Para más información e inscripciones, ingrese a la plataforma.

Saludos cordiales,
Equipo ALMA - Alzheimer Rosario`,
    },
  }

  useEffect(() => {
    fetchVolunteers()
    fetchEmailHistory()
  }, [])

  const fetchVolunteers = async () => {
    try {
      const response = await fetch("/api/voluntarios")
      const data = await response.json()
      setVolunteers(data)
    } catch (error) {
      console.error("Error fetching voluntarios:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchEmailHistory = async () => {
    try {
      const response = await fetch("/api/emails")
      const data = await response.json()
      setEmailHistory(data)
    } catch (error) {
      console.error("Error fetching email history:", error)
    }
  }

  const handleTipoChange = (tipo) => {
    setFormData({ ...formData, tipo })
    if (plantillas[tipo]) {
      setFormData({
        ...formData,
        tipo,
        asunto: plantillas[tipo].asunto,
        mensaje: plantillas[tipo].mensaje,
      })
    }
  }

  const handleUserSelection = (userId, checked) => {
    if (checked) {
      setSelectedUsers([...selectedUsers, userId])
    } else {
      setSelectedUsers(selectedUsers.filter((id) => id !== userId))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(volunteers.map((v) => v.id))
    } else {
      setSelectedUsers([])
    }
  }

  const enviarEmails = async () => {
    setSending(true)
    try {
      let destinatarios: any[] = []

      if (formData.destinatarios === "todos") {
        destinatarios = volunteers.filter((v) => !v.is_admin)
      } else if (formData.destinatarios === "seleccionados") {
        destinatarios = volunteers.filter((v) => selectedUsers.includes(v.id))
      }

      const promises = destinatarios.map((volunteer) => {
        let mensaje = formData.mensaje
        let asunto = formData.asunto

        // Reemplazar variables en el mensaje
        const fullName = `${volunteer.name}${volunteer.last_name ? " " + volunteer.last_name : ""}`
        mensaje = mensaje.replace(/{nombre}/g, fullName)
        asunto = asunto.replace(/{nombre}/g, fullName)

        return fetch("/api/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to: volunteer.email,
            subject: asunto,
            message: mensaje,
            type: formData.tipo,
          }),
        })
      })

      await Promise.all(promises)

      alert(`Emails enviados exitosamente a ${destinatarios.length} usuarios`)
      setDialogOpen(false)
      resetForm()
      fetchEmailHistory()
    } catch (error) {
      console.error("Error sending emails:", error)
      alert("Error al enviar emails")
    } finally {
      setSending(false)
    }
  }

  const resetForm = () => {
    setFormData({
      tipo: "general",
      asunto: "",
      mensaje: "",
      destinatarios: "todos",
    })
    setSelectedUsers([])
  }

  if (loading) {
    return <div className="text-center py-8">Cargando sistema de emails...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Emails</h2>
          <p className="text-gray-600">Envío de comunicaciones y recordatorios</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="bg-[#4dd0e1] hover:bg-[#3bc0d1] text-white">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Email
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Enviar Email</DialogTitle>
              <DialogDescription>Compose y envía emails a los usuarios registrados</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo de Email</Label>
                <Select value={formData.tipo} onValueChange={handleTipoChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(tiposEmail).map(([key, value]) => (
                      <SelectItem key={key} value={key}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="destinatarios">Destinatarios</Label>
                <Select
                  value={formData.destinatarios}
                  onValueChange={(value) => setFormData({ ...formData, destinatarios: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los usuarios</SelectItem>
                    <SelectItem value="seleccionados">Usuarios seleccionados</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.destinatarios === "seleccionados" && (
                <div className="space-y-2">
                  <Label>Seleccionar Usuarios</Label>
                  <div className="border rounded-md p-3 max-h-40 overflow-y-auto">
                    <div className="flex items-center space-x-2 mb-2 pb-2 border-b">
                      <Checkbox
                        id="select-all"
                        checked={selectedUsers.length === volunteers.length}
                        onCheckedChange={handleSelectAll}
                      />
                      <Label htmlFor="select-all" className="font-medium">
                        Seleccionar todos
                      </Label>
                    </div>
                    {volunteers
                      .filter((v) => !v.is_admin)
                      .map((volunteer) => (
                        <div key={volunteer.id} className="flex items-center space-x-2 py-1">
                          <Checkbox
                            id={`user-${volunteer.id}`}
                            checked={selectedUsers.includes(volunteer.id)}
                            onCheckedChange={(checked) => handleUserSelection(volunteer.id, checked)}
                          />
                          <Label htmlFor={`user-${volunteer.id}`} className="text-sm">
                            {volunteer.name}{volunteer.last_name ? " " + volunteer.last_name : ""} ({volunteer.email})
                          </Label>
                        </div>
                      ))}
                  </div>
                  <p className="text-sm text-gray-500">{selectedUsers.length} usuarios seleccionados</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="asunto">Asunto</Label>
                <Input
                  id="asunto"
                  value={formData.asunto}
                  onChange={(e) => setFormData({ ...formData, asunto: e.target.value })}
                  placeholder="Asunto del email"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mensaje">Mensaje</Label>
                <Textarea
                  id="mensaje"
                  value={formData.mensaje}
                  onChange={(e) => setFormData({ ...formData, mensaje: e.target.value })}
                  placeholder="Contenido del email"
                  rows={8}
                  required
                />
                <p className="text-xs text-gray-500">
                  Variables disponibles: {"{nombre}"} - Se reemplazará automáticamente
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={enviarEmails}
                disabled={sending || !formData.asunto || !formData.mensaje}
                className="bg-[#4dd0e1] hover:bg-[#3bc0d1] text-white"
              >
                {sending ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Enviar Email
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="historial" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 bg-white border border-gray-200 p-1 rounded-lg">
          <TabsTrigger value="historial" className="data-[state=active]:bg-[#4dd0e1] data-[state=active]:text-white">
            Historial de Emails
          </TabsTrigger>
          <TabsTrigger value="plantillas" className="data-[state=active]:bg-[#4dd0e1] data-[state=active]:text-white">
            Plantillas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="historial" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Emails Enviados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#4dd0e1]">{emailHistory.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Esta Semana</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {
                    emailHistory.filter(
                      (email) => new Date(email.sent) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                    ).length
                  }
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Usuarios Activos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#4dd0e1]">
                  {volunteers.filter((v) => !v.is_admin).length}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            {emailHistory.map((email) => (
              <Card key={email.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-[#4dd0e1]" />
                        <h3 className="font-medium">{email.subject}</h3>
                        <Badge
                          variant={email.status === "sent" ? "default" : "secondary"}
                          className={email.status === "sent" ? "bg-green-500" : ""}
                        >
                          {email.status === "sent" ? "Enviado" : "Pendiente"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>Para: {email.to}</span>
                        <span>Tipo: {tiposEmail[email.type] || email.type}</span>
                        <span>Fecha: {new Date(email.sent).toLocaleDateString("es-ES")}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {email.status === "sent" ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-yellow-500" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {emailHistory.length === 0 && (
            <div className="text-center py-12">
              <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay emails enviados</h3>
              <p className="text-gray-600">Envía tu primer email para comenzar.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="plantillas" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            {Object.entries(plantillas).map(([key, plantilla]) => (
              <Card key={key}>
                <CardHeader>
                  <CardTitle className="text-lg">{tiposEmail[key]}</CardTitle>
                  <CardDescription>Plantilla predefinida para {tiposEmail[key].toLowerCase()}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium">Asunto:</Label>
                    <p className="text-sm text-gray-600 mt-1">{plantilla.asunto}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Mensaje:</Label>
                    <div className="text-sm text-gray-600 mt-1 bg-gray-50 p-3 rounded border max-h-32 overflow-y-auto">
                      <pre className="whitespace-pre-wrap text-xs">{plantilla.mensaje}</pre>
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      setFormData({
                        tipo: key,
                        asunto: plantilla.asunto,
                        mensaje: plantilla.mensaje,
                        destinatarios: "todos",
                      })
                      setDialogOpen(true)
                    }}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    Usar Plantilla
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
