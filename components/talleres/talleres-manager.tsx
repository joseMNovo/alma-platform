"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Edit, Trash2, Users, Calendar, Clock, DollarSign, CheckCircle, Search, Filter } from "lucide-react"

export default function TalleresManager({ user }) {
  const [talleres, setTalleres] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTaller, setEditingTaller] = useState(null)
  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    instructor: "",
    fecha: "",
    horario: "",
    cupos: "",
    costo: "",
    estado: "activo",
  })
  const [searchTerm, setSearchTerm] = useState("")
  const [filterActive, setFilterActive] = useState(true)

  const isAdmin = user.rol === "admin"

  useEffect(() => {
    fetchTalleres()
  }, [])

  const fetchTalleres = async () => {
    try {
      const response = await fetch("/api/talleres")
      const data = await response.json()
      setTalleres(data)
    } catch (error) {
      console.error("Error fetching talleres:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const method = editingTaller ? "PUT" : "POST"
      const url = editingTaller ? `/api/talleres?id=${editingTaller.id}` : "/api/talleres"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        fetchTalleres()
        setDialogOpen(false)
        resetForm()
      }
    } catch (error) {
      console.error("Error saving taller:", error)
    }
  }

  const handleDelete = async (id) => {
    if (confirm("¿Estás seguro de que quieres eliminar este taller?")) {
      try {
        const response = await fetch(`/api/talleres?id=${id}`, {
          method: "DELETE",
        })
        if (response.ok) {
          fetchTalleres()
        }
      } catch (error) {
        console.error("Error deleting taller:", error)
      }
    }
  }

  const handleInscripcion = async (tallerId) => {
    try {
      const response = await fetch("/api/talleres/inscripcion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          usuarioId: user.id,
          tallerId: tallerId,
        }),
      })

      if (response.ok) {
        fetchTalleres()
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
      instructor: "",
      fecha: "",
      horario: "",
      cupos: "",
      costo: "",
      estado: "activo",
    })
    setEditingTaller(null)
  }

  const openEditDialog = (taller) => {
    setEditingTaller(taller)
    setFormData({
      nombre: taller.nombre,
      descripcion: taller.descripcion,
      instructor: taller.instructor,
      fecha: taller.fecha,
      horario: taller.horario,
      cupos: taller.cupos.toString(),
      costo: taller.costo.toString(),
      estado: taller.estado,
    })
    setDialogOpen(true)
  }

  const estaInscrito = (tallerId) => {
    return user.inscripciones?.talleres?.includes(tallerId) || false
  }

  // Filtrado de talleres
  const filteredTalleres = talleres.filter((taller) => {
    const matchesSearch =
      taller.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      taller.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
      taller.instructor.toLowerCase().includes(searchTerm.toLowerCase())

    if (filterActive) {
      return matchesSearch && taller.estado === "activo"
    }

    return matchesSearch
  })

  if (loading) {
    return <div className="text-center py-8">Cargando talleres...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">Talleres de Memoria</h2>
          <p className="text-gray-600">Gestiona los talleres de estimulación cognitiva</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          {isAdmin && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm} className="bg-[#4dd0e1] hover:bg-[#3bc0d1] text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Taller
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingTaller ? "Editar Taller" : "Nuevo Taller"}</DialogTitle>
                  <DialogDescription>
                    {editingTaller ? "Modifica los datos del taller" : "Completa la información del nuevo taller"}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre del Taller</Label>
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
                    <Label htmlFor="instructor">Instructor</Label>
                    <Input
                      id="instructor"
                      value={formData.instructor}
                      onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        placeholder="10:00 - 12:00"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cupos">Cupos</Label>
                      <Input
                        id="cupos"
                        type="number"
                        value={formData.cupos}
                        onChange={(e) => setFormData({ ...formData, cupos: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="costo">Costo ($)</Label>
                      <Input
                        id="costo"
                        type="number"
                        value={formData.costo}
                        onChange={(e) => setFormData({ ...formData, costo: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" className="bg-[#4dd0e1] hover:bg-[#3bc0d1] text-white">
                      {editingTaller ? "Actualizar" : "Crear"} Taller
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <Input
            placeholder="Buscar talleres..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          className={`flex items-center gap-2 ${filterActive ? "bg-[#4dd0e1] text-white" : ""}`}
          onClick={() => setFilterActive(!filterActive)}
        >
          <Filter size={18} />
          {filterActive ? "Todos" : "Solo Activos"}
        </Button>
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {filteredTalleres.map((taller) => (
          <Card key={taller.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{taller.nombre}</CardTitle>
                  <CardDescription className="mt-2 line-clamp-2">{taller.descripcion}</CardDescription>
                </div>
                <Badge
                  variant={taller.estado === "activo" ? "default" : "secondary"}
                  className={taller.estado === "activo" ? "bg-[#4dd0e1]" : ""}
                >
                  {taller.estado}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex items-center text-gray-600">
                  <Users className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span className="truncate">{taller.instructor}</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
                  {new Date(taller.fecha).toLocaleDateString("es-ES")}
                </div>
                <div className="flex items-center text-gray-600">
                  <Clock className="w-4 h-4 mr-2 flex-shrink-0" />
                  {taller.horario}
                </div>
                <div className="flex items-center text-gray-600">
                  <Users className="w-4 h-4 mr-2 flex-shrink-0" />
                  Cupos: {taller.inscritos}/{taller.cupos}
                </div>
                <div className="flex items-center text-gray-600">
                  <DollarSign className="w-4 h-4 mr-2 flex-shrink-0" />${taller.costo.toLocaleString()}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {!isAdmin &&
                  (estaInscrito(taller.id) ? (
                    <Button disabled className="flex-1 bg-green-500 text-white cursor-not-allowed" size="sm">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Inscripto
                    </Button>
                  ) : taller.inscritos < taller.cupos ? (
                    <Button
                      onClick={() => handleInscripcion(taller.id)}
                      className="flex-1 bg-[#4dd0e1] hover:bg-[#3bc0d1] text-white"
                      size="sm"
                    >
                      Inscribirse
                    </Button>
                  ) : (
                    <Button disabled className="flex-1 bg-gray-400 text-white cursor-not-allowed" size="sm">
                      Sin Cupos
                    </Button>
                  ))}
                {isAdmin && (
                  <>
                    <Button onClick={() => openEditDialog(taller)} variant="outline" size="sm" className="flex-1">
                      <Edit className="w-4 h-4 mr-1" />
                      Editar
                    </Button>
                    <Button
                      onClick={() => handleDelete(taller.id)}
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

      {filteredTalleres.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay talleres disponibles</h3>
          <p className="text-gray-600">
            {isAdmin ? "Crea el primer taller para comenzar." : "Pronto habrá nuevos talleres disponibles."}
          </p>
        </div>
      )}
    </div>
  )
}
