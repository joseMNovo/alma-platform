"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Heart, Loader2 } from "lucide-react"

/**
 * Onboarding liviano del participante.
 *
 * El participante se registra solo con email + PIN, así que su ficha nace SIN
 * nombre — y el staff lo ve como "Sin nombre". Este modal, la primera vez que
 * entra, le pide nombre y apellido al toque (inline, no lo manda a otra
 * pantalla). Es no intrusivo: puede posponerlo.
 *
 * Guiado por DATOS, no por un flag frágil: aparece si el perfil no tiene
 * nombre. Si lo pospone, vuelve a aparecer en el próximo ingreso (no dentro de
 * la misma sesión, para no molestar), hasta que lo complete.
 */

const SNOOZE_KEY = "alma_onboarding_snoozed"

export default function ParticipanteOnboarding({ user }: { user: any }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [lastName, setLastName] = useState("")
  const [phone, setPhone] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user?.role !== "participante") return
    // Pospuesto en esta sesión: no reaparece al navegar.
    if (sessionStorage.getItem(SNOOZE_KEY)) return

    fetch("/api/participantes/perfil")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const p = data?.profile
        // Solo si todavía no cargó su nombre.
        if (!p?.name?.trim()) {
          setName(p?.name ?? "")
          setLastName(p?.last_name ?? "")
          setPhone(p?.phone ?? "")
          setOpen(true)
        }
      })
      .catch(() => {})
  }, [user?.role])

  const snooze = () => {
    sessionStorage.setItem(SNOOZE_KEY, "1")
    setOpen(false)
  }

  const save = async () => {
    if (!name.trim() || !lastName.trim()) return
    setSaving(true)
    try {
      const res = await fetch("/api/participantes/perfil", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), last_name: lastName.trim(), phone: phone.trim() || null }),
      })
      if (!res.ok) throw new Error()

      // Reflejar el nombre en el header al instante (el user vive en localStorage).
      try {
        const stored = JSON.parse(localStorage.getItem("alma_user") || "{}")
        stored.name = name.trim()
        stored.last_name = lastName.trim()
        localStorage.setItem("alma_user", JSON.stringify(stored))
      } catch { /* si el storage falla, no es crítico */ }

      setOpen(false)
      // Un reload liviano para que el header tome el nombre nuevo.
      window.location.reload()
    } catch {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) snooze() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Heart className="h-6 w-6 text-[#4dd0e1]" />
            ¡Bienvenido/a a ALMA!
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-gray-600">
          Para conocerte mejor, contanos cómo te llamás. Es rápido y lo podés
          completar con más datos cuando quieras desde <strong>Mi cuenta</strong>.
        </p>

        <div className="space-y-3 pt-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="ob-name">Nombre *</Label>
              <Input id="ob-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </div>
            <div>
              <Label htmlFor="ob-last">Apellido *</Label>
              <Input id="ob-last" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="ob-phone">Teléfono <span className="text-gray-400">(opcional)</span></Label>
            <Input id="ob-phone" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={snooze} className="border-gray-300 text-gray-600">
            Ahora no
          </Button>
          <Button
            onClick={save}
            disabled={saving || !name.trim() || !lastName.trim()}
            className="bg-[#4dd0e1] hover:bg-[#3bb8c9] text-white"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
