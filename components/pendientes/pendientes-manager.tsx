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
import { Plus, CheckSquare, Square, User, Calendar, Trash2, Edit, X } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface SubItem {
  id: string
  descripcion: string
  voluntarioAsignado: string
  completado: boolean
  fechaCreacion: string
  fechaCompletado?: string
}

interface Categoria {
  id: string
  descripcion: string
  voluntarioAsignado: string
  completado: boolean
  fechaCreacion: string
  fechaCompletado?: string
  subItems: SubItem[]
}

interface PendientesData {
  pendientes: Categoria[]
}

export default function PendientesManager({ user }) {
  const [pendientes, setPendientes] = useState<Categoria[]>([])
  const [voluntarios, setVoluntarios] = useState([])
  const [showCompleted, setShowCompleted] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isSubCategoryModalOpen, setIsSubCategoryModalOpen] = useState(false)
  const [selectedCategoria, setSelectedCategoria] = useState('')
  const [editingItem, setEditingItem] = useState<{id: string, type: 'categoria' | 'subcategoria', categoriaId?: string} | null>(null)
  const [formData, setFormData] = useState({
    descripcion: '',
    voluntarioAsignado: ''
  })

  // Cargar datos iniciales
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const response = await fetch('/api/data')
      const data = await response.json()
      
      if (data.voluntarios) {
        setVoluntarios(data.voluntarios)
      }
      
      if (data.pendientes) {
        setPendientes(data.pendientes)
      } else {
        // Inicializar estructura si no existe
        setPendientes([])
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

  const saveData = async (newPendientes: Categoria[]) => {
    try {
      const response = await fetch('/api/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pendientes: newPendientes
        })
      })

      if (!response.ok) {
        throw new Error('Error al guardar datos')
      }

      setPendientes(newPendientes)
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
    if (!formData.descripcion.trim()) {
      toast({
        title: "Error",
        description: "La descripción es requerida",
        variant: "destructive"
      })
      return
    }

    const newItem: Categoria = {
      id: generateId(),
      descripcion: formData.descripcion,
      voluntarioAsignado: formData.voluntarioAsignado,
      completado: false,
      fechaCreacion: new Date().toISOString(),
      subItems: []
    }

    const updatedPendientes = [...pendientes, newItem]
    saveData(updatedPendientes)

    // Reset form
    setFormData({ descripcion: '', voluntarioAsignado: '' })
    setIsModalOpen(false)
    
    toast({
      title: "Éxito",
      description: 'Categoría agregada'
    })
  }

  const handleAddSubCategory = (categoriaId: string) => {
    setSelectedCategoria(categoriaId)
    setIsSubCategoryModalOpen(true)
  }

  const handleAddSubCategorySave = () => {
    if (!formData.descripcion.trim()) {
      toast({
        title: "Error",
        description: "La descripción es requerida",
        variant: "destructive"
      })
      return
    }

    if (!selectedCategoria) {
      toast({
        title: "Error",
        description: "Debe seleccionar una categoría",
        variant: "destructive"
      })
      return
    }

    const newSubItem: SubItem = {
      id: generateId(),
      descripcion: formData.descripcion,
      voluntarioAsignado: formData.voluntarioAsignado,
      completado: false,
      fechaCreacion: new Date().toISOString()
    }

    const updatedPendientes = pendientes.map(categoria => {
      if (categoria.id === selectedCategoria) {
        return {
          ...categoria,
          subItems: [...categoria.subItems, newSubItem]
        }
      }
      return categoria
    })

    saveData(updatedPendientes)

    // Reset form
    setFormData({ descripcion: '', voluntarioAsignado: '' })
    setSelectedCategoria('')
    setIsSubCategoryModalOpen(false)
    
    toast({
      title: "Éxito",
      description: 'Sub-categoría agregada'
    })
  }

  const toggleCompletion = (categoriaId: string, subItemId?: string) => {
    const updatedPendientes = pendientes.map(categoria => {
      if (categoria.id === categoriaId) {
        if (subItemId) {
          // Toggle sub-item
          const updatedSubItems = categoria.subItems.map(subItem => {
            if (subItem.id === subItemId) {
              return {
                ...subItem,
                completado: !subItem.completado,
                fechaCompletado: !subItem.completado ? new Date().toISOString() : undefined
              }
            }
            return subItem
          })
          return { ...categoria, subItems: updatedSubItems }
        } else {
          // Toggle categoria
          return {
            ...categoria,
            completado: !categoria.completado,
            fechaCompletado: !categoria.completado ? new Date().toISOString() : undefined
          }
        }
      }
      return categoria
    })

    saveData(updatedPendientes)
  }

  const handleEdit = (itemId: string, type: 'categoria' | 'subcategoria', categoriaId?: string) => {
    setEditingItem({ id: itemId, type, categoriaId })
    
    if (type === 'categoria') {
      const categoria = pendientes.find(c => c.id === itemId)
      if (categoria) {
        setFormData({
          descripcion: categoria.descripcion,
          voluntarioAsignado: categoria.voluntarioAsignado
        })
      }
    } else {
      const categoria = pendientes.find(c => c.id === categoriaId)
      const subItem = categoria?.subItems.find(s => s.id === itemId)
      if (subItem) {
        setFormData({
          descripcion: subItem.descripcion,
          voluntarioAsignado: subItem.voluntarioAsignado
        })
        setSelectedCategoria(categoriaId || '')
      }
    }
    
    setIsEditModalOpen(true)
  }

  const handleDelete = (itemId: string, type: 'categoria' | 'subcategoria', categoriaId?: string) => {
    if (type === 'categoria') {
      const updatedPendientes = pendientes.filter(c => c.id !== itemId)
      saveData(updatedPendientes)
      toast({
        title: "Éxito",
        description: "Categoría eliminada"
      })
    } else {
      const updatedPendientes = pendientes.map(categoria => {
        if (categoria.id === categoriaId) {
          return {
            ...categoria,
            subItems: categoria.subItems.filter(subItem => subItem.id !== itemId)
          }
        }
        return categoria
      })
      saveData(updatedPendientes)
      toast({
        title: "Éxito",
        description: "Sub-categoría eliminada"
      })
    }
  }

  const handleEditSave = () => {
    if (!formData.descripcion.trim()) {
      toast({
        title: "Error",
        description: "La descripción es requerida",
        variant: "destructive"
      })
      return
    }

    if (!editingItem) return

    if (editingItem.type === 'categoria') {
      const updatedPendientes = pendientes.map(categoria => {
        if (categoria.id === editingItem.id) {
          return {
            ...categoria,
            descripcion: formData.descripcion,
            voluntarioAsignado: formData.voluntarioAsignado
          }
        }
        return categoria
      })
      saveData(updatedPendientes)
    } else {
      if (!selectedCategoria) {
        toast({
          title: "Error",
          description: "Debe seleccionar una categoría",
          variant: "destructive"
        })
        return
      }

      const updatedPendientes = pendientes.map(categoria => {
        if (categoria.id === selectedCategoria) {
          return {
            ...categoria,
            subItems: categoria.subItems.map(subItem => {
              if (subItem.id === editingItem.id) {
                return {
                  ...subItem,
                  descripcion: formData.descripcion,
                  voluntarioAsignado: formData.voluntarioAsignado
                }
              }
              return subItem
            })
          }
        }
        return categoria
      })
      saveData(updatedPendientes)
    }

    // Reset form
    setFormData({ descripcion: '', voluntarioAsignado: '' })
    setSelectedCategoria('')
    setEditingItem(null)
    setIsEditModalOpen(false)
    
    toast({
      title: "Éxito",
      description: "Item actualizado"
    })
  }

  const getVoluntarioNombre = (voluntarioId: string) => {
    const voluntario = voluntarios.find(v => v.id.toString() === voluntarioId)
    return voluntario ? voluntario.nombre : 'Sin asignar'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const filteredPendientes = showCompleted 
    ? pendientes 
    : pendientes.filter(item => !item.completado)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pendientes</h1>
          <p className="text-gray-600">Gestiona tus tareas y categorías pendientes</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="show-completed"
              checked={showCompleted}
              onCheckedChange={setShowCompleted}
            />
            <Label htmlFor="show-completed" className="text-sm">
              Ver completados
            </Label>
          </div>
          
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button 
                className="bg-[#4dd0e1] hover:bg-[#3bb5c7] text-white"
                onClick={() => {
                  setFormData({ descripcion: '', voluntarioAsignado: '' })
                }}
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
                  <Label htmlFor="descripcion">Descripción</Label>
                  <Textarea
                    id="descripcion"
                    placeholder="Describe la categoría..."
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="voluntario">Asignar a voluntario</Label>
                  <Select 
                    value={formData.voluntarioAsignado} 
                    onValueChange={(value) => setFormData({ ...formData, voluntarioAsignado: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un voluntario" />
                    </SelectTrigger>
                    <SelectContent>
                      {voluntarios.map(voluntario => (
                        <SelectItem key={voluntario.id} value={voluntario.id.toString()}>
                          {voluntario.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleAddCategory}
                    className="bg-[#4dd0e1] hover:bg-[#3bb5c7] text-white"
                  >
                    Crear Categoría
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Modal de Edición */}
          <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingItem?.type === 'categoria' ? 'Editar Categoría' : 'Editar Sub-categoría'}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                {editingItem?.type === 'subcategoria' && (
                  <div>
                    <Label htmlFor="edit-categoria">Categoría padre</Label>
                    <Select value={selectedCategoria} onValueChange={setSelectedCategoria}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {pendientes.map(categoria => (
                          <SelectItem key={categoria.id} value={categoria.id}>
                            {categoria.descripcion}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label htmlFor="edit-descripcion">Descripción</Label>
                  <Textarea
                    id="edit-descripcion"
                    placeholder="Describe la tarea o categoría..."
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="edit-voluntario">Asignar a voluntario</Label>
                  <Select 
                    value={formData.voluntarioAsignado} 
                    onValueChange={(value) => setFormData({ ...formData, voluntarioAsignado: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un voluntario" />
                    </SelectTrigger>
                    <SelectContent>
                      {voluntarios.map(voluntario => (
                        <SelectItem key={voluntario.id} value={voluntario.id.toString()}>
                          {voluntario.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleEditSave}
                    className="bg-[#4dd0e1] hover:bg-[#3bb5c7] text-white"
                  >
                    Guardar Cambios
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Modal para Sub-categorías */}
          <Dialog open={isSubCategoryModalOpen} onOpenChange={setIsSubCategoryModalOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Nueva Sub-categoría</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="sub-descripcion">Descripción</Label>
                  <Textarea
                    id="sub-descripcion"
                    placeholder="Describe la sub-categoría..."
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="sub-voluntario">Asignar a voluntario</Label>
                  <Select 
                    value={formData.voluntarioAsignado} 
                    onValueChange={(value) => setFormData({ ...formData, voluntarioAsignado: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un voluntario" />
                    </SelectTrigger>
                    <SelectContent>
                      {voluntarios.map(voluntario => (
                        <SelectItem key={voluntario.id} value={voluntario.id.toString()}>
                          {voluntario.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsSubCategoryModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleAddSubCategorySave}
                    className="bg-[#4dd0e1] hover:bg-[#3bb5c7] text-white"
                  >
                    Crear Sub-categoría
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Lista de Pendientes */}
      <div className="space-y-6">
        {filteredPendientes.length === 0 ? (
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
            {filteredPendientes.map(categoria => (
              <Card key={categoria.id} className={`h-fit ${categoria.completado ? 'opacity-60 bg-gray-50' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <Checkbox
                        checked={categoria.completado}
                        onCheckedChange={() => toggleCompletion(categoria.id)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <CardTitle className={`text-lg ${categoria.completado ? 'line-through text-gray-500' : ''}`}>
                          {categoria.descripcion}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-[#4dd0e1] font-medium">
                            {getVoluntarioNombre(categoria.voluntarioAsignado)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {formatDate(categoria.fechaCreacion)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {categoria.completado && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                          Completado
                        </Badge>
                      )}
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAddSubCategory(categoria.id)}
                          className="h-8 w-8 p-0 text-[#4dd0e1] hover:text-[#3bb5c7] hover:bg-[#4dd0e1]/10"
                          title="Agregar sub-categoría"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(categoria.id, 'categoria')}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(categoria.id, 'categoria')}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                {categoria.subItems.length > 0 && (
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm text-gray-700 mb-3">Sub-tareas:</h4>
                      {categoria.subItems
                        .filter(subItem => showCompleted || !subItem.completado)
                        .map(subItem => (
                          <div 
                            key={subItem.id} 
                            className={`flex items-start justify-between p-3 rounded-lg border ${
                              subItem.completado ? 'bg-gray-100 opacity-60' : 'bg-gray-50 border-gray-200'
                            }`}
                          >
                            <div className="flex items-start space-x-3 flex-1">
                              <Checkbox
                                checked={subItem.completado}
                                onCheckedChange={() => toggleCompletion(categoria.id, subItem.id)}
                                className="mt-1"
                              />
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium ${subItem.completado ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                                  {subItem.descripcion}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <User className="w-3 h-3 text-gray-500" />
                                  <span className="text-xs text-[#4dd0e1] font-medium">
                                    {getVoluntarioNombre(subItem.voluntarioAsignado)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <Calendar className="w-3 h-3 text-gray-500" />
                                  <span className="text-xs text-gray-700">
                                    {formatDate(subItem.fechaCreacion)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 ml-2">
                              {subItem.completado && (
                                <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs mr-1">
                                  Completado
                                </Badge>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(subItem.id, 'subcategoria', categoria.id)}
                                className="h-6 w-6 p-0"
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(subItem.id, 'subcategoria', categoria.id)}
                                className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
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
