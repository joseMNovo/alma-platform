"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import BotonesInforme from "@/components/ui/botones-informe"
import {
  Loader2, ShoppingCart, Package, Wallet, Minus, Trash2,
  Banknote, ArrowLeftRight, Ban, PackagePlus, ListOrdered, UserPlus, AlertTriangle,
} from "lucide-react"

interface CurrentUser {
  id: number
  name: string
  role: string
  is_admin?: boolean
}

/** Una fila de la góndola. El stock no se guarda acá: `stock` viene del
 *  inventario, que es donde vive la mercadería. */
interface StandProduct {
  id: number
  name: string
  inventory_item_id?: number | null
  unit_price: number
  is_active: boolean
  sort_order: number
  sold: number
  stock: number
}

interface StandSale {
  id: number
  payment_method: "efectivo" | "transferencia"
  total: number
  customer_name?: string | null
  customer_email?: string | null
  is_void: boolean
  created_at?: string | null
  items: { product_id: number; product_name?: string | null; quantity: number; unit_price: number }[]
}

interface StandSummary {
  total: number
  efectivo: number
  transferencia: number
  sales_count: number
  by_product: { product_id: number; name: string; units: number; revenue: number }[]
}

type Vista = "vender" | "stock" | "caja" | "historial"

const pesos = (n: number) =>
  `$${Number(n || 0).toLocaleString("es-AR", { maximumFractionDigits: 0 })}`

/**
 * Lo que llega del backend, como número.
 *
 * Los importes son `Decimal` en Python y Pydantic los serializa como STRING
 * ("1500.00") para no perder centavos en el camino a JSON. Eso está bien, pero
 * en JavaScript `0 + "1500.00"` no suma: concatena. Sumar una lista de ventas
 * así daba "01500.00800.00", un string con dos puntos decimales que termina en
 * NaN — y encima el NaN quedaba escondido, porque `pesos()` lo pasa por
 * `n || 0` y NaN es falsy, así que se leía "$0".
 *
 * Toda cuenta que se haga acá con plata que vino del servidor pasa por acá.
 */
const num = (v: unknown): number => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/**
 * Fecha y hora en el huso del teléfono, con red por si el navegador no sabe
 * leer lo que mandó el servidor.
 *
 * El backend manda ISO con offset (`2026-09-19T20:49:00+02:00`) y eso lo
 * parsea cualquier navegador moderno. Pero Safari viejo se atraganta con los
 * microsegundos y con la variante que usa un espacio en vez de la `T`, y
 * devuelve `Invalid Date` — que en pantalla se lee como "NaN".
 *
 * Tres intentos, de mejor a peor: parseo directo, parseo normalizado, y si
 * todo falla, se recortan los dígitos del propio texto. Mal que mal, ver la
 * hora del servidor es mejor que ver "Invalid Date" en medio de una venta.
 */
function fechaHora(valor?: string | null): { fecha: string; hora: string } {
  if (!valor) return { fecha: "", hora: "" }

  let d = new Date(valor)
  if (isNaN(d.getTime())) {
    d = new Date(valor.replace(" ", "T").replace(/\.\d+/, ""))
  }
  if (isNaN(d.getTime())) {
    return { fecha: valor.slice(8, 10) + "/" + valor.slice(5, 7), hora: valor.slice(11, 16) }
  }
  return {
    fecha: d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" }),
    hora: d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
  }
}

/** Puesto de venta del stand.
 *
 *  Pensado para usarse parado en el Monumento, con una mano y sin tiempo:
 *  botones grandes, una pantalla por tarea y el total siempre a la vista.
 */
