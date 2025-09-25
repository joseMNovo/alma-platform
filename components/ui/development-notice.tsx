"use client"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Construction, Package } from "lucide-react"

interface DevelopmentNoticeProps {
  isAdmin?: boolean
}

export default function DevelopmentNotice({ isAdmin = false }: DevelopmentNoticeProps) {
  if (isAdmin) {
    return (
      <Alert className="mb-6 border-amber-200 bg-amber-50">
        <Construction className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
        <strong>Plataforma en Desarrollo:</strong> Solo algunos módulos están habilitados. Estamos trabajando en el resto.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Alert className="mb-6 border-blue-200 bg-blue-50">
      <Package className="h-4 w-4 text-blue-600" />
      <AlertDescription className="text-blue-800">
        <strong>Plataforma en Desarrollo:</strong> Solo algunos módulos están habilitados. Estamos trabajando en el resto.
      </AlertDescription>
    </Alert>
  )
}
