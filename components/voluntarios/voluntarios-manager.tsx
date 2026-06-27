"use client"

import { useState, useEffect, Suspense } from "react"
import { toast } from "@/hooks/use-toast"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { formatLocalDate } from "@/lib/utils"
import { Plus, Edit, Trash2, Users, User, Calendar, Phone, Mail, Heart, KeyRound, X, ChevronDown, LayoutGrid, List, Search } from "lucide-react"

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

function VoluntariosManagerInner({ user }: { user: CurrentUser }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [volunteers, setVolunteers] = useState<Volunteer[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingVolunteer, setEditingVolunteer] = useState<Volunteer | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [volunteerToDelete, setVolunteerToDelete] = useState<Volunteer | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards")
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filters, setFilters] = useState({
    name: "",
    last_name: "",
    email: "",
    phone: "",
    specialty: "",
  })

  // PIN management
  const [pinDialogOpen, setPinDialogOpen] = useState(false)
  const [pinVolunteer, setPinVolunteer] = useState<Volunteer | null>(null)
  const [pinValue, setPinValue] = useState("")
  const [pinLoading, setPinLoading] = useState(false)
  const [pinMessage, setPinMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null)
  const [specialtyInput, setSpecialtyInput] = useState("")
  const [nameTouched, setNameTouched] = useState(false)
  const [lastNameTouched, setLastNameTouched] = useState(false)
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

  // Abrir modal de edición propio si viene ?editSelf=true
  useEffect(() => {
    if (searchParams.get("editSelf") === "true" && volunteers.length > 0) {
      const myRecord = volunteers.find((v) => v.email === user.email)
      if (myRecord) {
        openEditDialog(myRecord)
        router.replace("/voluntarios", { scroll: false })
      }
    }
  }, [searchParams, volunteers])

  const fetchVolunteers = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/voluntarios")
      if (response.ok) {
        const data = await response.json()
        setVolunteers(data.filter((v: any) => v.status !== "pendiente"))
      }
    } catch (error) {
      console.error("Error fetching voluntarios:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast({ title: "Campo requerido", description: "El nombre es obligatorio", variant: "destructive" })
      setNameTouched(true)
      document.getElementById("vol-name")?.focus()
      return
    }
    if (!formData.last_name.trim()) {
      toast({ title: "Campo requerido", description: "El apellido es obligatorio", variant: "destructive" })
      setLastNameTouched(true)
      document.getElementById("last_name")?.focus()
      return
    }
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
      } else {
        const data = await response.json().catch(() => ({}))
        toast({ title: "Error al guardar", description: data.error || "No se pudo guardar el voluntario", variant: "destructive" })
      }
    } catch {
      toast({ title: "Error de conexión", description: "No se pudo conectar con el servidor", variant: "destructive" })
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
    setSpecialtyInput("")
    setNameTouched(false)
    setLastNameTouched(false)
  }

  const addSpecialty = () => {
    const trimmed = specialtyInput.trim()
    if (trimmed && !formData.specialties.includes(trimmed)) {
      setFormData({ ...formData, specialties: [...formData.specialties, trimmed] })
    }
    setSpecialtyInput("")
  }

  const removeSpecialty = (index: number) => {
    setFormData({
      ...formData,
      specialties: formData.specialties.filter((_, i) => i !== index),
    })
  }

  const handleSpecialtyKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      addSpecialty()
    }
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

  const matchesFilter = (value: string | null | undefined, query: string) =>
    !query.trim() || (value || "").toLowerCase().includes(query.trim().toLowerCase())

  const filteredVolunteers = volunteers
    .filter((v) =>
      matchesFilter(v.name, filters.name) &&
      matchesFilter(v.last_name, filters.last_name) &&
      matchesFilter(v.email, filters.email) &&
      matchesFilter(v.phone, filters.phone) &&
      matchesFilter((v.specialties || []).join(" "), filters.specialty)
    )
    // Orden alfabético por nombre completo, igual en lista y cards.
    .sort((a, b) => getFullName(a).localeCompare(getFullName(b), "es", { sensitivity: "base" }))

  const activeFilterCount = Object.values(filters).filter((f) => f.trim()).length

  const clearFilters = () =>
    setFilters({ name: "", last_name: "", email: "", phone: "", specialty: "" })

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
    <div className="space-y-4 px-4 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div className="text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-3">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <Users className="w-6 h-6 mr-3 text-[#4dd0e1]" />
              Gestión de voluntarios
            </h2>
            {/* Toggle de vista: tarjetas / lista (solo desktop) */}
            <div className="hidden sm:inline-flex items-center bg-gray-100 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                aria-pressed={viewMode === "cards"}
                title="Vista de tarjetas"
                className={`inline-flex items-center justify-center w-8 h-8 rounded-md transition-colors ${
                  viewMode === "cards"
                    ? "bg-white text-[#4dd0e1] shadow-sm"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                aria-pressed={viewMode === "list"}
                title="Vista de lista"
                className={`inline-flex items-center justify-center w-8 h-8 rounded-md transition-colors ${
                  viewMode === "list"
                    ? "bg-white text-[#4dd0e1] shadow-sm"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-1">Administra los voluntarios de ALMA</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => { resetForm(); setDialogOpen(true) }}
              className="w-full sm:w-auto bg-[#4dd0e1] hover:bg-[#3bc0d1] text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuevo voluntario/a
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
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

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="vol-name">Nombre *</Label>
                  <Input
                    id="vol-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    onBlur={() => setNameTouched(true)}
                    placeholder="Nombre"
                  />
                  {nameTouched && !formData.name.trim() && (
                    <p className="text-xs text-red-500 mt-1">El nombre es requerido</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="last_name">Apellido *</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    onBlur={() => setLastNameTouched(true)}
                    placeholder="Apellido"
                  />
                  {lastNameTouched && !formData.last_name.trim() && (
                    <p className="text-xs text-red-500 mt-1">El apellido es requerido</p>
                  )}
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
                      <SelectItem value="Prefiero no decirlo">Prefiero no decirlo</SelectItem>
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

              {/* Especialidades */}
              <div className="space-y-2">
                <Label>Especialidades</Label>
                <div className="flex gap-2">
                  <Input
                    value={specialtyInput}
                    onChange={(e) => setSpecialtyInput(e.target.value)}
                    onKeyDown={handleSpecialtyKeyDown}
                    placeholder="Ej: Música, Arte... (Enter para agregar)"
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" onClick={addSpecialty} disabled={!specialtyInput.trim()}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {formData.specialties.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {formData.specialties.map((s, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 bg-[#e0f7fa] text-[#00838f] text-xs font-medium px-2.5 py-1 rounded-full"
                      >
                        {s}
                        <button type="button" onClick={() => removeSpecialty(i)} className="hover:text-red-500 transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <p className="text-xs text-gray-400">* Campos obligatorios</p>
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

      {/* ── Acordeón de filtros ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setFiltersOpen((o) => !o)}
          className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors hover:bg-gray-50/50"
        >
          <span className="flex items-center gap-2 text-sm font-medium text-gray-600">
            <Search className="w-4 h-4 text-[#4dd0e1]" />
            Filtros de búsqueda
            {activeFilterCount > 0 && (
              <Badge variant="outline" className="text-xs border-[#4dd0e1] text-[#00838f]">
                {activeFilterCount}
              </Badge>
            )}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${
              filtersOpen ? "rotate-180" : ""
            }`}
          />
        </button>
        <div
          className={`grid transition-all duration-300 ease-in-out ${
            filtersOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="overflow-hidden">
            <div className="px-4 pb-4 pt-1 border-t border-gray-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div>
                  <Label htmlFor="filter-name" className="text-xs text-gray-500">Nombre</Label>
                  <Input
                    id="filter-name"
                    value={filters.name}
                    onChange={(e) => setFilters({ ...filters, name: e.target.value })}
                    placeholder="Nombre"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="filter-last-name" className="text-xs text-gray-500">Apellido</Label>
                  <Input
                    id="filter-last-name"
                    value={filters.last_name}
                    onChange={(e) => setFilters({ ...filters, last_name: e.target.value })}
                    placeholder="Apellido"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="filter-email" className="text-xs text-gray-500">Email</Label>
                  <Input
                    id="filter-email"
                    value={filters.email}
                    onChange={(e) => setFilters({ ...filters, email: e.target.value })}
                    placeholder="Email"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="filter-phone" className="text-xs text-gray-500">Teléfono</Label>
                  <Input
                    id="filter-phone"
                    value={filters.phone}
                    onChange={(e) => setFilters({ ...filters, phone: e.target.value })}
                    placeholder="Teléfono"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="filter-specialty" className="text-xs text-gray-500">Especialidad</Label>
                  <Input
                    id="filter-specialty"
                    value={filters.specialty}
                    onChange={(e) => setFilters({ ...filters, specialty: e.target.value })}
                    placeholder="Especialidad"
                    className="mt-1"
                  />
                </div>
              </div>
              {activeFilterCount > 0 && (
                <div className="flex justify-end mt-3">
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="text-gray-500 hover:text-gray-700">
                    <X className="w-3.5 h-3.5 mr-1" />
                    Limpiar filtros
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── MOBILE: Acordeón (< sm) ── */}
      <div className="sm:hidden space-y-2">
        {filteredVolunteers.map((volunteer) => {
          const isExpanded = expandedId === volunteer.id
          const fullName = getFullName(volunteer)
          return (
            <div
              key={volunteer.id}
              className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
            >
              {/* Fila compacta — siempre visible */}
              <button
                className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors active:bg-gray-50"
                onClick={() => setExpandedId(isExpanded ? null : volunteer.id)}
              >
                {/* Avatar pequeño */}
                {volunteer.photo ? (
                  <img
                    src={volunteer.photo}
                    alt={fullName}
                    className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#4dd0e1] to-[#3bc0d1] flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}

                {/* Nombre + email */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-semibold text-gray-900 text-sm truncate leading-snug">
                      {fullName}
                    </span>
                  </div>
                  {volunteer.email ? (
                    <span className="text-xs text-gray-400 truncate block mt-0.5">{volunteer.email}</span>
                  ) : volunteer.phone ? (
                    <span className="text-xs text-gray-400 truncate block mt-0.5">{volunteer.phone}</span>
                  ) : null}
                </div>

                {/* Age badge + chevron */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {volunteer.age && (
                    <Badge variant="outline" className="text-xs px-1.5 py-0">
                      {volunteer.age}a
                    </Badge>
                  )}
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </button>

              {/* Contenido expandido */}
              <div
                className={`grid transition-all duration-300 ease-in-out ${
                  isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
                <div className="overflow-hidden">
                  <div className="px-4 pb-4 pt-3 border-t border-gray-100 space-y-3">
                    {/* Datos de contacto */}
                    <div className="space-y-2">
                      {volunteer.phone && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <span>{volunteer.phone}</span>
                        </div>
                      )}
                      {volunteer.email && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <span className="truncate">{volunteer.email}</span>
                        </div>
                      )}
                      {volunteer.birth_date && (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <span>Nac: {volunteer.birth_date.slice(0, 10).split("-").reverse().join("/")}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <span>Registro: {formatLocalDate(volunteer.registration_date)}</span>
                      </div>
                    </div>

                    {/* Especialidades */}
                    {volunteer.specialties && volunteer.specialties.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Heart className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <span>Especialidades</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {volunteer.specialties.map((specialty, index) => (
                            <Badge key={index} variant="outline" className="text-xs px-2 py-0.5">
                              {specialty}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Acciones */}
                    <div className="flex gap-2 pt-1">
                      <Button
                        onClick={() => openEditDialog(volunteer)}
                        variant="outline"
                        size="sm"
                        className="flex-1 h-9"
                      >
                        <Edit className="w-3.5 h-3.5 mr-1.5" />
                        Editar
                      </Button>
                      {user.role === "admin" && (
                        <Button
                          onClick={() => openPinDialog(volunteer)}
                          variant="outline"
                          size="sm"
                          className="h-9 w-9 p-0 text-[#4dd0e1] border-[#4dd0e1] hover:bg-[#e0f7fa]"
                          title="Asignar PIN"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button
                        onClick={() => handleDeleteClick(volunteer)}
                        variant="outline"
                        size="sm"
                        className="h-9 w-9 p-0 text-red-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── DESKTOP: Grid de cards (≥ sm) ── */}
      <div className={`${viewMode === "cards" ? "hidden sm:grid" : "hidden"} grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 px-4 sm:px-0`}>
        {filteredVolunteers.map((volunteer) => (
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
                      {volunteer.age && (
                        <Badge variant="outline" className="text-xs">
                          {volunteer.age} años
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
                      Nacimiento: {volunteer.birth_date.slice(0, 10).split("-").reverse().join("/")}
                    </span>
                  </div>
                )}

                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span className="text-xs sm:text-sm">
                    Registrado: {formatLocalDate(volunteer.registration_date)}
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

      {/* ── DESKTOP: Vista de lista / tablero (≥ sm) ── */}
      {viewMode === "list" && (
        <div className="hidden sm:block px-4 sm:px-0">
          <div className="overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-separate border-spacing-0">
                <thead>
                  <tr className="text-left text-[11px] font-semibold text-[#00838f]/70 uppercase tracking-wider bg-[#e0f7fa]/40">
                    <th className="px-5 py-3.5 font-semibold border-r border-gray-100">Voluntario</th>
                    <th className="px-5 py-3.5 font-semibold border-r border-gray-100">Edad</th>
                    <th className="px-5 py-3.5 font-semibold border-r border-gray-100">Teléfono</th>
                    <th className="px-5 py-3.5 font-semibold border-r border-gray-100">Email</th>
                    <th className="px-5 py-3.5 font-semibold border-r border-gray-100">Registrado</th>
                    <th className="px-5 py-3.5 font-semibold border-r border-gray-100">Especialidades</th>
                    <th className="px-5 py-3.5 font-semibold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVolunteers
                    .map((volunteer) => (
                    <tr key={volunteer.id} className="group border-t border-gray-50 transition-colors hover:bg-[#f6fdfe]">
                      <td className="px-5 py-3 border-t border-r border-gray-100">
                        <div className="flex items-center gap-3">
                          {volunteer.photo ? (
                            <img
                              src={volunteer.photo}
                              alt={getFullName(volunteer)}
                              className="w-9 h-9 rounded-full object-cover flex-shrink-0 ring-2 ring-white shadow-sm"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#4dd0e1] to-[#3bc0d1] flex items-center justify-center flex-shrink-0 ring-2 ring-white shadow-sm">
                              <User className="w-4 h-4 text-white" />
                            </div>
                          )}
                          <span className="font-semibold text-gray-800">{getFullName(volunteer)}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 border-t border-r border-gray-100 text-gray-500 whitespace-nowrap">{volunteer.age ? `${volunteer.age} años` : "—"}</td>
                      <td className="px-5 py-3 border-t border-r border-gray-100 text-gray-500 tabular-nums whitespace-nowrap">{volunteer.phone || "—"}</td>
                      <td className="px-5 py-3 border-t border-r border-gray-100 text-gray-500">{volunteer.email || "—"}</td>
                      <td className="px-5 py-3 border-t border-r border-gray-100 text-gray-500 tabular-nums whitespace-nowrap">{formatLocalDate(volunteer.registration_date)}</td>
                      <td className="px-5 py-3 border-t border-r border-gray-100">
                        {volunteer.specialties && volunteer.specialties.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 max-w-[220px]">
                            {volunteer.specialties.map((specialty, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center bg-[#e0f7fa] text-[#00838f] text-xs font-medium px-2.5 py-0.5 rounded-full"
                              >
                                {specialty}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 border-t border-gray-100">
                        <div className="flex items-center justify-end gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                          <button
                            onClick={() => openEditDialog(volunteer)}
                            className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-gray-400 hover:text-[#00838f] hover:bg-[#e0f7fa] transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {user.role === "admin" && (
                            <button
                              onClick={() => openPinDialog(volunteer)}
                              className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-gray-400 hover:text-[#00838f] hover:bg-[#e0f7fa] transition-colors"
                              title="Asignar PIN"
                            >
                              <KeyRound className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteClick(volunteer)}
                            className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {volunteers.length === 0 && (
        <div className="text-center py-12 px-4">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay voluntarios registrados</h3>
          <p className="text-gray-600">Agrega el primer voluntario para comenzar a gestionar el equipo.</p>
        </div>
      )}

      {volunteers.length > 0 && filteredVolunteers.length === 0 && (
        <div className="text-center py-12 px-4">
          <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Sin resultados</h3>
          <p className="text-gray-600">Ningún voluntario coincide con los filtros aplicados.</p>
          <Button variant="outline" size="sm" onClick={clearFilters} className="mt-4">
            <X className="w-3.5 h-3.5 mr-1" />
            Limpiar filtros
          </Button>
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

export default function VoluntariosManager({ user }: { user: CurrentUser }) {
  return (
    <Suspense fallback={null}>
      <VoluntariosManagerInner user={user} />
    </Suspense>
  )
}
