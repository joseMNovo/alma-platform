"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Ayuda from "@/components/ui/ayuda"
import { toast } from "@/hooks/use-toast"
import type { Training } from "@/lib/data-manager"
import { CreditCard, Loader2, ExternalLink, AlertTriangle, Check, Info } from "lucide-react"

/** Tiene que coincidir con PAYMENT_URL_KEY del backend. */
const CLAVE_LINK_PAGO = "capacitaciones_payment_url"

/**
 * Link de pago de las capacitaciones.
 *
 * Un solo link para todas, que es como cobra ALMA. Abajo, por si alguna
 * capacitación cobra distinto, se le puede poner el suyo: el propio siempre
 * le gana al general.
 *
 * La plataforma NO se entera de los pagos: manda a MercadoPago y listo. Quien
 * confirma es una persona, desde Accesos. Por eso acá no hay ningún estado de
 * "pagado" ni nada que se parezca.
 */
export default function LinkPagoAdmin() {
  const [general, setGeneral] = useState("")
  // Lo que hay en la base. Comparar contra esto es lo que decide si el botón
  // Guardar tiene algo para hacer: sin la copia, "guardar" queda siempre
  // habilitado y no hay forma de saber si lo que se ve ya está guardado.
  const [guardado, setGuardado] = useState("")
  const [trainings, setTrainings] = useState<Training[]>([])
  const [propios, setPropios] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)
  const [savingGeneral, setSavingGeneral] = useState(false)
  const [savingId, setSavingId] = useState<number | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [resSettings, resTrainings] = await Promise.all([
        fetch("/api/configuracion"),
        fetch("/api/capacitaciones"),
      ])
      if (!resSettings.ok || !resTrainings.ok) throw new Error("No se pudo cargar")

      const settings = await resSettings.json()
      const lista: Training[] = await resTrainings.json()

      const actual = settings?.[CLAVE_LINK_PAGO] ?? ""
      setGeneral(actual)
      setGuardado(actual)
      setTrainings(lista)
      setPropios(
        Object.fromEntries(lista.map((t) => [t.id, t.own_payment_url ?? ""])),
      )
    } catch {
      toast({
        title: "Error",
        description: "No se pudo cargar el link de pago",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const guardarGeneral = async () => {
    setSavingGeneral(true)
    try {
      const res = await fetch("/api/configuracion", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: CLAVE_LINK_PAGO, value: general.trim() || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "No se pudo guardar")

      const limpio = data?.[CLAVE_LINK_PAGO] ?? ""
      setGeneral(limpio)
      setGuardado(limpio)
      toast({
        title: general.trim() ? "Link guardado" : "Link borrado",
        description: general.trim()
          ? "El botón de compra ya aparece en las capacitaciones con precio."
          : "Las capacitaciones dejan de mostrar el botón de compra.",
      })
    } catch (error: any) {
      toast({ title: "Error", description: error?.message, variant: "destructive" })
    } finally {
      setSavingGeneral(false)
    }
  }

  const guardarPropio = async (training: Training) => {
    setSavingId(training.id)
    try {
      const res = await fetch(`/api/capacitaciones/${training.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_url: (propios[training.id] ?? "").trim() || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "No se pudo guardar")

      toast({ title: `Link actualizado en «${training.title}»` })
      load()
    } catch (error: any) {
      toast({ title: "Error", description: error?.message, variant: "destructive" })
    } finally {
      setSavingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-[#4dd0e1]" />
      </div>
    )
  }

  const conPrecio = trainings.filter((t) => Number(t.price) > 0)
  const hayCambioGeneral = general.trim() !== guardado.trim()

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-gray-900">Link de pago</h3>
        <p className="text-sm text-gray-500">
          Adónde mandamos a la gente cuando toca «Comprar» en una capacitación.
        </p>
      </div>

      {/* ── El link general ─────────────────────────────────────────── */}
      <Card>
        <CardContent className="space-y-3 py-4">
          <div>
            <Label>
              Link de MercadoPago
              <Ayuda lado="abajo">
                Lo creás en tu cuenta de MercadoPago y lo pegás acá. Se usa en todas las
                capacitaciones. Si lo borrás, deja de aparecer el botón de comprar.
              </Ayuda>
            </Label>
            <Input
              placeholder="https://mpago.la/..."
              value={general}
              onChange={(e) => setGeneral(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={guardarGeneral}
              disabled={savingGeneral || !hayCambioGeneral}
              className="bg-[#4dd0e1] hover:bg-[#3bb8c9]"
            >
              {savingGeneral && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>

            {/* Sin cambios pendientes: se dice que está guardado en vez de
                dejar un botón activo que no haría nada. */}
            {!hayCambioGeneral && guardado && (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-600">
                <Check className="h-4 w-4" />
                Guardado
              </span>
            )}
            {hayCambioGeneral && (
              <span className="text-sm text-amber-600">Hay cambios sin guardar</span>
            )}

            {guardado && (
              <a
                href={guardado}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#00838f] underline-offset-2 hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                Probarlo
              </a>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recordatorio de lo que la plataforma NO hace. Es la confusión más
          probable del módulo: creer que el acceso se da solo al pagar. */}
      <p className="flex items-start gap-2 text-xs text-gray-500">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        MercadoPago no avisa los pagos. Cuando veas uno, habilitá a esa persona desde
        Accesos.
      </p>

      {/* ── Excepciones ─────────────────────────────────────────────── */}
      {conPrecio.length > 0 && (
        <Card>
          <CardContent className="space-y-4 py-4">
            <div>
              <h4 className="flex items-center gap-1.5 font-medium text-gray-900">
                ¿Alguna cobra distinto?
                <Ayuda lado="abajo">
                  Si una capacitación tiene otro precio y necesita su propio link de
                  MercadoPago, cargalo acá. Las que queden vacías usan el link de arriba.
                </Ayuda>
              </h4>
            </div>

            <div className="space-y-3">
              {conPrecio.map((t) => {
                const propio = (propios[t.id] ?? "").trim()
                const cambio = propio !== (t.own_payment_url ?? "").trim()

                return (
                  <div key={t.id} className="rounded-lg border border-gray-200 p-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-medium text-gray-800">{t.title}</span>
                      <span className="text-sm text-gray-500">
                        ${Number(t.price).toLocaleString("es-AR")}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Input
                        placeholder="Usa el link general"
                        value={propios[t.id] ?? ""}
                        onChange={(e) =>
                          setPropios((prev) => ({ ...prev, [t.id]: e.target.value }))
                        }
                        className="min-w-[200px] flex-1"
                      />
                      <Button
                        variant="outline"
                        onClick={() => guardarPropio(t)}
                        disabled={savingId === t.id || !cambio}
                      >
                        {savingId === t.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : cambio ? (
                          "Guardar"
                        ) : (
                          <>
                            <Check className="mr-1.5 h-4 w-4 text-green-600" />
                            Guardado
                          </>
                        )}
                      </Button>
                    </div>

                    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-500">
                      {propio ? (
                        <>
                          <CreditCard className="h-3 w-3 shrink-0 text-[#9A8BC2]" />
                          Cobra con su propio link.
                        </>
                      ) : general.trim() ? (
                        <>
                          <Check className="h-3 w-3 shrink-0 text-green-500" />
                          Cobra con el link general.
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-3 w-3 shrink-0 text-amber-500" />
                          No muestra botón de comprar: falta cargar el link general.
                        </>
                      )}
                    </p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
