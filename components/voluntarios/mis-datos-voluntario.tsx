"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Save, Plus, X, UserCircle } from "lucide-react"

export default function MisDatosVoluntario({ user }: { user: any }) {
  const [formData, setFormData] = useState({
    name: user.name || "",
    last_name: user.last_name || "",
    phone: user.phone || "",
    gender: user.gender || "",
    age: user.age ? String(user.age) : "",
    birth_date: user.birth_date || "",
    specialties: (user.specialties as string[]) || [],
  })
  const [specialtyInput, setSpecialtyInput] = useState("")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null)

  const handleAgeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g, "").slice(0, 3)
    setFormData({ ...formData, age: v })
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/[^0-9+\-\s()]/g, "").slice(0, 20)
    setFormData({ ...formData, phone: v })
  }

  const addSpecialty = () => {
    const trimmed = specialtyInput.trim()
    if (trimmed && !formData.specialties.includes(trimmed)) {
      setFormData({ ...formData, specialties: [...formData.specialties, trimmed] })
    }
    setSpecialtyInput("")
  }

  const removeSpecialty = (index: number) => {
    setFormData({ ...formData, specialties: formData.specialties.filter((_, i) => i !== index) })
  }

  const handleSpecialtyKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); addSpecialty() }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/voluntarios?id=${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          last_name: formData.last_name,
          phone: formData.phone,
          gender: formData.gender,
          age: formData.age,
          birth_date: formData.birth_date,
          specialties: formData.specialties,
          // preserve fields not editable here
          email: user.email,
          status: user.status,
          is_admin: user.is_admin,
          photo: user.photo || "",
        }),
      })
      if (res.ok) {
        setMessage({ type: "ok", text: "¡Datos guardados! Si cambiaste tu nombre, se verá al próximo inicio de sesión." })
      } else {
        setMessage({ type: "error", text: "Error al guardar. Intentá de nuevo." })
      }
    } catch {
      setMessage({ type: "error", text: "Error de conexión." })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900">Mis Datos</h2>
        <p className="text-gray-600">Tu información personal en la plataforma</p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserCircle className="w-5 h-5 text-[#4dd0e1]" />
            Perfil
          </CardTitle>
          <CardDescription>Email: <span className="font-medium text-gray-700">{user.email}</span></CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Nombre y Apellido */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Tu nombre"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="last_name">Apellido</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  placeholder="Tu apellido"
                />
              </div>
            </div>

            {/* Teléfono, Edad, Sexo */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  placeholder="+54 11 1234-5678"
                  maxLength={20}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="age">Edad</Label>
                <Input
                  id="age"
                  value={formData.age}
                  onChange={handleAgeChange}
                  placeholder="Edad"
                  maxLength={3}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Sexo</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(v) => setFormData({ ...formData, gender: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Masculino">Masculino</SelectItem>
                    <SelectItem value="Femenino">Femenino</SelectItem>
                    <SelectItem value="Prefiero no decirlo">Prefiero no decirlo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Fecha de nacimiento */}
            <div className="space-y-1.5 max-w-[200px]">
              <Label htmlFor="birth_date">Fecha de nacimiento</Label>
              <Input
                id="birth_date"
                type="date"
                value={formData.birth_date}
                onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
              />
            </div>

            {/* Especialidades */}
            <div className="space-y-2">
              <Label>Especialidades</Label>
              <div className="flex gap-2">
                <Input
                  value={specialtyInput}
                  onChange={(e) => setSpecialtyInput(e.target.value)}
                  onKeyDown={handleSpecialtyKeyDown}
                  placeholder="Ej: Música, Arte... (Enter para agregar)"
                  className="flex-1"
                />
                <Button type="button" variant="outline" onClick={addSpecialty} disabled={!specialtyInput.trim()}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {formData.specialties.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {formData.specialties.map((s, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 bg-[#e0f7fa] text-[#00838f] text-xs font-medium px-2.5 py-1 rounded-full"
                    >
                      {s}
                      <button type="button" onClick={() => removeSpecialty(i)} className="hover:text-red-500 transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {message && (
              <Alert className={message.type === "ok" ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                <AlertDescription className={message.type === "ok" ? "text-green-700" : "text-red-700"}>
                  {message.text}
                </AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              disabled={saving || !formData.name.trim()}
              className="bg-[#0099b0] hover:bg-[#007a8e] text-white disabled:opacity-50"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Guardando..." : "Guardar cambios"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
