"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, Download, FileText, AlertTriangle, CheckCircle } from "lucide-react"
import ConfirmationDialog from "@/components/ui/confirmation-dialog"

export default function AjustesManager({ user }: { user: any }) {
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [importError, setImportError] = useState("")
  const [importSuccess, setImportSuccess] = useState(false)

  const handleExport = async () => {
    try {
      const response = await fetch("/api/data/export")
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `alma-data-${new Date().toISOString().split("T")[0]}.json`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        alert("Error al exportar los datos")
      }
    } catch (error) {
      console.error("Error exporting data:", error)
      alert("Error al exportar los datos")
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.type === "application/json" || file.name.endsWith(".json")) {
        setSelectedFile(file)
        setImportError("")
      } else {
        setImportError("Por favor selecciona un archivo JSON válido")
        setSelectedFile(null)
      }
    }
  }

  const validateJsonStructure = (data: any): boolean => {
    const requiredKeys = ["volunteers", "workshops", "groups", "activities", "payments", "inventory", "enrollments", "pending_tasks"]

    // Verificar que tenga todas las claves requeridas
    for (const key of requiredKeys) {
      if (!(key in data)) {
        setImportError(`El archivo JSON no contiene la clave requerida: ${key}`)
        return false
      }
      if (!Array.isArray(data[key])) {
        setImportError(`La clave '${key}' debe ser un array`)
        return false
      }
    }

    // Verificar que exista al menos un voluntario administrador
    const hasAdmin = data.volunteers?.some((v: any) => v.is_admin === true || v.is_admin === 1)
    if (!hasAdmin) {
      setImportError("Debe existir al menos un voluntario administrador en el archivo")
      return false
    }

    return true
  }

  const handleImportConfirm = async () => {
    if (!selectedFile) return

    setImporting(true)
    setImportError("")
    setImportSuccess(false)

    try {
      const text = await selectedFile.text()
      const jsonData = JSON.parse(text)

      // Validar estructura del JSON
      if (!validateJsonStructure(jsonData)) {
        setImporting(false)
        return
      }

      // Enviar al servidor para importar
      const response = await fetch("/api/data/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(jsonData),
      })

      if (response.ok) {
        setImportSuccess(true)
        setSelectedFile(null)
        // Limpiar el input de archivo
        const fileInput = document.getElementById("json-file") as HTMLInputElement
        if (fileInput) fileInput.value = ""
        
        // Recargar la página después de 2 segundos para reflejar los cambios
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      } else {
        const error = await response.json()
        setImportError(error.error || "Error al importar los datos")
      }
    } catch (error) {
      console.error("Error importing data:", error)
      setImportError("Error al procesar el archivo JSON. Verifica que sea válido.")
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <FileText className="w-6 h-6 mr-3 text-[#4dd0e1]" />
          Ajustes del Sistema
        </h2>
        <p className="text-gray-600 mt-1">Gestiona la importación y exportación de datos</p>
      </div>

      {/* Mensaje de éxito */}
      {importSuccess && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 shadow-sm rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <CheckCircle className="h-5 w-5 text-green-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-800">
                <span className="font-medium">Importación exitosa:</span> Los datos se han importado correctamente. La página se recargará automáticamente.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mensaje de error */}
      {importError && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 shadow-sm rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">
                <span className="font-medium">Error:</span> {importError}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tarjetas de funcionalidades */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Exportar JSON */}
        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Download className="w-5 h-5 mr-2 text-[#4dd0e1]" />
              Exportar Datos
            </CardTitle>
            <CardDescription>
              Descarga una copia de seguridad de todos los datos del sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Incluye:</strong> Usuarios, Talleres, Grupos, Actividades, Pagos, Inventario, Voluntarios e Inscripciones
              </p>
            </div>
            <Button 
              onClick={handleExport}
              className="w-full bg-[#4dd0e1] hover:bg-[#3bc0d1] text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar JSON
            </Button>
          </CardContent>
        </Card>

        {/* Importar JSON */}
        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Upload className="w-5 h-5 mr-2 text-[#4dd0e1]" />
              Importar Datos
            </CardTitle>
            <CardDescription>
              Restaura datos desde un archivo JSON de respaldo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>⚠️ Advertencia:</strong> Esta acción reemplazará todos los datos actuales
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="json-file">Archivo JSON</Label>
              <Input
                id="json-file"
                type="file"
                accept=".json,application/json"
                onChange={handleFileSelect}
                className="cursor-pointer"
              />
              {selectedFile && (
                <p className="text-sm text-green-600">
                  ✓ Archivo seleccionado: {selectedFile.name}
                </p>
              )}
            </div>

            <Button 
              onClick={() => setImportDialogOpen(true)}
              disabled={!selectedFile || importing}
              variant="outline"
              className="w-full border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
            >
              <Upload className="w-4 h-4 mr-2" />
              {importing ? "Importando..." : "Importar JSON"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Información adicional */}
      <Card className="bg-gray-50 border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg">Información Importante</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900">Formato del archivo JSON:</h4>
            <ul className="text-sm text-gray-600 space-y-1 ml-4">
              <li>• Debe contener las claves: volunteers, workshops, groups, activities, payments, inventory, enrollments, pending_tasks</li>
              <li>• Cada clave debe ser un array de objetos</li>
              <li>• Debe existir al menos un voluntario con is_admin: true</li>
              <li>• El archivo debe ser válido JSON</li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900">Recomendaciones:</h4>
            <ul className="text-sm text-gray-600 space-y-1 ml-4">
              <li>• Haz una exportación antes de importar datos nuevos</li>
              <li>• Verifica que el archivo JSON sea de una versión compatible</li>
              <li>• La importación reemplazará todos los datos actuales</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Diálogo de confirmación para importar */}
      <ConfirmationDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onConfirm={handleImportConfirm}
        title="¿Importar datos?"
        description="Esta acción reemplazará TODOS los datos actuales del sistema con los datos del archivo JSON. Esta operación no se puede deshacer."
        action="import"
        loading={importing}
        itemType="general"
      />
    </div>
  )
}
