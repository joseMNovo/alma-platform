import { api } from '@/lib/api-client'

// ============================================================
// TypeScript Interfaces (sin cambios — compatibilidad total)
// ============================================================

export interface Volunteer {
  id: number
  name: string
  last_name?: string
  age?: number
  gender?: string
  photo?: string | null
  phone?: string
  email?: string
  registration_date: string
  birth_date?: string
  status: string
  specialties?: string[]
  is_admin: boolean
}

export interface Workshop {
  id: number
  name: string
  description?: string
  instructor?: string
  date?: string
  schedule?: string
  capacity: number
  cost: number
  enrolled: number
  status: string
}

export interface Group {
  id: number
  name: string
  description?: string
  coordinator?: string
  day?: string
  schedule?: string
  participants: number
  status: string
}

export interface Activity {
  id: number
  name: string
  description?: string
  date?: string
  schedule?: string
  location?: string
  capacity: number
  enrolled: number
  is_free?: boolean
  cost?: number
  status: string
}

export interface Payment {
  id: number
  user_id: number
  concept: string
  amount: number
  due_date: string
  payment_method: string | null
  status: string
  payment_date: string | null
}

export interface InventoryItem {
  id: number
  name: string
  category?: string
  quantity: number
  minimum_stock: number
  price: number
  supplier?: string
  assigned_volunteer_id?: number | null
  entry_date: string
}

export interface Enrollment {
  id: number
  user_id: number
  type: string
  item_id: number
  enrollment_date: string
  status: string
}

export interface PendingTask {
  id: string
  description: string
  assigned_volunteer_id: string
  completed: boolean
  created_date: string
  completed_date?: string
  sub_items?: PendingTask[]
}

export interface AllData {
  volunteers: Volunteer[]
  workshops: Workshop[]
  groups: Group[]
  activities: Activity[]
  payments: Payment[]
  inventory: InventoryItem[]
  enrollments: Enrollment[]
  pending_tasks: PendingTask[]
}

export interface VolunteerRef {
  id: number
  name: string
  last_name: string
}

export interface CalendarInstance {
  id: number
  type: 'grupo' | 'taller' | 'actividad'
  source_id: number | null
  title: string | null
  date: string
  start_time: string
  end_time: string
  notes: string | null
  status: 'programado' | 'realizado' | 'cancelado'
  notify_enabled: boolean
  reminder_offsets: number[] | null
  created_by_volunteer_id: number | null
  coordinator: VolunteerRef | null
  /** @deprecated El backend lo mantiene con el primero; usar co_coordinators. */
  co_coordinator: VolunteerRef | null
  /** Un evento puede tener varios co-coordinadores. */
  co_coordinators: VolunteerRef[]
  volunteers: VolunteerRef[]
  /** Conteo real de participantes anotados a este evento (no cancelados). */
  participants_count?: number
}

export interface EventEnrollment {
  id: number
  status: string
  event_id: number
  type: string
  event_title: string | null
  event_date: string | null
  start_time: string
  person_name: string
  person_email: string | null
  enrolled_at: string | null
}

export interface Participant {
  id: number
  email: string
  is_active: boolean
  /** Falso hasta que hace click en el link del mail de registro. Sin esto no entra. */
  email_verified?: boolean
  created_at?: string
}

export interface ParticipantProfile {
  id?: number
  participant_id: number
  name?: string | null
  last_name?: string | null
  phone?: string | null
  birth_date?: string | null
  city?: string | null
  province?: string | null
  address?: string | null
  emergency_contact_name?: string | null
  emergency_contact_phone?: string | null
  notes?: string | null
  accepts_notifications?: boolean
  accepts_whatsapp?: boolean
}

export interface Idea {
  id: number
  title: string
  body: string
  category?: string | null
  created_by_volunteer_id: number
  created_by_name?: string | null
  comment_count: number
  created_at: string
  updated_at?: string | null
}

export interface IdeaComment {
  id: number
  idea_id: number
  volunteer_id: number
  volunteer_name?: string | null
  body: string
  created_at: string
}

