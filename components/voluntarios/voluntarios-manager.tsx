"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import ConfirmationDialog from "@/components/ui/confirmation-dialog"
import { Plus, Edit, Trash2, Users, User, Calendar, Phone, Mail, Heart } from "lucide-react"

// Interfaces para tipado
interface User {
  id: number
  nombre: string
  email: string
  rol: string
  administrador?: boolean
}

interface Voluntario {
  id: number
  nombre: string
  apellido: string
  edad: number | null
  sexo: string
  foto: string | null
  telefono: string
  email: string
  especialidades: string[]
  fechaNacimiento: string
  fechaRegistro: string
  administrador: boolean
}

export default function VoluntariosManager({ user }: { user: User }) {
  const [voluntarios, setVoluntarios] = useState<Voluntario[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingVoluntario, setEditingVoluntario] = useState<Voluntario | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [voluntarioToDelete, setVoluntarioToDelete] = useState<Voluntario | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    edad: "",
    sexo: "",
    foto: "",
    telefono: "",
    email: "",
    especialidades: [] as string[],
    fechaNacimiento: "",
    administrador: false
  })

  useEffect(() => {
    fetchVoluntarios()
  }, [])

  const fetchVoluntarios = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/voluntarios")
      if (response.ok) {
        const data = await response.json()
        setVoluntarios(data)
      }
    } catch (error) {
      console.error("Error fetching voluntarios:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const method = editingVoluntario ? "PUT" : "POST"
      const url = editingVoluntario ? `/api/voluntarios?id=${editingVoluntario.id}` : "/api/voluntarios"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        fetchVoluntarios()
        setDialogOpen(false)
        resetForm()
      }
    } catch (error) {
      console.error("Error saving voluntario:", error)
    }
  }

  const handleDeleteClick = (voluntario: Voluntario) => {
    setVoluntarioToDelete(voluntario)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async (): Promise<void> => {
    if (!voluntarioToDelete) return
    
    setDeleting(true)
    try {
      const response = await fetch(`/api/voluntarios?id=${voluntarioToDelete.id}`, {
        method: "DELETE",
      })
      if (response.ok) {
        fetchVoluntarios()
        setDeleteDialogOpen(false)
        setVoluntarioToDelete(null)
      } else {
        const error = await response.json()
        alert(error.error || "Error al eliminar voluntario")
      }
    } catch (error) {
      console.error("Error deleting voluntario:", error)
      alert("Error al eliminar voluntario")
    } finally {
      setDeleting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      nombre: "",
      apellido: "",
      edad: "",
      sexo: "",
      foto: "",
      telefono: "",
      email: "",
      especialidades: [],
      fechaNacimiento: "",
      administrador: false
    })
    setEditingVoluntario(null)
  }

  const openEditDialog = (voluntario: Voluntario) => {
    setEditingVoluntario(voluntario)
    setFormData({
      nombre: voluntario.nombre || "",
      apellido: voluntario.apellido || "",
      edad: voluntario.edad?.toString() || "",
      sexo: voluntario.sexo || "",
      foto: voluntario.foto || "",
      telefono: voluntario.telefono || "",
      email: voluntario.email || "",
      especialidades: voluntario.especialidades || [],
      fechaNacimiento: voluntario.fechaNacimiento || "",
      administrador: voluntario.administrador || false
    })
    setDialogOpen(true)
  }

  const getSexoIcon = (sexo: string) => {
    switch (sexo?.toLowerCase()) {
      case "masculino":
        return "👨"
      case "femenino":
        return "👩"
      default:
        return "👤"
    }
  }

  const getSexoColor = (sexo: string) => {
    switch (sexo?.toLowerCase()) {
      case "masculino":
        return "bg-blue-100 text-blue-800"
      case "femenino":
        return "bg-pink-100 text-pink-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getNombreCompleto = (voluntario: Voluntario) => {
    if (voluntario.apellido) {
      return `${voluntario.nombre} ${voluntario.apellido}`
    }
    return voluntario.nombre
  }

  // Función para validar solo números en teléfono
  const handleTelefonoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9+\-\s]/g, '')
    setFormData({...formData, telefono: value})
  }

  // Función para validar solo números en edad
  const handleEdadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '')
    setFormData({...formData, edad: value})
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4dd0e1] mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando voluntarios...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 px-4 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="text-center sm:text-left">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center justify-center sm:justify-start">
            <Users className="w-6 h-6 mr-3 text-[#4dd0e1]" />
            Gestión de voluntarios
          </h2>
          <p className="text-gray-600 mt-1">Administra los voluntarios de ALMA</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => {
                resetForm()
                setDialogOpen(true)
              }}
              className="w-full sm:w-auto bg-[#4dd0e1] hover:bg-[#3bc0d1] text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Agregar voluntario
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] mx-4 sm:mx-0 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingVoluntario ? "Editar voluntario" : "Agregar nuevo voluntario"}
              </DialogTitle>
              <DialogDescription>
                {editingVoluntario 
                  ? "Modifica la información del voluntario" 
                  : "Completa la información del nuevo voluntario"
                }
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nombre">Nombre *</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, nombre: e.target.value})}
                    placeholder="Nombre"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="apellido">Apellido</Label>
                  <Input
                    id="apellido"
                    value={formData.apellido}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, apellido: e.target.value})}
                    placeholder="Apellido"
                  />
                </div>
                
                <div>
                  <Label htmlFor="edad">Edad</Label>
                  <Input
                    id="edad"
                    type="text"
                    value={formData.edad}
                    onChange={handleEdadChange}
                    placeholder="Edad"
                    maxLength={3}
                  />
                </div>
                
                <div>
                  <Label htmlFor="sexo">Sexo</Label>
                  <Select value={formData.sexo} onValueChange={(value) => setFormData({...formData, sexo: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar sexo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Masculino">Masculino</SelectItem>
                      <SelectItem value="Femenino">Femenino</SelectItem>
                      <SelectItem value="Otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="telefono">Teléfono</Label>
                  <Input
                    id="telefono"
                    value={formData.telefono}
                    onChange={handleTelefonoChange}
                    placeholder="+54 11 1234-5678"
                    maxLength={20}
                  />
                </div>
                
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, email: e.target.value})}
                    placeholder="email@ejemplo.com"
                  />
                </div>
                
                <div>
                  <Label htmlFor="fechaNacimiento">Fecha de nacimiento</Label>
                  <Input
                    id="fechaNacimiento"
                    type="date"
                    value={formData.fechaNacimiento}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, fechaNacimiento: e.target.value})}
                  />
                </div>
                
                {/* <div className="md:col-span-2">
                  <Label htmlFor="foto">URL de Foto</Label>
                  <Input
                    id="foto"
                    value={formData.foto}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, foto: e.target.value})}
                    placeholder="https://ejemplo.com/foto.jpg"
                  />
                </div> */}
              </div>
              
              {/* Campo Administrador - Solo visible para administradores */}
              {user.rol === "admin" && (
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="administrador"
                    checked={formData.administrador}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, administrador: e.target.checked})}
                    className="rounded border-gray-300 text-[#4dd0e1] focus:ring-[#4dd0e1]"
                  />
                  <Label htmlFor="administrador" className="text-sm font-medium">
                    Administrador
                  </Label>
                </div>
              )}
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-[#4dd0e1] hover:bg-[#3bc0d1]">
                  {editingVoluntario ? "Actualizar" : "Agregar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de Voluntarios */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 px-4 sm:px-0">
        {voluntarios.map((voluntario) => (
          <Card key={voluntario.id} className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {voluntario.foto ? (
                    <img 
                      src={voluntario.foto} 
                      alt={getNombreCompleto(voluntario)}
                      className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#4dd0e1] to-[#3bc0d1] flex items-center justify-center flex-shrink-0">
                      <User className="w-6 h-6 text-white" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-lg truncate">{getNombreCompleto(voluntario)}</CardTitle>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <Badge variant="secondary" className={`text-xs ${getSexoColor(voluntario.sexo)}`}>
                        {getSexoIcon(voluntario.sexo)} {voluntario.sexo || "No especificado"}
                      </Badge>
                      {voluntario.edad && (
                        <Badge variant="outline" className="text-xs">
                          {voluntario.edad} años
                        </Badge>
                      )}
                      {voluntario.administrador && user.rol === "admin" && (
                        <Badge variant="default" className="text-xs bg-[#4dd0e1] text-white">
                          👑 Administrador
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3">
              <div className="space-y-2">
                {voluntario.telefono && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="truncate">{voluntario.telefono}</span>
                  </div>
                )}
                
                {voluntario.email && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="truncate">{voluntario.email}</span>
                  </div>
                )}
                
                {voluntario.fechaNacimiento && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="text-xs sm:text-sm">Nacimiento: {new Date(voluntario.fechaNacimiento).toLocaleDateString("es-ES")}</span>
                  </div>
                )}
                
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span className="text-xs sm:text-sm">Registrado: {new Date(voluntario.fechaRegistro).toLocaleDateString("es-ES")}</span>
                </div>
              </div>
              
              {voluntario.especialidades && voluntario.especialidades.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center text-sm font-medium text-gray-700">
                    <Heart className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="text-xs sm:text-sm">Especialidades:</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {voluntario.especialidades.map((especialidad, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {especialidad}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t">
                <Button 
                  onClick={() => openEditDialog(voluntario)} 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Editar
                </Button>
                <Button
                  onClick={() => handleDeleteClick(voluntario)}
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 sm:w-auto"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {voluntarios.length === 0 && (
        <div className="text-center py-12 px-4">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay voluntarios registrados</h3>
          <p className="text-gray-600">Agrega el primer voluntario para comenzar a gestionar el equipo.</p>
        </div>
      )}

      {/* Diálogo de confirmación para eliminar */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        itemName={voluntarioToDelete?.nombre}
        itemType="general"
        action="delete"
        loading={deleting}
        title="¿Eliminar voluntario?"
        description="Esta acción eliminará permanentemente al voluntario del sistema. Si tiene items asignados en el inventario, no se podrá eliminar."
      />
    </div>
  )
}
