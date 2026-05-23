"use client"

import { useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { CheckCircle2, XCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import AlmaFooter from "@/components/ui/alma-footer"
import { hashPassword } from "@/lib/utils/password"

function RestablecerPinContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("token") ?? ""
  const type = searchParams.get("type") ?? ""

  const [pin, setPin] = useState("")
  const [pinConfirm, setPinConfirm] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<"form" | "success" | "error">("form")
  const [countdown, setCountdown] = useState(3)

  const handlePinChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value.replace(/\D/g, "").slice(0, 4))
  }

  const startCountdown = () => {
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(interval) }
        return c - 1
      })
    }, 1000)
    setTimeout(() => router.push("/"), 3000)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (pin.length !== 4) { setError("El PIN debe tener 4 dígitos"); return }
    if (pin !== pinConfirm) { setError("Los PINs no coinciden"); return }
    if (!token || !type) { setError("Link inválido"); return }

    setLoading(true)
    try {
      const new_pin_hash = await hashPassword(pin)
      const res = await fetch("/api/pin-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, user_type: type, new_pin_hash }),
      })

      if (res.ok) {
        setStatus("success")
        startCountdown()
      } else {
        const data = await res.json()
        if (res.status === 400) {
          setStatus("error")
        } else {
          setError(data.error || "Error al restablecer el PIN")
        }
      }
    } catch {
      setError("Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col bg-gradient-to-br from-[#4dd0e1] to-[#9a8bc2] relative overflow-hidden"
      style={{ fontFamily: "'Gotham Rounded', system-ui, sans-serif" }}
    >
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <img src="/images/alma_blanco.png" alt="ALMA" className="h-16 object-contain mx-auto" />
          </div>

          <div className="bg-white rounded-2xl shadow-2xl p-8 border border-[#b2ebf2] space-y-4">
            {status === "error" && (
              <div className="text-center space-y-4">
                <XCircle className="w-12 h-12 text-red-400 mx-auto" />
                <h2 className="text-xl font-bold text-gray-800">Link inválido o expirado</h2>
                <p className="text-gray-600 text-sm">Solicitá un nuevo link de restablecimiento.</p>
                <a href="/" className="block w-full bg-[#0099b0] hover:bg-[#007a8e] text-white font-semibold py-2.5 px-4 rounded-lg transition-all text-center shadow-md">
                  Ir al inicio
                </a>
              </div>
            )}

            {status === "success" && (
              <div className="text-center space-y-4">
                <CheckCircle2 className="w-12 h-12 text-[#0099b0] mx-auto" />
                <h2 className="text-xl font-bold text-gray-800">¡PIN actualizado!</h2>
                <p className="text-gray-600 text-sm">Ya podés ingresar con tu nuevo PIN.</p>
                <p className="text-gray-400 text-sm">
                  Redirigiendo en <span className="font-bold text-[#0099b0]">{countdown}</span> segundos...
                </p>
                <a href="/" className="block w-full bg-[#0099b0] hover:bg-[#007a8e] text-white font-semibold py-2.5 px-4 rounded-lg transition-all text-center shadow-md">
                  Ir al inicio de sesión
                </a>
              </div>
            )}

            {status === "form" && (
              <>
                <div className="text-center">
                  <h2 className="text-xl font-bold text-gray-800">Nuevo PIN</h2>
                  <p className="text-gray-500 text-sm mt-1">Elegí un nuevo PIN de 4 dígitos</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="pin" className="text-gray-800 font-semibold text-sm">Nuevo PIN</Label>
                    <Input
                      id="pin"
                      type="password"
                      inputMode="numeric"
                      value={pin}
                      onChange={handlePinChange(setPin)}
                      placeholder="••••"
                      maxLength={4}
                      className="border-[#b2ebf2] focus:border-[#0099b0] focus:ring-2 focus:ring-[#4dd0e1]/30 focus:ring-offset-0 tracking-widest text-center text-lg"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="pin-confirm" className="text-gray-800 font-semibold text-sm">Confirmar PIN</Label>
                    <Input
                      id="pin-confirm"
                      type="password"
                      inputMode="numeric"
                      value={pinConfirm}
                      onChange={handlePinChange(setPinConfirm)}
                      placeholder="••••"
                      maxLength={4}
                      className="border-[#b2ebf2] focus:border-[#0099b0] focus:ring-2 focus:ring-[#4dd0e1]/30 focus:ring-offset-0 tracking-widest text-center text-lg"
                    />
                  </div>

                  {error && (
                    <Alert className="border-red-200 bg-red-50 rounded-xl">
                      <AlertDescription className="text-red-700 text-sm">{error}</AlertDescription>
                    </Alert>
                  )}

                  <Button
                    type="submit"
                    disabled={loading || pin.length !== 4 || pinConfirm.length !== 4}
                    className="w-full bg-[#0099b0] hover:bg-[#007a8e] text-white font-semibold py-2.5 rounded-lg transition-all disabled:bg-gray-100 disabled:text-gray-400 shadow-md hover:shadow-lg"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Guardar nuevo PIN"}
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
      <AlmaFooter floating />
    </div>
  )
}

export default function RestablecerPinPage() {
  return (
    <Suspense>
      <RestablecerPinContent />
    </Suspense>
  )
}
