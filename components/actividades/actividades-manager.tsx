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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Edit, Trash2, Activity, Search, Filter, CheckCircle2 } from "lucide-react"
import ConfirmationDialog from "@/components/ui/confirmation-dialog"
import { can } from "@/lib/permissions"

export default function ActividadesManager({ user }: { user: any }) {
  const [activities, setActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingActivity, setEditingActivity] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "activo",
  })
  const [searchTerm, setSearchTerm] = useState("")
  const [filterActive, setFilterActive] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [activityToDelete, setActivityToDelete] = useState<any>(null)

  // Detail dialog
  const [detailOpen, setDetailOpen] = useState(false)
  const [viewingActivity, setViewingActivity] = useState<any>(null)

  // Participant enrollment
  const isParticipant = user?.role === "participante"
  const [enrolledIds, setEnrolledIds] = useState<number[]>([])
  const [enrollingId, setEnrollingId] = useState<number | null>(null)

  useEffect(() => {
    fetchActivities()
  }, [])

  useEffect(() => {
    if (isParticipant) {
      fetch("/api/participantes/inscripciones")
        .then(r => r.json())
        .then(data => setEnrolledIds(data.activities || []))
        .catch(console.error)
    }
  }, [isParticipant])

  const fetchActivities = async () => {
    try {
      const response = await fetch("/api/actividades")
      const data = await response.json()
      setActivities(data)
    } catch (error) {
      console.error("Error fetching actividades:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    try {
      const method = editingActivity ? "PUT" : "POST"
      const url = editingActivity ? `/api/actividades?id=${editingActivity.id}` : "/api/actividades"
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      if (response.ok) {
        fetchActivities()
        setDialogOpen(false)
        resetForm()
      }
    } catch (error) {
      console.error("Error saving actividad:", error)
    }
  }

  const handleDelete = (activity: any) => {
    setActivityToDelete(activity)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!activityToDelete) return
    try {
      const response = await fetch(`/api/actividades?id=${activityToDelete.id}`, { method: "DELETE" })
      if (response.ok) fetchActivities()
    } catch (error) {
      console.error("Error deleting actividad:", error)
    } finally {
      setDeleteDialogOpen(false)
      setActivityToDelete(null)
    }
  }

  const resetForm = () => {
    setFormData({ name: "", description: "", status: "activo" })
    setEditingActivity(null)
  }

  const openEditDialog = (activity: any) => {
    setEditingActivity(activity)
    setFormData({
      name: activity.name,
      description: activity.description || "",
      status: activity.status,
    })
    setDialogOpen(true)
  }

  const openDetail = (activity: any) => {
    setViewingActivity(activity)
    setDetailOpen(true)
  }

  const handleEnrollToggle = async (activity: any) => {
    const enrolled = enrolledIds.includes(activity.id)
    setEnrollingId(activity.id)
    try {
      await fetch("/api/participantes/inscripciones", {
        method: enrolled ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "actividad", item_id: activity.id }),
      })
      setEnrolledIds(prev =>
        enrolled ? prev.filter(id => id !== activity.id) : [...prev, activity.id]
      )
    } catch (error) {
      console.error("Error toggling enrollment:", error)
    } finally {
      setEnrollingId(null)
    }
  }

  const filteredActivities = activities.filter((a) => {
    const matchesSearch =
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.description || "").toLowerCase().includes(searchTerm.toLowerCase())
    if (filterActive) return matchesSearch && a.status === "activo"
    return matchesSearch
  })

  if (loading) {
    return <div className="text-center py-8">Cargando actividades...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">Actividades</h2>
          <p className="text-gray-600">Ciclos de charlas, jornadas, eventos y más</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            {can(user, "actividades:create") && (
              <DialogTrigger asChild>
                <Button onClick={resetForm} className="bg-[#4dd0e1] hover:bg-[#3bc0d1] text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva Actividad
                </Button>
              </DialogTrigger>
            )}
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingActivity ? "Editar Actividad" : "Nueva Actividad"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre de la Actividad</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej: Ciclo de charlas sobre Alzheimer"
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
                    {editingActivity ? "Actualizar" : "Crear"} Actividad
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
            placeholder="Buscar actividades..."
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
          {filterActive ? "Todos" : "Solo Activas"}
        </Button>
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {filteredActivities.map((activity) => (
          <Card key={activity.id} className="hover:shadow-lg transition-shadow">
            <CardHeader
              className="cursor-pointer"
              onClick={() => openDetail(activity)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg hover:text-orange-500 transition-colors">{activity.name}</CardTitle>
                  <CardDescription className="mt-2 line-clamp-2">{activity.description}</CardDescription>
                </div>
                <Badge
                  variant={activity.status === "activo" ? "default" : "secondary"}
                  className={activity.status === "activo" ? "bg-orange-400" : ""}
                >
                  {activity.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 flex-wrap">
                {isParticipant ? (
                  <Button
                    onClick={() => handleEnrollToggle(activity)}
                    disabled={enrollingId === activity.id}
                    size="sm"
                    className={`flex-1 ${
                      enrolledIds.includes(activity.id)
                        ? "bg-green-500 hover:bg-green-600 text-white"
                        : "bg-orange-400 hover:bg-orange-500 text-white"
                    }`}
                  >
                    {enrolledIds.includes(activity.id) ? (
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
                    {can(user, "actividades:edit") && (
                      <Button
                        onClick={(e) => { e.stopPropagation(); openEditDialog(activity) }}
                        variant="outline" size="sm" className="flex-1"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Editar
                      </Button>
                    )}
                    {can(user, "actividades:delete") && (
                      <Button
                        onClick={(e) => { e.stopPropagation(); handleDelete(activity) }}
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

      {filteredActivities.length === 0 && (
        <div className="text-center py-12">
          <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay actividades disponibles</h3>
          <p className="text-gray-600">Crea la primera actividad para comenzar.</p>
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {viewingActivity?.name}
              <Badge
                variant={viewingActivity?.status === "activo" ? "default" : "secondary"}
                className={viewingActivity?.status === "activo" ? "bg-orange-400" : ""}
              >
                {viewingActivity?.status}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          {viewingActivity && (
            <div className="space-y-4">
              <p className="text-gray-700 text-sm leading-relaxed">
                {viewingActivity.description || <span className="italic text-gray-400">Sin descripción.</span>}
              </p>
              {isParticipant && (
                <Button
                  onClick={() => handleEnrollToggle(viewingActivity)}
                  disabled={enrollingId === viewingActivity.id}
                  className={`w-full ${
                    enrolledIds.includes(viewingActivity.id)
                      ? "bg-green-500 hover:bg-green-600 text-white"
                      : "bg-orange-400 hover:bg-orange-500 text-white"
                  }`}
                >
                  {enrolledIds.includes(viewingActivity.id) ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Anotado — Salir de la actividad
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
        itemName={activityToDelete?.name}
        itemType="actividad"
      />
    </div>
  )
}