export interface Persona {
  id: number
  participant_id?: number | null   // presente => la persona tiene cuenta de login
  is_volunteer?: boolean           // rol voluntario (flag descriptivo)
  volunteer_id?: number | null     // presente => tiene ficha en `voluntarios`
  name?: string | null
  last_name?: string | null
  email?: string | null
  cuit?: string | null
  is_member?: boolean
  birth_date?: string | null
  address?: string | null
  floor?: string | null
  apartment?: string | null
  city?: string | null
  province?: string | null
  postal_code?: string | null
  phone?: string | null
  source?: string | null
  invited_at?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export interface PersonaFilters {
  name?: string
  last_name?: string
  cuit?: string
  city?: string
  province?: string
}

export interface Announcement {
  id: number
  title: string
  body: string
  audience: string
  is_active: boolean
  starts_at?: string | null
  ends_at?: string | null
  created_at?: string
  updated_at?: string | null
}

export type BulkDeleteScope = 'month' | 'type' | 'series' | 'all'

export interface BulkDeleteFilters {
  scope: BulkDeleteScope
  year?: number
  month?: number
  type?: string
  source_id?: number | null
}

// ============================================================
// Volunteers (Voluntarios)
// ============================================================

export async function getVolunteers(): Promise<Volunteer[]> {
  return api.get<Volunteer[]>('/voluntarios/?limit=1000')
}

export async function getVolunteerById(id: number): Promise<Volunteer | null> {
  try {
    return await api.get<Volunteer>(`/voluntarios/${id}`)
  } catch {
    return null
  }
}

export async function getVolunteerByEmail(email: string): Promise<Volunteer | null> {
  try {
    return await api.get<Volunteer>(`/voluntarios/by-email/${encodeURIComponent(email)}`)
  } catch {
    return null
  }
}

export async function getVolunteerByEmailForAuth(
  email: string
): Promise<{ volunteer: Volunteer; pin_hash: string | null } | null> {
  try {
    const data = await api.get<{
      id: number; name: string; last_name?: string; email?: string; status: string; is_admin: boolean;
      pin_hash?: string | null; phone?: string | null; gender?: string | null; age?: number | null;
      birth_date?: string | null; photo?: string | null; specialties?: string[] | null;
    }>(
      `/voluntarios/auth/${encodeURIComponent(email)}`
    )
    const volunteer: Volunteer = {
      id: data.id,
      name: data.name,
      last_name: data.last_name,
      email: data.email,
      status: data.status,
      is_admin: data.is_admin,
      phone: data.phone,
      gender: data.gender,
      age: data.age,
      birth_date: data.birth_date,
      photo: data.photo,
      specialties: data.specialties,
      registration_date: '',
      capacity: 0,
    } as unknown as Volunteer
    return { volunteer, pin_hash: data.pin_hash ?? null }
  } catch {
    return null
  }
}

export async function setVolunteerPin(id: number, hashedPin: string): Promise<void> {
  await api.put(`/voluntarios/${id}`, { pin_hash: hashedPin })
}

export async function createVolunteer(data: Partial<Volunteer>): Promise<Volunteer> {
  return api.post<Volunteer>('/voluntarios/', {
    ...data,
    registration_date: data.registration_date || new Date().toISOString().split('T')[0],
  })
}

export async function updateVolunteer(id: number, data: Partial<Volunteer>): Promise<Volunteer> {
  return api.put<Volunteer>(`/voluntarios/${id}`, data)
}

export async function deleteVolunteer(id: number): Promise<void> {
  await api.delete(`/voluntarios/${id}`)
}

// ============================================================
// Workshops (Talleres)
// ============================================================

export async function getWorkshops(): Promise<Workshop[]> {
  return api.get<Workshop[]>('/talleres/?limit=1000')
}

export async function createWorkshop(data: Partial<Workshop>): Promise<Workshop> {
  return api.post<Workshop>('/talleres/', data)
}

export async function updateWorkshop(id: number, data: Partial<Workshop>): Promise<Workshop> {
  return api.put<Workshop>(`/talleres/${id}`, data)
}

export async function deleteWorkshop(id: number): Promise<void> {
  await api.delete(`/talleres/${id}`)
}

// ============================================================
// Groups (Grupos)
// ============================================================

export async function getGroups(): Promise<Group[]> {
  return api.get<Group[]>('/grupos/?limit=1000')
}

export async function createGroup(data: Partial<Group>): Promise<Group> {
  return api.post<Group>('/grupos/', data)
}

export async function updateGroup(id: number, data: Partial<Group>): Promise<Group> {
  return api.put<Group>(`/grupos/${id}`, data)
}

export async function deleteGroup(id: number): Promise<void> {
  await api.delete(`/grupos/${id}`)
}

// ============================================================
// Activities (Actividades)
// ============================================================

export async function getActivities(): Promise<Activity[]> {
  return api.get<Activity[]>('/actividades/?limit=1000')
}

export async function createActivity(data: Partial<Activity>): Promise<Activity> {
  return api.post<Activity>('/actividades/', data)
}

export async function updateActivity(id: number, data: Partial<Activity>): Promise<Activity> {
  return api.put<Activity>(`/actividades/${id}`, data)
}

export async function deleteActivity(id: number): Promise<void> {
  await api.delete(`/actividades/${id}`)
}

// ============================================================
// Payments (Pagos)
// ============================================================

export async function getPayments(): Promise<Payment[]> {
  return api.get<Payment[]>('/pagos/?limit=1000')
}

export async function createPayment(data: Partial<Payment>): Promise<Payment> {
  return api.post<Payment>('/pagos/', data)
}

export async function updatePayment(id: number, data: Partial<Payment>): Promise<Payment> {
  return api.put<Payment>(`/pagos/${id}`, data)
}

export async function deletePayment(id: number): Promise<void> {
  await api.delete(`/pagos/${id}`)
}

// ============================================================
// Inventory (Inventario)
// ============================================================

export async function getInventory(): Promise<InventoryItem[]> {
  return api.get<InventoryItem[]>('/inventario/?limit=1000')
}

export async function createInventoryItem(data: Partial<InventoryItem>): Promise<InventoryItem> {
  return api.post<InventoryItem>('/inventario/', {
    ...data,
    entry_date: data.entry_date || new Date().toISOString().split('T')[0],
  })
}

export async function updateInventoryItem(id: number, data: Partial<InventoryItem>): Promise<InventoryItem> {
  return api.put<InventoryItem>(`/inventario/${id}`, data)
}

export async function deleteInventoryItem(id: number): Promise<void> {
  await api.delete(`/inventario/${id}`)
}

// ============================================================
// Enrollments (Inscripciones)
// ============================================================

export async function getEnrollments(): Promise<Enrollment[]> {
  return api.get<Enrollment[]>('/inscripciones/?limit=1000')
}

export async function createEnrollment(data: Partial<Enrollment>): Promise<Enrollment> {
  return api.post<Enrollment>('/inscripciones/', {
    ...data,
    enrollment_date: data.enrollment_date || new Date().toISOString().split('T')[0],
  })
}

export async function getUserEnrollments(
  userId: number
): Promise<{ workshops: number[]; groups: number[]; activities: number[] }> {
  const rows = await api.get<Enrollment[]>(`/inscripciones/?user_id=${userId}&limit=500`)
  const workshops: number[] = []
  const groups: number[] = []
  const activities: number[] = []

  for (const row of rows) {
    if (row.type === 'taller') workshops.push(row.item_id)
    else if (row.type === 'grupo') groups.push(row.item_id)
    else if (row.type === 'actividad') activities.push(row.item_id)
  }

  return { workshops, groups, activities }
}

// ============================================================
// Pending Tasks (Pendientes)
// ============================================================

export async function getPendingTasks(): Promise<PendingTask[]> {
  const [parents, subItems] = await Promise.all([
    api.get<any[]>('/pendientes/?limit=500'),
    // Obtenemos los sub-items de cada pendiente
    api.get<any[]>('/pendientes/?limit=1').then(async () => {
      // No hay endpoint para todos los pending_items — los obtenemos via pendientes
      return [] as any[]
    }),
  ])

  // Mejor: obtener parents y luego los items de cada uno en paralelo
  const withItems = await Promise.all(
    parents.map(async (p: any) => {
      const items = await api.get<any[]>(`/pendientes/${p.id}/items`)
      return {
        id: p.id,
        description: p.description,
        assigned_volunteer_id: p.assigned_volunteer_id || '',
        completed: Boolean(p.completed),
        created_date: p.created_date,
        completed_date: p.completed_date || undefined,
        sub_items: items.map((s: any) => ({
          id: s.id,
          description: s.description,
          assigned_volunteer_id: s.assigned_volunteer_id || '',
          completed: Boolean(s.completed),
          created_date: s.created_date,
          completed_date: s.completed_date || undefined,
        })),
      }
    })
  )

  return withItems
}

export async function savePendingTasks(tasks: PendingTask[]): Promise<void> {
  await api.post('/pendientes/sync', { tasks })
}

// ============================================================
// Full data export / import
// ============================================================

export async function getAllData(): Promise<AllData> {
  const [volunteers, workshops, groups, activities, payments, inventory, enrollments, pending_tasks] =
    await Promise.all([
      getVolunteers(),
      getWorkshops(),
      getGroups(),
      getActivities(),
      getPayments(),
      getInventory(),
      getEnrollments(),
      getPendingTasks(),
    ])

  return { volunteers, workshops, groups, activities, payments, inventory, enrollments, pending_tasks }
}

export async function importAllData(data: AllData): Promise<void> {
  // Importación secuencial respetando las FK
  // 1. Borrar en orden inverso
  const allVolunteers = await getVolunteers()
  const allWorkshops = await getWorkshops()
  const allGroups = await getGroups()
  const allActivities = await getActivities()
  const allPayments = await getPayments()
  const allInventory = await getInventory()
  const allEnrollments = await getEnrollments()

  await Promise.all(allEnrollments.map((e) => api.delete(`/inscripciones/${e.id}`)))
  await Promise.all(allPayments.map((p) => api.delete(`/pagos/${p.id}`)))
  await Promise.all(allInventory.map((i) => api.delete(`/inventario/${i.id}`)))
  await savePendingTasks([]) // limpiar pendientes via sync
  await Promise.all(allActivities.map((a) => api.delete(`/actividades/${a.id}`)))
  await Promise.all(allGroups.map((g) => api.delete(`/grupos/${g.id}`)))
  await Promise.all(allWorkshops.map((w) => api.delete(`/talleres/${w.id}`)))
  await Promise.all(allVolunteers.map((v) => api.delete(`/voluntarios/${v.id}`)))

  // 2. Insertar en orden
  for (const v of data.volunteers || []) {
    await api.post('/voluntarios/', v)
  }
  for (const w of data.workshops || []) {
    await api.post('/talleres/', w)
  }
  for (const g of data.groups || []) {
    await api.post('/grupos/', g)
  }
  for (const a of data.activities || []) {
    await api.post('/actividades/', a)
  }
  for (const p of data.payments || []) {
    await api.post('/pagos/', p)
  }
  for (const i of data.inventory || []) {
    await api.post('/inventario/', i)
  }
  for (const e of data.enrollments || []) {
    await api.post('/inscripciones/', e)
  }
  if (data.pending_tasks?.length) {
    await savePendingTasks(data.pending_tasks)
  }
}

// ============================================================
// Calendar (Calendarios)
// ============================================================

export async function getCalendarInstances(
  year: number,
  month: number | null,
  filters?: { type?: string; volunteer_id?: number }
): Promise<CalendarInstance[]> {
  const params = new URLSearchParams({ year: String(year) })
  if (month !== null && month !== undefined) params.set('month', String(month))
  if (filters?.type) params.set('type', filters.type)
  if (filters?.volunteer_id) params.set('volunteer_id', String(filters.volunteer_id))
  return api.get<CalendarInstance[]>(`/calendar/instances-rich?${params}`)
}

export async function createCalendarInstance(data: {
  type: string
  date: string
  start_time?: string
  end_time?: string
  source_id?: number | null
  title?: string | null
  notes?: string | null
  status?: string
  notify_enabled?: boolean
  reminder_offsets?: number[] | null
  created_by_volunteer_id?: number | null
}): Promise<CalendarInstance> {
  const ci = await api.post<any>('/calendar/instances', {
    ...data,
    start_time: data.start_time || '10:00:00',
    end_time: data.end_time || '12:00:00',
    status: data.status || 'programado',
  })
  return { ...ci, coordinator: null, co_coordinator: null, co_coordinators: [], volunteers: [] }
}

/**
 * Devuelve el id del voluntario que creó la instancia (o null).
 * Usado por la API route DELETE para validar borrado por propietario.
 */
export async function getCalendarInstanceOwner(id: number): Promise<number | null> {
  const ci = await api.get<{ created_by_volunteer_id?: number | null }>(`/calendar/instances/${id}`)
  return ci.created_by_volunteer_id ?? null
}

export async function updateCalendarInstance(
  id: number,
  data: Partial<{
    type: string
    date: string
    start_time: string
    end_time: string
    source_id: number | null
    title: string | null
    notes: string | null
    status: string
    notify_enabled: boolean
    reminder_offsets: number[] | null
  }>
): Promise<CalendarInstance> {
  const ci = await api.put<any>(`/calendar/instances/${id}`, data)
  return { ...ci, coordinator: null, co_coordinator: null, co_coordinators: [], volunteers: [] }
}

/** Reemplaza la lista COMPLETA de co-coordinadores del evento. */
export async function setEventCoCoordinators(
  instance_id: number,
  volunteer_ids: number[]
): Promise<void> {
  await api.put(`/calendar/instances/${instance_id}/cocoordinators`, { volunteer_ids })
}

export async function setEventVolunteers(
  instance_id: number,
  volunteer_ids: number[]
): Promise<void> {
  await api.put(`/calendar/instances/${instance_id}/volunteers`, { volunteer_ids })
}

export async function deleteCalendarInstance(id: number): Promise<void> {
  await api.delete(`/calendar/instances/${id}`)
}

export async function countCalendarInstancesBulk(filters: BulkDeleteFilters): Promise<number> {
  const result = await api.post<{ count: number }>('/calendar/bulk-count', filters)
  return result.count
}

export async function deleteCalendarInstancesBulk(
  filters: BulkDeleteFilters
): Promise<{ deleted: number }> {
  return api.post<{ deleted: number }>('/calendar/bulk-delete', filters)
}

export async function generateCalendarInstances(params: {
  start_date: string
  end_date: string
  first_type: string
  start_time?: string
  interval_days?: number
  source_group_id?: number | null
  source_workshop_id?: number | null
}): Promise<{ created: number; instances: CalendarInstance[] }> {
  return api.post<{ created: number; instances: CalendarInstance[] }>('/calendar/generate', {
    start_date: params.start_date,
    end_date: params.end_date,
    first_type: params.first_type,
    start_time: params.start_time || '10:00:00',
    interval_days: params.interval_days ?? 14,
    source_group_id: params.source_group_id ?? null,
    source_workshop_id: params.source_workshop_id ?? null,
  })
}

export async function setCalendarAssignment(
  instance_id: number,
  role: string,
  volunteer_id: number
): Promise<void> {
  await api.put(`/calendar/instances/${instance_id}/assignments/by-role/${encodeURIComponent(role)}`, {
    volunteer_id,
  })
}

export async function removeCalendarAssignment(instance_id: number, role: string): Promise<void> {
  await api.delete(
    `/calendar/instances/${instance_id}/assignments/by-role/${encodeURIComponent(role)}`
  )
}

// ============================================================
// Participants (Participantes)
// ============================================================

export async function getParticipantByEmailForAuth(
  email: string
): Promise<{ participant: Participant; pin_hash: string | null } | null> {
  try {
    const data = await api.get<{
      id: number; email: string; is_active: boolean
      email_verified?: boolean; pin_hash?: string | null
    }>(`/participants/auth/${encodeURIComponent(email)}`)
    if (!data.is_active) return null
    return {
      // email_verified viaja para que el login pueda frenar a quien todavía
      // no confirmó su correo (ver app/api/auth/route.ts).
      participant: {
        id: data.id,
        email: data.email,
        is_active: data.is_active,
        email_verified: data.email_verified ?? false,
      },
      pin_hash: data.pin_hash ?? null,
    }
  } catch {
    return null
  }
}

export async function setParticipantPin(id: number, hashedPin: string): Promise<void> {
  await api.put(`/participants/${id}`, { pin_hash: hashedPin })
}

export async function createParticipant(email: string, hashedPin?: string): Promise<Participant> {
  return api.post<Participant>('/participants/', {
    email,
    pin_hash: hashedPin ?? null,
  })
}

export async function getParticipantProfile(participant_id: number): Promise<ParticipantProfile | null> {
  try {
    return await api.get<ParticipantProfile>(`/participants/${participant_id}/profile`)
  } catch {
    return null
  }
}

export async function upsertParticipantProfile(
  participant_id: number,
  data: Partial<ParticipantProfile>
): Promise<ParticipantProfile> {
  const existing = await getParticipantProfile(participant_id)
  if (!existing) {
    return api.post<ParticipantProfile>(`/participants/${participant_id}/profile`, {
      participant_id,
      ...data,
    })
  } else {
    return api.put<ParticipantProfile>(`/participants/${participant_id}/profile`, data)
  }
}

// ============================================================
// Personas (base de datos ALMA — ABM sobre participant_profiles)
// ============================================================

const PERSONA_WRITABLE_FIELDS = [
  "name", "last_name", "email", "cuit", "is_member", "birth_date", "address",
  "floor", "apartment", "city", "province", "postal_code", "phone",
] as const

/** Limpia el payload: recorta strings y convierte vacíos a null.
 *  Clave para el email: un "" rompería el índice único, NULL no. */
function cleanPersonaPayload(data: Partial<Persona>): Record<string, any> {
  const out: Record<string, any> = {}
  for (const field of PERSONA_WRITABLE_FIELDS) {
    if (field in data) {
      const raw = (data as Record<string, any>)[field]
      const val = typeof raw === "string" ? raw.trim() : raw
      out[field] = val === "" || val === undefined ? null : val
    }
  }
  return out
}

export async function getPersonaById(id: number): Promise<Persona | null> {
  try {
    return await api.get<Persona>(`/personas/${id}`)
  } catch {
    return null
  }
}

export async function getPersonas(filters: PersonaFilters = {}): Promise<Persona[]> {
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value && value.trim()) qs.set(key, value.trim())
  }
  qs.set("limit", "1000")
  return api.get<Persona[]>(`/personas/?${qs.toString()}`)
}

