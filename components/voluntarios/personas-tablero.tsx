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
      <Card className="border-[#bbe5eb] bg-gradient-to-br from-[#dff2f5] to-white shadow-sm">
        <CardContent className="pt-5 pb-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-[#5ec0cf]/20 flex items-center justify-center shrink-0">
            <Heart className="w-5 h-5 text-[#04799a]" />
          </div>
          <div>
            {loading
              ? <div className={skeletonClass} />
              : <p className="text-2xl sm:text-3xl font-bold text-[#04799a] leading-none">{counts?.volunteers ?? "—"}</p>
            }
            <p className="text-xs text-gray-500 mt-1 font-medium">Voluntarios activos</p>
          </div>
        </CardContent>
      </Card>

      {/* Participantes */}
      <Card className="border-[#e1dced] bg-gradient-to-br from-[#f0eef6] to-white shadow-sm">
        <CardContent className="pt-5 pb-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-[#e1dced] flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-[#5f5088]" />
          </div>
          <div>
            {loading
              ? <div className={skeletonClass} />
              : <p className="text-2xl sm:text-3xl font-bold text-[#5f5088] leading-none">{counts?.participants ?? "—"}</p>
            }
            <p className="text-xs text-gray-500 mt-1 font-medium">Participantes registrados</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
