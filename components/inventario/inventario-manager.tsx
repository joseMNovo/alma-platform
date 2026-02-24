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
import { Plus, Edit, Trash2, Package, AlertTriangle, Search, Filter, ArrowUp, ArrowDown, ArrowUpDown, ChevronUp, ChevronDown } from "lucide-react"
import ConfirmationDialog from "@/components/ui/confirmation-dialog"

function isLowStock(item: any) {
  if (item.minimum_stock === 1 && item.quantity === 1) return false
  if (item.quantity < item.minimum_stock) return true
  return false
}

export default function InventarioManager({ user }: { user: any }) {
  const [inventory, setInventory] = useState<any[]>([])
  const [volunteers, setVolunteers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<any>(null)
  const [deleting, setDeleting] = useState(false)
  const [filters, setFilters] = useState({
    searchTerm: "",
    category: "todas",
    volunteer: "todos",
    stockStatus: "todos",
    priceMin: "",
    priceMax: "",
  })
  const [sortField, setSortField] = useState("")
  const [sortDirection, setSortDirection] = useState("asc")
  const [showFilters, setShowFilters] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    quantity: "",
    minimum_stock: "",
    price: "",
    supplier: "",
    assigned_volunteer_id: "sin-asignar",
  })

  const categories = ["Material Didáctico", "Material Terapéutico", "Mobiliario", "Tecnología", "Oficina", "Limpieza", "Merchandising"]

  useEffect(() => {
    fetchInventory()
    fetchVolunteers()
  }, [])

  const fetchInventory = async () => {
    try {
      const response = await fetch("/api/inventario")
      const data = await response.json()
      setInventory(data)
    } catch (error) {
      console.error("Error fetching inventario:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchVolunteers = async () => {
    try {
      const response = await fetch("/api/voluntarios")
      if (response.ok) {
        const data = await response.json()
        setVolunteers(data)
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          quantity: Number.parseInt(formData.quantity),
          minimum_stock: Number.parseInt(formData.minimum_stock),
          price: formData.price ? Number.parseFloat(formData.price) : 0,
          supplier: formData.supplier || "",
          assigned_volunteer_id:
            formData.assigned_volunteer_id && formData.assigned_volunteer_id !== "sin-asignar"
              ? Number.parseInt(formData.assigned_volunteer_id)
              : null,
        }),
      })

      if (response.ok) {
        fetchInventory()
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
      const response = await fetch(`/api/inventario?id=${itemToDelete.id}`, { method: "DELETE" })
      if (response.ok) {
        fetchInventory()
        setDeleteDialogOpen(false)
        setItemToDelete(null)
      }
    } catch (error) {
      console.error("Error deleting item:", error)
    } finally {
      setDeleting(false)
    }
  }

  const updateStock = async (id: any, newQuantity: any) => {
    try {
      const response = await fetch(`/api/inventario?id=${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: newQuantity }),
      })
      if (response.ok) fetchInventory()
    } catch (error) {
      console.error("Error updating stock:", error)
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      category: "",
      quantity: "",
      minimum_stock: "",
      price: "",
      supplier: "",
      assigned_volunteer_id: "sin-asignar",
    })
    setEditingItem(null)
  }

  const openEditDialog = (item: any) => {
    setEditingItem(item)
    setFormData({
      name: item.name,
      category: item.category,
      quantity: item.quantity.toString(),
      minimum_stock: item.minimum_stock.toString(),
      price: item.price.toString(),
      supplier: item.supplier,
      assigned_volunteer_id: item.assigned_volunteer_id?.toString() || "sin-asignar",
    })
    setDialogOpen(true)
  }

  const getVolunteerName = (volunteerId: any) => {
    const volunteer = volunteers.find((v) => v.id === volunteerId)
    return volunteer ? volunteer.name : "Sin asignar"
  }

  const getFilteredAndSortedInventory = () => {
    let filtered = [...inventory]

    if (filters.searchTerm) {
      const search = filters.searchTerm.toLowerCase()
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(search) ||
          item.category?.toLowerCase().includes(search) ||
          (item.supplier && item.supplier.toLowerCase().includes(search)) ||
          getVolunteerName(item.assigned_volunteer_id).toLowerCase().includes(search)
      )
    }

    if (filters.category && filters.category !== "todas") {
      filtered = filtered.filter((item) => item.category === filters.category)
    }

    if (filters.volunteer && filters.volunteer !== "todos") {
      if (filters.volunteer === "sin-asignar") {
        filtered = filtered.filter((item) => !item.assigned_volunteer_id)
      } else {
        filtered = filtered.filter((item) => item.assigned_volunteer_id === parseInt(filters.volunteer))
      }
    }

    if (filters.stockStatus !== "todos") {
      if (filters.stockStatus === "bajo-stock") {
        filtered = filtered.filter(isLowStock)
      } else if (filters.stockStatus === "stock-normal") {
        filtered = filtered.filter((item) => !isLowStock(item))
      }
    }

    if (filters.priceMin) {
      filtered = filtered.filter((item) => (item.price || 0) >= parseFloat(filters.priceMin))
    }
    if (filters.priceMax) {
      filtered = filtered.filter((item) => (item.price || 0) <= parseFloat(filters.priceMax))
    }

    if (sortField) {
      filtered.sort((a, b) => {
        let aVal = a[sortField]
        let bVal = b[sortField]

        if (sortField === "assigned_volunteer_id") {
          aVal = getVolunteerName(a.assigned_volunteer_id)
          bVal = getVolunteerName(b.assigned_volunteer_id)
        } else if (sortField === "totalValue") {
          aVal = (a.quantity || 0) * (a.price || 0)
          bVal = (b.quantity || 0) * (b.price || 0)
        }

        if (typeof aVal !== "number" || typeof bVal !== "number") {
          aVal = String(aVal || "").toLowerCase()
          bVal = String(bVal || "").toLowerCase()
        }

        if (aVal < bVal) return sortDirection === "asc" ? -1 : 1
        if (aVal > bVal) return sortDirection === "asc" ? 1 : -1
        return 0
      })
    }

    return filtered
  }

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const clearFilters = () => {
    setFilters({ searchTerm: "", category: "todas", volunteer: "todos", stockStatus: "todos", priceMin: "", priceMax: "" })
    setSortField("")
    setSortDirection("asc")
  }

  const lowStockItems = inventory.filter(isLowStock)
  const totalInventoryValue = inventory.reduce((total, item) => total + item.quantity * (item.price || 0), 0)
  const filteredInventory = getFilteredAndSortedInventory()

  const hasActiveFilters =
    filters.searchTerm !== "" ||
    filters.category !== "todas" ||
    filters.volunteer !== "todos" ||
    filters.stockStatus !== "todos" ||
    filters.priceMin !== "" ||
    filters.priceMax !== "" ||
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
            className={`w-full sm:w-auto flex items-center justify-center gap-2 relative ${hasActiveFilters ? "border-[#4dd0e1] text-[#4dd0e1]" : ""}`}
          >
            <Filter className="w-4 h-4" />
            {showFilters ? (
              <><ChevronUp className="w-4 h-4" /><span className="hidden sm:inline">Ocultar filtros</span><span className="sm:hidden">Ocultar</span></>
            ) : (
              <><ChevronDown className="w-4 h-4" /><span className="hidden sm:inline">Mostrar filtros</span><span className="sm:hidden">Filtros</span></>
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
                  <Label htmlFor="name">Nombre del item</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Categoría</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Cantidad</Label>
                    <Input
                      id="quantity"
                      type="number"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="minimum_stock">Stock mínimo</Label>
                    <Input
                      id="minimum_stock"
                      type="number"
                      value={formData.minimum_stock}
                      onChange={(e) => setFormData({ ...formData, minimum_stock: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Precio unitario ($) <span className="text-gray-400">(opcional)</span></Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplier">Proveedor <span className="text-gray-400">(opcional)</span></Label>
                  <Input
                    id="supplier"
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    placeholder="Nombre del proveedor"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assigned_volunteer_id">Voluntario asignado</Label>
                  <Select
                    value={formData.assigned_volunteer_id}
                    onValueChange={(value) => setFormData({ ...formData, assigned_volunteer_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar voluntario" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sin-asignar">Sin asignar</SelectItem>
                      {volunteers.map((volunteer) => (
                        <SelectItem key={volunteer.id} value={volunteer.id.toString()}>
                          {volunteer.name}
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

      {/* Filters */}
      {showFilters && (
        <Card className="bg-gray-50 border-gray-200 mx-4 sm:mx-0">
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="flex items-center text-lg">
              <Filter className="w-5 h-5 mr-2 text-[#4dd0e1]" />
              Filtros y ordenamiento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-4 sm:px-6">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label>Búsqueda general</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Buscar por nombre, categoría, proveedor..."
                    value={filters.searchTerm}
                    onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select value={filters.category} onValueChange={(value) => setFilters({ ...filters, category: value })}>
                  <SelectTrigger><SelectValue placeholder="Todas las categorías" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas las categorías</SelectItem>
                    {categories.map((cat) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Voluntario</Label>
                <Select value={filters.volunteer} onValueChange={(value) => setFilters({ ...filters, volunteer: value })}>
                  <SelectTrigger><SelectValue placeholder="Todos los voluntarios" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los voluntarios</SelectItem>
                    <SelectItem value="sin-asignar">Sin asignar</SelectItem>
                    {volunteers.map((v) => (
                      <SelectItem key={v.id} value={v.id.toString()}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Estado de stock</Label>
                <Select value={filters.stockStatus} onValueChange={(value) => setFilters({ ...filters, stockStatus: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los estados</SelectItem>
                    <SelectItem value="stock-normal">Stock normal</SelectItem>
                    <SelectItem value="bajo-stock">Bajo stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Precio mínimo</Label>
                <Input type="number" placeholder="0" value={filters.priceMin} onChange={(e) => setFilters({ ...filters, priceMin: e.target.value })} />
              </div>

              <div className="space-y-2">
                <Label>Precio máximo</Label>
                <Input type="number" placeholder="Sin límite" value={filters.priceMax} onChange={(e) => setFilters({ ...filters, priceMax: e.target.value })} />
              </div>

              <div className="flex items-end">
                <Button variant="outline" onClick={clearFilters} className="w-full">Limpiar filtros</Button>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Ordenar por:</Label>
              <div className="flex flex-wrap gap-2">
                {[
                  { field: "name", label: "Nombre" },
                  { field: "category", label: "Categoría" },
                  { field: "quantity", label: "Cantidad" },
                  { field: "price", label: "Precio" },
                  { field: "assigned_volunteer_id", label: "Voluntario" },
                  { field: "totalValue", label: "Valor Total" },
                ].map(({ field, label }) => (
                  <Button
                    key={field}
                    variant={sortField === field ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleSort(field)}
                    className={`flex items-center gap-1 ${sortField === field ? "bg-[#4dd0e1] hover:bg-[#3bc0d1]" : ""}`}
                  >
                    {label}
                    {sortField === field ? (
                      sortDirection === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3" />
                    )}
                  </Button>
                ))}
              </div>
            </div>

            <div className="text-sm text-gray-600 pt-2 border-t">
              Mostrando {filteredInventory.length} de {inventory.length} items
            </div>
          </CardContent>
        </Card>
      )}

      {!showFilters && hasActiveFilters && (
        <Card className="bg-blue-50 border-blue-200 mx-4 sm:mx-0">
          <CardContent className="pt-4 px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-blue-800">
                  Filtros activos: {filteredInventory.length} de {inventory.length} items
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowFilters(true)} className="text-blue-600 hover:text-blue-800 self-end sm:self-auto">
                Ver filtros
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 px-4 sm:px-0">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#4dd0e1]">{inventory.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Items bajo stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{lowStockItems.length}</div>
          </CardContent>
        </Card>
        {totalInventoryValue > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Valor total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">${totalInventoryValue.toLocaleString()}</div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Low stock alerts */}
      {lowStockItems.length > 1 && (
        <Card className="border-red-200 bg-red-50 mx-4 sm:mx-0">
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="text-red-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Alertas de stock bajo
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <div className="space-y-2">
              {lowStockItems.map((item) => (
                <div key={item.id} className="flex justify-between items-center text-sm">
                  <span className="font-medium truncate">{item.name}</span>
                  <span className="text-red-600 text-xs sm:text-sm">
                    Stock: {item.quantity} (Mín: {item.minimum_stock})
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Item list */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 px-4 sm:px-0">
        {filteredInventory.map((item) => (
          <Card key={item.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{item.name}</CardTitle>
                  <CardDescription>{item.category}</CardDescription>
                </div>
                {isLowStock(item) && (
                  <Badge variant="destructive" className="bg-red-500">Stock bajo</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Cantidad:</span>
                  <span className="font-medium">{item.quantity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Stock mínimo:</span>
                  <span className="font-medium">{item.minimum_stock}</span>
                </div>
                {item.price > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Precio unitario:</span>
                    <span className="font-medium">${item.price.toLocaleString()}</span>
                  </div>
                )}
                {item.price > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Valor total:</span>
                    <span className="font-medium text-[#4dd0e1]">${(item.quantity * item.price).toLocaleString()}</span>
                  </div>
                )}
                {item.supplier && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Proveedor:</span>
                    <span className="font-medium text-xs">{item.supplier}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Voluntario:</span>
                  <span className={`font-medium text-xs ${item.assigned_volunteer_id ? "text-[#4dd0e1]" : "text-gray-400"}`}>
                    {getVolunteerName(item.assigned_volunteer_id)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => updateStock(item.id, Math.max(0, item.quantity - 1))}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  disabled={item.quantity === 0}
                >
                  -1
                </Button>
                <Button
                  onClick={() => updateStock(item.id, item.quantity + 1)}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
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

      {filteredInventory.length === 0 && inventory.length > 0 && (
        <div className="text-center py-12 px-4">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron items</h3>
          <p className="text-gray-600">Intenta ajustar los filtros para ver más resultados.</p>
        </div>
      )}

      {inventory.length === 0 && (
        <div className="text-center py-12 px-4">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay items en el inventario</h3>
          <p className="text-gray-600">Agrega el primer item para comenzar a gestionar el inventario.</p>
        </div>
      )}

      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        itemName={itemToDelete?.name}
        itemType="inventario"
        action="delete"
        loading={deleting}
      />
    </div>
  )
}