export async function createPersona(data: Partial<Persona>): Promise<Persona> {
  return api.post<Persona>("/personas/", cleanPersonaPayload(data))
}

export async function updatePersona(id: number, data: Partial<Persona>): Promise<Persona> {
  return api.put<Persona>(`/personas/${id}`, cleanPersonaPayload(data))
}

export async function deletePersona(id: number): Promise<void> {
  await api.delete(`/personas/${id}`)
}

/** Payload para habilitar a una persona (o crear una nueva) como voluntario/a. */
export interface VolunteerEnrollPayload {
  name: string
  last_name?: string | null
  email: string
  phone?: string | null
  birth_date?: string | null
  gender?: string | null
  age?: number | null
  persona_id?: number | null         // persona existente a habilitar
  registered_by_name?: string | null // quién la dio de alta (para el mail)
}

/** Crea la ficha de voluntario (pendiente de aprobación) y la vincula a la persona. */
export async function enrollVolunteerFromDb(data: VolunteerEnrollPayload): Promise<any> {
  return api.post("/voluntarios/enroll-from-db", data)
}

/** Resultado de invitar/convertir personas. `outcome` decide el mensaje del front. */
export interface ConversionResult {
  ok: boolean
  outcome: "invited" | "reinvited" | "reactivated" | "no_login"
  participant_id?: number | null
  email?: string | null
}

