"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function LoginForm({ onLogin }: { onLogin: (user: any) => void }) {
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok) {
        onLogin(data.user)
      } else {
        setError(data.error || "Email no válido")
      }
    } catch (error) {
      setError("Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#4dd0e1] to-white p-4">
      <Card className="w-full max-w-md shadow-2xl border-0">
        <CardHeader className="text-center pb-6 md:pb-8">
          <div className="mx-auto mb-4 md:mb-6 flex justify-center">
            <img src="/images/alma-logo.png" alt="ALMA - Alzheimer Rosario" className="h-16 md:h-20 w-auto" />
          </div>
          <CardTitle className="text-xl md:text-2xl text-gray-800">Bienvenido</CardTitle>
          <CardDescription className="text-gray-600">
            Ingresa tu email para acceder a la plataforma
          </CardDescription>
          <div className="mt-2">
            <span className="text-xs text-gray-400">v1.0.2</span>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                className="border-gray-300 focus:border-[#4dd0e1] focus:ring-[#4dd0e1]"
              />
            </div>
            {/* Campo de contraseña oculto */}
            {/* <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700">
                Contraseña
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="border-gray-300 focus:border-[#4dd0e1] focus:ring-[#4dd0e1]"
              />
            </div> */}
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-700">{error}</AlertDescription>
              </Alert>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#4dd0e1] hover:bg-[#3bc0d1] text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
