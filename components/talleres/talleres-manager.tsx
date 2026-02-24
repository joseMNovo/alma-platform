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
import { Plus, Edit, Trash2, Calendar, Search, Filter, CheckCircle2 } from "lucide-react"
import ConfirmationDialog from "@/components/ui/confirmation-dialog"
import { can } from "@/lib/permissions"

export default function TalleresManager({ user }: { user: any }) {
  const [workshops, setWorkshops] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingWorkshop, setEditingWorkshop] = useState<any>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [workshopToDelete, setWorkshopToDelete] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "activo",
  })
  const [searchTerm, setSearchTerm] = useState("")
  const [filterActive, setFilterActive] = useState(true)

  // Detail dialog
  const [detailOpen, setDetailOpen] = useState(false)
  const [viewingWorkshop, setViewingWorkshop] = useState<any>(null)

  // Participant enrollment
  const isParticipant = user?.role === "participante"
  const [enrolledIds, setEnrolledIds] = useState<number[]>([])
  const [enrollingId, setEnrollingId] = useState<number | null>(null)

  useEffect(() => {
    fetchWorkshops()
  }, [])

  useEffect(() => {
    if (isParticipant) {
      fetch("/api/participantes/inscripciones")
        .then(r => r.json())
        .then(data => setEnrolledIds(data.workshops || []))
        .catch(console.error)
    }
  }, [isParticipant])

  const fetchWorkshops = async () => {
    try {
      const response = await fetch("/api/talleres")
      const data = await response.json()
      setWorkshops(data)
    } catch (error) {
      console.error("Error fetching talleres:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    try {
      const method = editingWorkshop ? "PUT" : "POST"
      const url = editingWorkshop ? `/api/talleres?id=${editingWorkshop.id}` : "/api/talleres"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        fetchWorkshops()
        setDialogOpen(false)
        resetForm()
      }
    } catch (error) {
      console.error("Error saving taller:", error)
    }
  }

  const handleDelete = (workshop: any) => {
    setWorkshopToDelete(workshop)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!workshopToDelete) return
    try {
      const response = await fetch(`/api/talleres?id=${workshopToDelete.id}`, { method: "DELETE" })
      if (response.ok) fetchWorkshops()
    } catch (error) {
      console.error("Error deleting taller:", error)
    } finally {
      setDeleteDialogOpen(false)
      setWorkshopToDelete(null)
    }
  }

  const resetForm = () => {
    setFormData({ name: "", description: "", status: "activo" })
    setEditingWorkshop(null)
  }

  const openEditDialog = (workshop: any) => {
    setEditingWorkshop(workshop)
    setFormData({
      name: workshop.name,
      description: workshop.description || "",
      status: workshop.status,
    })
    setDialogOpen(true)
  }

  const openDetail = (workshop: any) => {
    setViewingWorkshop(workshop)
    setDetailOpen(true)
  }

  const handleEnrollToggle = async (workshop: any) => {
    const enrolled = enrolledIds.includes(workshop.id)
    setEnrollingId(workshop.id)
    try {
      await fetch("/api/participantes/inscripciones", {
        method: enrolled ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "taller", item_id: workshop.id }),
      })
      setEnrolledIds(prev =>
        enrolled ? prev.filter(id => id !== workshop.id) : [...prev, workshop.id]
      )
    } catch (error) {
      console.error("Error toggling enrollment:", error)
    } finally {
      setEnrollingId(null)
    }
  }

  const filteredWorkshops = workshops.filter((workshop) => {
    const matchesSearch =
      workshop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (workshop.description || "").toLowerCase().includes(searchTerm.toLowerCase())

    if (filterActive) return matchesSearch && workshop.status === "activo"
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
          <p className="text-gray-600">Gestiona los tipos de talleres de estimulación cognitiva</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            {can(user, "talleres:create") && (
              <DialogTrigger asChild>
                <Button onClick={resetForm} className="bg-[#4dd0e1] hover:bg-[#3bc0d1] text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Taller
                </Button>
              </DialogTrigger>
            )}
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingWorkshop ? "Editar Taller" : "Nuevo Taller"}</DialogTitle>
                <DialogDescription>
                  {editingWorkshop ? "Modifica los datos del taller" : "Completa la información del nuevo taller"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre del Taller</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Estado</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="activo">Activo</SelectItem>
                      <SelectItem value="inactivo">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-[#4dd0e1] hover:bg-[#3bc0d1] text-white">
                    {editingWorkshop ? "Actualizar" : "Crear"} Taller
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

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
        {filteredWorkshops.map((workshop) => (
          <Card key={workshop.id} className="hover:shadow-lg transition-shadow">
            <CardHeader
              className="cursor-pointer"
              onClick={() => openDetail(workshop)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg hover:text-[#4dd0e1] transition-colors">{workshop.name}</CardTitle>
                  <CardDescription className="mt-2 line-clamp-2">{workshop.description}</CardDescription>
                </div>
                <Badge
                  variant={workshop.status === "activo" ? "default" : "secondary"}
                  className={workshop.status === "activo" ? "bg-[#4dd0e1]" : ""}
                >
                  {workshop.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 flex-wrap">
                {isParticipant ? (
                  <Button
                    onClick={() => handleEnrollToggle(workshop)}
                    disabled={enrollingId === workshop.id}
                    size="sm"
                    className={`flex-1 ${
                      enrolledIds.includes(workshop.id)
                        ? "bg-green-500 hover:bg-green-600 text-white"
                        : "bg-[#4dd0e1] hover:bg-[#3bc0d1] text-white"
                    }`}
                  >
                    {enrolledIds.includes(workshop.id) ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Anotado
                      </>
                    ) : (
                      "Quiero participar"
                    )}
                  </Button>
                ) : (
                  <>
                    {can(user, "talleres:edit") && (
                      <Button
                        onClick={(e) => { e.stopPropagation(); openEditDialog(workshop) }}
                        variant="outline" size="sm" className="flex-1"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Editar
                      </Button>
                    )}
                    {can(user, "talleres:delete") && (
                      <Button
                        onClick={(e) => { e.stopPropagation(); handleDelete(workshop) }}
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredWorkshops.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay talleres disponibles</h3>
          <p className="text-gray-600">Crea el primer taller para comenzar.</p>
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {viewingWorkshop?.name}
              <Badge
                variant={viewingWorkshop?.status === "activo" ? "default" : "secondary"}
                className={viewingWorkshop?.status === "activo" ? "bg-[#4dd0e1]" : ""}
              >
                {viewingWorkshop?.status}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          {viewingWorkshop && (
            <div className="space-y-4">
              <p className="text-gray-700 text-sm leading-relaxed">
                {viewingWorkshop.description || <span className="italic text-gray-400">Sin descripción.</span>}
              </p>
              {isParticipant && (
                <Button
                  onClick={() => handleEnrollToggle(viewingWorkshop)}
                  disabled={enrollingId === viewingWorkshop.id}
                  className={`w-full ${
                    enrolledIds.includes(viewingWorkshop.id)
                      ? "bg-green-500 hover:bg-green-600 text-white"
                      : "bg-[#4dd0e1] hover:bg-[#3bc0d1] text-white"
                  }`}
                >
                  {enrolledIds.includes(viewingWorkshop.id) ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Anotado — Salir del taller
                    </>
                  ) : (
                    "Quiero participar"
                  )}
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        itemName={workshopToDelete?.name}
        itemType="taller"
      />
    </div>
  )
}
