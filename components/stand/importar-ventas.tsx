"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Upload, FileJson, Check, TriangleAlert } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface VentaDelArchivo {
  client_uuid?: string
  occurred_at?: string
  payment_method?: string
  total?: number
  items?: { quantity: number; product_name?: string }[]
}

/**
 * Importar el archivo de ventas que mandó un teléfono.
 *
 * Es la otra punta del export: la salida de emergencia que no depende de que
 * ese teléfono se vuelva a conectar nunca. Si se rompe, se pierde o la
 * persona se va de viaje con las ventas adentro, el archivo las trae igual.
 *
 * ── Por qué está en Historial y no en una pestaña propia ──────────────
 *
 * Importar no es una función aparte: es COMPLETAR una jornada. Llegás a tu
 * casa, abrís el historial del sábado, ves 11 ventas, sabés que faltan las
 * del otro teléfono, importás y las ves aparecer en la misma lista de abajo.
 * Verificás donde importaste.
 *
 * Y así no se le agrega un botón a la barra que se usa vendiendo: `Vender ·
 * Stock · Caja · Historial` la toca un voluntario parado en una feria. Meterle
 * ahí algo que el admin usa una vez cada dos meses es ensuciar la herramienta
 * del que trabaja para comodidad del que audita.
 *
 * ── Por qué se puede importar el mismo archivo diez veces ─────────────
 *
 * Cada venta trae el `client_uuid` que le puso el teléfono. El servidor
 * reconoce las que ya tiene y las ignora. Eso es lo que permite importar el
 * archivo Y además dejar que el teléfono sincronice solo cuando recupere
 * señal, sin que la caja se duplique.
 */
export default function ImportarVentas({ onImportado }: { onImportado: () => void }) {
  const { toast } = useToast()
  const [abierto, setAbierto] = useState(false)
  const [nombre, setNombre] = useState("")
  const [ventas, setVentas] = useState<VentaDelArchivo[]>([])
  const [error, setError] = useState("")
  const [subiendo, setSubiendo] = useState(false)

  const limpiar = () => {
    setNombre(""); setVentas([]); setError(""); setSubiendo(false)
  }

  const elegir = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0]
    // Se limpia el input para que elegir DOS VECES el mismo archivo vuelva a
    // disparar el evento: si no, corregís algo, lo volvés a elegir y no pasa
    // nada, que se lee como que la pantalla se colgó.
    e.target.value = ""
    if (!archivo) return

    limpiar()
    setNombre(archivo.name)
    try {
      const datos = JSON.parse(await archivo.text())
      const lista = Array.isArray(datos) ? datos : datos?.ventas
      if (!Array.isArray(lista) || lista.length === 0) {
        setError("El archivo no tiene ventas adentro.")
        return
      }
      if (lista.some((v: VentaDelArchivo) => !v.client_uuid)) {
        setError("Hay ventas sin identificador. Ese archivo no se puede importar sin arriesgar duplicados.")
        return
      }
      setVentas(lista)
    } catch {
      setError("No pudimos leer el archivo. ¿Es el .json que exportó el puesto?")
    }
  }

  const importar = async () => {
    setSubiendo(true)
    try {
      const res = await fetch("/api/stand/ventas/sync?origen=importada", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ventas),
      })
      const r = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(r?.error || "")

      const partes = [`${r.creadas} cargada${r.creadas === 1 ? "" : "s"}`]
      if (r.repetidas) partes.push(`${r.repetidas} ya estaba${r.repetidas === 1 ? "" : "n"}`)
      if (r.rechazadas?.length) partes.push(`${r.rechazadas.length} con problemas`)

      toast({ title: "Ventas importadas", description: partes.join(" · ") })
      setAbierto(false)
      limpiar()
      onImportado()
    } catch (e: any) {
      setError(e?.message || "No se pudieron importar.")
    } finally {
      setSubiendo(false)
    }
  }

  const total = ventas.reduce((a, v) => a + Number(v.total || 0), 0)
  const fechas = ventas.map(v => v.occurred_at).filter(Boolean).sort() as string[]
  const dia = (iso?: string) =>
    iso ? new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "short" }) : ""

  return (
    <>
      <Button variant="outline" className="h-9 gap-2" onClick={() => setAbierto(true)}>
        <Upload className="h-4 w-4" />
        Importar
      </Button>

      <Dialog open={abierto} onOpenChange={(v) => { setAbierto(v); if (!v) limpiar() }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Importar ventas del puesto</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-gray-500">
            El archivo <code>.json</code> que exportó el teléfono cuando se quedó sin señal.
          </p>

          <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-gray-300 px-4 py-5 transition-colors hover:border-[#4dd0e1]">
            <FileJson className="h-6 w-6 shrink-0 text-[#4dd0e1]" />
            <span className="min-w-0 flex-1 text-sm">
              <span className="block font-medium text-gray-800">
                {nombre || "Elegir archivo"}
              </span>
              <span className="block text-xs text-gray-400">
                {nombre ? "Tocá para elegir otro" : "ventas-puesto-2026-10-19.json"}
              </span>
            </span>
            <input type="file" accept=".json,application/json" onChange={elegir} className="hidden" />
          </label>

          {error && (
            <p className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </p>
          )}

          {/* Qué trae el archivo, ANTES de cargarlo. Importar sin saber qué
              estás importando es el momento en que alguien duplica una caja
              y se entera tres días después. */}
          {ventas.length > 0 && !error && (
            <div className="space-y-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
              <p className="font-semibold text-gray-900">
                {ventas.length} venta{ventas.length === 1 ? "" : "s"} · $
                {total.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
              </p>
              {fechas.length > 0 && (
                <p className="text-xs text-gray-500">
                  {dia(fechas[0])}
                  {dia(fechas[0]) !== dia(fechas[fechas.length - 1]) &&
                    ` – ${dia(fechas[fechas.length - 1])}`}
                </p>
              )}
              <p className="flex items-center gap-1.5 pt-1 text-xs text-gray-500">
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                Las que ya estén cargadas se saltean solas
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setAbierto(false)}>Cancelar</Button>
            <Button
              onClick={importar}
              disabled={ventas.length === 0 || !!error || subiendo}
              className="bg-[#4dd0e1] hover:bg-[#3bb8c9]"
            >
              {subiendo ? "Importando…" : `Importar ${ventas.length || ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
