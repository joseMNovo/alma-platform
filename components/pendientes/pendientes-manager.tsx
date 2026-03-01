"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Plus, CheckSquare, User, Calendar, Trash2, Edit } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface SubItem {
  id: string
  description: string
  assigned_volunteer_id: string
  completed: boolean
  created_date: string
  completed_date?: string
}

interface Category {
  id: string
  description: string
  assigned_volunteer_id: string
  completed: boolean
  created_date: string
  completed_date?: string
  sub_items: SubItem[]
}

export default function PendientesManager({ user }: { user: any }) {
  const [pendingItems, setPendingItems] = useState<Category[]>([])
  const [volunteers, setVolunteers] = useState<any[]>([])
  const [showCompleted, setShowCompleted] = useState(false)
  const [showOnlyMine, setShowOnlyMine] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isSubCategoryModalOpen, setIsSubCategoryModalOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('')
  const [editingItem, setEditingItem] = useState<{id: string, type: 'category' | 'subcategory', categoryId?: string} | null>(null)
  const [formData, setFormData] = useState({
    description: '',
    assigned_volunteer_id: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const response = await fetch('/api/data')
      const data = await response.json()

      if (data.volunteers) {
        setVolunteers(data.volunteers)
      }

      if (data.pendientes) {
        setPendingItems(data.pendientes)
      } else {
        setPendingItems([])
      }
    } catch (error) {
      console.error('Error cargando datos:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive"
      })
    }
  }

  const saveData = async (newItems: Category[]) => {
    try {
      const response = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pendientes: newItems })
      })

      if (!response.ok) {
        throw new Error('Error al guardar datos')
      }

      setPendingItems(newItems)
    } catch (error) {
      console.error('Error guardando datos:', error)
      toast({
        title: "Error",
        description: "No se pudieron guardar los datos",
        variant: "destructive"
      })
    }
  }

  const generateId = () => {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9)
  }

  const handleAddCategory = () => {
    if (!formData.description.trim()) {
      toast({ title: "Error", description: "La descripción es requerida", variant: "destructive" })
      return
    }

    const newItem: Category = {
      id: generateId(),
      description: formData.description,
      assigned_volunteer_id: formData.assigned_volunteer_id,
      completed: false,
      created_date: new Date().toISOString(),
      sub_items: []
    }

    const updated = [...pendingItems, newItem]
    saveData(updated)
    setFormData({ description: '', assigned_volunteer_id: '' })
    setIsModalOpen(false)
    toast({ title: "Éxito", description: 'Categoría agregada' })
  }

  const handleAddSubCategory = (categoryId: string) => {
    setSelectedCategory(categoryId)
    setIsSubCategoryModalOpen(true)
  }

  const handleAddSubCategorySave = () => {
    if (!formData.description.trim()) {
      toast({ title: "Error", description: "La descripción es requerida", variant: "destructive" })
      return
    }
    if (!selectedCategory) {
      toast({ title: "Error", description: "Debe seleccionar una categoría", variant: "destructive" })
      return
    }

    const newSubItem: SubItem = {
      id: generateId(),
      description: formData.description,
      assigned_volunteer_id: formData.assigned_volunteer_id,
      completed: false,
      created_date: new Date().toISOString()
    }

    const updated = pendingItems.map(category => {
      if (category.id === selectedCategory) {
        return { ...category, sub_items: [...category.sub_items, newSubItem] }
      }
      return category
    })

    saveData(updated)
    setFormData({ description: '', assigned_volunteer_id: '' })
    setSelectedCategory('')
    setIsSubCategoryModalOpen(false)
    toast({ title: "Éxito", description: 'Sub-categoría agregada' })
  }

  const toggleCompletion = (categoryId: string, subItemId?: string) => {
    const category = pendingItems.find(c => c.id === categoryId)
    if (!category) return
    if (subItemId) {
      const subItem = category.sub_items.find(s => s.id === subItemId)
      if (!subItem || !canUserEditSubItem(subItem)) return
    } else {
      if (!canUserEditCategory(category)) return
    }

    const updated = pendingItems.map(category => {
      if (category.id === categoryId) {
        if (subItemId) {
          const updatedSubItems = category.sub_items.map(subItem => {
            if (subItem.id === subItemId) {
              return {
                ...subItem,
                completed: !subItem.completed,
                completed_date: !subItem.completed ? new Date().toISOString() : undefined
              }
            }
            return subItem
          })
          return { ...category, sub_items: updatedSubItems }
        } else {
          return {
            ...category,
            completed: !category.completed,
            completed_date: !category.completed ? new Date().toISOString() : undefined
          }
        }
      }
      return category
    })

    saveData(updated)
  }

  const handleEdit = (itemId: string, type: 'category' | 'subcategory', categoryId?: string) => {
    setEditingItem({ id: itemId, type, categoryId })

    if (type === 'category') {
      const category = pendingItems.find(c => c.id === itemId)
      if (category) {
        setFormData({ description: category.description, assigned_volunteer_id: category.assigned_volunteer_id })
      }
    } else {
      const category = pendingItems.find(c => c.id === categoryId)
      const subItem = category?.sub_items.find(s => s.id === itemId)
      if (subItem) {
        setFormData({ description: subItem.description, assigned_volunteer_id: subItem.assigned_volunteer_id })
        setSelectedCategory(categoryId || '')
      }
    }

    setIsEditModalOpen(true)
  }

  const handleDelete = (itemId: string, type: 'category' | 'subcategory', categoryId?: string) => {
    if (type === 'category') {
      const updated = pendingItems.filter(c => c.id !== itemId)
      saveData(updated)
      toast({ title: "Éxito", description: "Categoría eliminada" })
    } else {
      const updated = pendingItems.map(category => {
        if (category.id === categoryId) {
          return { ...category, sub_items: category.sub_items.filter(s => s.id !== itemId) }
        }
        return category
      })
      saveData(updated)
      toast({ title: "Éxito", description: "Sub-categoría eliminada" })
    }
  }

  const handleEditSave = () => {
    if (!formData.description.trim()) {
      toast({ title: "Error", description: "La descripción es requerida", variant: "destructive" })
      return
    }
    if (!editingItem) return

    if (editingItem.type === 'category') {
      const updated = pendingItems.map(category => {
        if (category.id === editingItem.id) {
          return { ...category, description: formData.description, assigned_volunteer_id: formData.assigned_volunteer_id }
        }
        return category
      })
      saveData(updated)
    } else {
      if (!selectedCategory) {
        toast({ title: "Error", description: "Debe seleccionar una categoría", variant: "destructive" })
        return
      }
      const updated = pendingItems.map(category => {
        if (category.id === selectedCategory) {
          return {
            ...category,
            sub_items: category.sub_items.map(subItem => {
              if (subItem.id === editingItem.id) {
                return { ...subItem, description: formData.description, assigned_volunteer_id: formData.assigned_volunteer_id }
              }
              return subItem
            })
          }
        }
        return category
      })
      saveData(updated)
    }

    setFormData({ description: '', assigned_volunteer_id: '' })
    setSelectedCategory('')
    setEditingItem(null)
    setIsEditModalOpen(false)
    toast({ title: "Éxito", description: "Item actualizado" })
  }

  const getVolunteerName = (volunteerId: string) => {
    const volunteer = volunteers.find(v => v.id.toString() === volunteerId)
    return volunteer ? `${volunteer.name}${volunteer.last_name ? " " + volunteer.last_name : ""}` : 'Sin asignar'
  }

  const canUserSeeCategory = (category: Category) => {
    if (!showOnlyMine) return true
    if (category.assigned_volunteer_id === user.id.toString()) return true
    return category.sub_items.some(s => s.assigned_volunteer_id === user.id.toString())
  }

  const canUserEditCategory = (category: Category) => {
    return category.assigned_volunteer_id === user.id.toString()
  }

  const canUserEditSubItem = (subItem: SubItem) => {
    return subItem.assigned_volunteer_id === user.id.toString()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  const filteredItems = pendingItems.filter(item => {
    const showByCompleted = showCompleted || !item.completed
    const showByVisibility = !showOnlyMine || canUserSeeCategory(item)
    return showByCompleted && showByVisibility
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pendientes</h1>
          <p className="text-gray-600">Gestiona tus tareas y categorías pendientes</p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="flex items-center space-x-2">
              <Checkbox id="show-completed" checked={showCompleted} onCheckedChange={setShowCompleted} />
              <Label htmlFor="show-completed" className="text-sm">Ver completados</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="show-only-mine" checked={showOnlyMine} onCheckedChange={setShowOnlyMine} />
              <Label htmlFor="show-only-mine" className="text-sm">Ver solo los míos</Label>
            </div>
          </div>

          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button
                className="bg-[#4dd0e1] hover:bg-[#3bb5c7] text-white w-full sm:w-auto"
                onClick={() => setFormData({ description: '', assigned_volunteer_id: '' })}
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Nueva Categoría</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe la categoría..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="voluntario">Asignar a voluntario</Label>
                  <Select
                    value={formData.assigned_volunteer_id}
                    onValueChange={(value) => setFormData({ ...formData, assigned_volunteer_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un voluntario" />
                    </SelectTrigger>
                    <SelectContent>
                      {volunteers.map(volunteer => (
                        <SelectItem key={volunteer.id} value={volunteer.id.toString()}>
                          {volunteer.name}{volunteer.last_name ? " " + volunteer.last_name : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                  <Button onClick={handleAddCategory} className="bg-[#4dd0e1] hover:bg-[#3bb5c7] text-white">
                    Crear Categoría
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Edit Modal */}
          <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingItem?.type === 'category' ? 'Editar Categoría' : 'Editar Sub-categoría'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {editingItem?.type === 'subcategory' && (
                  <div>
                    <Label htmlFor="edit-categoria">Categoría padre</Label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {pendingItems.map(category => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <Label htmlFor="edit-description">Descripción</Label>
                  <Textarea
                    id="edit-description"
                    placeholder="Describe la tarea o categoría..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-voluntario">Asignar a voluntario</Label>
                  <Select
                    value={formData.assigned_volunteer_id}
                    onValueChange={(value) => setFormData({ ...formData, assigned_volunteer_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un voluntario" />
                    </SelectTrigger>
                    <SelectContent>
                      {volunteers.map(volunteer => (
                        <SelectItem key={volunteer.id} value={volunteer.id.toString()}>
                          {volunteer.name}{volunteer.last_name ? " " + volunteer.last_name : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancelar</Button>
                  <Button onClick={handleEditSave} className="bg-[#4dd0e1] hover:bg-[#3bb5c7] text-white">
                    Guardar Cambios
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Sub-category Modal */}
          <Dialog open={isSubCategoryModalOpen} onOpenChange={setIsSubCategoryModalOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Nueva Sub-categoría</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="sub-description">Descripción</Label>
                  <Textarea
                    id="sub-description"
                    placeholder="Describe la sub-categoría..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="sub-voluntario">Asignar a voluntario</Label>
                  <Select
                    value={formData.assigned_volunteer_id}
                    onValueChange={(value) => setFormData({ ...formData, assigned_volunteer_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un voluntario" />
                    </SelectTrigger>
                    <SelectContent>
                      {volunteers.map(volunteer => (
                        <SelectItem key={volunteer.id} value={volunteer.id.toString()}>
                          {volunteer.name}{volunteer.last_name ? " " + volunteer.last_name : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsSubCategoryModalOpen(false)}>Cancelar</Button>
                  <Button onClick={handleAddSubCategorySave} className="bg-[#4dd0e1] hover:bg-[#3bb5c7] text-white">
                    Crear Sub-categoría
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* List */}
      <div className="space-y-6">
        {filteredItems.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <CheckSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {showCompleted ? 'No hay tareas completadas' : 'No hay tareas pendientes'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map(category => (
              <Card key={category.id} className={`h-fit ${category.completed ? 'opacity-60 bg-gray-50' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <Checkbox
                        checked={category.completed}
                        onCheckedChange={() => toggleCompletion(category.id)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <CardTitle className={`text-lg ${category.completed ? 'line-through text-gray-500' : ''}`}>
                          {category.description}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-[#4dd0e1] font-medium">
                            {getVolunteerName(category.assigned_volunteer_id)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">{formatDate(category.created_date)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {category.completed && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                          Completado
                        </Badge>
                      )}
                      <div className="flex items-center gap-1">
                        {canUserEditCategory(category) && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAddSubCategory(category.id)}
                              className="h-8 w-8 p-0 text-[#4dd0e1] hover:text-[#3bb5c7] hover:bg-[#4dd0e1]/10"
                              title="Agregar sub-categoría"
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(category.id, 'category')}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(category.id, 'category')}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>

                {category.sub_items.length > 0 && (
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm text-gray-700 mb-3">Sub-tareas:</h4>
                      {category.sub_items
                        .filter(subItem => {
                          const showByCompleted = showCompleted || !subItem.completed
                          const showByAssignment = !showOnlyMine || subItem.assigned_volunteer_id === user.id.toString()
                          return showByCompleted && showByAssignment
                        })
                        .map(subItem => (
                          <div
                            key={subItem.id}
                            className={`flex items-start justify-between p-3 rounded-lg border ${
                              subItem.completed ? 'bg-gray-100 opacity-60' : 'bg-gray-50 border-gray-200'
                            }`}
                          >
                            <div className="flex items-start space-x-3 flex-1">
                              <Checkbox
                                checked={subItem.completed}
                                onCheckedChange={() => toggleCompletion(category.id, subItem.id)}
                                className="mt-1"
                              />
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium ${subItem.completed ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                                  {subItem.description}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <User className="w-3 h-3 text-gray-500" />
                                  <span className="text-xs text-[#4dd0e1] font-medium">
                                    {getVolunteerName(subItem.assigned_volunteer_id)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <Calendar className="w-3 h-3 text-gray-500" />
                                  <span className="text-xs text-gray-700">{formatDate(subItem.created_date)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 ml-2">
                              {subItem.completed && (
                                <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs mr-1">
                                  Completado
                                </Badge>
                              )}
                              {canUserEditSubItem(subItem) && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEdit(subItem.id, 'subcategory', category.id)}
                                    className="h-6 w-6 p-0"
                                  >
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDelete(subItem.id, 'subcategory', category.id)}
                                    className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
