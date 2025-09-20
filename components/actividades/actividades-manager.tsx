"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { Plus, Edit, Trash2, Users, Calendar, Clock, MapPin, DollarSign, CheckCircle } from "lucide-react"

export default function ActividadesManager({ user }) {
  const [actividades, setActividades] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingActividad, setEditingActividad] = useState(null)
  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    fecha: "",
    horario: "",
    lugar: "",
    cupos: "",
    gratuita: true,
    costo: "",
    estado: "activo",
  })

  const isAdmin = user.rol === "admin"

  useEffect(() => {
    fetchActividades()
  }, [])

  const fetchActividades = async () => {
    try {
      const response = await fetch("/api/actividades")
      const data = await response.json()
      setActividades(data)
    } catch (error) {
      console.error("Error fetching actividades:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const method = editingActividad ? "PUT" : "POST"
      const url = editingActividad ? `/api/actividades?id=${editingActividad.id}` : "/api/actividades"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          costo: formData.gratuita ? 0 : Number.parseInt(formData.costo) || 0,
        }),
      })

      if (response.ok) {
        fetchActividades()
        setDialogOpen(false)
        resetForm()
      }
    } catch (error) {
      console.error("Error saving actividad:", error)
    }
  }

  const handleDelete = async (id) => {
    if (confirm("¿Estás seguro de que quieres eliminar esta actividad?")) {
      try {
        const response = await fetch(`/api/actividades?id=${id}`, {
          method: "DELETE",
        })
        if (response.ok) {
          fetchActividades()
        }
      } catch (error) {
        console.error("Error deleting actividad:", error)
      }
    }
  }

  const handleInscripcion = async (actividadId) => {
    try {
      const response = await fetch("/api/actividades/inscripcion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          usuarioId: user.id,
          actividadId: actividadId,
        }),
      })

      if (response.ok) {
        fetchActividades()
        alert("¡Inscripción exitosa!")
      }
    } catch (error) {
      console.error("Error en inscripción:", error)
    }
  }

  const resetForm = () => {
    setFormData({
      nombre: "",
      descripcion: "",
      fecha: "",
      horario: "",
      lugar: "",
      cupos: "",
      gratuita: true,
      costo: "",
      estado: "activo",
    })
    setEditingActividad(null)
  }

  const openEditDialog = (actividad) => {
    setEditingActividad(actividad)
    setFormData({
      nombre: actividad.nombre,
      descripcion: actividad.descripcion,
      fecha: actividad.fecha,
      horario: actividad.horario,
      lugar: actividad.lugar,
      cupos: actividad.cupos.toString(),
      gratuita: actividad.gratuita,
      costo: actividad.costo ? actividad.costo.toString() : "",
      estado: actividad.estado,
    })
    setDialogOpen(true)
  }

  const estaInscrito = (actividadId) => {
    return user.inscripciones?.actividades?.includes(actividadId) || false
  }

  if (loading) {
    return <div className="text-center py-8">Cargando actividades...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Actividades</h2>
          <p className="text-gray-600">Eventos, charlas y jornadas especiales</p>
        </div>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm} className="bg-[#4dd0e1] hover:bg-[#3bc0d1] text-white">
                <Plus className="w-4 h-4 mr-2" />
                Nueva Actividad
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingActividad ? "Editar Actividad" : "Nueva Actividad"}</DialogTitle>
                <DialogDescription>
                  {editingActividad
                    ? "Modifica los datos de la actividad"
                    : "Completa la información de la nueva actividad"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre de la Actividad</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="descripcion">Descripción</Label>
                  <Textarea
                    id="descripcion"
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lugar">Lugar</Label>
                  <Input
                    id="lugar"
                    value={formData.lugar}
                    onChange={(e) => setFormData({ ...formData, lugar: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fecha">Fecha</Label>
                    <Input
                      id="fecha"
                      type="date"
                      value={formData.fecha}
                      onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="horario">Horario</Label>
                    <Input
                      id="horario"
                      value={formData.horario}
                      onChange={(e) => setFormData({ ...formData, horario: e.target.value })}
                      placeholder="19:00 - 21:00"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cupos">Cupos Disponibles</Label>
                  <Input
                    id="cupos"
                    type="number"
                    value={formData.cupos}
                    onChange={(e) => setFormData({ ...formData, cupos: e.target.value })}
                    required
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="gratuita"
                    checked={formData.gratuita}
                    onCheckedChange={(checked) => setFormData({ ...formData, gratuita: checked })}
                  />
                  <Label htmlFor="gratuita">Actividad gratuita</Label>
                </div>
                {!formData.gratuita && (
                  <div className="space-y-2">
                    <Label htmlFor="costo">Costo ($)</Label>
                    <Input
                      id="costo"
                      type="number"
                      value={formData.costo}
                      onChange={(e) => setFormData({ ...formData, costo: e.target.value })}
                      required={!formData.gratuita}
                    />
                  </div>
                )}
                <DialogFooter>
                  <Button type="submit" className="bg-[#4dd0e1] hover:bg-[#3bc0d1] text-white">
                    {editingActividad ? "Actualizar" : "Crear"} Actividad
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {actividades.map((actividad) => (
          <Card key={actividad.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{actividad.nombre}</CardTitle>
                  <CardDescription className="mt-2">{actividad.descripcion}</CardDescription>
                </div>
                <div className="flex flex-col gap-1">
                  <Badge
                    variant={actividad.estado === "activo" ? "default" : "secondary"}
                    className={actividad.estado === "activo" ? "bg-[#4dd0e1]" : ""}
                  >
                    {actividad.estado}
                  </Badge>
                  {actividad.gratuita && (
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      Gratuita
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex items-center text-gray-600">
                  <Calendar className="w-4 h-4 mr-2" />
                  {new Date(actividad.fecha).toLocaleDateString("es-ES")}
                </div>
                <div className="flex items-center text-gray-600">
                  <Clock className="w-4 h-4 mr-2" />
                  {actividad.horario}
                </div>
                <div className="flex items-center text-gray-600">
                  <MapPin className="w-4 h-4 mr-2" />
                  {actividad.lugar}
                </div>
                <div className="flex items-center text-gray-600">
                  <Users className="w-4 h-4 mr-2" />
                  Cupos: {actividad.inscritos}/{actividad.cupos}
                </div>
                {!actividad.gratuita && (
                  <div className="flex items-center text-gray-600">
                    <DollarSign className="w-4 h-4 mr-2" />${actividad.costo?.toLocaleString()}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {!isAdmin && actividad.inscritos < actividad.cupos && (
                  <Button
                    onClick={() => handleInscripcion(actividad.id)}
                    className="flex-1 bg-[#4dd0e1] hover:bg-[#3bc0d1] text-white"
                    size="sm"
                    disabled={estaInscrito(actividad.id)}
                  >
                    {estaInscrito(actividad.id) ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Inscrito
                      </>
                    ) : (
                      "Inscribirse"
                    )}
                  </Button>
                )}
                {isAdmin && (
                  <>
                    <Button onClick={() => openEditDialog(actividad)} variant="outline" size="sm" className="flex-1">
                      <Edit className="w-4 h-4 mr-1" />
                      Editar
                    </Button>
                    <Button
                      onClick={() => handleDelete(actividad.id)}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {actividades.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay actividades disponibles</h3>
          <p className="text-gray-600">
            {isAdmin ? "Crea la primera actividad para comenzar." : "Pronto habrá nuevas actividades disponibles."}
          </p>
        </div>
      )}
    </div>
  )
}
