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
import ConfirmationDialog from "@/components/ui/confirmation-dialog"

export default function PagosManager({ user }: { user: any }) {
  const [payments, setPayments] = useState<any[]>([])
  const [volunteers, setVolunteers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPayment, setEditingPayment] = useState<any>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [paymentToDelete, setPaymentToDelete] = useState<any>(null)
  const [formData, setFormData] = useState({
    user_id: "",
    concept: "",
    amount: "",
    due_date: "",
    payment_method: "",
    status: "pendiente",
  })

  const isAdmin = user.role === "admin"

  useEffect(() => {
    fetchPayments()
    fetchVolunteers()
  }, [])

  const fetchPayments = async () => {
    try {
      const response = await fetch("/api/pagos")
      const data = await response.json()
      setPayments(data)
    } catch (error) {
      console.error("Error fetching pagos:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchVolunteers = async () => {
    try {
      const response = await fetch("/api/voluntarios")
      const data = await response.json()
      setVolunteers(data)
    } catch (error) {
      console.error("Error fetching voluntarios:", error)
    }
  }

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    try {
      const method = editingPayment ? "PUT" : "POST"
      const url = editingPayment ? `/api/pagos?id=${editingPayment.id}` : "/api/pagos"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          amount: Number.parseInt(formData.amount),
          user_id: Number.parseInt(formData.user_id),
        }),
      })

      if (response.ok) {
        fetchPayments()
        setDialogOpen(false)
        resetForm()
      }
    } catch (error) {
      console.error("Error saving pago:", error)
    }
  }

  const handleDelete = (payment: any) => {
    setPaymentToDelete(payment)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!paymentToDelete) return
    try {
      const response = await fetch(`/api/pagos?id=${paymentToDelete.id}`, { method: "DELETE" })
      if (response.ok) fetchPayments()
    } catch (error) {
      console.error("Error deleting pago:", error)
    } finally {
      setDeleteDialogOpen(false)
      setPaymentToDelete(null)
    }
  }

  const markAsPaid = async (paymentId: number, paymentMethod: string) => {
    try {
      const response = await fetch(`/api/pagos?id=${paymentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "pagado",
          payment_date: new Date().toISOString().split("T")[0],
          payment_method: paymentMethod,
        }),
      })
      if (response.ok) {
        fetchPayments()
        alert("Pago marcado como realizado")
      }
    } catch (error) {
      console.error("Error updating pago:", error)
    }
  }

  const resetForm = () => {
    setFormData({ user_id: "", concept: "", amount: "", due_date: "", payment_method: "", status: "pendiente" })
    setEditingPayment(null)
  }

  const openEditDialog = (payment: any) => {
    setEditingPayment(payment)
    setFormData({
      user_id: payment.user_id.toString(),
      concept: payment.concept,
      amount: payment.amount.toString(),
      due_date: payment.due_date || "",
      payment_method: payment.payment_method || "",
      status: payment.status,
    })
    setDialogOpen(true)
  }

  const getVolunteerName = (userId: number) => {
    const volunteer = volunteers.find((v) => v.id === userId)
    return volunteer ? `${volunteer.name}${volunteer.last_name ? " " + volunteer.last_name : ""}` : "Usuario no encontrado"
  }

  const pendingPayments = payments.filter((p) => p.status === "pendiente")
  const overduePayments = payments.filter((p) => p.status === "pendiente" && new Date(p.due_date) < new Date())
  const cashPayments = payments.filter((p) => p.payment_method === "efectivo" && p.status === "pagado")
  const myPayments = payments.filter((p) => p.user_id === user.id)

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
                <DialogTitle>{editingPayment ? "Editar Pago" : "Nuevo Pago"}</DialogTitle>
                <DialogDescription>
                  {editingPayment ? "Modifica los datos del pago" : "Registra un nuevo pago o cuota"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="user_id">Voluntario</Label>
                  <Select
                    value={formData.user_id}
                    onValueChange={(value) => setFormData({ ...formData, user_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar voluntario" />
                    </SelectTrigger>
                    <SelectContent>
                      {volunteers.map((volunteer) => (
                        <SelectItem key={volunteer.id} value={volunteer.id.toString()}>
                          {volunteer.name}{volunteer.last_name ? " " + volunteer.last_name : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="concept">Concepto</Label>
                  <Input
                    id="concept"
                    value={formData.concept}
                    onChange={(e) => setFormData({ ...formData, concept: e.target.value })}
                    placeholder="Cuota mensual, taller, etc."
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Monto ($)</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="due_date">Fecha de Vencimiento</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Estado</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
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
                {formData.status === "pagado" && (
                  <div className="space-y-2">
                    <Label htmlFor="payment_method">Método de Pago</Label>
                    <Select
                      value={formData.payment_method}
                      onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
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
                    {editingPayment ? "Actualizar" : "Crear"} Pago
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
              <TabsTrigger value="pendientes" className="data-[state=active]:bg-[#4dd0e1] data-[state=active]:text-white">
                Pendientes ({pendingPayments.length})
              </TabsTrigger>
              <TabsTrigger value="vencidos" className="data-[state=active]:bg-[#4dd0e1] data-[state=active]:text-white">
                Vencidos ({overduePayments.length})
              </TabsTrigger>
              <TabsTrigger value="efectivo" className="data-[state=active]:bg-[#4dd0e1] data-[state=active]:text-white">
                Efectivo ({cashPayments.length})
              </TabsTrigger>
            </>
          )}
        </TabsList>

        {isAdmin && (
          <TabsContent value="todos" className="space-y-4">
            <div className="grid gap-4">
              {payments.map((payment) => (
                <Card key={payment.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{getVolunteerName(payment.user_id)}</h3>
                          <Badge
                            variant={
                              payment.status === "pagado"
                                ? "default"
                                : payment.status === "vencido"
                                  ? "destructive"
                                  : "secondary"
                            }
                            className={
                              payment.status === "pagado"
                                ? "bg-green-500"
                                : payment.status === "vencido"
                                  ? "bg-red-500"
                                  : "bg-yellow-500"
                            }
                          >
                            {payment.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{payment.concept}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />${payment.amount.toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Vence: {payment.due_date ? new Date(payment.due_date).toLocaleDateString("es-ES") : "-"}
                          </span>
                          {payment.payment_method && <span className="capitalize">Método: {payment.payment_method}</span>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {payment.status === "pendiente" && (
                          <>
                            <Button
                              onClick={() => markAsPaid(payment.id, "efectivo")}
                              size="sm"
                              variant="outline"
                              className="text-green-600 border-green-600 hover:bg-green-50"
                            >
                              Efectivo
                            </Button>
                            <Button
                              onClick={() => markAsPaid(payment.id, "transferencia")}
                              size="sm"
                              variant="outline"
                              className="text-blue-600 border-blue-600 hover:bg-blue-50"
                            >
                              Transferencia
                            </Button>
                          </>
                        )}
                        <Button onClick={() => openEditDialog(payment)} variant="outline" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleDelete(payment)}
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
                    {payments
                      .filter((p) => p.status === "pagado")
                      .reduce((sum, p) => sum + p.amount, 0)
                      .toLocaleString()}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Pagos Pendientes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">{pendingPayments.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Pagos Vencidos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{overduePayments.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Pagos en Efectivo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{cashPayments.length}</div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="grid gap-4">
              {myPayments.map((payment) => (
                <Card key={payment.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{payment.concept}</h3>
                          <Badge
                            variant={
                              payment.status === "pagado"
                                ? "default"
                                : payment.status === "vencido"
                                  ? "destructive"
                                  : "secondary"
                            }
                            className={
                              payment.status === "pagado"
                                ? "bg-green-500"
                                : payment.status === "vencido"
                                  ? "bg-red-500"
                                  : "bg-yellow-500"
                            }
                          >
                            {payment.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />${payment.amount.toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Vence: {payment.due_date ? new Date(payment.due_date).toLocaleDateString("es-ES") : "-"}
                          </span>
                          {payment.payment_date && (
                            <span className="flex items-center gap-1 text-green-600">
                              <CheckCircle className="w-4 h-4" />
                              Pagado: {new Date(payment.payment_date).toLocaleDateString("es-ES")}
                            </span>
                          )}
                        </div>
                      </div>
                      {payment.status === "pendiente" && payment.due_date && new Date(payment.due_date) < new Date() && (
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
                {pendingPayments.map((payment) => (
                  <Card key={payment.id} className="hover:shadow-md transition-shadow border-yellow-200">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-yellow-600" />
                            <h3 className="font-medium">{getVolunteerName(payment.user_id)}</h3>
                          </div>
                          <p className="text-sm text-gray-600">{payment.concept}</p>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>${payment.amount.toLocaleString()}</span>
                            <span>Vence: {payment.due_date ? new Date(payment.due_date).toLocaleDateString("es-ES") : "-"}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => markAsPaid(payment.id, "efectivo")}
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
                {overduePayments.map((payment) => (
                  <Card key={payment.id} className="hover:shadow-md transition-shadow border-red-200">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                            <h3 className="font-medium">{getVolunteerName(payment.user_id)}</h3>
                            <Badge variant="destructive">Vencido</Badge>
                          </div>
                          <p className="text-sm text-gray-600">{payment.concept}</p>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>${payment.amount.toLocaleString()}</span>
                            <span className="text-red-600">
                              Venció: {payment.due_date ? new Date(payment.due_date).toLocaleDateString("es-ES") : "-"}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => markAsPaid(payment.id, "efectivo")}
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
                {cashPayments.map((payment) => (
                  <Card key={payment.id} className="hover:shadow-md transition-shadow border-green-200">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-green-600" />
                            <h3 className="font-medium">{getVolunteerName(payment.user_id)}</h3>
                            <Badge className="bg-green-500">Efectivo</Badge>
                          </div>
                          <p className="text-sm text-gray-600">{payment.concept}</p>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>${payment.amount.toLocaleString()}</span>
                            <span>Pagado: {payment.payment_date ? new Date(payment.payment_date).toLocaleDateString("es-ES") : "-"}</span>
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

      {payments.length === 0 && (
        <div className="text-center py-12">
          <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay pagos registrados</h3>
          <p className="text-gray-600">
            {isAdmin ? "Crea el primer registro de pago para comenzar." : "No tienes pagos pendientes."}
          </p>
        </div>
      )}

      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        itemName={paymentToDelete ? `${getVolunteerName(paymentToDelete.user_id)} — ${paymentToDelete.concept}` : undefined}
        itemType="pago"
      />
    </div>
  )
}
