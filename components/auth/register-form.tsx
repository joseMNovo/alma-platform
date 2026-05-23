"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import AlmaFooter from "@/components/ui/alma-footer"
import { CheckCircle2, Clock } from "lucide-react"

type Role = "voluntario" | "participante" | ""

export default function RegisterForm() {
  const [role, setRole] = useState<Role>("")

  // Campos participante
  const [email, setEmail] = useState("")
  const [pin, setPin] = useState("")
  const [almaToken, setAlmaToken] = useState("")

  // Campos voluntario
  const [name, setName] = useState("")
  const [lastName, setLastName] = useState("")
  const [volEmail, setVolEmail] = useState("")

  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPin(e.target.value.replace(/\D/g, "").slice(0, 4))
  }

  const handleTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAlmaToken(e.target.value.replace(/\D/g, "").slice(0, 6))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")

    if (!role) { setError("Seleccioná un tipo de cuenta"); return }

    setLoading(true)
    try {
      if (role === "participante") {
        if (!email) { setError("El email es requerido"); setLoading(false); return }
        if (pin.length !== 4) { setError("El PIN debe tener exactamente 4 dígitos"); setLoading(false); return }
        if (almaToken.length !== 6) { setError("El Token ALMA debe tener exactamente 6 dígitos"); setLoading(false); return }

        const res = await fetch("/api/registro", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, pin, alma_token: almaToken, role }),
        })
        const data = await res.json()
        if (res.ok) {
          setSuccess(true)
        } else {
          setError(data.error || "Error al registrarse")
        }
      } else {
        if (!name.trim()) { setError("El nombre es requerido"); setLoading(false); return }
        if (!volEmail.trim()) { setError("El email es requerido"); setLoading(false); return }

        const res = await fetch("/api/voluntarios/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            last_name: lastName.trim() || null,
            email: volEmail.trim(),
          }),
        })
        const data = await res.json()
        if (res.ok) {
          setSuccess(true)
        } else {
          setError(data.error?.includes("409") || res.status === 409
            ? "El email ya está registrado"
            : data.error || "Error al registrarse")
        }
      }
    } catch {
      setError("Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  const flores = [
    { top: "64px", left: "64px", size: "112px", opacity: 0.02 },
    { top: "96px", right: "96px", size: "80px", opacity: 0.015 },
    { top: "25%", left: "33%", size: "128px", opacity: 0.015 },
    { bottom: "96px", right: "64px", size: "96px", opacity: 0.01 },
    { bottom: "25%", right: "25%", size: "144px", opacity: 0.01 },
    { top: "50%", left: "40px", size: "80px", opacity: 0.02 },
    { bottom: "64px", left: "25%", size: "80px", opacity: 0.01 },
  ]

  return (
    <div
      className="min-h-screen flex flex-col bg-gradient-to-br from-[#4dd0e1] to-[#9a8bc2] relative overflow-hidden"
      style={{ fontFamily: "'Gotham Rounded', system-ui, sans-serif" }}
    >
      {flores.map((f, i) => (
        <div key={i} className="absolute pointer-events-none" style={{ ...f, width: f.size, height: f.size }}>
          <img src="/images/flor.png" alt="" className="w-full h-full object-contain" />
        </div>
      ))}

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-4xl flex flex-col md:flex-row md:items-center md:gap-16 gap-8">

          {/* Identidad */}
          <div className="flex-1 flex flex-col items-center md:items-start gap-6 text-center md:text-left">
            <div className="w-full max-w-[390px]">
              <img src="/images/alma_blanco.png" alt="Alma Alzheimer Rosario" className="w-full h-auto object-contain" />
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight" style={{ textShadow: "0 1px 8px rgba(0,0,0,0.15)" }}>
                Creá tu cuenta<br />en ALMA
              </h1>
              <p className="text-white/95 text-lg md:text-xl font-normal" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.12)" }}>
                {role === "participante"
                  ? "Necesitás el Token ALMA para registrarte."
                  : role === "voluntario"
                  ? "Tu cuenta será revisada por el equipo antes de activarse."
                  : "Seleccioná tu tipo de cuenta para continuar."}
              </p>
            </div>
          </div>

          {/* Formulario */}
          <div className="w-full md:w-80 flex flex-col items-center gap-4">
            {success ? (
              <div className="w-full bg-white rounded-2xl shadow-2xl p-6 space-y-4 border border-[#b2ebf2] text-center">
                {role === "voluntario" ? (
                  <>
                    <Clock className="w-12 h-12 text-[#9a8bc2] mx-auto" />
                    <h2 className="text-xl font-bold text-gray-800">¡Solicitud enviada!</h2>
                    <p className="text-gray-600 text-sm">
                      Tu solicitud está en revisión. Cuando el equipo de ALMA la apruebe, vas a recibir un email de confirmación para configurar tu PIN e ingresar.
                    </p>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-12 h-12 text-[#0099b0] mx-auto" />
                    <h2 className="text-xl font-bold text-gray-800">¡Cuenta creada!</h2>
                    <p className="text-gray-600 text-sm">
                      Revisá tu email para verificar tu cuenta. Después ya podés iniciar sesión.
                    </p>
                  </>
                )}
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

                {/* Tipo de cuenta */}
                <div className="space-y-2">
                  <Label className="text-gray-800 font-semibold text-sm">Tipo de cuenta</Label>
                  <RadioGroup
                    value={role}
                    onValueChange={(val) => { setRole(val as Role); setError("") }}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="voluntario" id="rol-voluntario" />
                      <Label htmlFor="rol-voluntario" className="text-gray-700 font-normal cursor-pointer">Voluntario</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="participante" id="rol-participante" />
                      <Label htmlFor="rol-participante" className="text-gray-700 font-normal cursor-pointer">Participante</Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Campos voluntario */}
                {role === "voluntario" && (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="name" className="text-gray-800 font-semibold text-sm">Nombre *</Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Tu nombre"
                        className="border-[#b2ebf2] focus:border-[#9a8bc2] focus:ring-2 focus:ring-[#9a8bc2]/30 focus:ring-offset-0"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="last_name" className="text-gray-800 font-semibold text-sm">Apellido</Label>
                      <Input
                        id="last_name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Tu apellido (opcional)"
                        className="border-[#b2ebf2] focus:border-[#9a8bc2] focus:ring-2 focus:ring-[#9a8bc2]/30 focus:ring-offset-0"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="vol-email" className="text-gray-800 font-semibold text-sm">Email *</Label>
                      <Input
                        id="vol-email"
                        type="email"
                        value={volEmail}
                        onChange={(e) => setVolEmail(e.target.value)}
                        placeholder="tu@email.com"
                        className="border-[#b2ebf2] focus:border-[#9a8bc2] focus:ring-2 focus:ring-[#9a8bc2]/30 focus:ring-offset-0"
                      />
                    </div>
                  </>
                )}

                {/* Campos participante */}
                {role === "participante" && (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-gray-800 font-semibold text-sm">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tu@email.com"
                        className="border-[#b2ebf2] focus:border-[#0099b0] focus:ring-2 focus:ring-[#4dd0e1]/30 focus:ring-offset-0"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="pin" className="text-gray-800 font-semibold text-sm">PIN (4 dígitos)</Label>
                      <Input
                        id="pin"
                        type="password"
                        inputMode="numeric"
                        value={pin}
                        onChange={handlePinChange}
                        placeholder="••••"
                        maxLength={4}
                        className="border-[#b2ebf2] focus:border-[#0099b0] focus:ring-2 focus:ring-[#4dd0e1]/30 focus:ring-offset-0 tracking-widest text-center text-lg"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="alma_token" className="text-gray-800 font-semibold text-sm">Token ALMA (6 dígitos)</Label>
                      <Input
                        id="alma_token"
                        type="password"
                        inputMode="numeric"
                        value={almaToken}
                        onChange={handleTokenChange}
                        placeholder="••••••"
                        maxLength={6}
                        className="border-[#b2ebf2] focus:border-[#0099b0] focus:ring-2 focus:ring-[#4dd0e1]/30 focus:ring-offset-0 tracking-widest text-center text-lg"
                      />
                    </div>
                  </>
                )}

                {error && (
                  <Alert className="border-red-200 bg-red-50 rounded-xl">
                    <AlertDescription className="text-red-700 text-sm">{error}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  disabled={loading || !role}
                  className="w-full bg-[#0099b0] hover:bg-[#007a8e] active:bg-[#006478] active:scale-[0.98] text-white font-semibold py-2.5 px-4 rounded-lg transition-all disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                >
                  {loading ? "Registrando..." : "Registrarse"}
                </Button>

                <p className="text-gray-500 text-sm text-center">
                  ¿Ya tenés cuenta?{" "}
                  <a href="/" className="text-[#0099b0] font-semibold hover:underline">Iniciá sesión</a>
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
