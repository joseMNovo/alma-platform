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
import { Plus, Edit, Trash2, Package, AlertTriangle, Search, ArrowUp, ArrowDown, ArrowUpDown, ChevronDown, X, SlidersHorizontal } from "lucide-react"
import ConfirmationDialog from "@/components/ui/confirmation-dialog"
import FilterChip from "@/components/ui/filter-chip"
import SelectorBuscable from "@/components/ui/selector-buscable"
import { toast } from "@/hooks/use-toast"

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
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [filters, setFilters] = useState({
    searchTerm: "",
    category: "todas",
    volunteer: "todos",
    stockStatus: "todos",
    priceMin: "",
    priceMax: "",
    // "En venta" es un filtro, no una sub-pestaña: partir la lista en dos
    // parte también la búsqueda, y buscás "mates" en la mitad equivocada y
    // concluís que no está cargado.
    forSale: "todos",
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
    // Atrás no es una columna de inventario: tildarlo crea la fila en la
    // góndola del puesto de venta. Acá es un check y nada más, que es como
    // se piensa el problema.
    for_sale: false,
    sale_price: "",
  })

  const categories = ["Material Didáctico", "Material Terapéutico", "Mobiliario", "Tecnología", "Oficina", "Limpieza", "Merchandising"]
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const touch = (f: string) => setTouched(t => ({ ...t, [f]: true }))

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
    if (!formData.name.trim()) {
      toast({ title: "Campo requerido", description: "El nombre del item es obligatorio", variant: "destructive" })
      touch("name"); document.getElementById("inv-name")?.focus()
      return
    }
    if (!formData.category) {
      toast({ title: "Campo requerido", description: "La categoría es obligatoria", variant: "destructive" })
      touch("category"); document.getElementById("inv-category")?.focus()
      return
    }
    if (formData.quantity === "") {
      toast({ title: "Campo requerido", description: "La cantidad es obligatoria", variant: "destructive" })
      touch("quantity"); document.getElementById("inv-quantity")?.focus()
      return
    }
    if (formData.minimum_stock === "") {
      toast({ title: "Campo requerido", description: "El stock mínimo es obligatorio", variant: "destructive" })
      touch("minimum_stock"); document.getElementById("inv-minimum_stock")?.focus()
      return
    }
    // Un producto en góndola sin precio se cobra $0 y la caja no cierra.
    if (formData.for_sale && !(Number.parseFloat(formData.sale_price) > 0)) {
      toast({ title: "Falta el precio de venta", description: "Un ítem a la venta necesita a cuánto se vende", variant: "destructive" })
      touch("sale_price"); document.getElementById("inv-sale_price")?.focus()
      return
    }
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
          sale_price: formData.sale_price ? Number.parseFloat(formData.sale_price) : null,
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
      } else {
        const data = await response.json().catch(() => ({}))
        toast({ title: "Error al guardar", description: data.error || "No se pudo guardar el item", variant: "destructive" })
      }
    } catch {
      toast({ title: "Error de conexión", description: "No se pudo conectar con el servidor", variant: "destructive" })
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
      } else {
        // Antes el diálogo se quedaba abierto sin decir nada y parecía colgado.
        // El caso más común ahora es el 409 de un ítem que está en el puesto
        // de venta, que además explica cómo salir.
        const data = await response.json().catch(() => ({}))
        toast({
          title: "No se pudo borrar",
          description: data.error || "Intentá de nuevo en un momento",
          variant: "destructive",
        })
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
      for_sale: false,
      sale_price: "",
    })
    setEditingItem(null)
    setTouched({})
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
      for_sale: !!item.for_sale,
      // El backend devuelve el precio aunque esté fuera de la góndola, así que
      // volver a ponerlo a la venta no obliga a acordarse de a cuánto era.
      sale_price: item.sale_price != null ? String(item.sale_price) : "",
    })
    setDialogOpen(true)
  }

  const getVolunteerName = (volunteerId: any) => {
    const volunteer = volunteers.find((v) => v.id === volunteerId)
    if (!volunteer) return "Sin asignar"
    // Nombre y apellido: con solo el nombre de pila, dos "María" son la misma
    // persona en pantalla — y la búsqueda por apellido no encontraba nada.
    return `${volunteer.name || ""} ${volunteer.last_name || ""}`.trim() || "Sin asignar"
  }

  const getFilteredAndSortedInventory = () => {
    let filtered = [...inventory]

    if (filters.searchTerm) {
      const search = filters.searchTerm.toLowerCase()
      filtered = filtered.filter(
        (item) =>
          // Proveedor salió de la búsqueda junto con el campo: si no se ve en
          // ningún lado, un ítem que aparece "porque sí" hace desconfiar del
          // buscador entero.
          item.name.toLowerCase().includes(search) ||
          item.category?.toLowerCase().includes(search) ||
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

    // Solo "bajo stock". La opción inversa ("stock normal") existía en el
    // desplegable viejo y nadie filtra por "lo que está bien": el que entra
    // acá viene a buscar lo que falta.
    if (filters.stockStatus === "bajo-stock") {
      filtered = filtered.filter(isLowStock)
    }

    if (filters.forSale !== "todos") {
      filtered = filtered.filter((item) =>
        filters.forSale === "en-venta" ? !!item.for_sale : !item.for_sale,
      )
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

  /** Chips de un toque: volver a tocar el que ya está activo lo apaga.
   *  Sin esto habría que abrir un desplegable para deshacer un click. */
  const alternar = (campo: "stockStatus" | "forSale" | "volunteer", valor: string) =>
    setFilters((f) => ({ ...f, [campo]: f[campo] === valor ? "todos" : valor }))

  const clearFilters = () => {
    setFilters({ searchTerm: "", category: "todas", volunteer: "todos", stockStatus: "todos", priceMin: "", priceMax: "", forSale: "todos" })
    setSortField("")
    setSortDirection("asc")
  }

  const lowStockItems = inventory.filter(isLowStock)
  const enVentaItems = inventory.filter((item) => item.for_sale)
  const filteredInventory = getFilteredAndSortedInventory()

  const hasActiveFilters =
    filters.searchTerm !== "" ||
    filters.category !== "todas" ||
    filters.volunteer !== "todos" ||
    filters.stockStatus !== "todos" ||
    filters.priceMin !== "" ||
    filters.priceMax !== "" ||
    filters.forSale !== "todos" ||
    sortField !== ""

  /** Lo que vive detrás de "Más filtros". Se mira aparte para poder marcar el
   *  botón cuando hay algo activo que no se está viendo. */
  const hayFiltrosAvanzados =
    (filters.volunteer !== "todos" && filters.volunteer !== "sin-asignar") ||
    filters.priceMin !== "" ||
    filters.priceMax !== "" ||
    sortField !== ""

  if (loading) {
    return <div className="text-center py-8">Cargando inventario...</div>
  }

  return (
    <div className="space-y-4 px-4 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div className="text-center sm:text-left">
          <h2 className="text-2xl font-bold text-gray-900">Inventario</h2>
          <p className="text-sm text-gray-500">Gestión de materiales y recursos</p>
        </div>
        {/* Ya no hay botón de "Mostrar filtros": el buscador está siempre a la
            vista, que es el 90% de las veces que alguien venía a tocar acá. */}
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm} className="w-full sm:w-auto bg-[#4dd0e1] hover:bg-[#3bc0d1] text-white">
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Item
              </Button>
            </DialogTrigger>
            {/* Dos columnas.
                Antes era una columna de siete campos que no entraba en la
                pantalla: había que scrollear adentro del modal para llegar al
                botón, y en el celular quien llenaba el formulario no veía nunca
                cuánto le faltaba. Emparejar los campos cortos —cantidad con
                mínimo, los dos precios— lo baja a cuatro renglones.

                El `max-h-[90vh] overflow-y-auto` se queda, igual que en los
                otros modales de la app. No era eso lo que hacía scrollear
                —era el contenido de más—: es la red para una pantalla baja o
                un celular en horizontal. El DialogContent base no trae tope de
                alto, así que sin esto el modal se sale del viewport y el botón
                de guardar queda inalcanzable, que es peor que una barrita.

                Proveedor salió de la vista por pedido: NO se borró. Sigue en
                `formData` y se sigue mandando, así que el dato de los ítems
                que ya lo tenían cargado no se pierde al editarlos. */}
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingItem ? "Editar item" : "Nuevo item"}</DialogTitle>
                <DialogDescription>
                  {editingItem ? "Modificá los datos del item" : "Agregá un nuevo item al inventario"}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} noValidate className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="inv-name" className="text-xs">Nombre *</Label>
                  <Input
                    id="inv-name"
                    className="h-9"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    onBlur={() => touch("name")}
                  />
                  {touched.name && !formData.name.trim() && (
                    <p className="text-xs text-red-500">El nombre es requerido</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="inv-category" className="text-xs">Categoría *</Label>
                    <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                      <SelectTrigger id="inv-category" className="h-9">
                        <SelectValue placeholder="Elegir…" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="inv-volunteer" className="text-xs">Voluntario asignado</Label>
                    <SelectorBuscable
                      id="inv-volunteer"
                      className="h-9"
                      valor={formData.assigned_volunteer_id}
                      onChange={(v) => setFormData({ ...formData, assigned_volunteer_id: v })}
                      opciones={[
                        { valor: "sin-asignar", texto: "Sin asignar" },
                        ...volunteers.map((v: any) => ({
                          valor: v.id.toString(),
                          texto: `${v.name || ""} ${v.last_name || ""}`.trim() || "(sin nombre)",
                        })),
                      ]}
                      placeholder="Sin asignar"
                      textoBusqueda="Buscar voluntario…"
                      sinResultados="Ningún voluntario con ese nombre"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="inv-quantity" className="text-xs">Cantidad *</Label>
                    <Input
                      id="inv-quantity"
                      type="number"
                      className="h-9"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      onBlur={() => touch("quantity")}
                    />
                    {touched.quantity && formData.quantity === "" && (
                      <p className="text-xs text-red-500">Requerida</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="inv-minimum_stock" className="text-xs">Stock mínimo *</Label>
                    <Input
                      id="inv-minimum_stock"
                      type="number"
                      className="h-9"
                      value={formData.minimum_stock}
                      onChange={(e) => setFormData({ ...formData, minimum_stock: e.target.value })}
                      onBlur={() => touch("minimum_stock")}
                    />
                    {touched.minimum_stock && formData.minimum_stock === "" && (
                      <p className="text-xs text-red-500">Requerido</p>
                    )}
                  </div>
                </div>

                {/* Los dos precios juntos, que es justo donde se confunden: el
                    de la izquierda es cuanto vale, el de la derecha a cuanto se
                    vende. Uno al lado del otro la diferencia se ve sola. */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="price" className="text-xs">
                      Valor unitario ($) <span className="text-gray-400">(opcional)</span>
                    </Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      className="h-9"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  {formData.for_sale && (
                    <div className="space-y-1.5">
                      <Label htmlFor="inv-sale_price" className="text-xs">Precio de venta ($) *</Label>
                      <Input
                        id="inv-sale_price"
                        type="number"
                        step="0.01"
                        className="h-9"
                        value={formData.sale_price}
                        onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
                        onBlur={() => touch("sale_price")}
                        placeholder="0"
                      />
                      {touched.sale_price && !(Number.parseFloat(formData.sale_price) > 0) && (
                        <p className="text-xs text-red-500">Necesita precio</p>
                      )}
                    </div>
                  )}
                </div>

                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 shrink-0 accent-[#4dd0e1]"
                    checked={formData.for_sale}
                    onChange={(e) => setFormData({ ...formData, for_sale: e.target.checked })}
                  />
                  <span className="text-sm font-medium text-gray-700">Para vender</span>
                  <span className="text-xs text-gray-500">· aparece en el puesto y descuenta stock</span>
                </label>

                <DialogFooter className="gap-2 sm:gap-0">
                  <p className="mr-auto self-center text-xs text-gray-400">* Obligatorios</p>
                  <Button type="submit" className="bg-[#4dd0e1] hover:bg-[#3bc0d1] text-white">
                    {editingItem ? "Guardar" : "Agregar"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Barra de filtros.
          Antes esto era una tarjeta con encabezado, siete controles apilados y
          una fila de seis botones de orden: ocupaba la pantalla entera antes de
          dejar ver un solo ítem, y el buscador —lo único que se usa siempre—
          estaba escondido detrás de un botón.

          Es el mismo patrón que Personas y Voluntarios: buscar a la vista, los
          cortes de todos los días como chips, y lo que se usa una vez cada
          tanto detrás de "Más filtros".

          Lo único que se sacó es la opción "stock normal": nadie filtra por
          lo que está bien. Todo el resto sigue estando. */}
      <div className="space-y-2">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Buscar por nombre, categoría o voluntario…"
              value={filters.searchTerm}
              onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
              className="pl-9"
            />
            {!!filters.searchTerm && (
              <button
                onClick={() => setFilters({ ...filters, searchTerm: "" })}
                aria-label="Borrar la búsqueda"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Categoría queda como desplegable y no como chips: son siete, y
              siete chips ocupan más que la lista que vienen a filtrar. */}
          <Select value={filters.category} onValueChange={(value) => setFilters({ ...filters, category: value })}>
            <SelectTrigger className="sm:w-52"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las categorías</SelectItem>
              {categories.map((cat) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <FilterChip active={filters.stockStatus === "bajo-stock"} onClick={() => alternar("stockStatus", "bajo-stock")}>
            Bajo stock
          </FilterChip>
          <FilterChip active={filters.forSale === "en-venta"} onClick={() => alternar("forSale", "en-venta")}>
            En venta
          </FilterChip>
          <FilterChip active={filters.forSale === "no-en-venta"} onClick={() => alternar("forSale", "no-en-venta")}>
            Sin vender
          </FilterChip>
          <FilterChip active={filters.volunteer === "sin-asignar"} onClick={() => alternar("volunteer", "sin-asignar")}>
            Sin asignar
          </FilterChip>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition ${
              showFilters || hayFiltrosAvanzados
                ? "border-[#4dd0e1] text-[#00838f]"
                : "border-gray-300 text-gray-500 hover:border-[#4dd0e1] hover:text-[#00838f]"
            }`}
          >
            <SlidersHorizontal className="h-3 w-3" />
            Más filtros
            {/* Sin este punto, un filtro avanzado activo quedaba escondido y
                la lista parecía estar mintiendo. */}
            {hayFiltrosAvanzados && !showFilters && (
              <span className="h-1.5 w-1.5 rounded-full bg-[#4dd0e1]" />
            )}
          </button>

          {hasActiveFilters && (
            <button onClick={clearFilters} className="text-xs text-gray-400 underline hover:text-gray-600">
              Limpiar
            </button>
          )}
        </div>

        {showFilters && (
          <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Voluntario</Label>
                <Select value={filters.volunteer} onValueChange={(value) => setFilters({ ...filters, volunteer: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los voluntarios</SelectItem>
                    <SelectItem value="sin-asignar">Sin asignar</SelectItem>
                    {volunteers.map((v) => (
                      <SelectItem key={v.id} value={v.id.toString()}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Precio mínimo</Label>
                <Input type="number" placeholder="0" value={filters.priceMin} onChange={(e) => setFilters({ ...filters, priceMin: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Precio máximo</Label>
                <Input type="number" placeholder="Sin límite" value={filters.priceMax} onChange={(e) => setFilters({ ...filters, priceMax: e.target.value })} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Ordenar por</Label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { field: "name", label: "Nombre" },
                  { field: "category", label: "Categoría" },
                  { field: "quantity", label: "Cantidad" },
                  { field: "price", label: "Precio" },
                  { field: "assigned_volunteer_id", label: "Voluntario" },
                  // "Valor total" se fue con su columna: ordenar por algo que
                  // no se ve deja la lista barajada sin explicación.
                ].map(({ field, label }) => (
                  <button
                    key={field}
                    onClick={() => handleSort(field)}
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                      sortField === field
                        ? "border-[#4dd0e1] bg-[#4dd0e1] text-white"
                        : "border-gray-300 text-gray-500 hover:border-[#4dd0e1] hover:text-[#00838f]"
                    }`}
                  >
                    {label}
                    {sortField === field ? (
                      sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-600">
          {filteredInventory.length} {filteredInventory.length === 1 ? "ítem" : "ítems"}
          {hasActiveFilters && (
            <span className="text-xs font-normal text-gray-400">de {inventory.length}</span>
          )}
        </span>
      </div>

      {/* Summary cards */}
      <div className="grid gap-3 grid-cols-3 sm:gap-4 px-4 sm:px-0">
        <Card>
          <CardHeader className="pb-1 pt-3 px-3 sm:px-4 sm:pt-4 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">Items</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 sm:px-4 sm:pb-4">
            <div className="text-xl sm:text-2xl font-bold text-[#4dd0e1]">{inventory.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-3 px-3 sm:px-4 sm:pt-4 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">Bajo stock</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 sm:px-4 sm:pb-4">
            <div className="text-xl sm:text-2xl font-bold text-red-600">{lowStockItems.length}</div>
          </CardContent>
        </Card>
        {/* Antes acá iba "Valor" (cantidad × precio de todo el inventario).
            Se cambió por lo que hoy es el eje nuevo del módulo: cuánto de lo
            que hay está a la venta. Clickeable, porque un número que se ve
            invita a querer ver de qué está hecho. */}
        <Card
          role="button"
          tabIndex={0}
          onClick={() => setFilters({ ...filters, forSale: filters.forSale === "en-venta" ? "todos" : "en-venta" })}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              setFilters({ ...filters, forSale: filters.forSale === "en-venta" ? "todos" : "en-venta" })
            }
          }}
          className={`cursor-pointer transition-colors hover:border-[#4dd0e1] ${
            filters.forSale === "en-venta" ? "border-[#4dd0e1] bg-[#4dd0e1]/5" : ""
          }`}
        >
          <CardHeader className="pb-1 pt-3 px-3 sm:px-4 sm:pt-4 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">En venta</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 sm:px-4 sm:pb-4">
            <div className="text-xl sm:text-2xl font-bold text-[#00838f]">{enVentaItems.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Low stock alerts */}
      {/* El cartel aparece desde UN ítem en rojo, no desde dos.
          Con el corte en `> 1`, un solo ítem marcado dejaba un triangulito
          rojo en la fila y nada que explicara por qué estaba ahí. Y "1 ítem"
          es justamente el caso en que es más fácil no entenderlo.

          El texto dice el motivo, que es lo que faltaba: el triángulo no
          significa "algo anda mal", significa "quedan menos unidades que el
          mínimo que vos definiste para este ítem". */}
      {lowStockItems.length > 0 && (
        <Card className="border-red-200 bg-red-50 mx-4 sm:mx-0">
          <CardHeader className="px-4 pb-2 sm:px-6">
            <CardTitle className="text-red-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              {lowStockItems.length === 1
                ? "1 ítem por debajo del stock mínimo"
                : `${lowStockItems.length} ítems por debajo del stock mínimo`}
            </CardTitle>
            <CardDescription className="text-red-700/80">
              Quedan menos unidades que el mínimo definido para {lowStockItems.length === 1 ? "ese ítem" : "esos ítems"}.
              El mínimo se cambia al editarlo.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <div className="space-y-2">
              {lowStockItems.map((item) => (
                <div key={item.id} className="flex justify-between items-center gap-2 text-sm">
                  <span className="font-medium truncate">{item.name}</span>
                  {/* "7 / 10" obligaba a adivinar cuál era cuál. */}
                  <span className="ml-2 flex-shrink-0 text-xs text-red-600 sm:text-sm">
                    Quedan <strong>{item.quantity}</strong> · mínimo {item.minimum_stock}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── MOBILE: Acordeón (< sm) ── */}
      <div className="sm:hidden space-y-2">
        {filteredInventory.map((item) => {
          const isExpanded = expandedId === item.id
          const lowStock = isLowStock(item)
          const volunteerName = getVolunteerName(item.assigned_volunteer_id)
          return (
            <div
              key={item.id}
              className={`bg-white rounded-xl border shadow-sm overflow-hidden ${
                lowStock ? "border-red-200" : "border-gray-100"
              }`}
            >
              {/* Fila compacta — siempre visible */}
              <button
                className="w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors active:bg-gray-50"
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-semibold text-gray-900 text-sm truncate leading-snug flex-1">
                      {item.name}
                    </span>
                    {lowStock && (
                      <span
                        title={`Quedan ${item.quantity}, el mínimo es ${item.minimum_stock}`}
                        className="flex shrink-0 items-center"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {item.category && (
                      <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                        {item.category}
                      </span>
                    )}
                    <span className={`text-xs font-medium ${lowStock ? "text-red-600" : "text-gray-500"}`}>
                      Cant: {item.quantity}
                    </span>
                    {item.for_sale && (
                      <span className="rounded bg-[#4dd0e1]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[#00838f]">
                        En venta{item.sale_price ? ` · $${Number(item.sale_price).toLocaleString("es-AR")}` : ""}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5 transition-transform duration-300 ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Contenido expandido */}
              <div
                className={`grid transition-all duration-300 ease-in-out ${
                  isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
                <div className="overflow-hidden">
                  <div className="px-4 pb-4 pt-3 border-t border-gray-100 space-y-3">
                    {/* Stock controls + datos */}
                    <div className="space-y-2">
                      {/* Cantidad con controles inline */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Cantidad</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); updateStock(item.id, Math.max(0, item.quantity - 1)) }}
                            disabled={item.quantity === 0}
                            className="w-7 h-7 rounded-md border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40 text-sm font-medium"
                          >
                            −
                          </button>
                          <span className={`text-sm font-semibold min-w-[2rem] text-center ${lowStock ? "text-red-600" : "text-gray-900"}`}>
                            {item.quantity}
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); updateStock(item.id, item.quantity + 1) }}
                            className="w-7 h-7 rounded-md border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 text-sm font-medium"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Stock mínimo</span>
                        <span className={`font-medium ${lowStock ? "text-red-500" : "text-gray-600"}`}>
                          {item.minimum_stock}
                        </span>
                      </div>

                      {item.price > 0 && (
                        <>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-400">Precio unitario</span>
                            <span className="font-medium text-gray-600">${item.price.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-400">Valor total</span>
                            <span className="font-semibold text-[#4dd0e1]">
                              ${(item.quantity * item.price).toLocaleString()}
                            </span>
                          </div>
                        </>
                      )}

                      {/* Proveedor no se muestra en ningún lado del front por
                          pedido. El dato se sigue guardando y mandando. */}

                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Voluntario</span>
                        <span className={`font-medium text-right ${item.assigned_volunteer_id ? "text-[#4dd0e1]" : "text-gray-400"}`}>
                          {volunteerName}
                        </span>
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex gap-2 pt-1 border-t border-gray-100">
                      <Button
                        onClick={() => openEditDialog(item)}
                        variant="outline"
                        size="sm"
                        className="flex-1 h-9"
                      >
                        <Edit className="w-3.5 h-3.5 mr-1.5" />
                        Editar
                      </Button>
                      <Button
                        onClick={() => handleDeleteClick(item)}
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
      {/* ── ESCRITORIO: tabla (≥ sm) ──
          Antes eran tarjetas y con pocos ítems ya había que scrollear: la
          tabla muestra todo de un vistazo y aguanta cuando el inventario
          crezca. El detalle completo vive en el modal de edición, que se abre
          tocando el renglón. Los −1/+1 quedan a la vista porque es lo que más
          se hace. */}
      <div className="hidden sm:block overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/80 text-left text-gray-600">
              <th className="px-4 py-2 font-semibold">Ítem</th>
              <th className="px-4 py-2 font-semibold">Cantidad</th>
              <th className="px-4 py-2 font-semibold">Voluntario</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {filteredInventory.map((item) => {
              const lowStock = isLowStock(item)
              return (
                <tr
                  key={item.id}
                  onClick={() => openEditDialog(item)}
                  className={`cursor-pointer border-b border-gray-100 transition-colors last:border-0 hover:bg-[#4dd0e1]/[0.06] ${
                    lowStock ? "bg-red-50/40" : ""
                  }`}
                >
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      {/* El motivo, al pasar el mouse: el triángulo solo no
                          dice cuánto queda ni cuál era el mínimo. Va en un
                          `span` con `title` y no como hijo del icono, porque
                          eso depende de que lucide reenvíe children al svg. */}
                      {lowStock && (
                        <span
                          title={`Quedan ${item.quantity}, el mínimo es ${item.minimum_stock}`}
                          className="flex shrink-0 items-center"
                        >
                          <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 font-medium text-gray-900">
                          {item.name}
                          {/* Se ve sin filtrar: para saber qué se vende no
                              hace falta ir a buscarlo. */}
                          {item.for_sale && (
                            <span className="shrink-0 rounded-full bg-[#4dd0e1]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[#00838f]">
                              En venta{item.sale_price ? ` · $${Number(item.sale_price).toLocaleString("es-AR")}` : ""}
                            </span>
                          )}
                        </p>
                        {item.category && <p className="text-xs text-gray-400">{item.category}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => updateStock(item.id, Math.max(0, item.quantity - 1))}
                        disabled={item.quantity === 0}
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                      >
                        −
                      </button>
                      <span className={`min-w-[2.5rem] text-center font-semibold tabular-nums ${lowStock ? "text-red-600" : "text-gray-900"}`}>
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateStock(item.id, item.quantity + 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50"
                      >
                        +
                      </button>
                    </div>
                  </td>
                  {/* "Mínimo" y "Valor" salieron de la tabla. El mínimo sigue
                      existiendo y sigue decidiendo quién está en rojo y quién
                      sale en las alertas: lo que se fue es la columna, no el
                      dato. El detalle de cada ítem se ve al editarlo. */}
                  <td className={`px-4 py-2 ${item.assigned_volunteer_id ? "text-[#00838f]" : "text-gray-400"}`}>
                    {getVolunteerName(item.assigned_volunteer_id)}
                  </td>
                  <td className="px-4 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" onClick={() => openEditDialog(item)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={() => handleDeleteClick(item)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
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
        // Borrar un ítem que está a la venta también lo saca del puesto. Se
        // avisa antes: enterarse después, con el stand abierto, es tarde.
        description={
          itemToDelete?.for_sale
            ? `"${itemToDelete.name}" está a la venta en el puesto. Si lo borrás, también deja de ofrecerse ahí. Esta acción no se puede deshacer.`
            : undefined
        }
      />
    </div>
  )
}
