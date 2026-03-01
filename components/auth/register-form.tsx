"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import AlmaFooter from "@/components/ui/alma-footer"
import { CheckCircle2 } from "lucide-react"

export default function RegisterForm() {
  const [email, setEmail] = useState("")
  const [pin, setPin] = useState("")
  const [almaToken, setAlmaToken] = useState("")
  const [role, setRole] = useState<"voluntario" | "participante" | "">("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 4)
    setPin(value)
  }

  const handleTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6)
    setAlmaToken(value)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")

    // Validación frontend
    if (!email) {
      setError("El email es requerido")
      return
    }
    if (pin.length !== 4) {
      setError("El PIN debe tener exactamente 4 dígitos")
      return
    }
    if (almaToken.length !== 6) {
      setError("El Token ALMA debe tener exactamente 6 dígitos")
      return
    }
    if (!role) {
      setError("Seleccioná un rol")
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, pin, alma_token: almaToken, role }),
      })

      const data = await response.json()

      if (response.ok) {
        localStorage.setItem("alma_new_registration", role)
        setSuccess(true)
      } else {
        setError(data.error || "Error al registrarse")
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
      {/* Flores decorativas */}
      <div className="absolute top-16 left-16 w-28 h-28 opacity-[0.02] pointer-events-none">
        <img src="/images/flor.png" alt="" className="w-full h-full object-contain" />
      </div>
      <div className="absolute top-24 right-24 w-20 h-20 opacity-[0.015] pointer-events-none">
        <img src="/images/flor.png" alt="" className="w-full h-full object-contain" />
      </div>
      <div className="absolute top-1/4 left-1/3 w-32 h-32 opacity-[0.015] pointer-events-none">
        <img src="/images/flor.png" alt="" className="w-full h-full object-contain" />
      </div>
      <div className="absolute bottom-24 right-16 w-24 h-24 opacity-[0.01] pointer-events-none">
        <img src="/images/flor.png" alt="" className="w-full h-full object-contain" />
      </div>
      <div className="absolute bottom-1/4 right-1/4 w-36 h-36 opacity-[0.01] pointer-events-none">
        <img src="/images/flor.png" alt="" className="w-full h-full object-contain" />
      </div>
      <div className="absolute top-1/2 left-10 w-20 h-20 opacity-[0.02] pointer-events-none">
        <img src="/images/flor.png" alt="" className="w-full h-full object-contain" />
      </div>
      <div className="absolute bottom-16 left-1/4 w-20 h-20 opacity-[0.01] pointer-events-none">
        <img src="/images/flor.png" alt="" className="w-full h-full object-contain" />
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-4xl flex flex-col md:flex-row md:items-center md:gap-16 gap-8">

          {/* Columna izquierda — identidad */}
          <div className="flex-1 flex flex-col items-center md:items-start gap-6 text-center md:text-left">
            <div className="w-full max-w-[390px]">
              <img
                src="/images/alma_blanco.png"
                alt="Alma Alzheimer Rosario"
                className="w-full h-auto object-contain"
              />
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight" style={{ textShadow: "0 1px 8px rgba(0,0,0,0.15)" }}>
                Creá tu cuenta<br />
                en ALMA
              </h1>
              <p className="text-white/95 text-lg md:text-xl font-normal" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.12)" }}>
                Necesitás el Token ALMA<br className="hidden md:block" />
                para registrarte.
              </p>
            </div>
          </div>

          {/* Columna derecha — formulario */}
          <div className="w-full md:w-80 flex flex-col items-center gap-4">
            {success ? (
              <div className="w-full bg-white rounded-2xl shadow-2xl p-6 space-y-4 border border-[#b2ebf2] text-center">
                <CheckCircle2 className="w-12 h-12 text-[#0099b0] mx-auto" />
                <h2 className="text-xl font-bold text-gray-800">¡Cuenta creada!</h2>
                <p className="text-gray-600 text-sm">
                  Tu cuenta fue registrada exitosamente. Ya podés iniciar sesión con tu email y PIN.
                </p>
                <a
                  href="/"
                  className="block w-full bg-[#0099b0] hover:bg-[#007a8e] text-white font-semibold py-2.5 px-4 rounded-lg transition-all text-center shadow-md hover:shadow-lg"
                >
                  Ir al inicio de sesión
                </a>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                noValidate
                className="w-full bg-white rounded-2xl shadow-2xl p-6 space-y-4 text-left border border-[#b2ebf2]"
              >
                <h2 className="text-lg font-bold text-gray-800 text-center">Registro</h2>

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-gray-800 font-semibold text-sm">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    required
                    className="border-[#b2ebf2] placeholder:text-gray-400 text-gray-800 focus:border-[#0099b0] focus:ring-2 focus:ring-[#4dd0e1]/30 focus:ring-offset-0 transition-shadow"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="pin" className="text-gray-800 font-semibold text-sm">
                    PIN (4 dígitos)
                  </Label>
                  <Input
                    id="pin"
                    type="password"
                    inputMode="numeric"
                    value={pin}
                    onChange={handlePinChange}
                    placeholder="••••"
                    required
                    maxLength={4}
                    className="border-[#b2ebf2] placeholder:text-gray-400 text-gray-800 focus:border-[#0099b0] focus:ring-2 focus:ring-[#4dd0e1]/30 focus:ring-offset-0 tracking-widest text-center text-lg transition-shadow"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="alma_token" className="text-gray-800 font-semibold text-sm">
                    Token ALMA (6 dígitos)
                  </Label>
                  <Input
                    id="alma_token"
                    type="password"
                    inputMode="numeric"
                    value={almaToken}
                    onChange={handleTokenChange}
                    placeholder="••••••"
                    required
                    maxLength={6}
                    className="border-[#b2ebf2] placeholder:text-gray-400 text-gray-800 focus:border-[#0099b0] focus:ring-2 focus:ring-[#4dd0e1]/30 focus:ring-offset-0 tracking-widest text-center text-lg transition-shadow"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-800 font-semibold text-sm">Tipo de cuenta</Label>
                  <RadioGroup
                    value={role}
                    onValueChange={(val) => setRole(val as "voluntario" | "participante")}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="voluntario" id="rol-voluntario" />
                      <Label htmlFor="rol-voluntario" className="text-gray-700 font-normal cursor-pointer">
                        Voluntario
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="participante" id="rol-participante" />
                      <Label htmlFor="rol-participante" className="text-gray-700 font-normal cursor-pointer">
                        Participante
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {error && (
                  <Alert className="border-red-200 bg-red-50 rounded-xl">
                    <AlertDescription className="text-red-700 text-sm">{error}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  disabled={loading || pin.length !== 4 || almaToken.length !== 6 || !role}
                  className="w-full bg-[#0099b0] hover:bg-[#007a8e] active:bg-[#006478] active:scale-[0.98] text-white font-semibold py-2.5 px-4 rounded-lg transition-all
                    disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed disabled:shadow-none shadow-md hover:shadow-lg"
                >
                  {loading ? "Registrando..." : "Registrarse"}
                </Button>

                <p className="text-gray-500 text-sm text-center">
                  ¿Ya tenés cuenta?{" "}
                  <a href="/" className="text-[#0099b0] font-semibold hover:underline">
                    Iniciá sesión
                  </a>
                </p>
              </form>
            )}
          </div>

        </div>
      </div>

      <AlmaFooter floating />
    </div>
  )
}
