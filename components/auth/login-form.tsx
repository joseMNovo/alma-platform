"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import AlmaFooter from "@/components/ui/alma-footer"

export default function LoginForm({ onLogin }: { onLogin: (user: any) => void }) {
  const [email, setEmail] = useState("")
  const [pin, setPin] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [accordionOpen, setAccordionOpen] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 4)
    setPin(value)
  }

  const handleLoginButtonClick = () => {
    if (!accordionOpen) {
      setAccordionOpen(true)
      // Focus email after animation
      setTimeout(() => emailRef.current?.focus(), 320)
    } else {
      // Submit the form if accordion is already open
      handleSubmit()
    }
  }

  const handleSubmit = async (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault()
    setLoading(true)
    setError("")

    if (pin.length !== 4) {
      setError("El PIN debe tener exactamente 4 dígitos")
      setLoading(false)
      return
    }

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, pin }),
      })

      const data = await response.json()

      if (response.ok) {
        onLogin(data.user)
      } else {
        setError(data.error || "Credenciales inválidas")
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

        {/* ── Desktop: 2 columnas / Mobile: 1 columna ── */}
        <div className="w-full max-w-4xl flex flex-col md:flex-row md:items-center md:gap-16 gap-8">

          {/* Columna izquierda — identidad */}
          <div className="flex-1 flex flex-col items-center md:items-start gap-6 text-center md:text-left">

            {/* Logo de Alma */}
            <div className="w-full max-w-[390px]">
              <img
                src="/images/alma_blanco.png"
                alt="Alma Alzheimer Rosario"
                className="w-full h-auto object-contain"
              />
            </div>

            {/* Headline */}
            <div className="space-y-3">
              <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight" style={{ textShadow: "0 1px 8px rgba(0,0,0,0.15)" }}>
                Bienvenido a la<br />
                plataforma ALMA
              </h1>
              {/* Subtítulo: más opaco y peso normal para mejor legibilidad */}
              <p className="text-white/95 text-lg md:text-xl font-normal" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.12)" }}>
                Gestión de voluntarios,<br className="hidden md:block" />
                talleres y actividades.
              </p>
            </div>
          </div>

          {/* Columna derecha — acción */}
          <div className="w-full md:w-80 flex flex-col items-center gap-4">

            {/* CTA button — fondo blanco, teal-action para texto, hover con tinte */}
            <Button
              type="button"
              onClick={handleLoginButtonClick}
              disabled={loading}
              className="w-full bg-white hover:bg-[#f0fdff] active:scale-[0.98] text-[#0099b0] font-semibold rounded-full px-8 py-3 text-base transition-all shadow-lg hover:shadow-xl border-0 disabled:opacity-60"
            >
              {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
            </Button>

            {/* Accordion form */}
            <div
              className={`w-full overflow-hidden transition-all duration-300 ease-in-out ${
                accordionOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              {/* Card del formulario — blanco sólido, borde con tinte teal, sombra fuerte */}
              <form
                onSubmit={handleSubmit}
                className="bg-white rounded-2xl shadow-2xl p-6 space-y-4 text-left border border-[#b2ebf2]"
              >
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-gray-800 font-semibold text-sm">
                    Email
                  </Label>
                  <Input
                    id="email"
                    ref={emailRef}
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

                {error && (
                  <Alert className="border-red-200 bg-red-50 rounded-xl">
                    <AlertDescription className="text-red-700 text-sm">{error}</AlertDescription>
                  </Alert>
                )}

                {/* Botón Confirmar — teal oscuro para contraste WCAG AA (ratio 6.5:1) */}
                <Button
                  type="submit"
                  disabled={loading || pin.length !== 4}
                  className="w-full bg-[#0099b0] hover:bg-[#007a8e] active:bg-[#006478] active:scale-[0.98] text-white font-semibold py-2.5 px-4 rounded-lg transition-all
                    disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed disabled:shadow-none shadow-md hover:shadow-lg"
                >
                  {loading ? "Verificando..." : "Confirmar"}
                </Button>
              </form>
            </div>
          </div>

        </div>
      </div>

      <AlmaFooter />
    </div>
  )
}
