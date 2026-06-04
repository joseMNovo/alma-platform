"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Clock, Mail, User, Loader2, RefreshCw } from "lucide-react"
import { formatLocalDate } from "@/lib/utils"

interface PendingVolunteer {
  id: number
  name: string
  last_name: string | null
  email: string
  email_verified: boolean
  registration_date: string
  phone: string | null
}

interface CurrentUser {
  role: string
}

export default function AprobacionesManager({ user, onPendingCount }: { user: CurrentUser; onPendingCount?: (n: number) => void }) {
  const [volunteers, setVolunteers] = useState<PendingVolunteer[]>([])
  const [loading, setLoading] = useState(true)
  const [approvingId, setApprovingId] = useState<number | null>(null)

  const fetchPending = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/voluntarios?status=pendiente")
      if (res.ok) {
        const data = await res.json()
        setVolunteers(data)
        onPendingCount?.(data.length)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPending() }, [])

  const handleApprove = async (id: number) => {
    setApprovingId(id)
    try {
      const res = await fetch(`/api/voluntarios/${id}/approve`, { method: "POST" })
      if (res.ok) {
        setVolunteers((prev) => {
          const updated = prev.filter((v) => v.id !== id)
          onPendingCount?.(updated.length)
          return updated
        })
      }
    } finally {
      setApprovingId(null)
    }
  }

  const fullName = (v: PendingVolunteer) =>
    [v.name, v.last_name].filter(Boolean).join(" ")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Aprobaciones</h2>
          <p className="text-gray-500 text-sm mt-1">Voluntarios que esperan ser aprobados</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchPending} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-[#4dd0e1]" />
        </div>
      ) : volunteers.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto" />
          <h3 className="text-lg font-semibold text-gray-700">Sin pendientes</h3>
          <p className="text-gray-500 text-sm">No hay voluntarios esperando aprobación.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {volunteers.map((v) => (
            <Card key={v.id} className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#f5f3ff] flex items-center justify-center">
                      <User className="w-5 h-5 text-[#9a8bc2]" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{fullName(v)}</p>
                      <p className="text-gray-400 text-xs">ID #{v.id}</p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={v.email_verified
                      ? "border-green-300 text-green-700 bg-green-50 text-xs"
                      : "border-amber-300 text-amber-700 bg-amber-50 text-xs"}
                  >
                    {v.email_verified ? "Email verificado" : "Sin verificar"}
                  </Badge>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-gray-600 text-sm">
                    <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="truncate">{v.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500 text-xs">
                    <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span>Registrado el {formatLocalDate(v.registration_date)}</span>
                  </div>
                </div>

                <Button
                  className="w-full bg-[#4dd0e1] hover:bg-[#0099b0] text-white text-sm"
                  disabled={approvingId === v.id}
                  onClick={() => handleApprove(v.id)}
                >
                  {approvingId === v.id
                    ? <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                    : "Aprobar voluntario"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
