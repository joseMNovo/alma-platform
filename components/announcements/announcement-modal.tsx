"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Megaphone } from "lucide-react"

interface Announcement {
  id: number
  title: string
  body: string
}

interface AnnouncementModalProps {
  user: { id: number; role: string }
}

// Recuerda, solo durante la sesión del navegador, qué anuncio ya se mostró.
// Evita que el popup reaparezca al navegar entre pestañas (el Dashboard se
// remonta en cada ruta). El "no volver a mostrar" definitivo va al backend.
const SESSION_KEY = "alma_announcement_seen_id"

export default function AnnouncementModal({ user }: AnnouncementModalProps) {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null)
  const [open, setOpen] = useState(false)
  const [dontShow, setDontShow] = useState(false)

  useEffect(() => {
    let cancelled = false
    let pending: Announcement | null = null

    const showOrDefer = (data: Announcement) => {
      const seen = sessionStorage.getItem(SESSION_KEY)
      if (seen && Number(seen) === data.id) return
      // Si el modal de bienvenida (usuario recién creado) está abierto, esperamos
      // a que se cierre para no montarnos encima y cerrarlo de golpe.
      if ((window as any).__almaWelcomeOpen) {
        pending = data
        return
      }
      setAnnouncement(data)
      setOpen(true)
    }

    const onWelcomeClosed = () => {
      if (pending && !cancelled) {
        const data = pending
        pending = null
        showOrDefer(data)
      }
    }
    window.addEventListener("alma:welcome-closed", onWelcomeClosed)

    fetch("/api/announcements")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Announcement | null) => {
        if (cancelled || !data) return
        showOrDefer(data)
      })
      .catch(() => {})
    return () => {
      cancelled = true
      window.removeEventListener("alma:welcome-closed", onWelcomeClosed)
    }
  }, [])

  const handleClose = async () => {
    setOpen(false)
    if (!announcement) return

    // No reabrir durante esta sesión de navegador
    sessionStorage.setItem(SESSION_KEY, String(announcement.id))

    if (dontShow) {
      try {
        await fetch("/api/announcements/dismiss", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: announcement.id }),
        })
      } catch {
        // Si falla el descarte persistente, no rompemos la UX:
        // como mucho el anuncio reaparece en el próximo login.
      }
    }
  }

  if (!announcement) return null

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) handleClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Megaphone className="w-6 h-6 text-[#4dd0e1]" />
            {announcement.title}
          </DialogTitle>
        </DialogHeader>
        <div className="text-gray-600 text-sm leading-relaxed whitespace-pre-line pt-1 max-h-[55vh] overflow-y-auto">
          {announcement.body}
        </div>
        <DialogFooter className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
            <Checkbox checked={dontShow} onCheckedChange={(v) => setDontShow(v === true)} />
            No volver a mostrar
          </label>
          <Button
            onClick={handleClose}
            className="w-full sm:w-auto bg-[#0099b0] hover:bg-[#007a8e] text-white"
          >
            Entendido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
