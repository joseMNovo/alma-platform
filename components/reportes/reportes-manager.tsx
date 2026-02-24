"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, DollarSign, Download, Activity, AlertTriangle } from "lucide-react"

interface Volunteer {
  id: number
  name: string
  email: string
  role: string
  status?: string
}

interface Workshop {
  id: number
  name: string
  capacity: number
  enrolled: number
  day: string
  schedule: string
  status?: string
}

interface Group {
  id: number
  name: string
  participants: number
  status?: string
  day?: string
  schedule?: string
}

interface Activity {
  id: number
  name: string
  capacity: number
  enrolled: number
  status?: string
}

interface Payment {
  id: number
  concept: string
  amount: number
  status: string
  payment_method: string
  due_date?: string
}

interface InventoryItem {
  id: number
  name: string
  category: string
  quantity: number
  minimum_stock: number
  price: number
}

interface Data {
  volunteers: Volunteer[]
  workshops: Workshop[]
  groups: Group[]
  activities: Activity[]
  payments: Payment[]
  inventory: InventoryItem[]
}

export default function ReportesManager({ user }: { user: Volunteer }) {
  const [data, setData] = useState<Data>({
    volunteers: [],
    workshops: [],
    groups: [],
    activities: [],
    payments: [],
    inventory: [],
  })
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState("mes")

  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    try {
      const [volunteersRes, workshops, groups, activities, payments, inventory] = await Promise.all([
        fetch("/api/auth").then((r) => r.json()),
        fetch("/api/talleres").then((r) => r.json()),
        fetch("/api/grupos").then((r) => r.json()),
        fetch("/api/actividades").then((r) => r.json()),
        fetch("/api/pagos").then((r) => r.json()),
        fetch("/api/inventario").then((r) => r.json()),
      ])

      setData({
        volunteers: volunteersRes.volunteers || [],
        workshops,
        groups,
        activities,
        payments,
        inventory,
      })
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const stats = {
    totalVolunteers: data.volunteers.length,
    activeVolunteers: data.volunteers.filter((v) => v.role !== "admin").length,
    totalWorkshops: data.workshops.length,
    activeWorkshops: data.workshops.filter((w) => w.status === "activo").length,
    totalGroups: data.groups.length,
    activeGroups: data.groups.filter((g) => g.status === "activo").length,
    totalActivities: data.activities.length,
    activeActivities: data.activities.filter((a) => a.status === "activo").length,
    totalIncome: data.payments.filter((p) => p.status === "pagado").reduce((sum, p) => sum + p.amount, 0),
    pendingPayments: data.payments.filter((p) => p.status === "pendiente").length,
    overduePayments: data.payments.filter(
      (p) => p.status === "pendiente" && p.due_date && new Date(p.due_date) < new Date()
    ).length,
    totalInventory: data.inventory.length,
    lowStockItems: data.inventory.filter((i) => i.quantity <= i.minimum_stock).length,
    inventoryValue: data.inventory.reduce((sum, i) => sum + i.quantity * i.price, 0),
  }

  const chartData = {
    monthlyIncome: [
      { month: "Ene", income: 45000 },
      { month: "Feb", income: 52000 },
      { month: "Mar", income: 48000 },
      { month: "Abr", income: 61000 },
      { month: "May", income: 55000 },
      { month: "Jun", income: 67000 },
    ],
    enrollmentsByMonth: [
      { month: "Ene", workshops: 12, groups: 8, activities: 15 },
      { month: "Feb", workshops: 15, groups: 10, activities: 18 },
      { month: "Mar", workshops: 18, groups: 12, activities: 22 },
      { month: "Abr", workshops: 22, groups: 15, activities: 25 },
      { month: "May", workshops: 20, groups: 13, activities: 20 },
      { month: "Jun", workshops: 25, groups: 18, activities: 30 },
    ],
  }

  const exportReport = (type: string): void => {
    alert(`Exportando reporte de ${type}...`)
  }

  if (loading) {
    return <div className="text-center py-8">Cargando reportes...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Reportes y Estadísticas</h2>
          <p className="text-gray-600">Análisis completo de la plataforma alma</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semana">Esta semana</SelectItem>
              <SelectItem value="mes">Este mes</SelectItem>
              <SelectItem value="trimestre">Este trimestre</SelectItem>
              <SelectItem value="año">Este año</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => exportReport("general")} className="bg-[#4dd0e1] hover:bg-[#3bc0d1] text-white">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="resumen" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 bg-white border border-gray-200 p-1 rounded-lg">
          <TabsTrigger value="resumen" className="data-[state=active]:bg-[#4dd0e1] data-[state=active]:text-white">
            Resumen General
          </TabsTrigger>
          <TabsTrigger value="financiero" className="data-[state=active]:bg-[#4dd0e1] data-[state=active]:text-white">
            Financiero
          </TabsTrigger>
          <TabsTrigger value="actividades" className="data-[state=active]:bg-[#4dd0e1] data-[state=active]:text-white">
            Actividades
          </TabsTrigger>
          <TabsTrigger value="inventario" className="data-[state=active]:bg-[#4dd0e1] data-[state=active]:text-white">
            Inventario
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resumen" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Voluntarios</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#4dd0e1]">{stats.totalVolunteers}</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600">+12%</span> vs mes anterior
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">${stats.totalIncome.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600">+8%</span> vs mes anterior
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Actividades Activas</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#4dd0e1]">
                  {stats.activeWorkshops + stats.activeGroups + stats.activeActivities}
                </div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600">+5%</span> vs mes anterior
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Alertas</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.overduePayments + stats.lowStockItems}</div>
                <p className="text-xs text-muted-foreground">Pagos vencidos + Stock bajo</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Ingresos por Mes</CardTitle>
              <CardDescription>Evolución de ingresos en los últimos 6 meses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-end justify-between gap-2 p-4">
                {chartData.monthlyIncome.map((item, index) => (
                  <div key={index} className="flex flex-col items-center flex-1">
                    <div
                      className="bg-[#4dd0e1] w-full rounded-t"
                      style={{
                        height: `${(item.income / Math.max(...chartData.monthlyIncome.map((i) => i.income))) * 200}px`,
                      }}
                    />
                    <span className="text-xs mt-2 text-gray-600">{item.month}</span>
                    <span className="text-xs text-gray-500">${(item.income / 1000).toFixed(0)}k</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Talleres</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total:</span>
                  <span className="font-medium">{stats.totalWorkshops}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Activos:</span>
                  <span className="font-medium text-green-600">{stats.activeWorkshops}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Inscritos:</span>
                  <span className="font-medium">{data.workshops.reduce((sum, w) => sum + (w.enrolled || 0), 0)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Grupos de Apoyo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total:</span>
                  <span className="font-medium">{stats.totalGroups}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Activos:</span>
                  <span className="font-medium text-green-600">{stats.activeGroups}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Participantes:</span>
                  <span className="font-medium">{data.groups.reduce((sum, g) => sum + (g.participants || 0), 0)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Actividades</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total:</span>
                  <span className="font-medium">{stats.totalActivities}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Activas:</span>
                  <span className="font-medium text-green-600">{stats.activeActivities}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Inscritos:</span>
                  <span className="font-medium">{data.activities.reduce((sum, a) => sum + (a.enrolled || 0), 0)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="financiero" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Estado de Pagos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Pagos Realizados:</span>
                  <span className="font-medium text-green-600">
                    {data.payments.filter((p) => p.status === "pagado").length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Pagos Pendientes:</span>
                  <span className="font-medium text-yellow-600">{stats.pendingPayments}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Pagos Vencidos:</span>
                  <span className="font-medium text-red-600">{stats.overduePayments}</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total Ingresos:</span>
                    <span className="font-bold text-[#4dd0e1]">${stats.totalIncome.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Métodos de Pago</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Efectivo:</span>
                  <span className="font-medium">{data.payments.filter((p) => p.payment_method === "efectivo").length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Transferencia:</span>
                  <span className="font-medium">
                    {data.payments.filter((p) => p.payment_method === "transferencia").length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Tarjeta:</span>
                  <span className="font-medium">{data.payments.filter((p) => p.payment_method === "tarjeta").length}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Ingresos por Concepto</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {["Cuota Mensual", "Taller", "Actividad"].map((concept) => {
                  const conceptPayments = data.payments.filter(
                    (p) => p.concept.toLowerCase().includes(concept.toLowerCase()) && p.status === "pagado",
                  )
                  const conceptTotal = conceptPayments.reduce((sum, p) => sum + p.amount, 0)
                  const percentage = stats.totalIncome > 0 ? (conceptTotal / stats.totalIncome) * 100 : 0

                  return (
                    <div key={concept} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{concept}</span>
                        <span className="font-medium">${conceptTotal.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-[#4dd0e1] h-2 rounded-full" style={{ width: `${percentage}%` }} />
                      </div>
                      <div className="text-xs text-gray-500">{percentage.toFixed(1)}% del total</div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actividades" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Ocupación de Talleres</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.workshops.slice(0, 5).map((workshop) => {
                    const occupancy = workshop.capacity > 0 ? (workshop.enrolled / workshop.capacity) * 100 : 0
                    return (
                      <div key={workshop.id} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="truncate">{workshop.name}</span>
                          <span className="font-medium">
                            {workshop.enrolled}/{workshop.capacity}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              occupancy >= 80 ? "bg-red-500" : occupancy >= 60 ? "bg-yellow-500" : "bg-green-500"
                            }`}
                            style={{ width: `${occupancy}%` }}
                          />
                        </div>
                        <div className="text-xs text-gray-500">{occupancy.toFixed(1)}% ocupado</div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Participación en Grupos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.groups.map((group) => (
                    <div key={group.id} className="flex justify-between items-center">
                      <div>
                        <div className="font-medium text-sm">{group.name}</div>
                        <div className="text-xs text-gray-500">
                          {group.day} - {group.schedule}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-[#4dd0e1]">{group.participants}</div>
                        <div className="text-xs text-gray-500">participantes</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Inscripciones por Mes</CardTitle>
              <CardDescription>Comparativa de inscripciones en diferentes actividades</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-end justify-between gap-4 p-4">
                {chartData.enrollmentsByMonth.map((item, index) => (
                  <div key={index} className="flex flex-col items-center flex-1">
                    <div className="flex flex-col w-full gap-1">
                      <div className="bg-blue-500 w-full rounded-t" style={{ height: `${(item.workshops / 30) * 60}px` }} />
                      <div className="bg-green-500 w-full" style={{ height: `${(item.groups / 30) * 60}px` }} />
                      <div className="bg-[#4dd0e1] w-full" style={{ height: `${(item.activities / 30) * 60}px` }} />
                    </div>
                    <span className="text-xs mt-2 text-gray-600">{item.month}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-center gap-4 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded" />
                  <span className="text-xs">Talleres</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded" />
                  <span className="text-xs">Grupos</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-[#4dd0e1] rounded" />
                  <span className="text-xs">Actividades</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventario" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resumen Inventario</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Items:</span>
                  <span className="font-medium">{stats.totalInventory}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Bajo Stock:</span>
                  <span className="font-medium text-red-600">{stats.lowStockItems}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Valor Total:</span>
                  <span className="font-medium text-[#4dd0e1]">${stats.inventoryValue.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Por Categoría</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {["Material Didáctico", "Material Terapéutico", "Mobiliario", "Merchandising"].map((category) => {
                  const items = data.inventory.filter((i) => i.category === category)
                  return (
                    <div key={category} className="flex justify-between">
                      <span className="text-sm text-gray-600">{category}:</span>
                      <span className="font-medium">{items.length}</span>
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Alertas de Stock</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.lowStockItems > 0 ? (
                  <div className="space-y-2">
                    {data.inventory
                      .filter((i) => i.quantity <= i.minimum_stock)
                      .slice(0, 3)
                      .map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="truncate">{item.name}</span>
                          <span className="text-red-600">{item.quantity}</span>
                        </div>
                      ))}
                    {stats.lowStockItems > 3 && (
                      <div className="text-xs text-gray-500">+{stats.lowStockItems - 3} más...</div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-green-600">✓ Todo el stock está en niveles normales</div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Items Más Valiosos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.inventory
                  .sort((a, b) => b.quantity * b.price - a.quantity * a.price)
                  .slice(0, 5)
                  .map((item) => (
                    <div key={item.id} className="flex justify-between items-center">
                      <div>
                        <div className="font-medium text-sm">{item.name}</div>
                        <div className="text-xs text-gray-500">
                          {item.quantity} unidades × ${item.price.toLocaleString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-[#4dd0e1]">
                          ${(item.quantity * item.price).toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">valor total</div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
