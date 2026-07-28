"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import ConfirmationDialog from "@/components/ui/confirmation-dialog"
import ImageUpload from "@/components/ui/image-upload"
import { toast } from "@/hooks/use-toast"
import type { Training, TrainingItem } from "@/lib/data-manager"
import {
  Plus, Pencil, Trash2, ArrowUp, ArrowDown, Eye, EyeOff,
  CheckCircle2, AlertTriangle, Loader2, Youtube, FileText,
} from "lucide-react"

/**
 * Gestión de contenidos (admin).
 *
 * El formulario hace el trabajo sucio: se pega la URL de YouTube como sea
 * (youtu.be, watch?v=, /shorts/) y el backend extrae el ID y verifica por
 * oEmbed que el video se pueda insertar. Eso detecta EN EL MOMENTO el error
 * más probable del módulo: haber subido el video como «Privado».
 */
export default function CapacitacionesAdmin({
  user,
  trainings,
  onChanged,
  openNewSignal,
}: {
  user: any
  trainings: Training[]
  onChanged: () => void
  /** Cambia cuando el botón "Nueva capacitación" del header pide abrir el alta. */
  openNewSignal?: number
}) {
  const [editing, setEditing] = useState<Partial<Training> | null>(null)
  const [itemForm, setItemForm] = useState<{ trainingId: number; item: Partial<TrainingItem> } | null>(null)
  const [confirm, setConfirm] = useState<{ label: string; run: () => void } | null>(null)
  const [saving, setSaving] = useState(false)

  const newTraining = () =>
    setEditing({ title: "", status: "borrador", access_mode: "grant", price: 0, currency: "ARS" })

  // El header dispara el alta a través de esta señal (evita el primer render).
  useEffect(() => {
    if (openNewSignal) newTraining()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openNewSignal])

  // ── Capacitaciones ───────────────────────────────────────────────────

  const saveTraining = async () => {
    if (!editing?.title?.trim()) {
      toast({ title: "Falta el título", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const isNew = !editing.id
      const res = await fetch(isNew ? "/api/capacitaciones" : `/api/capacitaciones/${editing.id}`, {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "No se pudo guardar")

      toast({ title: isNew ? "Capacitación creada" : "Capacitación actualizada" })
      setEditing(null)
      onChanged()
    } catch (error: any) {
      toast({ title: "Error", description: error?.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const removeTraining = (t: Training) => {
    setConfirm({
      label: `Se elimina «${t.title}» y todo su contenido. Las habilitaciones y los pagos ya registrados NO se borran.`,
      run: async () => {
        try {
          const res = await fetch(`/api/capacitaciones/${t.id}`, { method: "DELETE" })
          if (!res.ok) throw new Error((await res.json())?.error)
          toast({ title: "Capacitación eliminada" })
          onChanged()
        } catch (error: any) {
          toast({ title: "Error", description: error?.message, variant: "destructive" })
        } finally {
          setConfirm(null)
        }
      },
    })
  }

  // ── Contenido ────────────────────────────────────────────────────────

  const saveItem = async () => {
    if (!itemForm) return
    const { trainingId, item } = itemForm
    if (!item.title?.trim()) {
      toast({ title: "Falta el título", variant: "destructive" })
      return
    }
    if ((item.kind ?? "video") === "video" && !item.video_ref?.trim()) {
      toast({ title: "Pegá el link del video", variant: "destructive" })
      return
    }

    setSaving(true)
    try {
      const isNew = !item.id
      const res = await fetch(isNew ? "/api/capacitaciones/items" : `/api/capacitaciones/items?id=${item.id}`, {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isNew ? { ...item, training_id: trainingId } : item),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "No se pudo guardar")

      toast({ title: isNew ? "Contenido agregado" : "Contenido actualizado" })
      setItemForm(null)
      onChanged()
    } catch (error: any) {
      toast({ title: "Error", description: error?.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const removeItem = (item: TrainingItem) => {
    setConfirm({
      label: `Se elimina «${item.title}». El avance de quienes lo vieron se pierde.`,
      run: async () => {
        try {
          const res = await fetch(`/api/capacitaciones/items?id=${item.id}`, { method: "DELETE" })
          if (!res.ok) throw new Error((await res.json())?.error)
          toast({ title: "Contenido eliminado" })
          onChanged()
        } catch (error: any) {
          toast({ title: "Error", description: error?.message, variant: "destructive" })
        } finally {
          setConfirm(null)
        }
      },
    })
  }

  const move = async (training: Training, index: number, direction: -1 | 1) => {
    const ids = training.items.map((i) => i.id)
    const target = index + direction
    if (target < 0 || target >= ids.length) return
    ;[ids[index], ids[target]] = [ids[target], ids[index]]

    try {
      const res = await fetch("/api/capacitaciones/items/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ training_id: training.id, order: ids }),
      })
      if (!res.ok) throw new Error((await res.json())?.error)
      onChanged()
    } catch (error: any) {
      toast({ title: "Error al reordenar", description: error?.message, variant: "destructive" })
    }
  }

  const togglePublished = async (item: TrainingItem) => {
    try {
      const res = await fetch(`/api/capacitaciones/items?id=${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_published: !item.is_published }),
      })
      if (!res.ok) throw new Error((await res.json())?.error)
      onChanged()
    } catch (error: any) {
      toast({ title: "Error", description: error?.message, variant: "destructive" })
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-gray-900">Gestión de contenidos</h3>
        <p className="text-sm text-gray-500">
          Con <strong>Nueva capacitación</strong> creás el curso; después cargale su{" "}
          <strong>contenido</strong> (videos, textos) desde cada tarjeta.
        </p>
      </div>

      {trainings.map((t) => (
        <Card key={t.id}>
          <CardContent className="space-y-3 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-semibold text-gray-900">{t.title}</h4>
                  <Badge variant={t.status === "publicada" ? "default" : "secondary"}>{t.status}</Badge>
                  {t.access_mode === "abierta" && <Badge variant="outline">Abierta</Badge>}
                  {Number(t.price) > 0 && (
                    <Badge variant="outline">${Number(t.price).toLocaleString("es-AR")}</Badge>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {t.item_count} {t.item_count === 1 ? "pieza" : "piezas"} de contenido
                  {t.default_access_days ? ` · acceso por ${t.default_access_days} días` : " · sin vencimiento"}
                </p>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => setEditing(t)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => removeTraining(t)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              {t.items.map((item, index) => (
                // flex-wrap: en mobile el título ocupa la primera fila y los
                // botones bajan a la segunda, en vez de aplastarse.
                <div key={item.id} className="flex flex-wrap items-center gap-1 rounded border border-gray-100 p-2 sm:gap-2">
                  {item.kind === "video" ? (
                    <Youtube className="h-4 w-4 shrink-0 text-red-500" />
                  ) : (
                    <FileText className="h-4 w-4 shrink-0 text-gray-400" />
                  )}
                  <span className={`min-w-0 flex-1 basis-full truncate text-sm sm:basis-auto ${item.is_published ? "" : "text-gray-400 line-through"}`}>
                    {index + 1}. {item.title}
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => move(t, index, -1)} disabled={index === 0}>
                    <ArrowUp className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => move(t, index, 1)} disabled={index === t.items.length - 1}>
                    <ArrowDown className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => togglePublished(item)}>
                    {item.is_published ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3 text-gray-400" />}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setItemForm({ trainingId: t.id, item })}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => removeItem(item)}>
                    <Trash2 className="h-3 w-3 text-red-500" />
                  </Button>
                </div>
              ))}

              <Button
                size="sm"
                variant="outline"
                className="w-full border-[#4dd0e1]/40 bg-[#4dd0e1]/10 font-medium text-[#00838f] hover:bg-[#4dd0e1]/20"
                onClick={() => setItemForm({ trainingId: t.id, item: { kind: "video", is_published: true } })}
              >
                <Plus className="mr-2 h-3 w-3" />
                Agregar contenido a «{t.title}»
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {editing && (
        <TrainingDialog
          value={editing}
          saving={saving}
          onChange={setEditing}
          onSave={saveTraining}
          onClose={() => setEditing(null)}
        />
      )}

      {itemForm && (
        <ItemDialog
          value={itemForm.item}
          saving={saving}
          onChange={(item) => setItemForm({ ...itemForm, item })}
          onSave={saveItem}
          onClose={() => setItemForm(null)}
        />
      )}

      {confirm && (
        <ConfirmationDialog
          open
          onOpenChange={(open) => !open && setConfirm(null)}
          title="¿Confirmás?"
          description={confirm.label}
          action="delete"
          itemType="general"
          onConfirm={confirm.run}
        />
      )}
    </div>
  )
}

// ── Formulario de capacitación ─────────────────────────────────────────

function TrainingDialog({
  value, saving, onChange, onSave, onClose,
}: {
  value: Partial<Training>
  saving: boolean
  onChange: (v: Partial<Training>) => void
  onSave: () => void
  onClose: () => void
}) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{value.id ? "Editar capacitación" : "Nueva capacitación"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Título *</Label>
            <Input value={value.title ?? ""} onChange={(e) => onChange({ ...value, title: e.target.value })} />
          </div>

          <div>
            <Label>Descripción</Label>
            <Textarea
              rows={3}
              value={value.description ?? ""}
              onChange={(e) => onChange({ ...value, description: e.target.value })}
            />
          </div>

          <ImageUpload
            label="Portada"
            purpose="training_cover"
            ownerType="training"
            ownerId={value.id ?? null}
            value={value.cover_file_guid ?? null}
            onChange={(guid) => onChange({ ...value, cover_file_guid: guid })}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Precio</Label>
              <Input
                type="number"
                min={0}
                value={String(value.price ?? 0)}
                onChange={(e) => onChange({ ...value, price: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Estado</Label>
              <Select value={value.status ?? "borrador"} onValueChange={(v) => onChange({ ...value, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="borrador">Borrador</SelectItem>
                  <SelectItem value="publicada">Publicada</SelectItem>
                  <SelectItem value="archivada">Archivada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Acceso</Label>
              <Select value={value.access_mode ?? "grant"} onValueChange={(v) => onChange({ ...value, access_mode: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="grant">Requiere habilitación</SelectItem>
                  <SelectItem value="abierta">Abierta (gratuita)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Vencimiento (días)</Label>
              <Input
                type="number"
                min={0}
                placeholder="Sin vencimiento"
                value={value.default_access_days ?? ""}
                onChange={(e) =>
                  onChange({ ...value, default_access_days: e.target.value ? Number(e.target.value) : null })
                }
              />
            </div>
          </div>
          <p className="text-xs text-gray-400">
            Vacío = el acceso no vence. Es solo el valor sugerido al habilitar a alguien.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={onSave} disabled={saving} className="bg-[#4dd0e1] hover:bg-[#3bb8c9]">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Formulario de contenido ────────────────────────────────────────────

function ItemDialog({
  value, saving, onChange, onSave, onClose,
}: {
  value: Partial<TrainingItem>
  saving: boolean
  onChange: (v: Partial<TrainingItem>) => void
  onSave: () => void
  onClose: () => void
}) {
  const [checking, setChecking] = useState(false)
  const [check, setCheck] = useState<{ ok: boolean; message?: string | null; video_id?: string | null } | null>(null)

  /** Valida el link contra YouTube y autocompleta el título. */
  const verify = async () => {
    if (!value.video_ref?.trim()) return
    setChecking(true)
    setCheck(null)
    try {
      const res = await fetch("/api/capacitaciones/check-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: value.video_ref }),
      })
      const data = await res.json()
      setCheck(data)
      if (data.ok) {
        onChange({
          ...value,
          video_ref: data.video_id,
          title: value.title?.trim() ? value.title : data.title || "",
        })
      }
    } catch {
      setCheck({ ok: false, message: "No se pudo verificar el video" })
    } finally {
      setChecking(false)
    }
  }

  const isVideo = (value.kind ?? "video") === "video"

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{value.id ? "Editar contenido" : "Agregar contenido"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Tipo</Label>
            <Select value={value.kind ?? "video"} onValueChange={(v) => onChange({ ...value, kind: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="video">Video de YouTube</SelectItem>
                <SelectItem value="texto">Texto</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isVideo && (
            <div>
              <Label>Link del video *</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://youtu.be/... o el ID"
                  value={value.video_ref ?? ""}
                  onChange={(e) => { onChange({ ...value, video_ref: e.target.value }); setCheck(null) }}
                />
                <Button variant="outline" onClick={verify} disabled={checking || !value.video_ref}>
                  {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verificar"}
                </Button>
              </div>

              {check && (
                <p className={`mt-2 flex items-start gap-1 text-xs ${check.ok ? "text-green-600" : "text-red-600"}`}>
                  {check.ok ? (
                    <>
                      <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0" />
                      El video se puede insertar correctamente.
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                      {check.message}
                    </>
                  )}
                </p>
              )}

              <p className="mt-2 text-xs text-gray-400">
                El video tiene que estar en YouTube como <strong>«No listado»</strong>. Los
                «Privados» no se pueden insertar y se ven en negro.
              </p>

              {check?.ok && check.video_id && (
                <div className="mt-3 aspect-video w-full overflow-hidden rounded-lg bg-black">
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${check.video_id}`}
                    className="h-full w-full"
                    allow="encrypted-media"
                  />
                </div>
              )}
            </div>
          )}

          <div>
            <Label>Título *</Label>
            <Input value={value.title ?? ""} onChange={(e) => onChange({ ...value, title: e.target.value })} />
          </div>

          {isVideo ? (
            <div>
              <Label>Duración (minutos)</Label>
              <Input
                type="number"
                min={0}
                value={value.duration_minutes ?? ""}
                onChange={(e) =>
                  onChange({ ...value, duration_minutes: e.target.value ? Number(e.target.value) : null })
                }
              />
              <p className="mt-1 text-xs text-gray-400">
                Se usa para calcular cuándo dar el video por visto (90% reproducido).
              </p>
            </div>
          ) : (
            <div>
              <Label>Contenido</Label>
              <Textarea rows={6} value={value.body ?? ""} onChange={(e) => onChange({ ...value, body: e.target.value })} />
            </div>
          )}

          <div>
            <Label>Descripción</Label>
            <Textarea
              rows={2}
              value={value.description ?? ""}
              onChange={(e) => onChange({ ...value, description: e.target.value })}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={onSave} disabled={saving} className="bg-[#4dd0e1] hover:bg-[#3bb8c9]">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
