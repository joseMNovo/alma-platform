"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import FilterChip from "@/components/ui/filter-chip"
import {
  Loader2, TrendingUp, ShoppingCart, GraduationCap, Wallet,
  Banknote, ArrowLeftRight, CircleDollarSign, AlertTriangle, ArrowRight,
} from "lucide-react"
import type { ResumenIngresos } from "@/lib/data-manager"

/**
 * Ingresos: toda la plata que entra, junta.
 *
 * Hasta acá cada módulo mostraba lo suyo —Academia su recaudación, el puesto
 * su caja— y para saber el total había que sumarlo a mano.
 *
 * Es SOLO LECTURA a propósito. Los botones llevan al módulo que corresponde en
 * vez de abrir un formulario: si se pudiera cargar un ingreso desde acá habría
 * dos pantallas creando la misma fila, y con el tiempo se separan.
 *
 * Y dice "registrados", no "recaudados". El total es lo que alguien cargó; si
 * entró una donación y nadie la anotó, acá no está. Un número que se hace pasar
 * por la verdad completa es peor que no tener número, porque se le cree.
 */

const pesos = (n: number) =>
  `$${Number(n || 0).toLocaleString("es-AR", { maximumFractionDigits: 0 })}`

const MESES = ["E", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"]

/** A dónde lleva cada origen. Sin ruta, la tarjeta no es clickeable. */
const DESTINO: Record<string, { ruta: string; icono: any }> = {
  capacitacion: { ruta: "/pagos-capacitaciones", icono: GraduationCap },
  stand: { ruta: "/puesto-venta", icono: ShoppingCart },
}

const ICONO_MEDIO: Record<string, any> = {
  efectivo: Banknote,
  transferencia: ArrowLeftRight,
  mercadopago: CircleDollarSign,
}

export default function IngresosTablero() {
  const router = useRouter()
  const [year, setYear] = useState<number>(new Date().getFullYear())
  const [datos, setDatos] = useState<ResumenIngresos | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let cancelado = false
    setCargando(true)
    fetch(`/api/ingresos?year=${year}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelado) setDatos(d) })
      .catch(() => { if (!cancelado) setDatos(null) })
      .finally(() => { if (!cancelado) setCargando(false) })
    return () => { cancelado = true }
  }, [year])

  if (cargando && !datos) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-[#4dd0e1]" />
      </div>
    )
  }

  if (!datos) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-gray-500">
          No se pudo cargar el resumen.
        </CardContent>
      </Card>
    )
  }

  // El año en curso siempre está, aunque todavía no haya entrado nada: si no,
  // un enero sin movimiento dejaría la pantalla sin ningún chip para tocar.
  const anios = Array.from(new Set([new Date().getFullYear(), ...datos.anios])).sort((a, b) => b - a)
  const maxMes = Math.max(...datos.por_mes.map((m) => Number(m.total)), 1)

  return (
    <div className="space-y-4 px-4 sm:px-0">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Ingresos</h2>
        <p className="text-sm text-gray-500">Todo lo que entra, junto</p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {anios.map((a) => (
          <FilterChip key={a} active={year === a} onClick={() => setYear(a)}>
            {a}
          </FilterChip>
        ))}
      </div>

      {/* ── El número grande ───────────────────────────────────────────── */}
      <Card className="border-[#4dd0e1]/30 bg-gradient-to-br from-[#4dd0e1]/10 to-transparent">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 py-5">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-8 w-8 shrink-0 text-[#00838f]" />
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">
                Registrado en {year}
              </p>
              <p className="text-3xl font-bold text-gray-900 sm:text-4xl">
                {pesos(Number(datos.total))}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-700">{datos.operaciones}</p>
            <p className="text-xs text-gray-500">
              {datos.operaciones === 1 ? "movimiento" : "movimientos"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Plata que existe en la base y no entra en ningún año, porque se cargó
          sin fecha de pago. Se muestra o se pierde de vista para siempre. */}
      {datos.sin_fecha.cantidad > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="flex items-start gap-2.5 py-3 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <p className="text-gray-700">
              Hay <strong>{datos.sin_fecha.cantidad}</strong>{" "}
              {datos.sin_fecha.cantidad === 1 ? "pago cargado" : "pagos cargados"} sin
              fecha, por <strong>{pesos(Number(datos.sin_fecha.total))}</strong>. No
              entran en ningún año, así que no están sumados acá arriba.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── De dónde viene ─────────────────────────────────────────────── */}
      {datos.por_origen.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            De dónde viene
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {datos.por_origen.map((o) => {
              const destino = DESTINO[o.key]
              const Icono = destino?.icono ?? Wallet
              const parte = Number(datos.total) > 0
                ? (Number(o.total) / Number(datos.total)) * 100
                : 0
              return (
                <Card
                  key={o.key}
                  onClick={destino ? () => router.push(destino.ruta) : undefined}
                  className={destino ? "cursor-pointer transition-colors hover:border-[#4dd0e1]" : ""}
                >
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <Icono className="h-4 w-4 shrink-0 text-[#00838f]" />
                        <span className="truncate font-medium text-gray-800">{o.label}</span>
                      </div>
                      {/* Lleva al módulo en vez de cargar acá: una sola
                          pantalla por dato, siempre la misma. */}
                      {destino && <ArrowRight className="h-3.5 w-3.5 shrink-0 text-gray-300" />}
                    </div>

                    <p className="mt-1 text-xl font-bold text-gray-900">{pesos(Number(o.total))}</p>
                    <p className="text-xs text-gray-500">
                      {o.operaciones} {o.operaciones === 1 ? "movimiento" : "movimientos"}
                      {" · "}{parte.toFixed(0)}% del total
                    </p>

                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-[#4dd0e1]"
                        style={{ width: `${Math.max(parte, 2)}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Cómo entró ─────────────────────────────────────────────────── */}
      {datos.por_medio.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Cómo entró
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            {datos.por_medio.map((m) => {
              const Icono = ICONO_MEDIO[m.key] ?? Wallet
              return (
                <Card key={m.key}>
                  <CardContent className="flex items-center gap-3 py-3">
                    <Icono className="h-5 w-5 shrink-0 text-gray-400" />
                    <div className="min-w-0">
                      <p className="truncate text-xs capitalize text-gray-500">
                        {m.key === "mercadopago" ? "Mercado Pago" : m.key}
                      </p>
                      <p className="font-bold text-gray-900">{pesos(Number(m.total))}</p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Cuándo ─────────────────────────────────────────────────────── */}
      {Number(datos.total) > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Mes a mes
          </p>
          <Card>
            <CardContent className="py-4">
              <div className="flex h-32 items-end gap-1">
                {datos.por_mes.map((m) => {
                  const alto = (Number(m.total) / maxMes) * 100
                  return (
                    <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                      <div className="flex w-full flex-1 items-end">
                        <div
                          className={`w-full rounded-t transition-all ${
                            Number(m.total) > 0 ? "bg-[#4dd0e1]" : "bg-gray-100"
                          }`}
                          style={{ height: `${Math.max(alto, 2)}%` }}
                          title={`${pesos(Number(m.total))}`}
                        />
                      </div>
                      <span className="text-[10px] text-gray-400">{MESES[m.month - 1]}</span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {Number(datos.total) === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            No hay ingresos registrados en {year}.
          </CardContent>
        </Card>
      )}

      <p className="pb-2 text-center text-xs text-gray-400">
        Suma lo registrado en Academia y en el puesto de venta. Lo que no se
        cargó en el sistema no aparece acá.
      </p>
    </div>
  )
}
