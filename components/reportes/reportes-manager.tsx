"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, DollarSign, Download, Activity, AlertTriangle } from "lucide-react"

export default function ReportesManager({ user }) {
  const [data, setData] = useState({
    usuarios: [],
    talleres: [],
    grupos: [],
    actividades: [],
    pagos: [],
    inventario: [],
    inscripciones: [],
  })
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState("mes")

  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    try {
      const [usuarios, talleres, grupos, actividades, pagos, inventario] = await Promise.all([
        fetch("/api/auth").then((r) => r.json()),
        fetch("/api/talleres").then((r) => r.json()),
        fetch("/api/grupos").then((r) => r.json()),
        fetch("/api/actividades").then((r) => r.json()),
        fetch("/api/pagos").then((r) => r.json()),
        fetch("/api/inventario").then((r) => r.json()),
      ])

      setData({
        usuarios: usuarios.usuarios || [],
        talleres,
        grupos,
        actividades,
        pagos,
        inventario,
        inscripciones: [], // Se obtendría de una API de inscripciones
      })
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  // Cálculos de estadísticas
  const stats = {
    totalUsuarios: data.usuarios.length,
    usuariosActivos: data.usuarios.filter((u) => u.rol === "usuario").length,
    totalTalleres: data.talleres.length,
    talleresActivos: data.talleres.filter((t) => t.estado === "activo").length,
    totalGrupos: data.grupos.length,
    gruposActivos: data.grupos.filter((g) => g.estado === "activo").length,
    totalActividades: data.actividades.length,
    actividadesActivas: data.actividades.filter((a) => a.estado === "activo").length,
    ingresosTotales: data.pagos.filter((p) => p.estado === "pagado").reduce((sum, p) => sum + p.monto, 0),
    pagosPendientes: data.pagos.filter((p) => p.estado === "pendiente").length,
    pagosVencidos: data.pagos.filter((p) => p.estado === "pendiente" && new Date(p.fechaVencimiento) < new Date())
      .length,
    inventarioTotal: data.inventario.length,
    itemsBajoStock: data.inventario.filter((i) => i.cantidad <= i.stockMinimo).length,
    valorInventario: data.inventario.reduce((sum, i) => sum + i.cantidad * i.precio, 0),
  }

  // Datos para gráficos (simulados)
  const chartData = {
    ingresosMensuales: [
      { mes: "Ene", ingresos: 45000 },
      { mes: "Feb", ingresos: 52000 },
      { mes: "Mar", ingresos: 48000 },
      { mes: "Abr", ingresos: 61000 },
      { mes: "May", ingresos: 55000 },
      { mes: "Jun", ingresos: 67000 },
    ],
    inscripcionesPorMes: [
      { mes: "Ene", talleres: 12, grupos: 8, actividades: 15 },
      { mes: "Feb", talleres: 15, grupos: 10, actividades: 18 },
      { mes: "Mar", talleres: 18, grupos: 12, actividades: 22 },
      { mes: "Abr", talleres: 22, grupos: 15, actividades: 25 },
      { mes: "May", talleres: 20, grupos: 13, actividades: 20 },
      { mes: "Jun", talleres: 25, grupos: 18, actividades: 30 },
    ],
  }

  const exportarReporte = (tipo) => {
    // Simulación de exportación
    alert(`Exportando reporte de ${tipo}...`)
  }

  if (loading) {
    return <div className="text-center py-8">Cargando reportes...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Reportes y Estadísticas</h2>
          <p className="text-gray-600">Análisis completo de la plataforma ALMA</p>
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
          <Button onClick={() => exportarReporte("general")} className="bg-[#4dd0e1] hover:bg-[#3bc0d1] text-white">
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
          {/* KPIs Principales */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#4dd0e1]">{stats.totalUsuarios}</div>
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
                <div className="text-2xl font-bold text-green-600">${stats.ingresosTotales.toLocaleString()}</div>
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
                  {stats.talleresActivos + stats.gruposActivos + stats.actividadesActivas}
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
                <div className="text-2xl font-bold text-red-600">{stats.pagosVencidos + stats.itemsBajoStock}</div>
                <p className="text-xs text-muted-foreground">Pagos vencidos + Stock bajo</p>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico de Ingresos */}
          <Card>
            <CardHeader>
              <CardTitle>Ingresos por Mes</CardTitle>
              <CardDescription>Evolución de ingresos en los últimos 6 meses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-end justify-between gap-2 p-4">
                {chartData.ingresosMensuales.map((item, index) => (
                  <div key={index} className="flex flex-col items-center flex-1">
                    <div
                      className="bg-[#4dd0e1] w-full rounded-t"
                      style={{
                        height: `${(item.ingresos / Math.max(...chartData.ingresosMensuales.map((i) => i.ingresos))) * 200}px`,
                      }}
                    />
                    <span className="text-xs mt-2 text-gray-600">{item.mes}</span>
                    <span className="text-xs text-gray-500">${(item.ingresos / 1000).toFixed(0)}k</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Distribución de Actividades */}
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Talleres</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total:</span>
                  <span className="font-medium">{stats.totalTalleres}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Activos:</span>
                  <span className="font-medium text-green-600">{stats.talleresActivos}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Inscritos:</span>
                  <span className="font-medium">{data.talleres.reduce((sum, t) => sum + t.inscritos, 0)}</span>
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
                  <span className="font-medium">{stats.totalGrupos}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Activos:</span>
                  <span className="font-medium text-green-600">{stats.gruposActivos}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Participantes:</span>
                  <span className="font-medium">{data.grupos.reduce((sum, g) => sum + g.participantes, 0)}</span>
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
                  <span className="font-medium">{stats.totalActividades}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Activas:</span>
                  <span className="font-medium text-green-600">{stats.actividadesActivas}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Inscritos:</span>
                  <span className="font-medium">{data.actividades.reduce((sum, a) => sum + a.inscritos, 0)}</span>
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
                    {data.pagos.filter((p) => p.estado === "pagado").length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Pagos Pendientes:</span>
                  <span className="font-medium text-yellow-600">{stats.pagosPendientes}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Pagos Vencidos:</span>
                  <span className="font-medium text-red-600">{stats.pagosVencidos}</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total Ingresos:</span>
                    <span className="font-bold text-[#4dd0e1]">${stats.ingresosTotales.toLocaleString()}</span>
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
                  <span className="font-medium">{data.pagos.filter((p) => p.metodoPago === "efectivo").length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Transferencia:</span>
                  <span className="font-medium">
                    {data.pagos.filter((p) => p.metodoPago === "transferencia").length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Tarjeta:</span>
                  <span className="font-medium">{data.pagos.filter((p) => p.metodoPago === "tarjeta").length}</span>
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
                {["Cuota Mensual", "Taller", "Actividad"].map((concepto) => {
                  const pagosConcepto = data.pagos.filter(
                    (p) => p.concepto.toLowerCase().includes(concepto.toLowerCase()) && p.estado === "pagado",
                  )
                  const totalConcepto = pagosConcepto.reduce((sum, p) => sum + p.monto, 0)
                  const porcentaje = stats.ingresosTotales > 0 ? (totalConcepto / stats.ingresosTotales) * 100 : 0

                  return (
                    <div key={concepto} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{concepto}</span>
                        <span className="font-medium">${totalConcepto.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-[#4dd0e1] h-2 rounded-full" style={{ width: `${porcentaje}%` }} />
                      </div>
                      <div className="text-xs text-gray-500">{porcentaje.toFixed(1)}% del total</div>
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
                  {data.talleres.slice(0, 5).map((taller) => {
                    const ocupacion = taller.cupos > 0 ? (taller.inscritos / taller.cupos) * 100 : 0
                    return (
                      <div key={taller.id} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="truncate">{taller.nombre}</span>
                          <span className="font-medium">
                            {taller.inscritos}/{taller.cupos}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              ocupacion >= 80 ? "bg-red-500" : ocupacion >= 60 ? "bg-yellow-500" : "bg-green-500"
                            }`}
                            style={{ width: `${ocupacion}%` }}
                          />
                        </div>
                        <div className="text-xs text-gray-500">{ocupacion.toFixed(1)}% ocupado</div>
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
                  {data.grupos.map((grupo) => (
                    <div key={grupo.id} className="flex justify-between items-center">
                      <div>
                        <div className="font-medium text-sm">{grupo.nombre}</div>
                        <div className="text-xs text-gray-500">
                          {grupo.dia} - {grupo.horario}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-[#4dd0e1]">{grupo.participantes}</div>
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
                {chartData.inscripcionesPorMes.map((item, index) => (
                  <div key={index} className="flex flex-col items-center flex-1">
                    <div className="flex flex-col w-full gap-1">
                      <div
                        className="bg-blue-500 w-full rounded-t"
                        style={{
                          height: `${(item.talleres / 30) * 60}px`,
                        }}
                      />
                      <div
                        className="bg-green-500 w-full"
                        style={{
                          height: `${(item.grupos / 30) * 60}px`,
                        }}
                      />
                      <div
                        className="bg-[#4dd0e1] w-full"
                        style={{
                          height: `${(item.actividades / 30) * 60}px`,
                        }}
                      />
                    </div>
                    <span className="text-xs mt-2 text-gray-600">{item.mes}</span>
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
                  <span className="font-medium">{stats.inventarioTotal}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Bajo Stock:</span>
                  <span className="font-medium text-red-600">{stats.itemsBajoStock}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Valor Total:</span>
                  <span className="font-medium text-[#4dd0e1]">${stats.valorInventario.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Por Categoría</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {["Material Didáctico", "Material Terapéutico", "Mobiliario"].map((categoria) => {
                  const items = data.inventario.filter((i) => i.categoria === categoria)
                  return (
                    <div key={categoria} className="flex justify-between">
                      <span className="text-sm text-gray-600">{categoria}:</span>
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
                {stats.itemsBajoStock > 0 ? (
                  <div className="space-y-2">
                    {data.inventario
                      .filter((i) => i.cantidad <= i.stockMinimo)
                      .slice(0, 3)
                      .map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="truncate">{item.nombre}</span>
                          <span className="text-red-600">{item.cantidad}</span>
                        </div>
                      ))}
                    {stats.itemsBajoStock > 3 && (
                      <div className="text-xs text-gray-500">+{stats.itemsBajoStock - 3} más...</div>
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
                {data.inventario
                  .sort((a, b) => b.cantidad * b.precio - a.cantidad * a.precio)
                  .slice(0, 5)
                  .map((item) => (
                    <div key={item.id} className="flex justify-between items-center">
                      <div>
                        <div className="font-medium text-sm">{item.nombre}</div>
                        <div className="text-xs text-gray-500">
                          {item.cantidad} unidades × ${item.precio.toLocaleString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-[#4dd0e1]">
                          ${(item.cantidad * item.precio).toLocaleString()}
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
