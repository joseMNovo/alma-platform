"use client"

import { AlertTriangle, Trash2, Package, Users, Calendar, Activity, CreditCard, Mail, BarChart3, Settings, Upload } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface ConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  title?: string
  description?: string
  itemName?: string
  itemType?: "taller" | "grupo" | "actividad" | "pago" | "inventario" | "email" | "reporte" | "configuracion" | "general"
  action?: "delete" | "archive" | "restore" | "reset" | "import" | "general"
  loading?: boolean
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
  general: AlertTriangle,
}

const itemLabels = {
  taller: "taller",
  grupo: "grupo",
  actividad: "actividad",
  pago: "pago",
  inventario: "item del inventario",
  email: "email",
  reporte: "reporte",
  configuracion: "configuración",
  general: "elemento",
}

const actionLabels = {
  delete: "eliminar",
  archive: "archivar",
  restore: "restaurar",
  reset: "restablecer",
  import: "importar datos",
  general: "realizar esta acción",
}

export default function ConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  itemName,
  itemType = "general",
  action = "delete",
  loading = false,
}: ConfirmationDialogProps) {
  const IconComponent = itemIcons[itemType]
  const itemLabel = itemLabels[itemType]
  const actionLabel = actionLabels[action]

  const defaultTitle = title || `¿Confirmar ${actionLabel}?`
  const defaultDescription = description || 
    (itemName 
      ? `¿Estás seguro de que deseas ${actionLabel} "${itemName}"? Esta acción no se puede deshacer.`
      : `¿Estás seguro de que deseas ${actionLabel} este ${itemLabel}? Esta acción no se puede deshacer.`
    )

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[425px] border-0 shadow-2xl bg-gradient-to-br from-white to-gray-50">
        <AlertDialogHeader className="text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-red-50 to-red-100 shadow-lg">
            <IconComponent className="h-10 w-10 text-red-600 drop-shadow-sm" />
          </div>
          <AlertDialogTitle className="text-2xl font-bold text-gray-900 mb-2">
            {defaultTitle}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base text-gray-600 leading-relaxed">
            {defaultDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        {itemName && (
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-5 border border-gray-200 shadow-sm">
            <div className="flex items-center space-x-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">
                <IconComponent className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <span className="text-sm font-semibold text-gray-900">{itemName}</span>
                <p className="text-xs text-gray-500 capitalize">{itemLabel}</p>
              </div>
            </div>
          </div>
        )}

        <AlertDialogFooter className="flex-col sm:flex-row gap-3 sm:gap-0 pt-6">
          <AlertDialogCancel 
            className="w-full sm:w-auto order-2 sm:order-1 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium"
            disabled={loading}
          >
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={loading}
            className="w-full sm:w-auto order-1 sm:order-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white focus:ring-red-600 shadow-lg hover:shadow-xl transition-all duration-200 font-medium"
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                <span>Procesando...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                {action === "import" ? (
                  <Upload className="h-4 w-4" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                <span>
                  {action === "delete" ? "Eliminar" : 
                   action === "archive" ? "Archivar" :
                   action === "restore" ? "Restaurar" :
                   action === "reset" ? "Restablecer" :
                   action === "import" ? "Importar" :
                   "Confirmar"}
                </span>
              </div>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