/** Invita a una persona ya cargada a crear su cuenta de participante (le manda el mail del PIN). */
export async function invitePersonToPlatform(profileId: number, registeredByName?: string | null): Promise<ConversionResult> {
  return api.post<ConversionResult>("/participants/invite", { profile_id: profileId, registered_by_name: registeredByName ?? null })
}

/** Quita el rol de voluntario/a de una persona y la vuelve participante (reactiva o invita). */
export async function revertVolunteerToParticipant(personaId: number, registeredByName?: string | null): Promise<ConversionResult> {
  return api.post<ConversionResult>("/participants/revert-volunteer", { persona_id: personaId, registered_by_name: registeredByName ?? null })
}

// ============================================================
// Ideas
// ============================================================

export async function getIdeas(): Promise<Idea[]> {
  return api.get<Idea[]>('/ideas/?limit=500')
}

export async function createIdea(data: { title: string; body: string; category?: string | null; created_by_volunteer_id: number }): Promise<Idea> {
  return api.post<Idea>('/ideas/', data)
}

export async function updateIdea(id: number, data: { title?: string; body?: string; category?: string | null }): Promise<Idea> {
  return api.put<Idea>(`/ideas/${id}`, data)
}

export async function deleteIdea(id: number): Promise<void> {
  await api.delete(`/ideas/${id}`)
}

