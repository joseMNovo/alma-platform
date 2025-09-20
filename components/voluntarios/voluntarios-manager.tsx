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

export default function VoluntariosManager({ user }) {
  const [voluntarios, setVoluntarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingVoluntario, setEditingVoluntario] = useState(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [voluntarioToDelete, setVoluntarioToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [formData, setFormData] = useState({
    nombre: "",
    edad: "",
    sexo: "",
    foto: "",
    telefono: "",
    email: "",
    especialidades: []
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

  const handleSubmit = async (e) => {
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

  const handleDeleteClick = (voluntario) => {
    setVoluntarioToDelete(voluntario)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
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
      edad: "",
      sexo: "",
      foto: "",
      telefono: "",
      email: "",
      especialidades: []
    })
    setEditingVoluntario(null)
  }

  const openEditDialog = (voluntario) => {
    setEditingVoluntario(voluntario)
    setFormData({
      nombre: voluntario.nombre || "",
      edad: voluntario.edad?.toString() || "",
      sexo: voluntario.sexo || "",
      foto: voluntario.foto || "",
      telefono: voluntario.telefono || "",
      email: voluntario.email || "",
      especialidades: voluntario.especialidades || []
    })
    setDialogOpen(true)
  }

  const getSexoIcon = (sexo) => {
    switch (sexo?.toLowerCase()) {
      case "masculino":
        return "👨"
      case "femenino":
        return "👩"
      default:
        return "👤"
    }
  }

  const getSexoColor = (sexo) => {
    switch (sexo?.toLowerCase()) {
      case "masculino":
        return "bg-blue-100 text-blue-800"
      case "femenino":
        return "bg-pink-100 text-pink-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Users className="w-6 h-6 mr-3 text-[#4dd0e1]" />
            Gestión de Voluntarios
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
              className="bg-[#4dd0e1] hover:bg-[#3bc0d1] text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Agregar Voluntario
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingVoluntario ? "Editar Voluntario" : "Agregar Nuevo Voluntario"}
              </DialogTitle>
              <DialogDescription>
                {editingVoluntario 
                  ? "Modifica la información del voluntario" 
                  : "Completa la información del nuevo voluntario"
                }
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="nombre">Nombre *</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                    placeholder="Nombre completo"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="edad">Edad</Label>
                  <Input
                    id="edad"
                    type="number"
                    value={formData.edad}
                    onChange={(e) => setFormData({...formData, edad: e.target.value})}
                    placeholder="Edad"
                    min="18"
                    max="100"
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
                    onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                    placeholder="+54 11 1234-5678"
                  />
                </div>
                
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="email@ejemplo.com"
                  />
                </div>
                
                {/* <div className="md:col-span-2">
                  <Label htmlFor="foto">URL de Foto</Label>
                  <Input
                    id="foto"
                    value={formData.foto}
                    onChange={(e) => setFormData({...formData, foto: e.target.value})}
                    placeholder="https://ejemplo.com/foto.jpg"
                  />
                </div> */}
              </div>
              
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {voluntarios.map((voluntario) => (
          <Card key={voluntario.id} className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  {voluntario.foto ? (
                    <img 
                      src={voluntario.foto} 
                      alt={voluntario.nombre}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#4dd0e1] to-[#3bc0d1] flex items-center justify-center">
                      <User className="w-6 h-6 text-white" />
                    </div>
                  )}
                  <div>
                    <CardTitle className="text-lg">{voluntario.nombre}</CardTitle>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant="secondary" className={`text-xs ${getSexoColor(voluntario.sexo)}`}>
                        {getSexoIcon(voluntario.sexo)} {voluntario.sexo || "No especificado"}
                      </Badge>
                      {voluntario.edad && (
                        <Badge variant="outline" className="text-xs">
                          {voluntario.edad} años
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
                    <Phone className="w-4 h-4 mr-2" />
                    {voluntario.telefono}
                  </div>
                )}
                
                {voluntario.email && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail className="w-4 h-4 mr-2" />
                    {voluntario.email}
                  </div>
                )}
                
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="w-4 h-4 mr-2" />
                  Registrado: {new Date(voluntario.fechaRegistro).toLocaleDateString("es-ES")}
                </div>
              </div>
              
              {voluntario.especialidades && voluntario.especialidades.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center text-sm font-medium text-gray-700">
                    <Heart className="w-4 h-4 mr-2" />
                    Especialidades:
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
              
              <div className="flex space-x-2 pt-3 border-t">
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
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {voluntarios.length === 0 && (
        <div className="text-center py-12">
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
