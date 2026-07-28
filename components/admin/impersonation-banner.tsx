"use client"

import { useState } from "react"
import { AlertTriangle, LogOut } from "lucide-react"
import { toast } from "@/hooks/use-toast"

const ROLE_LABELS: Record<string, string> = {
  voluntario: "Voluntario/a",
  participante: "Participante",
}

/**
 * Aviso fijo cuando un admin está viendo la app como otra persona
 * (impersonación). Se banca su propia altura (h-9) — Dashboard le corre el
 * header sticky para abajo (top-9 en vez de top-0) mientras esto está activo.
 */
export default function ImpersonationBanner({
  user,
}: {
  user: {
    name?: string | null
    last_name?: string | null
    email: string
    role: string
    original_admin?: { id: number; email: string }
  }
}) {
  const [exiting, setExiting] = useState(false)

  const exit = async () => {
    setExiting(true)
    try {
      const res = await fetch("/api/admin/impersonate", { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "No se pudo volver a tu cuenta")
      localStorage.setItem("alma_user", JSON.stringify(data.user))
      // Recarga completa: los ~20 page.tsx del app leen alma_user solo al montar.
      window.location.href = "/calendarios"
    } catch (error: any) {
      toast({ title: "Error", description: error?.message, variant: "destructive" })
      setExiting(false)
    }
  }

  const fullName = `${user.name ?? ""} ${user.last_name ?? ""}`.trim() || user.email

  return (
    <div className="fixed inset-x-0 top-0 z-40 flex h-9 items-center justify-center gap-2 bg-amber-400 px-3 text-center text-xs font-medium text-amber-950 sm:gap-3 sm:text-sm">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span className="truncate">
        Estás viendo como <strong>{fullName}</strong> ({ROLE_LABELS[user.role] ?? user.role})
        {user.original_admin?.email ? <span className="hidden sm:inline"> — entraste como {user.original_admin.email}</span> : null}
      </span>
      <button
        onClick={exit}
        disabled={exiting}
        className="ml-1 inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-950/10 px-2.5 py-1 font-semibold transition-colors hover:bg-amber-950/20 disabled:opacity-60"
      >
        <LogOut className="h-3.5 w-3.5" />
        {exiting ? "Volviendo…" : "Volver a mi cuenta"}
      </button>
    </div>
  )
}