export async function getIdeaComments(ideaId: number): Promise<IdeaComment[]> {
  return api.get<IdeaComment[]>(`/ideas/${ideaId}/comments`)
}

export async function createIdeaComment(ideaId: number, body: string, volunteerId: number): Promise<IdeaComment> {
  return api.post<IdeaComment>(`/ideas/${ideaId}/comments?volunteer_id=${volunteerId}`, { body })
}

export async function deleteIdeaComment(ideaId: number, commentId: number): Promise<void> {
  await api.delete(`/ideas/${ideaId}/comments/${commentId}`)
}

// ============================================================
// Group Histories (Fichero / Historiales de grupos)
// ============================================================

export interface GroupHistoryAttendee {
  id?: number
  person_profile_id?: number | null
  person_name: string
  person_age?: number | null
  patient_name?: string | null
  patient_age?: number | null
  relationship?: string | null
  problematica?: string | null
  notes?: string | null
  created_at?: string
}

export interface GroupHistory {
  id: number
  group_id?: number | null
  group_name?: string | null
  title?: string | null
  session_date?: string | null
  coordinator_volunteer_id?: number | null
  coordinator_name?: string | null
  summary?: string | null
  created_by_volunteer_id: number
  created_by_name?: string | null
  attendee_count: number
  attendees: GroupHistoryAttendee[]
  created_at?: string
  updated_at?: string | null
}

export interface GroupHistoryFilters {
  group_id?: number
  q?: string
}

export interface GroupHistoryPayload {
  group_id?: number | null
  group_name?: string | null
  title?: string | null
  session_date?: string | null
  coordinator_volunteer_id?: number | null
  summary?: string | null
  created_by_volunteer_id?: number
  attendees?: GroupHistoryAttendee[]
}

export interface GroupHistorySuggestion {
  label: string
  source: "participante" | "fichero"
  person_profile_id?: number | null
}

export async function suggestHistoryAttendees(q: string): Promise<GroupHistorySuggestion[]> {
  return api.get<GroupHistorySuggestion[]>(`/group-histories/suggest?q=${encodeURIComponent(q)}`)
}

export async function getGroupHistories(filters: GroupHistoryFilters = {}): Promise<GroupHistory[]> {
  const params = new URLSearchParams()
  if (filters.group_id != null) params.set('group_id', String(filters.group_id))
  if (filters.q) params.set('q', filters.q)
  const qs = params.toString()
  return api.get<GroupHistory[]>(`/group-histories/${qs ? `?${qs}` : ''}`)
}

export async function getGroupHistory(id: number): Promise<GroupHistory> {
  return api.get<GroupHistory>(`/group-histories/${id}`)
}

export async function createGroupHistory(data: GroupHistoryPayload): Promise<GroupHistory> {
  return api.post<GroupHistory>('/group-histories/', data)
}

export async function updateGroupHistory(id: number, data: GroupHistoryPayload): Promise<GroupHistory> {
  return api.put<GroupHistory>(`/group-histories/${id}`, data)
}

export async function deleteGroupHistory(id: number): Promise<void> {
  await api.delete(`/group-histories/${id}`)
}

// ============================================================
// Announcements (Anuncios / Novedades)
// ============================================================

export async function getPendingAnnouncement(
  userType: string,
  userId: number,
  role: string,
): Promise<Announcement | null> {
  return api.get<Announcement | null>(
    `/announcements/pending?user_type=${encodeURIComponent(userType)}&user_id=${userId}&role=${encodeURIComponent(role)}`,
  )
}

export async function dismissAnnouncement(id: number, userType: string, userId: number): Promise<void> {
  await api.post(`/announcements/${id}/dismiss`, { user_type: userType, user_id: userId })
}

// ============================================================
// Activity Tracking (Actividad)
// ============================================================

export interface ActivityEvent {
  id: number
  event_type: 'login' | 'view' | 'create' | 'edit' | 'delete'
  module: string | null
  action: string | null
  user_type: string
  user_id: number
  role: string
  created_at?: string
}

export interface ActivityEventInput {
  event_type: 'login' | 'view' | 'create' | 'edit' | 'delete'
  module?: string | null
  action?: string | null
  user_type: string
  user_id: number
  role: string
}

export interface ActivityUserSummary {
  user_type: string
  user_id: number
  role: string
  login_count: number
  last_login: string | null
  view_counts: Record<string, number>
  action_counts: Record<string, number>
}

/** 'participante' se mapea a sí mismo; todo lo demás (admin/voluntario) vive en la tabla voluntarios. */
export function toUserType(role: string): string {
  return role === 'participante' ? 'participante' : 'voluntario'
}

export async function logActivityEvent(data: ActivityEventInput): Promise<void> {
  await api.post('/activity/', data)
}

export async function getActivitySummary(): Promise<ActivityUserSummary[]> {
  return api.get<ActivityUserSummary[]>('/activity/summary')
}

export async function getActivityTimeline(
  userType: string,
  userId: number,
  limit = 200,
): Promise<ActivityEvent[]> {
  return api.get<ActivityEvent[]>(
    `/activity/?user_type=${encodeURIComponent(userType)}&user_id=${userId}&limit=${limit}`,
  )
}

export async function getPersonasCounts(): Promise<{ volunteers: number; participants: number }> {
  const [volunteers, participants] = await Promise.all([
    api.get<Volunteer[]>('/voluntarios/?status=activo&limit=1000'),
    api.get<Participant[]>('/participants/?is_active=true&limit=1000'),
  ])
  return {
    volunteers: volunteers.length,
    participants: participants.length,
  }
}

// ============================================================
// Push Notifications + Notificaciones in-app (campanita)
// ============================================================

export interface AppNotification {
  id: number
  title: string
  body?: string | null
  kind: 'announcement' | 'calendar_reminder' | 'calendar_new' | 'system'
  url?: string | null
  is_read: boolean
  read_at?: string | null
  created_at?: string
}

export async function savePushSubscription(payload: {
  user_type: string
  user_id: number
  endpoint: string
  keys: { p256dh: string; auth: string }
  user_agent?: string
}): Promise<void> {
  await api.post('/push/subscribe', payload)
}

