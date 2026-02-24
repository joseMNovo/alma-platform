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
import PersonasTablero from "@/components/voluntarios/personas-tablero"
import { Plus, Edit, Trash2, Users, User, Calendar, Phone, Mail, Heart, KeyRound } from "lucide-react"

interface CurrentUser {
  id: number
  name: string
  email: string
  role: string
  is_admin?: boolean
}

interface Volunteer {
  id: number
  name: string
  last_name: string
  age: number | null
  gender: string
  photo: string | null
  phone: string
  email: string
  specialties: string[]
  birth_date: string
  registration_date: string
  is_admin: boolean
}

export default function VoluntariosManager({ user }: { user: CurrentUser }) {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingVolunteer, setEditingVolunteer] = useState<Volunteer | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [volunteerToDelete, setVolunteerToDelete] = useState<Volunteer | null>(null)
  const [deleting, setDeleting] = useState(false)

  // PIN management
  const [pinDialogOpen, setPinDialogOpen] = useState(false)
  const [pinVolunteer, setPinVolunteer] = useState<Volunteer | null>(null)
  const [pinValue, setPinValue] = useState("")
  const [pinLoading, setPinLoading] = useState(false)
  const [pinMessage, setPinMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    last_name: "",
    age: "",
    gender: "",
    photo: "",
    phone: "",
    email: "",
    specialties: [] as string[],
    birth_date: "",
    is_admin: false,
  })

  useEffect(() => {
    fetchVolunteers()
  }, [])

  const fetchVolunteers = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/voluntarios")
      if (response.ok) {
        const data = await response.json()
        setVolunteers(data)
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
      const method = editingVolunteer ? "PUT" : "POST"
      const url = editingVolunteer ? `/api/voluntarios?id=${editingVolunteer.id}` : "/api/voluntarios"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        fetchVolunteers()
        setDialogOpen(false)
        resetForm()
      }
    } catch (error) {
      console.error("Error saving voluntario:", error)
    }
  }

  const handleDeleteClick = (volunteer: Volunteer) => {
    setVolunteerToDelete(volunteer)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async (): Promise<void> => {
    if (!volunteerToDelete) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/voluntarios?id=${volunteerToDelete.id}`, {
        method: "DELETE",
      })
      if (response.ok) {
        fetchVolunteers()
        setDeleteDialogOpen(false)
        setVolunteerToDelete(null)
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
      name: "",
      last_name: "",
      age: "",
      gender: "",
      photo: "",
      phone: "",
      email: "",
      specialties: [],
      birth_date: "",
      is_admin: false,
    })
    setEditingVolunteer(null)
  }

  const openPinDialog = (volunteer: Volunteer) => {
    setPinVolunteer(volunteer)
    setPinValue("")
    setPinMessage(null)
    setPinDialogOpen(true)
  }

  const handleSavePin = async () => {
    if (!/^\d{4}$/.test(pinValue)) {
      setPinMessage({ type: "error", text: "El PIN debe ser exactamente 4 dígitos numéricos" })
      return
    }
    setPinLoading(true)
    setPinMessage(null)
    try {
      const res = await fetch("/api/voluntarios/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: pinVolunteer!.id, pin: pinValue }),
      })
      if (res.ok) {
        setPinMessage({ type: "ok", text: "PIN guardado correctamente" })
        setPinValue("")
      } else {
        const data = await res.json()
        setPinMessage({ type: "error", text: data.error || "Error al guardar el PIN" })
      }
    } catch {
      setPinMessage({ type: "error", text: "Error de conexión" })
    } finally {
      setPinLoading(false)
    }
  }

  const openEditDialog = (volunteer: Volunteer) => {
    setEditingVolunteer(volunteer)
    setFormData({
      name: volunteer.name || "",
      last_name: volunteer.last_name || "",
      age: volunteer.age?.toString() || "",
      gender: volunteer.gender || "",
      photo: volunteer.photo || "",
      phone: volunteer.phone || "",
      email: volunteer.email || "",
      specialties: volunteer.specialties || [],
      birth_date: volunteer.birth_date || "",
      is_admin: volunteer.is_admin || false,
    })
    setDialogOpen(true)
  }

  const getGenderIcon = (gender: string) => {
    switch (gender?.toLowerCase()) {
      case "masculino": return "👨"
      case "femenino": return "👩"
      default: return "👤"
    }
  }

  const getGenderColor = (gender: string) => {
    switch (gender?.toLowerCase()) {
      case "masculino": return "bg-blue-100 text-blue-800"
      case "femenino": return "bg-pink-100 text-pink-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getFullName = (volunteer: Volunteer) => {
    if (volunteer.last_name) return `${volunteer.name} ${volunteer.last_name}`
    return volunteer.name
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9+\-\s]/g, "")
    setFormData({ ...formData, phone: value })
  }

  const handleAgeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "")
    setFormData({ ...formData, age: value })
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
      {/* Tablero de personas registradas */}
      <PersonasTablero />

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
              onClick={() => { resetForm(); setDialogOpen(true) }}
              className="w-full sm:w-auto bg-[#4dd0e1] hover:bg-[#3bc0d1] text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Agregar voluntario
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] mx-4 sm:mx-0 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingVolunteer ? "Editar voluntario" : "Agregar nuevo voluntario"}
              </DialogTitle>
              <DialogDescription>
                {editingVolunteer
                  ? "Modifica la información del voluntario"
                  : "Completa la información del nuevo voluntario"}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nombre *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nombre"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="last_name">Apellido</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    placeholder="Apellido"
                  />
                </div>

                <div>
                  <Label htmlFor="age">Edad</Label>
                  <Input
                    id="age"
                    type="text"
                    value={formData.age}
                    onChange={handleAgeChange}
                    placeholder="Edad"
                    maxLength={3}
                  />
                </div>

                <div>
                  <Label htmlFor="gender">Sexo</Label>
                  <Select value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })}>
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
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={handlePhoneChange}
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
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@ejemplo.com"
                  />
                </div>

                <div>
                  <Label htmlFor="birth_date">Fecha de nacimiento</Label>
                  <Input
                    id="birth_date"
                    type="date"
                    value={formData.birth_date}
                    onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                  />
                </div>
              </div>

              {/* Admin checkbox - only visible to admins */}
              {user.role === "admin" && (
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_admin"
                    checked={formData.is_admin}
                    onChange={(e) => setFormData({ ...formData, is_admin: e.target.checked })}
                    className="rounded border-gray-300 text-[#4dd0e1] focus:ring-[#4dd0e1]"
                  />
                  <Label htmlFor="is_admin" className="text-sm font-medium">
                    Administrador
                  </Label>
                </div>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-[#4dd0e1] hover:bg-[#3bc0d1]">
                  {editingVolunteer ? "Actualizar" : "Agregar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Volunteer list */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 px-4 sm:px-0">
        {volunteers.map((volunteer) => (
          <Card key={volunteer.id} className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {volunteer.photo ? (
                    <img
                      src={volunteer.photo}
                      alt={getFullName(volunteer)}
                      className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#4dd0e1] to-[#3bc0d1] flex items-center justify-center flex-shrink-0">
                      <User className="w-6 h-6 text-white" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-lg truncate">{getFullName(volunteer)}</CardTitle>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <Badge variant="secondary" className={`text-xs ${getGenderColor(volunteer.gender)}`}>
                        {getGenderIcon(volunteer.gender)} {volunteer.gender || "No especificado"}
                      </Badge>
                      {volunteer.age && (
                        <Badge variant="outline" className="text-xs">
                          {volunteer.age} años
                        </Badge>
                      )}
                      {volunteer.is_admin && user.role === "admin" && (
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
                {volunteer.phone && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="truncate">{volunteer.phone}</span>
                  </div>
                )}

                {volunteer.email && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="truncate">{volunteer.email}</span>
                  </div>
                )}

                {volunteer.birth_date && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="text-xs sm:text-sm">
                      Nacimiento: {new Date(volunteer.birth_date).toLocaleDateString("es-ES")}
                    </span>
                  </div>
                )}

                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span className="text-xs sm:text-sm">
                    Registrado: {new Date(volunteer.registration_date).toLocaleDateString("es-ES")}
                  </span>
                </div>
              </div>

              {volunteer.specialties && volunteer.specialties.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center text-sm font-medium text-gray-700">
                    <Heart className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="text-xs sm:text-sm">Especialidades:</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {volunteer.specialties.map((specialty, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {specialty}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t">
                <Button
                  onClick={() => openEditDialog(volunteer)}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Editar
                </Button>
                {user.role === "admin" && (
                  <Button
                    onClick={() => openPinDialog(volunteer)}
                    variant="outline"
                    size="sm"
                    className="text-[#4dd0e1] border-[#4dd0e1] hover:bg-[#e0f7fa]"
                    title="Asignar PIN"
                  >
                    <KeyRound className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  onClick={() => handleDeleteClick(volunteer)}
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

      {volunteers.length === 0 && (
        <div className="text-center py-12 px-4">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay voluntarios registrados</h3>
          <p className="text-gray-600">Agrega el primer voluntario para comenzar a gestionar el equipo.</p>
        </div>
      )}

      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        itemName={volunteerToDelete?.name}
        itemType="general"
        action="delete"
        loading={deleting}
        title="¿Eliminar voluntario?"
        description="Esta acción eliminará permanentemente al voluntario del sistema. Si tiene items asignados en el inventario, no se podrá eliminar."
      />

      {/* PIN Dialog */}
      <Dialog open={pinDialogOpen} onOpenChange={(open) => { setPinDialogOpen(open); if (!open) setPinMessage(null) }}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-[#4dd0e1]" />
              Asignar PIN
            </DialogTitle>
            <DialogDescription>
              {pinVolunteer ? `Establecer PIN de acceso para ${pinVolunteer.name}${pinVolunteer.last_name ? " " + pinVolunteer.last_name : ""}` : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pin-input">PIN (4 dígitos numéricos)</Label>
              <Input
                id="pin-input"
                type="password"
                inputMode="numeric"
                value={pinValue}
                onChange={(e) => setPinValue(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="••••"
                maxLength={4}
                className="tracking-widest text-center text-lg"
                onKeyDown={(e) => { if (e.key === "Enter") handleSavePin() }}
              />
            </div>

            {pinMessage && (
              <p className={`text-sm font-medium ${pinMessage.type === "ok" ? "text-green-600" : "text-red-600"}`}>
                {pinMessage.type === "ok" ? "✓ " : "✗ "}{pinMessage.text}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPinDialogOpen(false)}>
              Cerrar
            </Button>
            <Button
              className="bg-[#4dd0e1] hover:bg-[#3bc0d1] text-white"
              onClick={handleSavePin}
              disabled={pinLoading || pinValue.length !== 4}
            >
              {pinLoading ? "Guardando..." : "Guardar PIN"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
