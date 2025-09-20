"use client"

import { useState, useEffect } from "react"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Edit, Trash2, DollarSign, Calendar, AlertTriangle, CheckCircle, Clock } from "lucide-react"

export default function PagosManager({ user }) {
  const [pagos, setPagos] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPago, setEditingPago] = useState(null)
  const [formData, setFormData] = useState({
    usuarioId: "",
    concepto: "",
    monto: "",
    fechaVencimiento: "",
    metodoPago: "",
    estado: "pendiente",
  })

  const isAdmin = user.rol === "admin"

  useEffect(() => {
    fetchPagos()
    fetchUsuarios()
  }, [])

  const fetchPagos = async () => {
    try {
      const response = await fetch("/api/pagos")
      const data = await response.json()
      setPagos(data)
    } catch (error) {
      console.error("Error fetching pagos:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUsuarios = async () => {
    try {
      const response = await fetch("/api/auth")
      const data = await response.json()
      setUsuarios(data.usuarios || [])
    } catch (error) {
      console.error("Error fetching usuarios:", error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const method = editingPago ? "PUT" : "POST"
      const url = editingPago ? `/api/pagos?id=${editingPago.id}` : "/api/pagos"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          monto: Number.parseInt(formData.monto),
          usuarioId: Number.parseInt(formData.usuarioId),
        }),
      })

      if (response.ok) {
        fetchPagos()
        setDialogOpen(false)
        resetForm()
      }
    } catch (error) {
      console.error("Error saving pago:", error)
    }
  }

  const handleDelete = async (id) => {
    if (confirm("¿Estás seguro de que quieres eliminar este pago?")) {
      try {
        const response = await fetch(`/api/pagos?id=${id}`, {
          method: "DELETE",
        })
        if (response.ok) {
          fetchPagos()
        }
      } catch (error) {
        console.error("Error deleting pago:", error)
      }
    }
  }

  const marcarComoPagado = async (pagoId, metodoPago) => {
    try {
      const response = await fetch(`/api/pagos?id=${pagoId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          estado: "pagado",
          fechaPago: new Date().toISOString().split("T")[0],
          metodoPago: metodoPago,
        }),
      })

      if (response.ok) {
        fetchPagos()
        alert("Pago marcado como realizado")
      }
    } catch (error) {
      console.error("Error updating pago:", error)
    }
  }

  const resetForm = () => {
    setFormData({
      usuarioId: "",
      concepto: "",
      monto: "",
      fechaVencimiento: "",
      metodoPago: "",
      estado: "pendiente",
    })
    setEditingPago(null)
  }

  const openEditDialog = (pago) => {
    setEditingPago(pago)
    setFormData({
      usuarioId: pago.usuarioId.toString(),
      concepto: pago.concepto,
      monto: pago.monto.toString(),
      fechaVencimiento: pago.fechaVencimiento,
      metodoPago: pago.metodoPago || "",
      estado: pago.estado,
    })
    setDialogOpen(true)
  }

  const getUsuarioNombre = (usuarioId) => {
    const usuario = usuarios.find((u) => u.id === usuarioId)
    return usuario ? usuario.nombre : "Usuario no encontrado"
  }

  const pagosPendientes = pagos.filter((p) => p.estado === "pendiente")
  const pagosVencidos = pagos.filter((p) => p.estado === "pendiente" && new Date(p.fechaVencimiento) < new Date())
  const pagosEfectivo = pagos.filter((p) => p.metodoPago === "efectivo" && p.estado === "pagado")
  const misPagos = pagos.filter((p) => p.usuarioId === user.id)

  if (loading) {
    return <div className="text-center py-8">Cargando información de pagos...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Pagos</h2>
          <p className="text-gray-600">Control de cuotas, ingresos y seguimiento de pagos</p>
        </div>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm} className="bg-[#4dd0e1] hover:bg-[#3bc0d1] text-white">
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Pago
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingPago ? "Editar Pago" : "Nuevo Pago"}</DialogTitle>
                <DialogDescription>
                  {editingPago ? "Modifica los datos del pago" : "Registra un nuevo pago o cuota"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="usuarioId">Usuario</Label>
                  <Select
                    value={formData.usuarioId}
                    onValueChange={(value) => setFormData({ ...formData, usuarioId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar usuario" />
                    </SelectTrigger>
                    <SelectContent>
                      {usuarios.map((usuario) => (
                        <SelectItem key={usuario.id} value={usuario.id.toString()}>
                          {usuario.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="concepto">Concepto</Label>
                  <Input
                    id="concepto"
                    value={formData.concepto}
                    onChange={(e) => setFormData({ ...formData, concepto: e.target.value })}
                    placeholder="Cuota mensual, taller, etc."
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monto">Monto ($)</Label>
                  <Input
                    id="monto"
                    type="number"
                    value={formData.monto}
                    onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fechaVencimiento">Fecha de Vencimiento</Label>
                  <Input
                    id="fechaVencimiento"
                    type="date"
                    value={formData.fechaVencimiento}
                    onChange={(e) => setFormData({ ...formData, fechaVencimiento: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estado">Estado</Label>
                  <Select
                    value={formData.estado}
                    onValueChange={(value) => setFormData({ ...formData, estado: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendiente">Pendiente</SelectItem>
                      <SelectItem value="pagado">Pagado</SelectItem>
                      <SelectItem value="vencido">Vencido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.estado === "pagado" && (
                  <div className="space-y-2">
                    <Label htmlFor="metodoPago">Método de Pago</Label>
                    <Select
                      value={formData.metodoPago}
                      onValueChange={(value) => setFormData({ ...formData, metodoPago: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar método" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="efectivo">Efectivo</SelectItem>
                        <SelectItem value="transferencia">Transferencia</SelectItem>
                        <SelectItem value="tarjeta">Tarjeta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <DialogFooter>
                  <Button type="submit" className="bg-[#4dd0e1] hover:bg-[#3bc0d1] text-white">
                    {editingPago ? "Actualizar" : "Crear"} Pago
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Tabs defaultValue={isAdmin ? "todos" : "mis-pagos"} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 bg-white border border-gray-200 p-1 rounded-lg">
          {isAdmin && (
            <TabsTrigger value="todos" className="data-[state=active]:bg-[#4dd0e1] data-[state=active]:text-white">
              Todos los Pagos
            </TabsTrigger>
          )}
          <TabsTrigger value="mis-pagos" className="data-[state=active]:bg-[#4dd0e1] data-[state=active]:text-white">
            {isAdmin ? "Resumen" : "Mis Pagos"}
          </TabsTrigger>
          {isAdmin && (
            <>
              <TabsTrigger
                value="pendientes"
                className="data-[state=active]:bg-[#4dd0e1] data-[state=active]:text-white"
              >
                Pendientes ({pagosPendientes.length})
              </TabsTrigger>
              <TabsTrigger value="vencidos" className="data-[state=active]:bg-[#4dd0e1] data-[state=active]:text-white">
                Vencidos ({pagosVencidos.length})
              </TabsTrigger>
              <TabsTrigger value="efectivo" className="data-[state=active]:bg-[#4dd0e1] data-[state=active]:text-white">
                Efectivo ({pagosEfectivo.length})
              </TabsTrigger>
            </>
          )}
        </TabsList>

        {isAdmin && (
          <TabsContent value="todos" className="space-y-4">
            <div className="grid gap-4">
              {pagos.map((pago) => (
                <Card key={pago.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{getUsuarioNombre(pago.usuarioId)}</h3>
                          <Badge
                            variant={
                              pago.estado === "pagado"
                                ? "default"
                                : pago.estado === "vencido"
                                  ? "destructive"
                                  : "secondary"
                            }
                            className={
                              pago.estado === "pagado"
                                ? "bg-green-500"
                                : pago.estado === "vencido"
                                  ? "bg-red-500"
                                  : "bg-yellow-500"
                            }
                          >
                            {pago.estado}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{pago.concepto}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />${pago.monto.toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Vence: {new Date(pago.fechaVencimiento).toLocaleDateString("es-ES")}
                          </span>
                          {pago.metodoPago && <span className="capitalize">Método: {pago.metodoPago}</span>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {pago.estado === "pendiente" && (
                          <>
                            <Button
                              onClick={() => marcarComoPagado(pago.id, "efectivo")}
                              size="sm"
                              variant="outline"
                              className="text-green-600 border-green-600 hover:bg-green-50"
                            >
                              Efectivo
                            </Button>
                            <Button
                              onClick={() => marcarComoPagado(pago.id, "transferencia")}
                              size="sm"
                              variant="outline"
                              className="text-blue-600 border-blue-600 hover:bg-blue-50"
                            >
                              Transferencia
                            </Button>
                          </>
                        )}
                        <Button onClick={() => openEditDialog(pago)} variant="outline" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleDelete(pago.id)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        )}

        <TabsContent value="mis-pagos" className="space-y-4">
          {isAdmin ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Ingresos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-[#4dd0e1]">
                    $
                    {pagos
                      .filter((p) => p.estado === "pagado")
                      .reduce((sum, p) => sum + p.monto, 0)
                      .toLocaleString()}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Pagos Pendientes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">{pagosPendientes.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Pagos Vencidos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{pagosVencidos.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Pagos en Efectivo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{pagosEfectivo.length}</div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="grid gap-4">
              {misPagos.map((pago) => (
                <Card key={pago.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{pago.concepto}</h3>
                          <Badge
                            variant={
                              pago.estado === "pagado"
                                ? "default"
                                : pago.estado === "vencido"
                                  ? "destructive"
                                  : "secondary"
                            }
                            className={
                              pago.estado === "pagado"
                                ? "bg-green-500"
                                : pago.estado === "vencido"
                                  ? "bg-red-500"
                                  : "bg-yellow-500"
                            }
                          >
                            {pago.estado}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />${pago.monto.toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Vence: {new Date(pago.fechaVencimiento).toLocaleDateString("es-ES")}
                          </span>
                          {pago.fechaPago && (
                            <span className="flex items-center gap-1 text-green-600">
                              <CheckCircle className="w-4 h-4" />
                              Pagado: {new Date(pago.fechaPago).toLocaleDateString("es-ES")}
                            </span>
                          )}
                        </div>
                      </div>
                      {pago.estado === "pendiente" && new Date(pago.fechaVencimiento) < new Date() && (
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {isAdmin && (
          <>
            <TabsContent value="pendientes" className="space-y-4">
              <div className="grid gap-4">
                {pagosPendientes.map((pago) => (
                  <Card key={pago.id} className="hover:shadow-md transition-shadow border-yellow-200">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-yellow-600" />
                            <h3 className="font-medium">{getUsuarioNombre(pago.usuarioId)}</h3>
                          </div>
                          <p className="text-sm text-gray-600">{pago.concepto}</p>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>${pago.monto.toLocaleString()}</span>
                            <span>Vence: {new Date(pago.fechaVencimiento).toLocaleDateString("es-ES")}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => marcarComoPagado(pago.id, "efectivo")}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            Marcar Pagado
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="vencidos" className="space-y-4">
              <div className="grid gap-4">
                {pagosVencidos.map((pago) => (
                  <Card key={pago.id} className="hover:shadow-md transition-shadow border-red-200">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                            <h3 className="font-medium">{getUsuarioNombre(pago.usuarioId)}</h3>
                            <Badge variant="destructive">Vencido</Badge>
                          </div>
                          <p className="text-sm text-gray-600">{pago.concepto}</p>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>${pago.monto.toLocaleString()}</span>
                            <span className="text-red-600">
                              Venció: {new Date(pago.fechaVencimiento).toLocaleDateString("es-ES")}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => marcarComoPagado(pago.id, "efectivo")}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            Marcar Pagado
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-blue-600 border-blue-600 hover:bg-blue-50 bg-transparent"
                          >
                            Enviar Recordatorio
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="efectivo" className="space-y-4">
              <div className="grid gap-4">
                {pagosEfectivo.map((pago) => (
                  <Card key={pago.id} className="hover:shadow-md transition-shadow border-green-200">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-green-600" />
                            <h3 className="font-medium">{getUsuarioNombre(pago.usuarioId)}</h3>
                            <Badge className="bg-green-500">Efectivo</Badge>
                          </div>
                          <p className="text-sm text-gray-600">{pago.concepto}</p>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>${pago.monto.toLocaleString()}</span>
                            <span>Pagado: {new Date(pago.fechaPago).toLocaleDateString("es-ES")}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </>
        )}
      </Tabs>

      {pagos.length === 0 && (
        <div className="text-center py-12">
          <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay pagos registrados</h3>
          <p className="text-gray-600">
            {isAdmin ? "Crea el primer registro de pago para comenzar." : "No tienes pagos pendientes."}
          </p>
        </div>
      )}
    </div>
  )
}