export async function deletePushSubscription(endpoint: string): Promise<void> {
  await api.post('/push/unsubscribe', { endpoint })
}

export async function getNotifications(
  userType: string,
  userId: number,
  limit = 30,
): Promise<AppNotification[]> {
  return api.get<AppNotification[]>(
    `/notifications/?user_type=${encodeURIComponent(userType)}&user_id=${userId}&limit=${limit}`,
  )
}

export async function getUnreadCount(userType: string, userId: number): Promise<number> {
  const res = await api.get<{ unread: number }>(
    `/notifications/unread-count?user_type=${encodeURIComponent(userType)}&user_id=${userId}`,
  )
  return res.unread
}

export async function markNotificationsRead(
  userType: string,
  userId: number,
  id?: number,
): Promise<void> {
  const q = `user_type=${encodeURIComponent(userType)}&user_id=${userId}${id != null ? `&id=${id}` : ''}`
  await api.post(`/notifications/mark-read?${q}`)
}

export interface BroadcastResult {
  recipients: number
  push_sent: number
  popup_created: boolean
}

export async function broadcastNotification(payload: {
  title: string
  body: string
  audience: string
  url?: string | null
  also_popup: boolean
  volunteer_ids?: number[] | null
}): Promise<BroadcastResult> {
  return api.post<BroadcastResult>('/notifications/broadcast', payload)
}

// ============================================================
// Files (almacén genérico de archivos)
// Los bytes viven en disco del backend; acá solo viaja la metadata.
// Para MOSTRAR un archivo se usa fileUrl(guid) → /api/files/<guid>/raw
// ============================================================

export interface FileMeta {
  id: number
  guid: string
  name: string
  mime_type: string
  extension?: string | null
  size_bytes: number
  checksum_sha256?: string | null
  purpose: string
  owner_type?: string | null
  owner_id?: number | null
  width?: number | null
  height?: number | null
  is_active: boolean
  uploaded_by_volunteer_id?: number | null
  created_at?: string
  updated_at?: string | null
}

export interface FilePurpose {
  key: string
  label: string
  mimes: string[]
  max_mb: number
}

/** URL para mostrar el archivo. El guid es inmutable, así que el navegador la cachea para siempre. */
export function fileUrl(guid?: string | null): string | null {
  return guid ? `/api/files/${guid}/raw` : null
}

export async function uploadFile(payload: {
  name: string
  mime_type: string
  purpose: string
  data_base64: string
  owner_type?: string | null
  owner_id?: number | null
  uploaded_by_volunteer_id?: number | null
}): Promise<FileMeta> {
  return api.post<FileMeta>('/files/', payload)
}

export async function getFiles(filters?: {
  purpose?: string
  owner_type?: string
  owner_id?: number
  include_inactive?: boolean
}): Promise<FileMeta[]> {
  const q = new URLSearchParams()
  if (filters?.purpose) q.set('purpose', filters.purpose)
  if (filters?.owner_type) q.set('owner_type', filters.owner_type)
  if (filters?.owner_id != null) q.set('owner_id', String(filters.owner_id))
  if (filters?.include_inactive) q.set('include_inactive', 'true')
  const qs = q.toString()
  return api.get<FileMeta[]>(`/files/${qs ? `?${qs}` : ''}`)
}

export async function getFilePurposes(): Promise<FilePurpose[]> {
  return api.get<FilePurpose[]>('/files/purposes')
}

export async function getFileMeta(guid: string): Promise<FileMeta> {
  return api.get<FileMeta>(`/files/${guid}`)
}

/** Bytes crudos del archivo (para el proxy del BFF, no para componentes). */
export async function getFileRaw(guid: string): Promise<Response> {
  return api.getRaw(`/files/${guid}/raw`)
}

export async function getFileBase64(guid: string): Promise<{
  guid: string
  name: string
  mime_type: string
  size_bytes: number
  data_base64: string
}> {
  return api.get(`/files/${guid}/base64`)
}

export async function updateFileMeta(
  guid: string,
  data: { name?: string; purpose?: string; owner_type?: string | null; owner_id?: number | null; is_active?: boolean },
): Promise<FileMeta> {
  return api.put<FileMeta>(`/files/${guid}`, data)
}

/** purge=false → baja lógica. purge=true → borra el archivo físico (irreversible, solo admin). */
export async function deleteFile(guid: string, opts?: { purge?: boolean; volunteerId?: number }): Promise<void> {
  const q = new URLSearchParams()
  if (opts?.purge) q.set('purge', 'true')
  if (opts?.volunteerId != null) q.set('volunteer_id', String(opts.volunteerId))
  const qs = q.toString()
  await api.delete(`/files/${guid}${qs ? `?${qs}` : ''}`)
}

// ============================================================
// Capacitaciones
// El backend decide qué contenido viaja: los ítems bloqueados vienen con
// locked=true y video_ref en null. El front NUNCA filtra contenido.
// ============================================================

export interface TrainingItem {
  id: number
  training_id: number
  kind: string
  title: string
  description?: string | null
  provider?: string | null
  video_ref?: string | null
  body?: string | null
  file_url?: string | null
  duration_minutes?: number | null
  sort_order: number
  is_published: boolean
  locked: boolean
  last_position_sec?: number | null
  watched_sec?: number | null
  completed: boolean
  created_at?: string
  updated_at?: string | null
}

export interface Training {
  id: number
  title: string
  slug: string
  description?: string | null
  cover_file_guid?: string | null
  price: number
  currency: string
  status: string
  access_mode: string
  default_access_days?: number | null
  category?: string | null
  available_from?: string | null
  available_until?: string | null
  sort_order: number
  created_by_volunteer_id?: number | null
  item_count: number
  has_access: boolean
  access_expires_at?: string | null
  completed_items: number
  items: TrainingItem[]
  created_at?: string
  updated_at?: string | null
}

export interface VideoCheckResult {
  ok: boolean
  video_id?: string | null
  title?: string | null
  author_name?: string | null
  thumbnail_url?: string | null
  message?: string | null
}

export async function getTrainings(opts?: {
  status?: string
  userType?: string
  userId?: number
  includeItems?: boolean
}): Promise<Training[]> {
  const q = new URLSearchParams()
  if (opts?.status) q.set('status', opts.status)
  if (opts?.userType) q.set('user_type', opts.userType)
  if (opts?.userId != null) q.set('user_id', String(opts.userId))
  if (opts?.includeItems) q.set('include_items', 'true')
  const qs = q.toString()
  return api.get<Training[]>(`/capacitaciones/${qs ? `?${qs}` : ''}`)
}

