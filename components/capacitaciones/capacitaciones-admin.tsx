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
import Ayuda from "@/components/ui/ayuda"
import FilterChip from "@/components/ui/filter-chip"
import { toast } from "@/hooks/use-toast"
import type { Training, TrainingItem } from "@/lib/data-manager"
import CatalogoCapacitaciones from "@/components/capacitaciones/catalogo-capacitaciones"
import TrainingPlayer from "@/components/capacitaciones/training-player"
import {
  Plus, Pencil, Trash2, ArrowUp, ArrowDown, ArrowLeft, Eye, EyeOff,
  CheckCircle2, AlertTriangle, Loader2, Youtube, FileText, GraduationCap,
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
  openNew,
  onOpenNewHandled,
}: {
  user: any
  trainings: Training[]
  onChanged: () => void
  /** true cuando el botón "Nueva capacitación" del header pide abrir el alta. */
  openNew?: boolean
  /** Apaga el pedido apenas se consume (ver comentario en el efecto). */
  onOpenNewHandled?: () => void
}) {
  const [editing, setEditing] = useState<Partial<Training> | null>(null)
  const [itemForm, setItemForm] = useState<{ trainingId: number; item: Partial<TrainingItem> } | null>(null)
  const [confirm, setConfirm] = useState<{ label: string; run: () => void } | null>(null)
  const [saving, setSaving] = useState(false)
  // Qué capacitación está abierta y qué contenido se está viendo de ella. Se
  // guarda el ID y no el objeto: la lista se recarga entera después de cada
  // cambio y un objeto viejo mostraría datos desactualizados.
  const [abiertaId, setAbiertaId] = useState<number | null>(null)
  const [itemAbiertoId, setItemAbiertoId] = useState<number | null>(null)

  const abierta = trainings.find((t) => t.id === abiertaId) ?? null
  // Si el ID guardado no es de esta capacitación (o el contenido se borró),
  // cae en el primero. Así no hace falta limpiarlo al cambiar de pantalla.
  const itemAbierto =
    abierta?.items.find((i) => i.id === itemAbiertoId) ?? abierta?.items[0] ?? null

  const newTraining = () =>
    setEditing({ title: "", status: "borrador", access_mode: "grant", price: 0, currency: "ARS" })

  // El header dispara el alta a través de este pedido, que se consume UNA vez.
  // Importante: este componente se desmonta en cada recarga (el manager muestra
  // un spinner) y al volver de la vista "Ver". Si el pedido quedara prendido,
  // el efecto correría de nuevo al montar y el modal se reabriría solo.
  useEffect(() => {
    if (!openNew) return
    newTraining()
    onOpenNewHandled?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openNew])

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
          // Vuelve a la grilla: quedarse en el detalle de algo que ya no existe
          // deja la pantalla en blanco.
          setAbiertaId(null)
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
      {abierta ? (
        /* Adentro de una capacitación se ve la MISMA pantalla que ve la
           persona, con los botones de administración encima. Es la única forma
           de saber cómo va a quedar sin tener que salir a mirarlo de nuevo. */
        <DetalleCapacitacion
          training={abierta}
          item={itemAbierto}
          user={user}
          onSelectItem={setItemAbiertoId}
          onVolver={() => setAbiertaId(null)}
          onEditar={() => setEditing(abierta)}
          onEliminar={() => removeTraining(abierta)}
          onNuevoItem={() =>
            setItemForm({ trainingId: abierta.id, item: { kind: "video", is_published: true } })
          }
          onEditarItem={(item) => setItemForm({ trainingId: abierta.id, item })}
          onEliminarItem={removeItem}
          onMover={(index, direction) => move(abierta, index, direction)}
          onAlternarPublicado={togglePublished}
        />
      ) : trainings.length === 0 ? (
        <div className="py-12 text-center">
          <GraduationCap className="mx-auto mb-4 h-12 w-12 text-gray-400" />
          <h3 className="mb-2 text-lg font-medium text-gray-900">No hay capacitaciones creadas</h3>
          <p className="text-gray-600">Creá la primera con el botón de arriba.</p>
        </div>
      ) : (
        /* La misma grilla que ve la gente, con el estado encima de las que
           todavía no están publicadas. */
        <CatalogoCapacitaciones
          trainings={trainings}
          mostrarEstado
          cta="Administrar"
          onSelect={(t) => {
            setAbiertaId(t.id)
            setItemAbiertoId(null)
          }}
        />
      )}

      {editing && (
        <TrainingDialog
          value={editing}
          categorias={[
            ...new Set(trainings.map((t) => t.category?.trim()).filter(Boolean) as string[]),
          ].sort((a, b) => a.localeCompare(b, "es"))}
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

// ── Detalle de una capacitación (admin) ────────────────────────────────

/**
 * Lo mismo que ve la persona —reproductor a la izquierda, lista de contenidos
 * a la derecha— más los botones de administrar cada pieza.
 *
 * A propósito SIN «Tu avance»: acá el avance de quien administra no significa
 * nada. Y el video no registra reproducción (`soloVistaPrevia`), así revisar
 * el contenido no ensucia las estadísticas.
 */
function DetalleCapacitacion({
  training,
  item,
  user,
  onSelectItem,
  onVolver,
  onEditar,
  onEliminar,
  onNuevoItem,
  onEditarItem,
  onEliminarItem,
  onMover,
  onAlternarPublicado,
}: {
  training: Training
  item: TrainingItem | null
  user: any
  onSelectItem: (id: number) => void
  onVolver: () => void
  onEditar: () => void
  onEliminar: () => void
  onNuevoItem: () => void
  onEditarItem: (item: TrainingItem) => void
  onEliminarItem: (item: TrainingItem) => void
  onMover: (index: number, direction: -1 | 1) => void
  onAlternarPublicado: (item: TrainingItem) => void
}) {
  return (
    <div className="space-y-4">
      <button
        onClick={onVolver}
        className="flex items-center gap-1.5 text-sm font-medium text-gray-500 transition hover:text-[#00838f]"
      >
        <ArrowLeft className="h-4 w-4" />
        Todas las capacitaciones
      </button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-gray-900">{training.title}</h3>
            <Badge variant={training.status === "publicada" ? "default" : "secondary"}>
              {training.status}
            </Badge>
            {training.access_mode === "abierta" && <Badge variant="outline">Abierta</Badge>}
            {Number(training.price) > 0 && (
              <Badge variant="outline">${Number(training.price).toLocaleString("es-AR")}</Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {training.item_count} {training.item_count === 1 ? "pieza" : "piezas"} de contenido
            {training.default_access_days
              ? ` · acceso por ${training.default_access_days} días`
              : " · sin vencimiento"}
          </p>
        </div>
        {/* Botones sin texto: el title es lo único que explica qué hace cada
            uno. Sin eso hay que adivinar por el ícono. */}
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="outline"
            title="Editar los datos de la capacitación"
            aria-label="Editar los datos de la capacitación"
            onClick={onEditar}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            title="Eliminar la capacitación entera"
            aria-label="Eliminar la capacitación entera"
            onClick={onEliminar}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          {item ? (
            <>
              {item.kind === "video" ? (
                <TrainingPlayer
                  item={item}
                  userEmail={user?.email ?? ""}
                  userName={user?.name}
                  soloVistaPrevia
                />
              ) : (
                <Card>
                  <CardContent className="prose max-w-none whitespace-pre-wrap py-6 text-sm text-gray-700">
                    {item.body || item.description || "Sin contenido."}
                  </CardContent>
                </Card>
              )}

              <div>
                <h4 className="text-lg font-semibold text-gray-900">{item.title}</h4>
                {item.description && (
                  <p className="mt-1 text-sm text-gray-600">{item.description}</p>
                )}
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-14 text-center text-gray-500">
                <FileText className="h-8 w-8 text-gray-300" />
                <p>Todavía no cargaste contenido.</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-1">
          {training.items.map((it, index) => {
            const activo = item?.id === it.id
            return (
              // Oculto = el renglón entero cambia de color. El estado no puede
              // depender de un ícono chiquito ni de pasar el mouse: se tiene
              // que ver de una pasada cuál no está publicado.
              <div
                key={it.id}
                className={`rounded-lg border p-2.5 transition ${
                  activo
                    ? "border-[#4dd0e1] bg-[#4dd0e1]/5"
                    : it.is_published
                      ? "border-gray-200 hover:bg-gray-50"
                      : "border-amber-200 bg-amber-50/70"
                }`}
              >
                {/* El título es el botón que abre la vista previa; los íconos
                    van aparte porque un botón adentro de otro no es válido. */}
                <button
                  onClick={() => onSelectItem(it.id)}
                  className="flex w-full items-start gap-2 text-left"
                >
                  {it.kind === "video" ? (
                    <Youtube
                      className={`mt-0.5 h-4 w-4 shrink-0 ${
                        it.is_published ? "text-red-500" : "text-amber-500"
                      }`}
                    />
                  ) : (
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block truncate text-sm font-medium ${
                        it.is_published ? "text-gray-800" : "text-amber-900/70"
                      }`}
                    >
                      {index + 1}. {it.title}
                    </span>
                    {it.duration_minutes ? (
                      <span className="text-xs text-gray-400">{it.duration_minutes} min</span>
                    ) : null}
                  </span>
                  {!it.is_published && (
                    <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                      Oculto
                    </span>
                  )}
                </button>

                <div className="mt-1 flex justify-end gap-0.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    title="Subirlo un lugar en la lista"
                    aria-label="Subirlo un lugar en la lista"
                    onClick={() => onMover(index, -1)}
                    disabled={index === 0}
                  >
                    <ArrowUp className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    title="Bajarlo un lugar en la lista"
                    aria-label="Bajarlo un lugar en la lista"
                    onClick={() => onMover(index, 1)}
                    disabled={index === training.items.length - 1}
                  >
                    <ArrowDown className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    title={
                      it.is_published
                        ? "Visible. Tocá para ocultarlo"
                        : "Oculto. Tocá para hacerlo visible"
                    }
                    aria-label={it.is_published ? "Ocultar este contenido" : "Hacer visible este contenido"}
                    onClick={() => onAlternarPublicado(it)}
                  >
                    {it.is_published ? (
                      <Eye className="h-3 w-3" />
                    ) : (
                      <EyeOff className="h-3 w-3 text-amber-600" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    title="Editar este contenido"
                    aria-label="Editar este contenido"
                    onClick={() => onEditarItem(it)}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    title="Eliminar este contenido"
                    aria-label="Eliminar este contenido"
                    onClick={() => onEliminarItem(it)}
                  >
                    <Trash2 className="h-3 w-3 text-red-500" />
                  </Button>
                </div>
              </div>
            )
          })}

          <Button
            size="sm"
            variant="outline"
            className="w-full border-[#4dd0e1]/40 bg-[#4dd0e1]/10 font-medium text-[#00838f] hover:bg-[#4dd0e1]/20"
            onClick={onNuevoItem}
          >
            <Plus className="mr-2 h-3 w-3" />
            Agregar contenido
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Formulario de capacitación ─────────────────────────────────────────

function TrainingDialog({
  value, categorias, saving, onChange, onSave, onClose,
}: {
  value: Partial<Training>
  /** Las que ya se usaron, para elegir en vez de volver a escribirlas. */
  categorias: string[]
  saving: boolean
  onChange: (v: Partial<Training>) => void
  onSave: () => void
  onClose: () => void
}) {
  // La portada está subiendo o esperando que confirmen el encuadre. Guardar
  // ahora dejaría la capacitación sin imagen y sin aviso.
  const [portadaOcupada, setPortadaOcupada] = useState(false)

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

          {/* 16/9: la misma proporción con la que se muestra la portada en la
              tarjeta del catálogo y en la página pública. Por eso el recuadro
              de acá es fiel a lo que va a ver la gente. */}
          <ImageUpload
            label="Portada"
            purpose="training_cover"
            ownerType="training"
            ownerId={value.id ?? null}
            cropAspect={16 / 9}
            value={value.cover_file_guid ?? null}
            onChange={(guid) => onChange({ ...value, cover_file_guid: guid })}
            onBusyChange={setPortadaOcupada}
          />

          <div>
            <Label>
              Categoría
              <Ayuda lado="abajo">Agrupa y filtra el catálogo. Es texto libre.</Ayuda>
            </Label>
            <Input
              placeholder="Ej: Cuidadores"
              value={value.category ?? ""}
              onChange={(e) => onChange({ ...value, category: e.target.value })}
            />

            {/* Las que ya existen, a un toque.
                Antes iban en un <datalist>: el navegador las muestra solo
                mientras tipeás, con su propio estilo y a su criterio — o sea,
                para descubrirlas había que adivinarlas primero. Escribirlas de
                nuevo termina en "Cuidadores" y "cuidadores" como dos secciones
                distintas del catálogo. */}
            {categorias.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {categorias.map((c) => (
                  <FilterChip
                    key={c}
                    active={(value.category ?? "").trim() === c}
                    // Volver a tocar la que ya está puesta la saca: es la forma
                    // de dejar la capacitación sin categoría sin tener que
                    // borrar el texto a mano.
                    onClick={() =>
                      onChange({
                        ...value,
                        category: (value.category ?? "").trim() === c ? "" : c,
                      })
                    }
                  >
                    {c}
                  </FilterChip>
                ))}
              </div>
            )}
          </div>

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
              <Label>
                Vencimiento (días)
                <Ayuda>
                  En blanco, el acceso no se vence nunca. Es solo una sugerencia: al
                  habilitar a alguien lo vas a poder cambiar.
                </Ayuda>
              </Label>
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
          <div>
            <Label>
              Carga horaria
              <Ayuda>
                El certificado va a decir exactamente lo que escribas acá. No se calcula
                con la duración de los videos: la ponés vos. Si la dejás vacía, el
                certificado no menciona horas.
              </Ayuda>
            </Label>
            <Input
              placeholder="Ej: 8 horas"
              value={value.certificate_hours ?? ""}
              onChange={(e) => onChange({ ...value, certificate_hours: e.target.value })}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          {portadaOcupada && (
            <span className="mr-auto text-xs text-gray-500">Terminá con la portada</span>
          )}
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={onSave}
            disabled={saving || portadaOcupada}
            className="bg-[#4dd0e1] hover:bg-[#3bb8c9]"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Duración: se escribe como en YouTube ───────────────────────────────

/**
 * "1:33:58" → 94.  "93:58" → 94.  "8" → 8.
 *
 * En la base la duración vive en MINUTOS enteros, pero nadie mira un video y
 * piensa en minutos: mira "1:33:58" abajo del reproductor. Antes había que
 * sacar la cuenta a mano, y una cuenta mal hecha corre el umbral del 90% que
 * decide cuándo el video se da por visto.
 *
 * Un número suelto se toma como minutos, que es lo que se cargaba antes.
 * Devuelve null si no se entiende.
 */
function minutosDesdeDuracion(texto: string): number | null {
  const limpio = texto.trim()
  if (!limpio) return null

  const partes = limpio.split(":")
  if (partes.length > 3) return null

  const numeros = partes.map((parte) => Number(parte))
  if (numeros.some((n) => !Number.isInteger(n) || n < 0)) return null

  const segundos =
    numeros.length === 1
      ? numeros[0] * 60
      : numeros.length === 2
        ? numeros[0] * 60 + numeros[1]
        : numeros[0] * 3600 + numeros[1] * 60 + numeros[2]

  if (segundos <= 0) return null
  // Al menos 1: un video de 20 segundos no puede quedar en 0 minutos, porque
  // 0 apaga el cálculo del avance.
  return Math.max(1, Math.round(segundos / 60))
}

/** El camino inverso, para mostrar lo que ya estaba guardado. */
function duracionDesdeMinutos(minutos?: number | null): string {
  if (!minutos) return ""
  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60
  return horas ? `${horas}:${String(resto).padStart(2, "0")}:00` : String(resto)
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
  // La duración se escribe como "1:33:58"; en `value` viaja en minutos. El
  // texto se guarda aparte para no reescribirlo mientras se tipea.
  const [duracion, setDuracion] = useState(() => duracionDesdeMinutos(value.duration_minutes))

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
              <Label>
                Duración
                <Ayuda>
                  Copiala tal cual del reproductor de YouTube: 1:33:58. Se usa para
                  calcular cuándo dar el video por visto (90% reproducido).
                </Ayuda>
              </Label>
              <Input
                inputMode="numeric"
                placeholder="1:33:58"
                value={duracion}
                onChange={(e) => {
                  // Solo dígitos y dos puntos: cualquier otra cosa es un error
                  // de tipeo que después haría un número raro.
                  const texto = e.target.value.replace(/[^\d:]/g, "")
                  setDuracion(texto)
                  onChange({ ...value, duration_minutes: minutosDesdeDuracion(texto) })
                }}
              />
              {/* Dos casos, y ninguno es una explicación:
                  · No se entiende → se guardaría en null, y un null apaga el
                    cálculo del 90%: ese video no se daría por visto nunca.
                  · Hay conversión de verdad (hay ":") → se muestra el
                    resultado. Atrapa el dedo gordo de escribir "133:58" por
                    "1:33:58", que son 134 minutos en vez de 94 y nada avisaría.
                  Un número suelto no muestra nada: repetirlo sería ruido. */}
              {duracion.trim() && !value.duration_minutes ? (
                <p className="mt-1 text-xs text-amber-600">Escribila como 1:33:58</p>
              ) : duracion.includes(":") && value.duration_minutes ? (
                <p className="mt-1 text-xs text-gray-400">= {value.duration_minutes} min</p>
              ) : null}
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