export default function PuestoVentaManager({ user }: { user: CurrentUser }) {
  const { toast } = useToast()
  const [vista, setVista] = useState<Vista>("vender")
  const [productos, setProductos] = useState<StandProduct[]>([])
  const [ventas, setVentas] = useState<StandSale[]>([])
  const [caja, setCaja] = useState<StandSummary | null>(null)
  const [cargando, setCargando] = useState(true)
  const [cobrando, setCobrando] = useState(false)

  /** Carrito: id de producto → cantidad. */
  const [carrito, setCarrito] = useState<Record<number, number>>({})

  /** Datos que la persona quiera dejar. Opcionales SIEMPRE: en el stand,
   *  pedir datos no puede frenar el cobro. No se le manda nada. */
  const [cliente, setCliente] = useState({ nombre: "", mail: "" })
  const [pidiendoDatos, setPidiendoDatos] = useState(false)

  // `quantity` no es del producto sino del ítem del inventario. Viaja en el
  // mismo formulario porque para quien carga es un solo dato: cuánto hay.
  const [editando, setEditando] = useState<(Partial<StandProduct> & { quantity?: number }) | null>(null)
  /** Producto a punto de quitarse. Quitar no puede ser un click al pasar:
   *  los dos botones viven pegados y ya hubo quien lo tocó sin querer. */
  const [porQuitar, setPorQuitar] = useState<StandProduct | null>(null)
  const [guardandoProducto, setGuardandoProducto] = useState(false)


  /**
   * Los números del período que está mirando el historial.
   *
   * Se calculan acá y no se le piden al backend: `ventas` YA es exactamente el
   * conjunto filtrado por el rango —es lo que se está mostrando— así que un
   * endpoint nuevo devolvería los mismos totales con un viaje de más y, peor,
   * con la posibilidad de no coincidir con la tabla de abajo si alguno de los
   * dos filtra distinto. Son decenas de filas, no millones.
   *
   * Las anuladas quedan afuera de todos los totales: una venta anulada no
   * recaudó nada. Siguen apareciendo en la tabla porque sí importa saber que
   * existió y que alguien la dio de baja.
   */
  const resumen = useMemo(() => {
    const validas = ventas.filter(v => !v.is_void)
    const total = validas.reduce((a, v) => a + num(v.total), 0)
    const efectivo = validas
      .filter(v => v.payment_method === "efectivo")
      .reduce((a, v) => a + num(v.total), 0)

    const porProducto = new Map<string, { nombre: string; unidades: number; importe: number }>()
    const porDia = new Map<string, number>()

    for (const v of validas) {
      for (const i of v.items) {
        const nombre = i.product_name ?? "?"
        const fila = porProducto.get(nombre) ?? { nombre, unidades: 0, importe: 0 }
        fila.unidades += num(i.quantity)
        fila.importe += num(i.quantity) * num(i.unit_price)
        porProducto.set(nombre, fila)
      }
      // La fecha se corta del ISO en vez de pasar por Date: `new Date` lo
      // mueve a la zona del navegador y una venta de las 22 h caía al día
      // siguiente.
      if (v.created_at) {
        const dia = v.created_at.slice(0, 10)
        porDia.set(dia, (porDia.get(dia) ?? 0) + num(v.total))
      }
    }

    const productos = [...porProducto.values()].sort((a, b) => b.importe - a.importe)
    const dias = [...porDia.entries()].sort((a, b) => a[0].localeCompare(b[0]))

    return {
      total,
      efectivo,
      transferencia: total - efectivo,
      cantidad: validas.length,
      promedio: validas.length ? total / validas.length : 0,
      anuladas: ventas.length - validas.length,
      productos,
      topProducto: Math.max(1, ...productos.map(f => f.importe)),
      dias,
      topDia: Math.max(1, ...dias.map(([, v]) => v)),
    }
  }, [ventas])

  /** Rango del historial. Filtra la lista Y alimenta el informe: un solo
   *  selector para las dos cosas, para que nadie se baje un período distinto
   *  del que está mirando. Vacío = las últimas 50, como venía. */
  const [rango, setRango] = useState({ desde: "", hasta: "" })

  useEffect(() => { cargar() }, [])

  const cargar = async (conRango = rango) => {
    try {
      // Con fechas el backend ignora el límite: el período es el recorte.
      // Sin esto el historial mostraba SIEMPRE las últimas 50 y, pasadas
      // esas, escondía las viejas sin avisarle a nadie.
      const qs = new URLSearchParams({ limit: "50" })
      if (conRango.desde) qs.set("desde", conRango.desde)
      if (conRango.hasta) qs.set("hasta", conRango.hasta)

      const [p, v, c] = await Promise.all([
        fetch("/api/stand/productos").then(r => (r.ok ? r.json() : [])),
        fetch(`/api/stand/ventas?${qs.toString()}`).then(r => (r.ok ? r.json() : [])),
        fetch("/api/stand/caja").then(r => (r.ok ? r.json() : null)),
      ])
      setProductos(Array.isArray(p) ? p : [])
      setVentas(Array.isArray(v) ? v : [])
      setCaja(c)
    } catch {
      toast({ title: "No se pudo cargar el puesto", variant: "destructive" })
    } finally {
      setCargando(false)
    }
  }

  // ── Carrito ──────────────────────────────────────────────────────────
  const sumar = (id: number) => setCarrito(c => ({ ...c, [id]: (c[id] || 0) + 1 }))
  const restar = (id: number) =>
    setCarrito(c => {
      const n = (c[id] || 0) - 1
      const copia = { ...c }
      if (n <= 0) delete copia[id]
      else copia[id] = n
      return copia
    })
  const vaciar = () => setCarrito({})

  const total = useMemo(
    () =>
      Object.entries(carrito).reduce((acc, [id, cant]) => {
        const p = productos.find(x => x.id === Number(id))
        return acc + (p ? Number(p.unit_price) * cant : 0)
      }, 0),
    [carrito, productos],
  )

  const unidades = useMemo(
    () => Object.values(carrito).reduce((a, b) => a + b, 0),
    [carrito],
  )

  const cobrar = async (medio: "efectivo" | "transferencia") => {
    const items = Object.entries(carrito).map(([id, cantidad]) => ({
      product_id: Number(id),
      quantity: cantidad,
    }))
    if (!items.length) return

    setCobrando(true)
    try {
      const res = await fetch("/api/stand/ventas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payment_method: medio,
          items,
          customer_name: cliente.nombre.trim() || null,
          customer_email: cliente.mail.trim() || null,
        }),
      })
      if (!res.ok) {
        // Sin stock no es un error del sistema: es el mostrador diciendo que
        // no queda. Se muestra el motivo y se recargan los productos, porque
        // lo más probable es que otro haya vendido lo que faltaba.
        const detalle = (await res.json().catch(() => ({})))?.error
        throw new Error(res.status === 409 ? detalle : "")
      }
      const venta: StandSale = await res.json()
      toast({ title: `Venta registrada · ${pesos(venta.total)}` })
      vaciar()
      setCliente({ nombre: "", mail: "" })
      setPidiendoDatos(false)
      cargar()
    } catch (error: any) {
      toast({
        title: error?.message || "No se pudo registrar la venta",
        variant: "destructive",
      })
      if (error?.message) cargar()
    } finally {
      setCobrando(false)
    }
  }

  const anular = async (id: number) => {
    try {
      const res = await fetch(`/api/stand/ventas?id=${id}`, { method: "PUT" })
      if (!res.ok) throw new Error()
      toast({ title: "Venta anulada" })
      cargar()
    } catch {
      toast({ title: "No se pudo anular", variant: "destructive" })
    }
  }

  // ── Productos ────────────────────────────────────────────────────────
  const guardarProducto = async () => {
    if (!editando?.name?.trim()) {
      toast({ title: "Falta el nombre", variant: "destructive" })
      return
    }
    setGuardandoProducto(true)
    try {
      // `quantity` es la mercadería, y va al inventario. Dar de alta un
      // producto acá da de alta el ítem allá: son la misma cosa.
      const body = {
        name: editando.name.trim(),
        unit_price: Number(editando.unit_price) || 0,
        quantity: Number(editando.quantity) || 0,
        sort_order: Number(editando.sort_order) || 0,
      }
      const url = editando.id ? `/api/stand/productos?id=${editando.id}` : "/api/stand/productos"
      const res = await fetch(url, {
        method: editando.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      setEditando(null)
      cargar()
    } catch {
      toast({ title: "No se pudo guardar el producto", variant: "destructive" })
    } finally {
      setGuardandoProducto(false)
    }
  }

  const desactivar = async (id: number) => {
    try {
      const res = await fetch(`/api/stand/productos?id=${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast({ title: "Producto quitado" })
      setPorQuitar(null)
      cargar()
    } catch {
      toast({ title: "No se pudo quitar", variant: "destructive" })
    }
  }

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-[#4dd0e1]" />
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-32">
      {/* Encabezado + cambio de vista */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-6 w-6 text-[#4dd0e1]" />
          <h2 className="text-xl font-bold text-gray-900">Puesto de venta</h2>
        </div>
        <div className="inline-flex w-full overflow-x-auto rounded-lg border border-gray-200 bg-white p-1 sm:w-auto">
          {([
            ["vender", "Vender", ShoppingCart],
            ["stock", "Stock", Package],
            ["caja", "Caja", Wallet],
            ["historial", "Historial", ListOrdered],
          ] as const).map(([clave, texto, Icono]) => (
            <button
              key={clave}
              onClick={() => setVista(clave)}
              className={`inline-flex flex-1 shrink-0 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors sm:flex-none ${
                vista === clave ? "bg-[#4dd0e1] text-white" : "text-gray-600 hover:text-[#00838f]"
              }`}
            >
              <Icono className="h-4 w-4" />
              {texto}
            </button>
          ))}
        </div>
      </div>

      {/* ── VENDER ─────────────────────────────────────────────────── */}
      {vista === "vender" && (
        <>
          {productos.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                No hay productos cargados. Agregalos desde <strong>Stock</strong>.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
              {productos.map(p => {
                const cant = carrito[p.id] || 0
                const sinStock = p.stock <= 0
                return (
                  <button
                    key={p.id}
                    onClick={() => sumar(p.id)}
                    disabled={sinStock && cant === 0}
                    className={`relative min-h-[88px] rounded-xl border-2 bg-white p-2.5 text-left transition-transform active:scale-[0.98] disabled:opacity-40 ${
                      cant > 0 ? "border-[#4dd0e1] bg-[#4dd0e1]/5" : "border-gray-100"
                    }`}
                  >
                    <p className="pr-9 text-sm font-semibold leading-tight text-gray-900">{p.name}</p>
                    <p className="mt-0.5 text-base font-bold text-[#00838f]">{pesos(p.unit_price)}</p>
                    <p className={`text-[11px] ${sinStock ? "text-red-500" : "text-gray-400"}`}>
                      {sinStock ? "Sin stock" : `Quedan ${p.stock}`}
                    </p>

                    {/* Toda la tarjeta suma uno: es el gesto que se repite cien
                        veces en la tarde. La cantidad y el menos aparecen solo
                        cuando hay algo cargado, así la grilla queda más baja y
                        los 8 productos entran sin scrollear en el teléfono. */}
                    {cant > 0 && (
                      <>
                        {/* `key={cant}` a propósito: al cambiar el número React
                            vuelve a montar el elemento y la animación se repite.
                            Ese salto es lo que enseña, sin un solo cartel, que
                            tocar de nuevo suma otro. */}
                        <span
                          key={cant}
                          className="absolute right-2 top-2 flex h-7 min-w-[1.75rem] items-center justify-center rounded-full bg-[#4dd0e1] px-1.5 text-sm font-bold tabular-nums text-white duration-200 animate-in zoom-in-50"
                        >
                          {cant}
                        </span>
                        <span
                          key={`mas-${cant}`}
                          aria-hidden
                          className="pointer-events-none absolute left-1/2 top-1/2 animate-sumar-uno text-base font-bold text-[#00838f]"
                        >
                          +1
                        </span>
                        <span
                          role="button"
                          tabIndex={0}
                          aria-label={`Quitar uno de ${p.name}`}
                          onClick={e => { e.stopPropagation(); restar(p.id) }}
                          onKeyDown={e => {
                            if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); restar(p.id) }
                          }}
                          className="absolute bottom-1.5 right-1.5 flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 active:bg-gray-100"
                        >
                          <Minus className="h-4 w-4" />
                        </span>
                      </>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {/* Barra de cobro: pegada abajo y siempre visible mientras haya
              algo en el carrito. Es la única acción que importa acá. */}
          {unidades > 0 && (
            <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-lg backdrop-blur">
              <div className="mx-auto flex max-w-4xl flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    {unidades} {unidades === 1 ? "unidad" : "unidades"}
                  </span>
                  <span className="text-2xl font-bold text-gray-900">{pesos(total)}</span>
                </div>
                {/* Datos opcionales, colapsados: en el stand lo primero es
                    cobrar, y pedir el mail no puede meterse en el medio. */}
                {pidiendoDatos ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Nombre (opcional)"
                      value={cliente.nombre}
                      onChange={e => setCliente(c => ({ ...c, nombre: e.target.value }))}
                    />
                    <Input
                      placeholder="Mail (opcional)"
                      inputMode="email"
                      value={cliente.mail}
                      onChange={e => setCliente(c => ({ ...c, mail: e.target.value }))}
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => setPidiendoDatos(true)}
                    className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-[#00838f] hover:underline"
                  >
                    <UserPlus className="h-4 w-4" /> Agregar nombre y mail
                  </button>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" className="h-12 w-12 shrink-0" onClick={vaciar}>
                    <Trash2 className="h-5 w-5" />
                  </Button>
                  <Button
                    className="h-12 flex-1 gap-2 bg-emerald-600 text-base hover:bg-emerald-700"
                    onClick={() => cobrar("efectivo")} disabled={cobrando}
                  >
                    <Banknote className="h-5 w-5" /> Efectivo
                  </Button>
                  <Button
                    className="h-12 flex-1 gap-2 bg-[#4dd0e1] text-base hover:bg-[#3bb8c9]"
                    onClick={() => cobrar("transferencia")} disabled={cobrando}
                  >
                    <ArrowLeftRight className="h-5 w-5" /> Transfer.
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── STOCK ──────────────────────────────────────────────────── */}
      {vista === "stock" && (
        <>
          <div className="flex justify-end">
            <Button
              className="gap-2 bg-[#4dd0e1] hover:bg-[#3bb8c9]"
              onClick={() => setEditando({ name: "", unit_price: 0, quantity: 0, sort_order: productos.length + 1 })}
            >
              <PackagePlus className="h-4 w-4" /> Nuevo producto
            </Button>
          </div>

          {/* ── CELULAR: tarjetas ──
              La tabla necesita 520px de ancho y en un teléfono obligaba a
              scrollear de costado para llegar a los botones. */}
          <div className="space-y-2 sm:hidden">
            {productos.map(p => (
              <div key={p.id} className="rounded-xl border border-gray-200 bg-white p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold leading-tight text-gray-900">{p.name}</p>
                  <p className="shrink-0 font-bold text-[#00838f]">{pesos(p.unit_price)}</p>
                </div>

                {/* "Inicial" ya no está: el stock lo lleva el inventario y se
                    puede corregir a mano, así que un número de arranque
                    congelado dejó de significar algo. */}
                <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                  <span>Vendidos <strong className="tabular-nums text-gray-700">{p.sold}</strong></span>
                  <span className={p.stock <= 0 ? "text-red-500" : ""}>
                    Quedan <strong className={`tabular-nums ${p.stock <= 0 ? "text-red-600" : "text-gray-900"}`}>{p.stock}</strong>
                  </span>
                </div>

                <div className="mt-3 flex gap-2">
                  <Button variant="outline" className="h-10 flex-1" onClick={() => setEditando({ ...p, quantity: p.stock })}>
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    className="h-10 flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => setPorQuitar(p)}
                  >
                    Quitar
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* ── ESCRITORIO: tabla ── */}
          <div className="hidden overflow-x-auto rounded-xl border border-gray-200 bg-white sm:block">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/80 text-left text-gray-600">
                  <th className="px-4 py-2 font-semibold">Producto</th>
                  <th className="px-4 py-2 font-semibold">Precio</th>
                  <th className="px-4 py-2 font-semibold">Vendidos</th>
                  <th className="px-4 py-2 font-semibold">Quedan</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {productos.map(p => (
                  <tr key={p.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-2 font-medium text-gray-900">{p.name}</td>
                    <td className="px-4 py-2 tabular-nums">{pesos(p.unit_price)}</td>
                    <td className="px-4 py-2 tabular-nums text-gray-500">{p.sold}</td>
                    <td className={`px-4 py-2 font-semibold tabular-nums ${p.stock <= 0 ? "text-red-500" : "text-gray-900"}`}>
                      {p.stock}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setEditando({ ...p, quantity: p.stock })}>
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => setPorQuitar(p)}
                        >
                          Quitar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── CAJA ───────────────────────────────────────────────────── */}
      {vista === "caja" && caja && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi label="Recaudado" value={pesos(caja.total)} destacado />
            <Kpi label="Efectivo" value={pesos(caja.efectivo)} />
            <Kpi label="Transferencia" value={pesos(caja.transferencia)} />
            <Kpi label="Ventas" value={String(caja.sales_count)} />
          </div>

          <div className="rounded-xl border border-gray-200 bg-white">
            <table className="w-full table-fixed text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/80 text-gray-600">
                  <th className="px-3 py-2 text-left font-semibold">Producto</th>
                  <th className="w-20 px-2 py-2 text-right font-semibold">Unid.</th>
                  <th className="w-28 px-3 py-2 text-right font-semibold">Recaudado</th>
                </tr>
              </thead>
              <tbody>
                {caja.by_product.length === 0 ? (
                  <tr><td colSpan={3} className="px-3 py-8 text-center text-gray-400">Todavía no se vendió nada.</td></tr>
                ) : caja.by_product.map(f => (
                  <tr key={f.product_id} className="border-b border-gray-100 last:border-0">
                    <td className="truncate px-3 py-2 font-medium text-gray-900">{f.name}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{f.units}</td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums text-[#00838f]">{pesos(f.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Últimas ventas
            </p>
            {/* Alto máximo con scroll propio: en una jornada esto llega a
                cientos de filas y no puede empujar la caja fuera de pantalla.
                Vienen de la API ordenadas de la más nueva a la más vieja. */}
            <div className="max-h-[360px] overflow-y-auto rounded-xl border border-gray-200 bg-white">
              <table className="w-full table-fixed text-sm">
                <tbody>
                  {ventas.length === 0 ? (
                    <tr><td className="px-3 py-8 text-center text-gray-400">Todavía no hay ventas.</td></tr>
                  ) : ventas.map(v => (
                    <tr
                      key={v.id}
                      className={`border-b border-gray-100 last:border-0 ${v.is_void ? "opacity-50" : ""}`}
                    >
                      <td className="px-3 py-2">
                        <p className={`truncate ${v.is_void ? "line-through" : ""}`}>
                          {v.items.map(i => `${i.quantity}× ${i.product_name ?? "?"}`).join(", ")}
                        </p>
                        <p className="text-[11px] text-gray-400">
                          {v.payment_method === "efectivo" ? "Efectivo" : "Transferencia"}
                          {v.is_void ? " · anulada" : ""}
                        </p>
                      </td>
                      <td className="w-20 px-1 py-2 text-right text-[11px] leading-tight text-gray-400">
                        {v.created_at && (
                          <>
                            {fechaHora(v.created_at).fecha}
                            <br />
                            {fechaHora(v.created_at).hora}
                          </>
                        )}
                      </td>
                      <td className="w-24 px-2 py-2 text-right">
                        <span className="font-semibold tabular-nums">{pesos(v.total)}</span>
                        {!v.is_void && (
                          <button
                            onClick={() => anular(v.id)}
                            title="Anular venta"
                            className="ml-1 align-middle text-red-400 hover:text-red-600"
                          >
                            <Ban className="inline h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── HISTORIAL ──────────────────────────────────────────────── */}
      {vista === "historial" && (
        <div className="space-y-1.5">
          {/* Sin tarjeta y en una sola fila, como la barra de Inventario: esto
              es un filtro, no una sección. En celular las dos fechas se
              reparten el ancho y los botones caen abajo; en escritorio entra
              todo en un renglón. */}
          <div className="mb-3 flex flex-wrap items-end gap-2">
            <div className="flex min-w-0 flex-1 items-end gap-2 sm:flex-initial">
              <div className="min-w-0 flex-1 space-y-1 sm:w-36 sm:flex-initial">
                <Label className="text-xs text-gray-500">Desde</Label>
                <Input
                  type="date"
                  className="h-9 w-full"
                  value={rango.desde}
                  onChange={e => { const r = { ...rango, desde: e.target.value }; setRango(r); cargar(r) }}
                />
              </div>
              <div className="min-w-0 flex-1 space-y-1 sm:w-36 sm:flex-initial">
                <Label className="text-xs text-gray-500">Hasta</Label>
                <Input
                  type="date"
                  className="h-9 w-full"
                  value={rango.hasta}
                  onChange={e => { const r = { ...rango, hasta: e.target.value }; setRango(r); cargar(r) }}
                />
              </div>
            </div>

            <BotonesInforme endpoint="/api/stand/informe" rango={rango} className="sm:ml-auto" />

            {(rango.desde || rango.hasta) && (
              <button
                onClick={() => { const r = { desde: "", hasta: "" }; setRango(r); cargar(r) }}
                className="pb-2 text-xs text-gray-400 underline hover:text-gray-600"
              >
                Limpiar
              </button>
            )}
          </div>

          {/* Sin rango se ven las últimas 50. Se dice, en vez de dejar creer
              que eso es todo lo que hay. */}
          {!rango.desde && !rango.hasta && ventas.length >= 50 && (
            <p className="pb-1 text-xs text-gray-400">
              Últimas 50 ventas. Para ver más atrás, elegí un rango de fechas.
            </p>
          )}

          {ventas.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                {rango.desde || rango.hasta
                  ? "No hay ventas en el período elegido."
                  : "Todavía no hay ventas."}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Los números primero. La pregunta que trae a alguien al
                  historial casi nunca es "¿qué vendí a las 14:32?" sino
                  "¿cómo nos fue?"; la lista contesta la primera y antes era
                  lo único que había. */}
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                <Kpi label="Recaudado" value={pesos(resumen.total)} destacado />
                <Kpi label="Ventas" value={String(resumen.cantidad)} />
                <Kpi label="Ticket promedio" value={pesos(resumen.promedio)} />
                <Kpi label="Efectivo" value={pesos(resumen.efectivo)} />
                <Kpi label="Transferencia" value={pesos(resumen.transferencia)} />
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {/* Qué se vendió. Las barras son contra el producto más
                    vendido del período, no contra el total: lo que importa
                    acá es el orden entre ellos. */}
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Lo más vendido
                  </p>
                  <div className="space-y-2">
                    {resumen.productos.slice(0, 6).map(f => (
                      <div key={f.nombre} className="space-y-1">
                        <div className="flex items-baseline justify-between gap-3 text-sm">
                          <span className="truncate font-medium text-gray-800">{f.nombre}</span>
                          <span className="shrink-0 text-xs text-gray-400">
                            {f.unidades} u · <span className="font-semibold text-[#00838f]">{pesos(f.importe)}</span>
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full bg-[#4dd0e1]"
                            style={{ width: `${(f.importe / resumen.topProducto) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                    {resumen.productos.length > 6 && (
                      <p className="pt-1 text-xs text-gray-400">
                        y {resumen.productos.length - 6} producto{resumen.productos.length - 6 === 1 ? "" : "s"} más
                      </p>
                    )}
                  </div>
                </div>

                {/* Por día. Solo con más de una jornada adentro del rango: con
                    un día solo sería una barra sola al 100%, que no compara
                    nada y repite el número de arriba. */}
                {resumen.dias.length > 1 && (
                  <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      Por jornada
                    </p>
                    <div className="space-y-2">
                      {resumen.dias.slice(-8).map(([dia, importe]) => (
                        <div key={dia} className="flex items-center gap-2.5 text-sm">
                          <span className="w-16 shrink-0 text-xs text-gray-500">{diaCorto(dia)}</span>
                          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                            <span
                              className="block h-full rounded-full bg-[#9A8BC2]"
                              style={{ width: `${(importe / resumen.topDia) * 100}%` }}
                            />
                          </span>
                          <span className="w-24 shrink-0 text-right text-xs font-semibold tabular-nums text-gray-700">
                            {pesos(importe)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* El detalle, ahora como tabla. Las tarjetas apiladas obligaban
                  a leer cada venta entera para comparar dos: en columnas, los
                  montos se alinean y el ojo las compara solo. */}
              <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/80 text-gray-600">
                      <th className="w-32 px-3 py-2 text-left font-semibold">Cuándo</th>
                      <th className="px-3 py-2 text-left font-semibold">Qué se vendió</th>
                      <th className="w-44 px-3 py-2 text-left font-semibold">Cliente</th>
                      <th className="w-28 px-3 py-2 text-left font-semibold">Pago</th>
                      <th className="w-28 px-3 py-2 text-right font-semibold">Total</th>
                      <th className="w-10 px-2 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {ventas.map(v => (
                      <tr
                        key={v.id}
                        className={`border-b border-gray-100 last:border-0 ${
                          v.is_void ? "bg-gray-50/60 text-gray-400" : ""
                        }`}
                      >
                        <td className="px-3 py-2 align-top text-xs text-gray-500">
                          {v.created_at && (
                            <>
                              {fechaHora(v.created_at).fecha}
                              <span className="block text-gray-400">{fechaHora(v.created_at).hora}</span>
                            </>
                          )}
                        </td>
                        <td className={`px-3 py-2 align-top ${v.is_void ? "line-through" : "text-gray-800"}`}>
                          {v.items.map(i => `${i.quantity}× ${i.product_name ?? "?"}`).join(", ")}
                          {v.is_void && (
                            <span className="ml-1.5 rounded-full bg-gray-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 no-underline">
                              anulada
                            </span>
                          )}
                        </td>
                        <td className="truncate px-3 py-2 align-top text-xs text-[#00838f]">
                          {[v.customer_name, v.customer_email].filter(Boolean).join(" · ") || "—"}
                        </td>
                        <td className="px-3 py-2 align-top text-xs text-gray-500">
                          {v.payment_method === "efectivo" ? "Efectivo" : "Transferencia"}
                        </td>
                        <td className="px-3 py-2 align-top text-right font-semibold tabular-nums">
                          {pesos(v.total)}
                        </td>
                        <td className="px-2 py-2 align-top text-right">
                          {!v.is_void && (
                            <button
                              onClick={() => anular(v.id)}
                              title="Anular venta"
                              className="text-red-400 transition-colors hover:text-red-600"
                            >
                              <Ban className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {resumen.anuladas > 0 && (
                <p className="text-xs text-gray-400">
                  {resumen.anuladas} venta{resumen.anuladas === 1 ? "" : "s"} anulada
                  {resumen.anuladas === 1 ? "" : "s"} en el período. No suman a los totales de arriba.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Confirmación de baja. Existe porque los dos botones viven pegados y
          alguien quitó productos sin querer durante una prueba. Se explica
          qué pasa de verdad —que las ventas viejas no se tocan— para que la
          decisión se tome con información y no con miedo. */}
      <Dialog open={!!porQuitar} onOpenChange={abierto => !abierto && setPorQuitar(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </span>
              ¿Quitar {porQuitar?.name}?
            </DialogTitle>
          </DialogHeader>

          <p className="text-sm text-gray-600">
            Deja de aparecer en <strong>Vender</strong> y en <strong>Stock</strong>.
            Las ventas que ya se hicieron con este producto quedan como están, y la
            caja sigue cerrando igual.
          </p>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setPorQuitar(null)}>
              Cancelar
            </Button>
            <Button
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => porQuitar && desactivar(porQuitar.id)}
            >
              Sí, quitar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alta / edición de producto */}
      <Dialog open={!!editando} onOpenChange={abierto => !abierto && setEditando(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editando?.id ? "Editar producto" : "Nuevo producto"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nombre</Label>
              <Input
                value={editando?.name ?? ""}
                onChange={e => setEditando(p => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Precio</Label>
                <Input
                  type="number" inputMode="numeric"
                  value={editando?.unit_price ?? 0}
                  onChange={e => setEditando(p => ({ ...p, unit_price: Number(e.target.value) }))}
                />
              </div>
              <div>
                <Label>Cantidad</Label>
                <Input
                  type="number" inputMode="numeric"
                  value={editando?.quantity ?? 0}
                  onChange={e => setEditando(p => ({ ...p, quantity: Number(e.target.value) }))}
                />
              </div>
            </div>
            <p className="text-xs text-gray-500">
              {editando?.id
                ? "La cantidad es el stock del inventario. Cambiala si contaste y no coincide."
                : "Se da de alta también en el inventario: es la misma mercadería."}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditando(null)}>Cancelar</Button>
            <Button className="bg-[#4dd0e1] hover:bg-[#3bb8c9]" onClick={guardarProducto} disabled={guardandoProducto}>
              {guardandoProducto ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/** "lun 14/10" a partir de un "2026-10-05" suelto.
 *
 *  Se parte el string a mano en vez de `new Date(iso)`: con la fecha pelada,
 *  el navegador la interpreta como UTC y en Argentina la retrasa un día. */
function diaCorto(iso: string): string {
  const [a, m, d] = iso.split("-").map(Number)
  if (!a || !m || !d) return iso
  const f = new Date(a, m - 1, d)
  const dia = f.toLocaleDateString("es-AR", { weekday: "short" }).replace(".", "")
  return `${dia} ${d}/${m}`
}

function Kpi({ label, value, destacado }: { label: string; value: string; destacado?: boolean }) {
  return (
    <Card className="border border-gray-200">
      <CardContent className="p-4">
        <p className={`tabular-nums leading-none ${destacado ? "text-2xl font-bold text-[#00838f]" : "text-xl font-bold text-gray-900"}`}>
          {value}
        </p>
        <p className="mt-1 truncate text-xs text-gray-500">{label}</p>
      </CardContent>
    </Card>
  )
}