export async function getMyTrainings(userType: string, userId: number): Promise<Training[]> {
  return api.get<Training[]>(`/capacitaciones/mis?user_type=${encodeURIComponent(userType)}&user_id=${userId}`)
}

export async function getTraining(
  id: number,
  opts?: { userType?: string; userId?: number; includeUnpublished?: boolean },
): Promise<Training> {
  const q = new URLSearchParams()
  if (opts?.userType) q.set('user_type', opts.userType)
  if (opts?.userId != null) q.set('user_id', String(opts.userId))
  if (opts?.includeUnpublished) q.set('include_unpublished', 'true')
  const qs = q.toString()
  return api.get<Training>(`/capacitaciones/${id}${qs ? `?${qs}` : ''}`)
}

export async function getPublicTraining(slug: string): Promise<Training> {
  return api.get<Training>(`/capacitaciones/publica/${encodeURIComponent(slug)}`)
}

export async function createTraining(data: Partial<Training> & { title: string }): Promise<Training> {
  return api.post<Training>('/capacitaciones/', data)
}

export async function updateTraining(id: number, data: Partial<Training>): Promise<Training> {
  return api.put<Training>(`/capacitaciones/${id}`, data)
}

export async function deleteTraining(id: number): Promise<void> {
  await api.delete(`/capacitaciones/${id}`)
}

export async function checkTrainingVideo(url: string): Promise<VideoCheckResult> {
  return api.post<VideoCheckResult>('/capacitaciones/check-video', { url })
}

export async function createTrainingItem(
  trainingId: number,
  data: Partial<TrainingItem> & { title: string },
): Promise<TrainingItem> {
  return api.post<TrainingItem>(`/capacitaciones/${trainingId}/items`, data)
}

export async function updateTrainingItem(itemId: number, data: Partial<TrainingItem>): Promise<TrainingItem> {
  return api.put<TrainingItem>(`/capacitaciones/items/${itemId}`, data)
}

export async function deleteTrainingItem(itemId: number): Promise<void> {
  await api.delete(`/capacitaciones/items/${itemId}`)
}

export async function reorderTrainingItems(trainingId: number, order: number[]): Promise<TrainingItem[]> {
  return api.put<TrainingItem[]>(`/capacitaciones/${trainingId}/items/reorder`, { order })
}

export async function saveTrainingProgress(
  itemId: number,
  payload: { user_type: string; user_id: number; last_position_sec: number; watched_delta: number; completed?: boolean },
): Promise<{ training_item_id: number; last_position_sec: number; watched_sec: number; completed_at?: string | null }> {
  return api.post(`/capacitaciones/items/${itemId}/progress`, payload)
}

export async function logTrainingView(
  itemId: number,
  payload: { user_type: string; user_id: number; ip?: string | null; user_agent?: string | null },
): Promise<void> {
  await api.post(`/capacitaciones/items/${itemId}/view`, payload)
}

export interface SharedAccountAlert {
  person_id: number
  person_name?: string | null
  person_email?: string | null
  distinct_ips: number
  views: number
}

/** Posibles cuentas compartidas. SOLO informativo: jamás revocar automáticamente. */
export async function getSharedAccountAlerts(days = 7, minIps = 4): Promise<SharedAccountAlert[]> {
  return api.get<SharedAccountAlert[]>(`/capacitaciones/alertas/cuentas-compartidas?days=${days}&min_ips=${minIps}`)
}

export async function getTrainingSummary(id: number): Promise<{
  training_id: number
  title: string
  students: number
  collected: number
  currency: string
  items: number
  completed_items_total: number
}> {
  return api.get(`/capacitaciones/${id}/resumen`)
}

// ============================================================
// Accesos (habilitaciones por persona) y pagos
// ============================================================

export interface AccessGrant {
  id: number
  person_id: number
  module_key: string
  resource_id: number
  is_active: boolean
  granted_by_volunteer_id?: number | null
  granted_at?: string
  expires_at?: string | null
  revoked_at?: string | null
  notes?: string | null
  is_live: boolean
  person_name?: string | null
  person_email?: string | null
  resource_title?: string | null
}

export interface AccessMatrixRow {
  person_id: number
  name?: string | null
  last_name?: string | null
  email?: string | null
  has_login: boolean
  is_volunteer: boolean
  grants: Record<string, boolean>
  total_paid: number
}

export interface PersonPayment {
  id: number
  person_id: number
  concept_type: string
  concept_id: number
  concept_label?: string | null
  amount: number
  currency: string
  period_year?: number | null
  period_month?: number | null
  method?: string | null
  reference?: string | null
  paid_at?: string | null
  registered_by_volunteer_id?: number | null
  notes?: string | null
  created_at?: string
  person_name?: string | null
}

export interface AccessAuditEntry {
  id: number
  grant_id?: number | null
  person_id: number
  module_key: string
  resource_id: number
  action: string
  actor_type: string
  actor_id: number
  detail?: Record<string, any> | null
  created_at?: string
  actor_name?: string | null
  person_name?: string | null
  resource_label?: string | null
}

export async function getMyAccess(
  userType: string,
  userId: number,
): Promise<{ person_id: number | null; grants: AccessGrant[] }> {
  return api.get(`/accesos/mis?user_type=${encodeURIComponent(userType)}&user_id=${userId}`)
}

export async function getPersonGrants(personId: number): Promise<AccessGrant[]> {
  return api.get<AccessGrant[]>(`/accesos/persona/${personId}`)
}

export async function getResourceGrants(moduleKey: string, resourceId = 0, onlyLive = true): Promise<AccessGrant[]> {
  return api.get<AccessGrant[]>(
    `/accesos/recurso?module_key=${encodeURIComponent(moduleKey)}&resource_id=${resourceId}&only_live=${onlyLive}`,
  )
}

export async function getAccessMatrix(
  moduleKey: string,
  opts?: { search?: string; onlyWithLogin?: boolean },
): Promise<AccessMatrixRow[]> {
  const q = new URLSearchParams({ module_key: moduleKey })
  if (opts?.search) q.set('search', opts.search)
  if (opts?.onlyWithLogin) q.set('only_with_login', 'true')
  return api.get<AccessMatrixRow[]>(`/accesos/matriz?${q.toString()}`)
}

