"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"
import { config } from "@/lib/config"
import {
  CheckCircle2, Loader2, Mail, CreditCard, ArrowLeft, ArrowRight, ShieldCheck,
} from "lucide-react"

/**
 * Compra exprés de una capacitación, para gente que todavía no tiene cuenta.
 *
 * Por qué existe: si alguien paga primero y se registra después (o nunca),
 * ALMA se queda con una transferencia sin dueño. Acá la cuenta se crea ANTES
 * de mandar a pagar, con el mail ya verificado.
 *
 * Se piden nombre y apellido aunque alarguen el formulario: sin ellos el
 * certificado no se puede emitir, y perseguir ese dato después es peor que
 * pedir dos campos ahora.
 *
 * Lo que este flujo NO hace: confirmar el pago. MercadoPago no nos avisa. Lo
 * que garantiza es que, cuando el pago aparezca, la persona exista y su mail
 * ande.
 */

type Paso = "inicio" | "datos" | "revisa-tu-mail" | "pagar"

export default function CompraWizard({
  slug,
  titulo,
  precio,
  moneda,
  paymentUrl,
  verificado,
}: {
  slug: string
  titulo: string
  precio: number
  moneda: string
  paymentUrl?: string | null
  /** Llega en true cuando vuelve del link del mail. */
  verificado: boolean
}) {
  const [paso, setPaso] = useState<Paso>(verificado ? "pagar" : "inicio")
  const [nombre, setNombre] = useState("")
  const [apellido, setApellido] = useState("")
  const [email, setEmail] = useState("")
  const [pin, setPin] = useState("")
  const [enviando, setEnviando] = useState(false)

  // Al volver del mail, la persona ya verificó: se salta directo a pagar.
  useEffect(() => {
    if (verificado) setPaso("pagar")
  }, [verificado])

  const volverA = `/capacitacion/${slug}/comprar`

  const crearCuenta = async () => {
    if (!nombre.trim() || !apellido.trim()) {
      toast({ title: "Faltan tu nombre y apellido", variant: "destructive" })
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast({ title: "Revisá el correo", variant: "destructive" })
      return
    }
    if (!/^\d{4}$/.test(pin)) {
      toast({ title: "El PIN son 4 números", variant: "destructive" })
      return
    }

    setEnviando(true)
    try {
      const res = await fetch("/api/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          pin,
          role: "participante",
          name: nombre,
          last_name: apellido,
          next: volverA,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "No se pudo crear la cuenta")

      setPaso("revisa-tu-mail")
    } catch (error: any) {
      toast({ title: "Error", description: error?.message, variant: "destructive" })
    } finally {
      setEnviando(false)
    }
  }

  const reenviar = async () => {
    try {
      await fetch("/api/registro", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })
      toast({ title: "Te lo mandamos de nuevo", description: "Revisá también el correo no deseado." })
    } catch {
      toast({ title: "No se pudo reenviar", variant: "destructive" })
    }
  }

  const pasos: { clave: Paso; label: string }[] = [
    { clave: "datos", label: "Tus datos" },
    { clave: "revisa-tu-mail", label: "Confirmar mail" },
    { clave: "pagar", label: "Pagar" },
  ]
  const indiceActual = pasos.findIndex((p) => p.clave === paso)

  return (
    <div className="space-y-6">
      {/* Los tres pasos, siempre a la vista: saber cuánto falta es la mitad
          de la tranquilidad de comprar. */}
      {paso !== "inicio" && (
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          {pasos.map((p, i) => (
            <li key={p.clave} className="flex items-center gap-2">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                  i < indiceActual
                    ? "bg-green-100 text-green-700"
                    : i === indiceActual
                      ? "bg-[#4dd0e1] text-white"
                      : "bg-gray-100 text-gray-400"
                }`}
              >
                {i < indiceActual ? "✓" : i + 1}
              </span>
              <span className={i === indiceActual ? "font-medium text-gray-900" : "text-gray-400"}>
                {p.label}
              </span>
              {i < pasos.length - 1 && <ArrowRight className="h-3 w-3 text-gray-300" />}
            </li>
          ))}
        </ol>
      )}

      {paso === "inicio" && (
        <div className="space-y-3">
          <Button
            onClick={() => setPaso("datos")}
            className="w-full bg-[#4dd0e1] py-6 text-base hover:bg-[#3bb8c9]"
          >
            Crear mi cuenta y comprar
          </Button>
          <Link
            href="/"
            className="block rounded-lg border border-gray-200 px-4 py-3 text-center font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Ya tengo cuenta, quiero ingresar
          </Link>
        </div>
      )}

      {paso === "datos" && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Nombre</Label>
              <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </div>
            <div>
              <Label>Apellido</Label>
              <Input value={apellido} onChange={(e) => setApellido(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Correo electrónico</Label>
            <Input
              type="email"
              placeholder="tucorreo@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <Label>Elegí un PIN de 4 números</Label>
            <Input
              inputMode="numeric"
              maxLength={4}
              placeholder="1234"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            />
            <p className="mt-1 text-xs text-gray-500">Es con lo que vas a entrar después.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={crearCuenta}
              disabled={enviando}
              className="bg-[#4dd0e1] hover:bg-[#3bb8c9]"
            >
              {enviando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Continuar
            </Button>
            <Button variant="outline" onClick={() => setPaso("inicio")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
          </div>
        </div>
      )}

      {paso === "revisa-tu-mail" && (
        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 text-center">
          <Mail className="mx-auto h-10 w-10 text-[#4dd0e1]" />
          <div>
            <p className="font-semibold text-gray-900">Te mandamos un correo</p>
            <p className="mt-1 text-sm text-gray-600">
              Abrilo y tocá el link para confirmar tu dirección. Después volvés acá solo
              para pagar.
            </p>
          </div>
          <p className="text-sm font-medium text-gray-800">{email}</p>
          <Button variant="outline" onClick={reenviar}>
            No me llegó, reenviar
          </Button>
        </div>
      )}

      {paso === "pagar" && (
        <div className="space-y-4">
          <p className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-900">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
            Tu correo quedó confirmado. Ya tenés cuenta en ALMA.
          </p>

          {paymentUrl ? (
            <>
              <a
                href={paymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#4dd0e1] px-4 py-4 text-base font-semibold text-white transition hover:bg-[#3bb8c9]"
              >
                <CreditCard className="h-5 w-5" />
                Pagar {Number(precio) > 0 ? `$${Number(precio).toLocaleString("es-AR")}` : ""}{" "}
                con MercadoPago
              </a>
              <p className="flex items-start gap-2 text-sm text-gray-600">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                Cuando confirmemos el pago, un voluntario te habilita «{titulo}» y la ves
                al entrar con tu correo y tu PIN.
              </p>
            </>
          ) : (
            <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
              Escribinos a{" "}
              <a
                href={`mailto:${config.contact.email}`}
                className="font-medium text-[#00838f] underline-offset-2 hover:underline"
              >
                {config.contact.email}
              </a>{" "}
              para coordinar el pago de «{titulo}».
            </p>
          )}

          <Link
            href="/"
            className="block text-center text-sm font-medium text-[#00838f] underline-offset-2 hover:underline"
          >
            Ingresar a la plataforma
          </Link>
        </div>
      )}
    </div>
  )
}
