"use client"

import { CheckCircle, Package, Users, Calendar, Activity, CreditCard, Mail, BarChart3, Settings } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface SuccessDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  itemName?: string
  itemType?: "taller" | "grupo" | "actividad" | "pago" | "inventario" | "email" | "reporte" | "configuracion" | "general"
  action?: "created" | "updated" | "deleted" | "saved" | "sent" | "general"
  onConfirm?: () => void
}

const itemIcons = {
  taller: Calendar,
  grupo: Users,
  actividad: Activity,
  pago: CreditCard,
  inventario: Package,
  email: Mail,
  reporte: BarChart3,
  configuracion: Settings,
  general: CheckCircle,
}

const actionLabels = {
  created: "creado",
  updated: "actualizado",
  deleted: "eliminado",
  saved: "guardado",
  sent: "enviado",
  general: "completado",
}

export default function SuccessDialog({
  open,
  onOpenChange,
  title,
  description,
  itemName,
  itemType = "general",
  action = "general",
  onConfirm,
}: SuccessDialogProps) {
  const IconComponent = itemIcons[itemType]
  const actionLabel = actionLabels[action]

  const defaultTitle = title || `¡${actionLabel.charAt(0).toUpperCase() + actionLabel.slice(1)} exitosamente!`
  const defaultDescription = description || 
    (itemName 
      ? `"${itemName}" ha sido ${actionLabel} correctamente.`
      : `La operación se ha ${actionLabel} correctamente.`
    )

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[425px] border-0 shadow-2xl bg-gradient-to-br from-white to-green-50">
        <AlertDialogHeader className="text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-50 to-green-100 shadow-lg">
            <CheckCircle className="h-10 w-10 text-green-600 drop-shadow-sm" />
          </div>
          <AlertDialogTitle className="text-2xl font-bold text-gray-900 mb-2">
            {defaultTitle}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base text-gray-600 leading-relaxed">
            {defaultDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        {itemName && (
          <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-5 border border-green-200 shadow-sm">
            <div className="flex items-center space-x-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">
                <IconComponent className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <span className="text-sm font-semibold text-gray-900">{itemName}</span>
                <p className="text-xs text-green-600 capitalize">Operación exitosa</p>
              </div>
            </div>
          </div>
        )}

        <AlertDialogFooter className="pt-6">
          <AlertDialogAction
            onClick={onConfirm || (() => onOpenChange(false))}
            className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white focus:ring-green-600 shadow-lg hover:shadow-xl transition-all duration-200 font-medium"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Continuar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
