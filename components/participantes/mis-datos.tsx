"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Save, User, Phone, MapPin, AlertCircle, CheckCircle2 } from "lucide-react"

interface Profile {
  name?: string | null
  last_name?: string | null
  phone?: string | null
  birth_date?: string | null
  city?: string | null
  province?: string | null
  address?: string | null
  emergency_contact_name?: string | null
  emergency_contact_phone?: string | null
  notes?: string | null
  accepts_notifications?: boolean
  accepts_whatsapp?: boolean
}

export default function MisDatos({ user }: { user: any }) {
  const [profile, setProfile] = useState<Profile>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null)

  useEffect(() => {
    fetchProfile()
  }, [])

  async function fetchProfile() {
    try {
      const res = await fetch("/api/participantes/perfil")
      if (res.ok) {
        const data = await res.json()
        setProfile(data.profile ?? {})
      }
    } catch {
      // Ignorar errores de carga
    } finally {
      setLoading(false)
    }
  }

  function handleChange(field: keyof Profile, value: any) {
    setProfile(prev => ({ ...prev, [field]: value }))
    setMessage(null)
  }

  async function handleSave() {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch("/api/participantes/perfil", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      })
      if (res.ok) {
        const data = await res.json()
        setProfile(data.profile ?? profile)
        setMessage({ type: "ok", text: "Datos guardados correctamente." })
      } else {
        const err = await res.json()
        setMessage({ type: "error", text: err.error || "Error al guardar." })
      }
    } catch {
      setMessage({ type: "error", text: "Error de conexión." })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-[#4dd0e1]">
        Cargando tus datos...
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Mis datos</h2>
        <p className="text-gray-500 text-sm mt-1">
          Todos los campos son opcionales. Completá solo lo que quieras compartir.
        </p>
      </div>

      {/* Datos personales */}
      <Card className="border-[#b2ebf2]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-[#0099b0] text-base">
            <User className="w-4 h-4" />
            Datos personales
          </CardTitle>
          <CardDescription className="text-xs">Información básica de tu perfil</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-sm text-gray-700">Nombre</Label>
              <Input
                id="name"
                value={profile.name ?? ""}
                onChange={e => handleChange("name", e.target.value)}
                placeholder="Tu nombre"
                className="border-[#b2ebf2] focus:border-[#0099b0]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="last_name" className="text-sm text-gray-700">Apellido</Label>
              <Input
                id="last_name"
                value={profile.last_name ?? ""}
                onChange={e => handleChange("last_name", e.target.value)}
                placeholder="Tu apellido"
                className="border-[#b2ebf2] focus:border-[#0099b0]"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="birth_date" className="text-sm text-gray-700">Fecha de nacimiento</Label>
              <Input
                id="birth_date"
                type="date"
                value={profile.birth_date ?? ""}
                onChange={e => handleChange("birth_date", e.target.value)}
                className="border-[#b2ebf2] focus:border-[#0099b0]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-sm text-gray-700">Teléfono</Label>
              <Input
                id="phone"
                type="tel"
                value={profile.phone ?? ""}
                onChange={e => handleChange("phone", e.target.value)}
                placeholder="Ej: 341-555-0100"
                className="border-[#b2ebf2] focus:border-[#0099b0]"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ubicación */}
      <Card className="border-[#b2ebf2]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-[#0099b0] text-base">
            <MapPin className="w-4 h-4" />
            Ubicación
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="city" className="text-sm text-gray-700">Ciudad</Label>
              <Input
                id="city"
                value={profile.city ?? ""}
                onChange={e => handleChange("city", e.target.value)}
                placeholder="Rosario"
                className="border-[#b2ebf2] focus:border-[#0099b0]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="province" className="text-sm text-gray-700">Provincia</Label>
              <Input
                id="province"
                value={profile.province ?? ""}
                onChange={e => handleChange("province", e.target.value)}
                placeholder="Santa Fe"
                className="border-[#b2ebf2] focus:border-[#0099b0]"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="address" className="text-sm text-gray-700">Dirección</Label>
            <Input
              id="address"
              value={profile.address ?? ""}
              onChange={e => handleChange("address", e.target.value)}
              placeholder="Calle, número, piso/depto (opcional)"
              className="border-[#b2ebf2] focus:border-[#0099b0]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Contacto de emergencia */}
      <Card className="border-[#b2ebf2]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-[#0099b0] text-base">
            <Phone className="w-4 h-4" />
            Contacto de emergencia
          </CardTitle>
          <CardDescription className="text-xs">Solo se usa ante una situación de urgencia</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="ec_name" className="text-sm text-gray-700">Nombre</Label>
              <Input
                id="ec_name"
                value={profile.emergency_contact_name ?? ""}
                onChange={e => handleChange("emergency_contact_name", e.target.value)}
                placeholder="Nombre del contacto"
                className="border-[#b2ebf2] focus:border-[#0099b0]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ec_phone" className="text-sm text-gray-700">Teléfono</Label>
              <Input
                id="ec_phone"
                type="tel"
                value={profile.emergency_contact_phone ?? ""}
                onChange={e => handleChange("emergency_contact_phone", e.target.value)}
                placeholder="341-555-0100"
                className="border-[#b2ebf2] focus:border-[#0099b0]"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Observaciones y notificaciones */}
      <Card className="border-[#b2ebf2]">
        <CardHeader className="pb-3">
          <CardTitle className="text-[#0099b0] text-base">Preferencias y notas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-sm text-gray-700">Observaciones</Label>
            <Textarea
              id="notes"
              value={profile.notes ?? ""}
              onChange={e => handleChange("notes", e.target.value)}
              placeholder="Alergias, condiciones de salud relevantes u otras notas..."
              className="border-[#b2ebf2] focus:border-[#0099b0] min-h-[80px]"
            />
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Checkbox
                id="notif"
                checked={!!profile.accepts_notifications}
                onCheckedChange={v => handleChange("accepts_notifications", !!v)}
                className="border-[#4dd0e1] data-[state=checked]:bg-[#0099b0]"
              />
              <Label htmlFor="notif" className="text-sm text-gray-700 cursor-pointer">
                Acepto recibir notificaciones por email sobre actividades de ALMA
              </Label>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox
                id="wa"
                checked={!!profile.accepts_whatsapp}
                onCheckedChange={v => handleChange("accepts_whatsapp", !!v)}
                className="border-[#4dd0e1] data-[state=checked]:bg-[#0099b0]"
              />
              <Label htmlFor="wa" className="text-sm text-gray-700 cursor-pointer">
                Acepto recibir mensajes de WhatsApp con novedades de ALMA
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mensajes */}
      {message && (
        <Alert className={message.type === "ok" ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
          {message.type === "ok"
            ? <CheckCircle2 className="w-4 h-4 text-green-600" />
            : <AlertCircle className="w-4 h-4 text-red-600" />}
          <AlertDescription className={message.type === "ok" ? "text-green-700" : "text-red-700"}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      {/* Botón guardar */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#0099b0] hover:bg-[#007a8e] text-white px-8 py-2.5 rounded-lg shadow-md"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Guardando..." : "Guardar mis datos"}
        </Button>
      </div>
    </div>
  )
}
