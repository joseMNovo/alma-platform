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
import { Plus, Edit, Trash2, Package, AlertTriangle, TrendingUp, TrendingDown, Search, Filter, ArrowUpDown, ArrowUp, ArrowDown, ChevronUp, ChevronDown } from "lucide-react"
import ConfirmationDialog from "@/components/ui/confirmation-dialog"

// Nueva función utilitaria para determinar si un item está bajo stock según la lógica pedida
function esBajoStock(item: any) {
  // Si el stock mínimo es 1 y la cantidad es 1, NO es bajo stock
  if (item.stockMinimo === 1 && item.cantidad === 1) {
    return false
  }
  // Si el stock mínimo es 2 o más, es bajo stock si cantidad < stockMinimo
  if (item.cantidad < item.stockMinimo) {
    return true
  }
  return false
}

export default function InventarioManager({ user }: { user: any }) {
  const [inventario, setInventario] = useState<any[]>([])
  const [voluntarios, setVoluntarios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<any>(null)
  const [deleting, setDeleting] = useState(false)
  const [filters, setFilters] = useState({
    searchTerm: "",
    categoria: "todas",
    voluntario: "todos",
    stockStatus: "todos",
    precioMin: "",
    precioMax: ""
  })
  const [sortField, setSortField] = useState("")
  const [sortDirection, setSortDirection] = useState("asc")
  const [showFilters, setShowFilters] = useState(false)
  const [formData, setFormData] = useState({
    nombre: "",
    categoria: "",
    cantidad: "",
    stockMinimo: "",
    precio: "",
    proveedor: "",
    voluntarioAsignado: "sin-asignar",
  })

  const categorias = ["Material Didáctico", "Material Terapéutico", "Mobiliario", "Tecnología", "Oficina", "Limpieza"]

  useEffect(() => {
    fetchInventario()
    fetchVoluntarios()
  }, [])

  const fetchInventario = async () => {
    try {
      const response = await fetch("/api/inventario")
      const data = await response.json()
      setInventario(data)
    } catch (error) {
      console.error("Error fetching inventario:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchVoluntarios = async () => {
    try {
      const response = await fetch("/api/voluntarios")
      if (response.ok) {
        const data = await response.json()
        setVoluntarios(data)
      }
    } catch (error) {
      console.error("Error fetching voluntarios:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const method = editingItem ? "PUT" : "POST"
      const url = editingItem ? `/api/inventario?id=${editingItem.id}` : "/api/inventario"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          cantidad: Number.parseInt(formData.cantidad),
          stockMinimo: Number.parseInt(formData.stockMinimo),
          precio: formData.precio ? Number.parseFloat(formData.precio) : 0,
          proveedor: formData.proveedor || "",
          voluntarioAsignado: formData.voluntarioAsignado && formData.voluntarioAsignado !== "sin-asignar" ? Number.parseInt(formData.voluntarioAsignado) : null,
        }),
      })

      if (response.ok) {
        fetchInventario()
        setDialogOpen(false)
        resetForm()
      }
    } catch (error) {
      console.error("Error saving item:", error)
    }
  }

  const handleDeleteClick = (item: any) => {
    setItemToDelete(item)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return
    
    setDeleting(true)
    try {
      const response = await fetch(`/api/inventario?id=${itemToDelete.id}`, {
        method: "DELETE",
      })
      if (response.ok) {
        fetchInventario()
        setDeleteDialogOpen(false)
        setItemToDelete(null)
      }
    } catch (error) {
      console.error("Error deleting item:", error)
    } finally {
      setDeleting(false)
    }
  }

  const actualizarStock = async (id: any, nuevaCantidad: any) => {
    try {
      const response = await fetch(`/api/inventario?id=${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cantidad: nuevaCantidad,
        }),
      })

      if (response.ok) {
        fetchInventario()
      }
    } catch (error) {
      console.error("Error updating stock:", error)
    }
  }

  const resetForm = () => {
    setFormData({
      nombre: "",
      categoria: "",
      cantidad: "",
      stockMinimo: "",
      precio: "",
      proveedor: "",
      voluntarioAsignado: "sin-asignar",
    })
    setEditingItem(null)
  }

  const openEditDialog = (item: any) => {
    setEditingItem(item)
    setFormData({
      nombre: item.nombre,
      categoria: item.categoria,
      cantidad: item.cantidad.toString(),
      stockMinimo: item.stockMinimo.toString(),
      precio: item.precio.toString(),
      proveedor: item.proveedor,
      voluntarioAsignado: item.voluntarioAsignado?.toString() || "sin-asignar",
    })
    setDialogOpen(true)
  }

  const getVoluntarioNombre = (voluntarioId: any) => {
    const voluntario = voluntarios.find(v => v.id === voluntarioId)
    return voluntario ? voluntario.nombre : "Sin asignar"
  }

  // Función para filtrar y ordenar el inventario
  const getFilteredAndSortedInventario = () => {
    let filteredItems = [...inventario]

    // Aplicar filtros
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase()
      filteredItems = filteredItems.filter(item => 
        item.nombre.toLowerCase().includes(searchLower) ||
        item.categoria.toLowerCase().includes(searchLower) ||
        (item.proveedor && item.proveedor.toLowerCase().includes(searchLower)) ||
        getVoluntarioNombre(item.voluntarioAsignado).toLowerCase().includes(searchLower)
      )
    }

    if (filters.categoria && filters.categoria !== "todas") {
      filteredItems = filteredItems.filter(item => item.categoria === filters.categoria)
    }

    if (filters.voluntario && filters.voluntario !== "todos") {
      if (filters.voluntario === "sin-asignar") {
        filteredItems = filteredItems.filter(item => !item.voluntarioAsignado)
      } else {
        filteredItems = filteredItems.filter(item => item.voluntarioAsignado === parseInt(filters.voluntario))
      }
    }

    if (filters.stockStatus && filters.stockStatus !== "todos") {
      if (filters.stockStatus === "bajo-stock") {
        filteredItems = filteredItems.filter(item => esBajoStock(item))
      } else if (filters.stockStatus === "stock-normal") {
        filteredItems = filteredItems.filter(item => !esBajoStock(item))
      }
    }

    if (filters.precioMin) {
      const precioMin = parseFloat(filters.precioMin)
      filteredItems = filteredItems.filter(item => (item.precio || 0) >= precioMin)
    }

    if (filters.precioMax) {
      const precioMax = parseFloat(filters.precioMax)
      filteredItems = filteredItems.filter(item => (item.precio || 0) <= precioMax)
    }

    // Aplicar ordenamiento
    if (sortField) {
      filteredItems.sort((a, b) => {
        let aValue = a[sortField]
        let bValue = b[sortField]

        // Manejar casos especiales
        if (sortField === "voluntarioAsignado") {
          aValue = getVoluntarioNombre(a.voluntarioAsignado)
          bValue = getVoluntarioNombre(b.voluntarioAsignado)
        } else if (sortField === "valorTotal") {
          aValue = (a.cantidad || 0) * (a.precio || 0)
          bValue = (b.cantidad || 0) * (b.precio || 0)
        }

        // Convertir a string para comparación si no es número
        if (typeof aValue !== "number" && typeof bValue !== "number") {
          aValue = String(aValue || "").toLowerCase()
          bValue = String(bValue || "").toLowerCase()
        }

        if (aValue < bValue) return sortDirection === "asc" ? -1 : 1
        if (aValue > bValue) return sortDirection === "asc" ? 1 : -1
        return 0
      })
    }

    return filteredItems
  }

  // Función para manejar el ordenamiento
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  // Función para limpiar filtros
  const clearFilters = () => {
    setFilters({
      searchTerm: "",
      categoria: "todas",
      voluntario: "todos",
      stockStatus: "todos",
      precioMin: "",
      precioMax: ""
    })
    setSortField("")
    setSortDirection("asc")
  }

  // Cambiado: ahora usamos la función esBajoStock para filtrar
  const itemsBajoStock = inventario.filter(esBajoStock)
  const valorTotalInventario = inventario.reduce((total, item) => total + (item.cantidad * (item.precio || 0)), 0)
  
  // Obtener items filtrados y ordenados
  const filteredInventario = getFilteredAndSortedInventario()

  // Verificar si hay filtros activos
  const hasActiveFilters = 
    filters.searchTerm !== "" ||
    filters.categoria !== "todas" ||
    filters.voluntario !== "todos" ||
    filters.stockStatus !== "todos" ||
    filters.precioMin !== "" ||
    filters.precioMax !== "" ||
    sortField !== ""

  if (loading) {
    return <div className="text-center py-8">Cargando inventario...</div>
  }

  return (
    <div className="space-y-6 px-4 sm:px-0">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="text-center sm:text-left">
          <h2 className="text-2xl font-bold text-gray-900">Inventario</h2>
          <p className="text-gray-600">Gestión de materiales y recursos</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={`w-full sm:w-auto flex items-center justify-center gap-2 relative ${hasActiveFilters ? 'border-[#4dd0e1] text-[#4dd0e1]' : ''}`}
          >
            <Filter className="w-4 h-4" />
            {showFilters ? (
              <>
                <ChevronUp className="w-4 h-4" />
                <span className="hidden sm:inline">Ocultar Filtros</span>
                <span className="sm:hidden">Ocultar</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                <span className="hidden sm:inline">Mostrar Filtros</span>
                <span className="sm:hidden">Filtros</span>
              </>
            )}
            {hasActiveFilters && !showFilters && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#4dd0e1] rounded-full"></div>
            )}
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="w-full sm:w-auto bg-[#4dd0e1] hover:bg-[#3bc0d1] text-white">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md mx-4 sm:mx-0 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingItem ? "Editar Item" : "Nuevo Item"}</DialogTitle>
              <DialogDescription>
                {editingItem ? "Modifica los datos del item" : "Agrega un nuevo item al inventario"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre del Item</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="categoria">Categoría</Label>
                <Select
                  value={formData.categoria}
                  onValueChange={(value) => setFormData({ ...formData, categoria: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map((categoria) => (
                      <SelectItem key={categoria} value={categoria}>
                        {categoria}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cantidad">Cantidad</Label>
                  <Input
                    id="cantidad"
                    type="number"
                    value={formData.cantidad}
                    onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stockMinimo">Stock Mínimo</Label>
                  <Input
                    id="stockMinimo"
                    type="number"
                    value={formData.stockMinimo}
                    onChange={(e) => setFormData({ ...formData, stockMinimo: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="precio">Precio Unitario ($) <span className="text-gray-400">(opcional)</span></Label>
                <Input
                  id="precio"
                  type="number"
                  step="0.01"
                  value={formData.precio}
                  onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="proveedor">Proveedor <span className="text-gray-400">(opcional)</span></Label>
                <Input
                  id="proveedor"
                  value={formData.proveedor}
                  onChange={(e) => setFormData({ ...formData, proveedor: e.target.value })}
                  placeholder="Nombre del proveedor"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="voluntarioAsignado">Voluntario Asignado</Label>
                <Select value={formData.voluntarioAsignado} onValueChange={(value) => setFormData({...formData, voluntarioAsignado: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar voluntario" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sin-asignar">Sin asignar</SelectItem>
                    {voluntarios.map((voluntario) => (
                      <SelectItem key={voluntario.id} value={voluntario.id.toString()}>
                        {voluntario.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="submit" className="bg-[#4dd0e1] hover:bg-[#3bc0d1] text-white">
                  {editingItem ? "Actualizar" : "Agregar"} Item
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filtros y Ordenamiento */}
      {showFilters && (
        <Card className="bg-gray-50 border-gray-200 mx-4 sm:mx-0">
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="flex items-center text-lg">
            <Filter className="w-5 h-5 mr-2 text-[#4dd0e1]" />
            Filtros y Ordenamiento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-4 sm:px-6">
          {/* Fila 1: Búsqueda general */}
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Búsqueda General</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="search"
                  placeholder="Buscar por nombre, categoría, proveedor..."
                  value={filters.searchTerm}
                  onChange={(e) => setFilters({...filters, searchTerm: e.target.value})}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="categoria-filter">Categoría</Label>
              <Select value={filters.categoria} onValueChange={(value) => setFilters({...filters, categoria: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las categorías" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las categorías</SelectItem>
                  {categorias.map((categoria) => (
                    <SelectItem key={categoria} value={categoria}>
                      {categoria}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="voluntario-filter">Voluntario</Label>
              <Select value={filters.voluntario} onValueChange={(value) => setFilters({...filters, voluntario: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los voluntarios" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los voluntarios</SelectItem>
                  <SelectItem value="sin-asignar">Sin asignar</SelectItem>
                  {voluntarios.map((voluntario) => (
                    <SelectItem key={voluntario.id} value={voluntario.id.toString()}>
                      {voluntario.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Fila 2: Filtros específicos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stock-status">Estado de Stock</Label>
              <Select value={filters.stockStatus} onValueChange={(value) => setFilters({...filters, stockStatus: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los estados</SelectItem>
                  <SelectItem value="stock-normal">Stock Normal</SelectItem>
                  <SelectItem value="bajo-stock">Bajo Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="precio-min">Precio Mínimo</Label>
              <Input
                id="precio-min"
                type="number"
                placeholder="0"
                value={filters.precioMin}
                onChange={(e) => setFilters({...filters, precioMin: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="precio-max">Precio Máximo</Label>
              <Input
                id="precio-max"
                type="number"
                placeholder="Sin límite"
                value={filters.precioMax}
                onChange={(e) => setFilters({...filters, precioMax: e.target.value})}
              />
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={clearFilters}
                className="w-full"
              >
                Limpiar Filtros
              </Button>
            </div>
          </div>

          {/* Ordenamiento */}
          <div className="space-y-3">
            <Label>Ordenar por:</Label>
            <div className="flex flex-wrap gap-2">
              {[
                { field: "nombre", label: "Nombre" },
                { field: "categoria", label: "Categoría" },
                { field: "cantidad", label: "Cantidad" },
                { field: "precio", label: "Precio" },
                { field: "voluntarioAsignado", label: "Voluntario" },
                { field: "valorTotal", label: "Valor Total" }
              ].map(({ field, label }) => (
                <Button
                  key={field}
                  variant={sortField === field ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleSort(field)}
                  className={`flex items-center gap-1 ${sortField === field ? 'bg-[#4dd0e1] hover:bg-[#3bc0d1]' : ''}`}
                >
                  {label}
                  {sortField === field && (
                    sortDirection === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                  )}
                  {sortField !== field && <ArrowUpDown className="w-3 h-3" />}
                </Button>
              ))}
            </div>
          </div>

          {/* Información de resultados */}
          <div className="text-sm text-gray-600 pt-2 border-t">
            Mostrando {filteredInventario.length} de {inventario.length} items
          </div>
        </CardContent>
      </Card>
      )}

      {/* Resumen de filtros activos cuando está oculto */}
      {!showFilters && hasActiveFilters && (
        <Card className="bg-blue-50 border-blue-200 mx-4 sm:mx-0">
          <CardContent className="pt-4 px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-blue-800">
                  Filtros activos: {filteredInventario.length} de {inventario.length} items
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(true)}
                className="text-blue-600 hover:text-blue-800 self-end sm:self-auto"
              >
                Ver filtros
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resumen del Inventario */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 px-4 sm:px-0">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#4dd0e1]">{inventario.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Items Bajo Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{itemsBajoStock.length}</div>
          </CardContent>
        </Card>
        {valorTotalInventario > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Valor Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">${valorTotalInventario.toLocaleString()}</div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Alertas de Stock Bajo */}
      {itemsBajoStock.length > 1 && (
        <Card className="border-red-200 bg-red-50 mx-4 sm:mx-0">
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="text-red-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Alertas de Stock Bajo
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <div className="space-y-2">
              {itemsBajoStock.map((item) => (
                <div key={item.id} className="flex justify-between items-center text-sm">
                  <span className="font-medium truncate">{item.nombre}</span>
                  <span className="text-red-600 text-xs sm:text-sm">
                    Stock: {item.cantidad} (Mín: {item.stockMinimo})
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Items */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 px-4 sm:px-0">
        {filteredInventario.map((item) => (
          <Card key={item.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{item.nombre}</CardTitle>
                  <CardDescription>{item.categoria}</CardDescription>
                </div>
                {/* Cambiado: mostrar "Stock Bajo" solo si esBajoStock(item) */}
                {esBajoStock(item) && (
                  <Badge variant="destructive" className="bg-red-500">
                    Stock Bajo
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Cantidad:</span>
                  <span className="font-medium">{item.cantidad}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Stock Mínimo:</span>
                  <span className="font-medium">{item.stockMinimo}</span>
                </div>
                {item.precio > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Precio Unitario:</span>
                    <span className="font-medium">${item.precio.toLocaleString()}</span>
                  </div>
                )}
                {item.precio > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Valor Total:</span>
                    <span className="font-medium text-[#4dd0e1]">${(item.cantidad * item.precio).toLocaleString()}</span>
                  </div>
                )}
                {item.proveedor && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Proveedor:</span>
                    <span className="font-medium text-xs">{item.proveedor}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Voluntario:</span>
                  <span className={`font-medium text-xs ${item.voluntarioAsignado ? 'text-[#4dd0e1]' : 'text-gray-400'}`}>
                    {getVoluntarioNombre(item.voluntarioAsignado)}
                  </span>
                </div>
              </div>

              {/* Controles de Stock */}
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => actualizarStock(item.id, Math.max(0, item.cantidad - 1))}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  disabled={item.cantidad === 0}
                >
                  <TrendingDown className="w-4 h-4 mr-1" />
                  -1
                </Button>
                <Button
                  onClick={() => actualizarStock(item.id, item.cantidad + 1)}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  <TrendingUp className="w-4 h-4 mr-1" />
                  +1
                </Button>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => openEditDialog(item)} variant="outline" size="sm" className="flex-1">
                  <Edit className="w-4 h-4 mr-1" />
                  Editar
                </Button>
                <Button
                  onClick={() => handleDeleteClick(item)}
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

      {filteredInventario.length === 0 && inventario.length > 0 && (
        <div className="text-center py-12 px-4">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron items</h3>
          <p className="text-gray-600">Intenta ajustar los filtros para ver más resultados.</p>
        </div>
      )}

      {inventario.length === 0 && (
        <div className="text-center py-12 px-4">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay items en el inventario</h3>
          <p className="text-gray-600">Agrega el primer item para comenzar a gestionar el inventario.</p>
        </div>
      )}

      {/* Diálogo de confirmación para eliminar */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        itemName={itemToDelete && typeof itemToDelete === "object" ? (itemToDelete as any).nombre : undefined}
        itemType="inventario"
        action="delete"
        loading={deleting}
      />
    </div>
  )
}
