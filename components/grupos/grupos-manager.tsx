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
import { Plus, Edit, Trash2, Users, CheckCircle2 } from "lucide-react"
import ConfirmationDialog from "@/components/ui/confirmation-dialog"
import { can } from "@/lib/permissions"

export default function GruposManager({ user }: { user: any }) {
  const [groups, setGroups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<any>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [groupToDelete, setGroupToDelete] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "activo",
  })

  // Detail dialog
  const [detailOpen, setDetailOpen] = useState(false)
  const [viewingGroup, setViewingGroup] = useState<any>(null)

  // Participant enrollment
  const isParticipant = user?.role === "participante"
  const [enrolledIds, setEnrolledIds] = useState<number[]>([])
  const [enrollingId, setEnrollingId] = useState<number | null>(null)

  useEffect(() => {
    fetchGroups()
  }, [])

  useEffect(() => {
    if (isParticipant) {
      fetch("/api/participantes/inscripciones")
        .then(r => r.json())
        .then(data => setEnrolledIds(data.groups || []))
        .catch(console.error)
    }
  }, [isParticipant])

  const fetchGroups = async () => {
    try {
      const response = await fetch("/api/grupos")
      const data = await response.json()
      setGroups(data)
    } catch (error) {
      console.error("Error fetching grupos:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    try {
      const method = editingGroup ? "PUT" : "POST"
      const url = editingGroup ? `/api/grupos?id=${editingGroup.id}` : "/api/grupos"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        fetchGroups()
        setDialogOpen(false)
        resetForm()
      }
    } catch (error) {
      console.error("Error saving grupo:", error)
    }
  }

  const handleDelete = (group: any) => {
    setGroupToDelete(group)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!groupToDelete) return
    try {
      const response = await fetch(`/api/grupos?id=${groupToDelete.id}`, { method: "DELETE" })
      if (response.ok) fetchGroups()
    } catch (error) {
      console.error("Error deleting grupo:", error)
    } finally {
      setDeleteDialogOpen(false)
      setGroupToDelete(null)
    }
  }

  const resetForm = () => {
    setFormData({ name: "", description: "", status: "activo" })
    setEditingGroup(null)
  }

  const openEditDialog = (group: any) => {
    setEditingGroup(group)
    setFormData({
      name: group.name,
      description: group.description || "",
      status: group.status,
    })
    setDialogOpen(true)
  }

  const openDetail = (group: any) => {
    setViewingGroup(group)
    setDetailOpen(true)
  }

  const handleEnrollToggle = async (group: any) => {
    const enrolled = enrolledIds.includes(group.id)
    setEnrollingId(group.id)
    try {
      await fetch("/api/participantes/inscripciones", {
        method: enrolled ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "grupo", item_id: group.id }),
      })
      setEnrolledIds(prev =>
        enrolled ? prev.filter(id => id !== group.id) : [...prev, group.id]
      )
    } catch (error) {
      console.error("Error toggling enrollment:", error)
    } finally {
      setEnrollingId(null)
    }
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
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          {can(user, "grupos:create") && (
            <DialogTrigger asChild>
              <Button onClick={resetForm} className="bg-[#4dd0e1] hover:bg-[#3bc0d1] text-white">
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Grupo
              </Button>
            </DialogTrigger>
          )}
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingGroup ? "Editar Grupo" : "Nuevo Grupo"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre del Grupo</Label>
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
                  {editingGroup ? "Actualizar" : "Crear"} Grupo
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {groups.map((group) => (
          <Card key={group.id} className="hover:shadow-lg transition-shadow">
            <CardHeader
              className="cursor-pointer"
              onClick={() => openDetail(group)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg hover:text-[#4dd0e1] transition-colors">{group.name}</CardTitle>
                  <CardDescription className="mt-2 line-clamp-2">{group.description}</CardDescription>
                </div>
                <Badge
                  variant={group.status === "activo" ? "default" : "secondary"}
                  className={group.status === "activo" ? "bg-[#4dd0e1]" : ""}
                >
                  {group.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isParticipant && (
                <div className="text-sm text-gray-600">
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-2" />
                    Participantes: {group.participants}
                  </div>
                </div>
              )}
              <div className="flex gap-2 flex-wrap">
                {isParticipant ? (
                  <Button
                    onClick={() => handleEnrollToggle(group)}
                    disabled={enrollingId === group.id}
                    size="sm"
                    className={`flex-1 ${
                      enrolledIds.includes(group.id)
                        ? "bg-green-500 hover:bg-green-600 text-white"
                        : "bg-[#4dd0e1] hover:bg-[#3bc0d1] text-white"
                    }`}
                  >
                    {enrolledIds.includes(group.id) ? (
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
                    {can(user, "grupos:edit") && (
                      <Button
                        onClick={(e) => { e.stopPropagation(); openEditDialog(group) }}
                        variant="outline" size="sm" className="flex-1"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Editar
                      </Button>
                    )}
                    {can(user, "grupos:delete") && (
                      <Button
                        onClick={(e) => { e.stopPropagation(); handleDelete(group) }}
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

      {groups.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay grupos disponibles</h3>
          <p className="text-gray-600">Crea el primer grupo para comenzar.</p>
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {viewingGroup?.name}
              <Badge
                variant={viewingGroup?.status === "activo" ? "default" : "secondary"}
                className={viewingGroup?.status === "activo" ? "bg-[#4dd0e1]" : ""}
              >
                {viewingGroup?.status}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          {viewingGroup && (
            <div className="space-y-4">
              <p className="text-gray-700 text-sm leading-relaxed">
                {viewingGroup.description || <span className="italic text-gray-400">Sin descripción.</span>}
              </p>
              {!isParticipant && (
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {viewingGroup.participants} participante{viewingGroup.participants !== 1 ? "s" : ""}
                </p>
              )}
              {isParticipant && (
                <Button
                  onClick={() => handleEnrollToggle(viewingGroup)}
                  disabled={enrollingId === viewingGroup.id}
                  className={`w-full ${
                    enrolledIds.includes(viewingGroup.id)
                      ? "bg-green-500 hover:bg-green-600 text-white"
                      : "bg-[#4dd0e1] hover:bg-[#3bc0d1] text-white"
                  }`}
                >
                  {enrolledIds.includes(viewingGroup.id) ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Anotado — Salir del grupo
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
        itemName={groupToDelete?.name}
        itemType="grupo"
      />
    </div>
  )
}