export async function grantAccess(payload: {
  person_id: number
  module_key: string
  resource_id?: number
  expires_at?: string | null
  access_days?: number | null
  notes?: string | null
  actor_type?: string
  actor_id?: number
  payment?: {
    concept_type?: string
    concept_id?: number
    concept_label?: string | null
    amount: number
    method?: string | null
    reference?: string | null
    paid_at?: string | null
    notes?: string | null
  } | null
}): Promise<AccessGrant> {
  return api.post<AccessGrant>('/accesos/', payload)
}

export async function grantAccessBulk(payload: {
  person_ids: number[]
  module_key: string
  resource_id?: number
  expires_at?: string | null
  access_days?: number | null
  notes?: string | null
  actor_type?: string
  actor_id?: number
}): Promise<AccessGrant[]> {
  return api.post<AccessGrant[]>('/accesos/bulk', payload)
}

export async function revokeAccess(payload: {
  person_id: number
  module_key: string
  resource_id?: number
  notes?: string | null
  actor_type?: string
  actor_id?: number
}): Promise<void> {
  await api.post('/accesos/revocar', payload)
}

export async function getAccessAudit(opts?: {
  personId?: number
  moduleKey?: string
  limit?: number
}): Promise<AccessAuditEntry[]> {
  const q = new URLSearchParams()
  if (opts?.personId) q.set('person_id', String(opts.personId))
  if (opts?.moduleKey) q.set('module_key', opts.moduleKey)
  if (opts?.limit) q.set('limit', String(opts.limit))
  const qs = q.toString()
  return api.get<AccessAuditEntry[]>(`/accesos/auditoria${qs ? `?${qs}` : ''}`)
}

export async function getPersonPayments(opts?: {
  personId?: number
  conceptType?: string
  conceptId?: number
  year?: number
}): Promise<PersonPayment[]> {
  const q = new URLSearchParams()
  if (opts?.personId) q.set('person_id', String(opts.personId))
  if (opts?.conceptType) q.set('concept_type', opts.conceptType)
  if (opts?.conceptId != null) q.set('concept_id', String(opts.conceptId))
  if (opts?.year) q.set('year', String(opts.year))
  const qs = q.toString()
  return api.get<PersonPayment[]>(`/accesos/pagos${qs ? `?${qs}` : ''}`)
}

export async function createPersonPayment(payload: {
  person_id: number
  concept_type: string
  concept_id?: number
  concept_label?: string | null
  amount: number
  currency?: string
  period_year?: number | null
  period_month?: number | null
  method?: string | null
  reference?: string | null
  paid_at?: string | null
  registered_by_volunteer_id?: number | null
  notes?: string | null
}): Promise<PersonPayment> {
  return api.post<PersonPayment>('/accesos/pagos', payload)
}

export async function deletePersonPayment(paymentId: number, volunteerId?: number): Promise<void> {
  await api.delete(`/accesos/pagos/${paymentId}${volunteerId != null ? `?volunteer_id=${volunteerId}` : ''}`)
}

export async function getPersonPaymentsSummary(opts?: {
  year?: number
  conceptType?: string
}): Promise<{ concept_type: string; concept_id: number; label?: string | null; pagos: number; total: number }[]> {
  const q = new URLSearchParams()
  if (opts?.year) q.set('year', String(opts.year))
  if (opts?.conceptType) q.set('concept_type', opts.conceptType)
  const qs = q.toString()
  return api.get(`/accesos/pagos/resumen${qs ? `?${qs}` : ''}`)
}

// ============================================================
// Participantes (vista de gestión — pestaña Participantes)
// ============================================================

export interface ParticipanteGestion {
  person_id: number
  participant_id: number
  name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  email_verified: boolean
  created_at: string | null
  enrollments_count: number
  has_training_access: boolean
}

export async function getParticipantesGestion(): Promise<ParticipanteGestion[]> {
  return api.get<ParticipanteGestion[]>('/participants/gestion')
}

/** Setea el PIN de un participante (admin lo escribe). Recibe el hash bcrypt. */
export async function setParticipantePin(participantId: number, hashedPin: string): Promise<void> {
  await api.put(`/participants/${participantId}`, { pin_hash: hashedPin })
}

// ============================================================
// Inscripción a EVENTOS del calendario (por encuentro individual)
// Reemplaza la inscripción por programa (participant_program_enrollments).
// ============================================================

/** Ids de eventos a los que un participante está anotado (para marcar en el calendario). */
export async function getParticipantEventIds(participantId: number): Promise<number[]> {
  return api.get<number[]>(`/calendar/participants/${participantId}/event-ids`)
}

/** Anota a un participante a un evento puntual (idempotente en el backend). */
export async function enrollInEvent(eventId: number, participantId: number): Promise<void> {
  await api.post(`/calendar/instances/${eventId}/participants`, {
    event_id: eventId,
    participant_id: participantId,
    status: "inscripto",
  })
}

/** Desanota a un participante de un evento. */
export async function unenrollFromEvent(eventId: number, participantId: number): Promise<void> {
  await api.delete(`/calendar/instances/${eventId}/participants/by-participant/${participantId}`)
}

/** Anotados de un evento (para que el staff vea quién va). */
export async function getEventParticipants(eventId: number): Promise<
  { id: number; event_id: number; participant_id: number; status: string }[]
> {
  return api.get(`/calendar/instances/${eventId}/participants`)
}

/** Listado de inscripciones agrupable, para la sub-pestaña "Inscripciones" de Espacios. */
export async function getInscripciones(filters?: {
  type?: string
  date_from?: string
  date_to?: string
}): Promise<EventEnrollment[]> {
  const q = new URLSearchParams()
  if (filters?.type) q.set("type", filters.type)
  if (filters?.date_from) q.set("date_from", filters.date_from)
  if (filters?.date_to) q.set("date_to", filters.date_to)
  const qs = q.toString()
  return api.get<EventEnrollment[]>(`/calendar/inscripciones${qs ? `?${qs}` : ""}`)
}

/** Dispara el recordatorio MANUAL de un evento (botón del calendario, staff). */
export async function notifyEventReminder(eventId: number): Promise<{ recipients: number; message?: string }> {
  return api.post(`/calendar/instances/${eventId}/notify`, {})
}
