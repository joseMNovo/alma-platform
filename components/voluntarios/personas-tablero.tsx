"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Heart, Users } from "lucide-react"

interface PersonasCounts {
  volunteers: number
  participants: number
}

export default function PersonasTablero() {
  const [counts, setCounts] = useState<PersonasCounts | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/personas")
      .then(r => r.json())
      .then(d => setCounts(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const skeletonClass = "h-8 w-16 bg-gray-200 rounded animate-pulse"

  return (
    <div className="grid grid-cols-2 gap-4 mb-6">
      {/* Voluntarios */}
      <Card className="border-[#b2ebf2] bg-gradient-to-br from-[#e0f7fa] to-white shadow-sm">
        <CardContent className="pt-5 pb-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-[#4dd0e1]/20 flex items-center justify-center shrink-0">
            <Heart className="w-5 h-5 text-[#0099b0]" />
          </div>
          <div>
            {loading
              ? <div className={skeletonClass} />
              : <p className="text-3xl font-bold text-[#0099b0] leading-none">{counts?.volunteers ?? "—"}</p>
            }
            <p className="text-xs text-gray-500 mt-1 font-medium">Voluntarios activos</p>
          </div>
        </CardContent>
      </Card>

      {/* Participantes */}
      <Card className="border-[#ffe0b2] bg-gradient-to-br from-[#fff3e0] to-white shadow-sm">
        <CardContent className="pt-5 pb-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            {loading
              ? <div className={skeletonClass} />
              : <p className="text-3xl font-bold text-orange-500 leading-none">{counts?.participants ?? "—"}</p>
            }
            <p className="text-xs text-gray-500 mt-1 font-medium">Participantes registrados</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
