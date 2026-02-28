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
  date: string
  start_time: string
  end_time: string
  notes: string | null
  status: 'programado' | 'realizado' | 'cancelado'
  coordinator: VolunteerRef | null
  co_coordinator: VolunteerRef | null
}

export interface Participant {
  id: number
  email: string
  is_active: boolean
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
    const data = await api.get<{ id: number; name: string; last_name?: string; email?: string; status: string; is_admin: boolean; pin_hash?: string | null }>(
      `/voluntarios/auth/${encodeURIComponent(email)}`
    )
    const volunteer: Volunteer = {
      id: data.id,
      name: data.name,
      last_name: data.last_name,
      email: data.email,
      status: data.status,
      is_admin: data.is_admin,
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
  notes?: string | null
  status?: string
}): Promise<CalendarInstance> {
  const ci = await api.post<any>('/calendar/instances', {
    ...data,
    start_time: data.start_time || '10:00:00',
    end_time: data.end_time || '12:00:00',
    status: data.status || 'programado',
  })
  return { ...ci, coordinator: null, co_coordinator: null }
}

export async function updateCalendarInstance(
  id: number,
  data: Partial<{
    type: string
    date: string
    start_time: string
    end_time: string
    source_id: number | null
    notes: string | null
    status: string
  }>
): Promise<CalendarInstance> {
  const ci = await api.put<any>(`/calendar/instances/${id}`, data)
  return { ...ci, coordinator: null, co_coordinator: null }
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
    const data = await api.get<{ id: number; email: string; is_active: boolean; pin_hash?: string | null }>(
      `/participants/auth/${encodeURIComponent(email)}`
    )
    if (!data.is_active) return null
    return {
      participant: { id: data.id, email: data.email, is_active: data.is_active },
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
