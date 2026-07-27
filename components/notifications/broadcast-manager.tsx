"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
import { Megaphone, Send, Loader2, CheckCircle2, Bell, Search, Users, Heart, UserCircle, Globe } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface VolunteerLite {
  id: number
  name: string
  last_name?: string | null
}

type AudienceMode = "voluntario" | "participante" | "all"

const AUDIENCE_OPTIONS: { key: AudienceMode; label: string; icon: any }[] = [
  { key: "voluntario", label: "Voluntarios", icon: Heart },
  { key: "participante", label: "Participantes", icon: UserCircle },
  { key: "all", label: "Todos", icon: Globe },
]

export default function BroadcastManager({ user }: { user: any }) {
  const { toast } = useToast()
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [alsoPopup, setAlsoPopup] = useState(false)
  const [sending, setSending] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [lastResult, setLastResult] = useState<{ recipients: number; push_sent: number } | null>(null)

  // A quién: voluntarios (con selección por persona), participantes, o todos.
  const [audienceMode, setAudienceMode] = useState<AudienceMode>("voluntario")

  // Destinatarios (solo aplica en modo "voluntario")
  const [volunteers, setVolunteers] = useState<VolunteerLite[]>([])
  const [loadingVols, setLoadingVols] = useState(true)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [search, setSearch] = useState("")

  useEffect(() => {
    let cancelled = false
    fetch("/api/voluntarios?status=activo")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: any[]) => {
        if (cancelled) return
        const list: VolunteerLite[] = (Array.isArray(data) ? data : []).map((v) => ({
          id: v.id,
          name: v.name,
          last_name: v.last_name,
        }))
        list.sort((a, b) => `${a.name} ${a.last_name || ""}`.localeCompare(`${b.name} ${b.last_name || ""}`))
        setVolunteers(list)
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoadingVols(false))
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return volunteers
    return volunteers.filter((v) => `${v.name} ${v.last_name || ""}`.toLowerCase().includes(q))
  }, [volunteers, search])

  const isVolMode = audienceMode === "voluntario"
  const allSelected = volunteers.length > 0 && selected.size === volunteers.length
  // El popup (aviso al entrar) es por AUDIENCIA, no por persona: solo aplica
  // cuando se apunta a una audiencia entera (participantes, todos, o todos los
  // voluntarios). Una selección parcial de voluntarios no puede llevar popup.
  const wholeAudience = !isVolMode || allSelected

  function toggleOne(id: number, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(volunteers.map((v) => v.id)) : new Set())
  }

  // Guardia extra en cliente (el BFF igual valida admin).
  if (!user?.is_admin) {
    return (
      <Alert>
        <AlertDescription>Esta sección es solo para administradores.</AlertDescription>
      </Alert>
    )
  }

  async function handleSend() {
    setConfirmOpen(false)
    setSending(true)
    try {
      // audience = a quién apunta el envío (y el popup, si va).
      // En modo voluntario con selección parcial, se mandan los IDs puntuales
      // y NO hay popup. Si es la audiencia entera, va por audiencia (y alcanza
      // a los que se sumen después).
      const payload: any = { title, body, audience: audienceMode, also_popup: wholeAudience && alsoPopup }
      if (isVolMode && !allSelected) payload.volunteer_ids = Array.from(selected)

      const res = await fetch("/api/notifications/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setLastResult({ recipients: data.recipients, push_sent: data.push_sent })
      toast({
        title: "Notificación enviada",
        description: `${data.recipients} destinatario(s). Los push salen en segundo plano.`,
      })
      setTitle("")
      setBody("")
      setAlsoPopup(false)
      setSelected(new Set())
      setSearch("")
    } catch {
      toast({ title: "No se pudo enviar", description: "Intentá de nuevo en un momento.", variant: "destructive" })
    } finally {
      setSending(false)
    }
  }

  const canSend = title.trim().length > 0 && !sending && (isVolMode ? selected.size > 0 : true)

  const recipientLabel =
    audienceMode === "all"
      ? "todos (voluntarios, admins y participantes)"
      : audienceMode === "participante"
        ? "todos los participantes"
        : allSelected
          ? "todos los voluntarios y admins"
          : `${selected.size} destinatario(s) seleccionado(s)`

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-[#4dd0e1]" />
            Enviar notificación
          </CardTitle>
          <CardDescription>
            Escribí un aviso y elegí a quién enviarlo. Les llega a la campanita{" "}
            <Bell className="inline-block w-4 h-4 align-text-bottom text-[#4dd0e1]" /> y, si tienen las
            notificaciones activadas, al celular.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* A quién: audiencia */}
          <div className="space-y-1.5">
            <Label>¿A quién?</Label>
            <div className="grid grid-cols-3 gap-2">
              {AUDIENCE_OPTIONS.map((opt) => {
                const Icon = opt.icon
                const active = audienceMode === opt.key
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => { setAudienceMode(opt.key); setAlsoPopup(false) }}
                    className={`flex items-center justify-center gap-1.5 rounded-lg border-2 px-2 py-2 text-sm font-medium transition ${
                      active
                        ? "border-[#4dd0e1] bg-[#4dd0e1]/10 text-[#00838f]"
                        : "border-gray-200 text-gray-600 hover:border-[#b2ebf2]"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bc-title">Título</Label>
            <Input
              id="bc-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Encuentro de este sábado"
              maxLength={120}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bc-body">Mensaje</Label>
            <Textarea
              id="bc-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Detalle del aviso (opcional)"
              rows={4}
              maxLength={500}
            />
          </div>

          {/* Destinatarios: solo en modo voluntario (selección por persona) */}
          {isVolMode ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-[#4dd0e1]" />
                  Destinatarios
                </Label>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    selected.size > 0 ? "bg-[#4dd0e1] text-white" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {selected.size} de {volunteers.length}
                </span>
              </div>

              <div className="border-2 border-[#b2ebf2] rounded-lg overflow-hidden shadow-sm">
                <div className="p-2.5 border-b border-[#b2ebf2] bg-[#e0f7fa]/50 space-y-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Buscar voluntario..."
                      className="pl-8 h-9 bg-white"
                    />
                  </div>
                  <label className="flex items-center gap-2 px-1 py-1 cursor-pointer select-none rounded hover:bg-white/60">
                    <Checkbox checked={allSelected} onCheckedChange={(v) => toggleAll(v === true)} />
                    <span className="text-sm font-semibold text-[#00838f]">Seleccionar todos ({volunteers.length})</span>
                  </label>
                </div>

                <div className="relative">
                  <ScrollArea className="h-56 bg-white">
                    {loadingVols ? (
                      <p className="px-3 py-6 text-center text-sm text-gray-400">Cargando voluntarios...</p>
                    ) : filtered.length === 0 ? (
                      <p className="px-3 py-6 text-center text-sm text-gray-400">
                        {search ? "Sin resultados" : "No hay voluntarios activos"}
                      </p>
                    ) : (
                      <ul className="divide-y divide-gray-100">
                        {filtered.map((v) => {
                          const checked = selected.has(v.id)
                          const isMe = v.id === user.id
                          const fullName = `${v.name || ""} ${v.last_name || ""}`.trim() || "(sin nombre)"
                          return (
                            <li key={v.id}>
                              <label
                                className={`flex items-center gap-2.5 px-3 py-2.5 cursor-pointer select-none transition-colors ${
                                  checked ? "bg-[#4dd0e1]/10" : "hover:bg-gray-50"
                                }`}
                              >
                                <Checkbox checked={checked} onCheckedChange={(c) => toggleOne(v.id, c === true)} />
                                <span className={`text-sm ${checked ? "font-medium text-[#00838f]" : "text-gray-800"}`}>
                                  {fullName}
                                  {isMe && <span className="ml-1.5 text-xs text-[#4dd0e1] font-medium">(vos)</span>}
                                </span>
                              </label>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </ScrollArea>
                  <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white to-transparent" />
                </div>
              </div>
              <p className="text-xs text-gray-400 px-0.5">Tocá un nombre para incluirlo. La lista tiene scroll.</p>
            </div>
          ) : (
            // Participantes / Todos: no hay selección por persona, va a la audiencia entera.
            <Alert className="border-[#b2ebf2] bg-[#e0f7fa]/40">
              <Users className="h-4 w-4 text-[#00838f]" />
              <AlertDescription className="text-gray-600">
                Se enviará a <strong>{recipientLabel}</strong> activos. No hay selección individual para
                esta audiencia.
              </AlertDescription>
            </Alert>
          )}

          {/* Popup: solo cuando se apunta a una audiencia entera */}
          {wholeAudience && (
            <div className="flex items-start gap-2 pt-1">
              <Checkbox id="bc-popup" checked={alsoPopup} onCheckedChange={(v) => setAlsoPopup(!!v)} className="mt-0.5" />
              <Label htmlFor="bc-popup" className="font-normal leading-snug cursor-pointer">
                Mostrar también como aviso emergente al ingresar (popup)
              </Label>
            </div>
          )}

          <Button
            onClick={() => setConfirmOpen(true)}
            disabled={!canSend}
            className="bg-[#4dd0e1] hover:bg-[#3bbccd] text-white"
          >
            {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            {sending ? "Enviando..." : "Enviar notificación"}
          </Button>

          {lastResult && !sending && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-700">
                Último envío: {lastResult.recipients} destinatario(s). Las campanitas ya están; los push a los dispositivos salen en segundo plano.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Enviar esta notificación?</AlertDialogTitle>
            <AlertDialogDescription>
              Se enviará a <strong>{recipientLabel}</strong>
              {wholeAudience && alsoPopup ? ", y además aparecerá como popup al ingresar" : ""}. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSend} className="bg-[#4dd0e1] hover:bg-[#3bbccd] text-white">
              Sí, enviar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
