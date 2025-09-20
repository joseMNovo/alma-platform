"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Edit, Trash2, Users, Calendar, Clock, CheckCircle } from "lucide-react"

export default function GruposManager({ user }) {
  const [grupos, setGrupos] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingGrupo, setEditingGrupo] = useState(null)
  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    coordinador: "",
    dia: "",
    horario: "",
    estado: "activo",
  })

  const isAdmin = user.rol === "admin"
  const diasSemana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]

  useEffect(() => {
    fetchGrupos()
  }, [])

  const fetchGrupos = async () => {
    try {
      const response = await fetch("/api/grupos")
      const data = await response.json()
      setGrupos(data)
    } catch (error) {
      console.error("Error fetching grupos:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const method = editingGrupo ? "PUT" : "POST"
      const url = editingGrupo ? `/api/grupos?id=${editingGrupo.id}` : "/api/grupos"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        fetchGrupos()
        setDialogOpen(false)
        resetForm()
      }
    } catch (error) {
      console.error("Error saving grupo:", error)
    }
  }

  const handleDelete = async (id) => {
    if (confirm("¿Estás seguro de que quieres eliminar este grupo?")) {
      try {
        const response = await fetch(`/api/grupos?id=${id}`, {
          method: "DELETE",
        })
        if (response.ok) {
          fetchGrupos()
        }
      } catch (error) {
        console.error("Error deleting grupo:", error)
      }
    }
  }

  const handleInscripcion = async (grupoId) => {
    try {
      const response = await fetch("/api/grupos/inscripcion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          usuarioId: user.id,
          grupoId: grupoId,
        }),
      })

      if (response.ok) {
        fetchGrupos()
        alert("¡Inscripción exitosa al grupo de apoyo!")
      }
    } catch (error) {
      console.error("Error en inscripción:", error)
    }
  }

  const resetForm = () => {
    setFormData({
      nombre: "",
      descripcion: "",
      coordinador: "",
      dia: "",
      horario: "",
      estado: "activo",
    })
    setEditingGrupo(null)
  }

  const openEditDialog = (grupo) => {
    setEditingGrupo(grupo)
    setFormData({
      nombre: grupo.nombre,
      descripcion: grupo.descripcion,
      coordinador: grupo.coordinador,
      dia: grupo.dia,
      horario: grupo.horario,
      estado: grupo.estado,
    })
    setDialogOpen(true)
  }

  const estaInscrito = (grupoId) => {
    return user.inscripciones?.grupos?.includes(grupoId) || false
  }

  if (loading) {
    return <div className="text-center py-8">Cargando grupos...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Grupos de Apoyo</h2>
          <p className="text-gray-600">Espacios de contención y apoyo emocional</p>
        </div>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm} className="bg-[#4dd0e1] hover:bg-[#3bc0d1] text-white">
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Grupo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingGrupo ? "Editar Grupo" : "Nuevo Grupo"}</DialogTitle>
                <DialogDescription>
                  {editingGrupo ? "Modifica los datos del grupo" : "Completa la información del nuevo grupo"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre del Grupo</Label>
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
                  <Label htmlFor="coordinador">Coordinador</Label>
                  <Input
                    id="coordinador"
                    value={formData.coordinador}
                    onChange={(e) => setFormData({ ...formData, coordinador: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dia">Día</Label>
                    <Select value={formData.dia} onValueChange={(value) => setFormData({ ...formData, dia: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar día" />
                      </SelectTrigger>
                      <SelectContent>
                        {diasSemana.map((dia) => (
                          <SelectItem key={dia} value={dia}>
                            {dia}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="horario">Horario</Label>
                    <Input
                      id="horario"
                      value={formData.horario}
                      onChange={(e) => setFormData({ ...formData, horario: e.target.value })}
                      placeholder="16:00 - 18:00"
                      required
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" className="bg-[#4dd0e1] hover:bg-[#3bc0d1] text-white">
                    {editingGrupo ? "Actualizar" : "Crear"} Grupo
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {grupos.map((grupo) => (
          <Card key={grupo.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{grupo.nombre}</CardTitle>
                  <CardDescription className="mt-2">{grupo.descripcion}</CardDescription>
                </div>
                <Badge
                  variant={grupo.estado === "activo" ? "default" : "secondary"}
                  className={grupo.estado === "activo" ? "bg-[#4dd0e1]" : ""}
                >
                  {grupo.estado}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex items-center text-gray-600">
                  <Users className="w-4 h-4 mr-2" />
                  Coordinador: {grupo.coordinador}
                </div>
                <div className="flex items-center text-gray-600">
                  <Calendar className="w-4 h-4 mr-2" />
                  {grupo.dia}
                </div>
                <div className="flex items-center text-gray-600">
                  <Clock className="w-4 h-4 mr-2" />
                  {grupo.horario}
                </div>
                <div className="flex items-center text-gray-600">
                  <Users className="w-4 h-4 mr-2" />
                  Participantes: {grupo.participantes}
                </div>
              </div>

              <div className="flex gap-2">
                {!isAdmin && (
                  <Button
                    onClick={() => handleInscripcion(grupo.id)}
                    className="flex-1 bg-[#4dd0e1] hover:bg-[#3bc0d1] text-white"
                    size="sm"
                    disabled={estaInscrito(grupo.id)}
                  >
                    {estaInscrito(grupo.id) ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Inscrito
                      </>
                    ) : (
                      "Unirse al Grupo"
                    )}
                  </Button>
                )}
                {isAdmin && (
                  <>
                    <Button onClick={() => openEditDialog(grupo)} variant="outline" size="sm" className="flex-1">
                      <Edit className="w-4 h-4 mr-1" />
                      Editar
                    </Button>
                    <Button
                      onClick={() => handleDelete(grupo.id)}
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

      {grupos.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay grupos disponibles</h3>
          <p className="text-gray-600">
            {isAdmin ? "Crea el primer grupo para comenzar." : "Pronto habrá nuevos grupos disponibles."}
          </p>
        </div>
      )}
    </div>
  )
}
