import { query } from '@/lib/db'

// ============================================================
// TypeScript Interfaces
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

// ============================================================
// Row formatters (MySQL row → TypeScript object)
// ============================================================

function formatDate(value: any): string {
  if (!value) return ''
  if (value instanceof Date) return value.toISOString().split('T')[0]
  return String(value).split('T')[0]
}

function formatDatetime(value: any): string {
  if (!value) return ''
  if (value instanceof Date) return value.toISOString()
  return String(value)
}

function formatVolunteer(row: any): Volunteer {
  return {
    id: row.id,
    name: row.name,
    last_name: row.last_name || undefined,
    age: row.age || undefined,
    gender: row.gender || undefined,
    photo: row.photo || null,
    phone: row.phone || undefined,
    email: row.email || undefined,
    registration_date: formatDate(row.registration_date),
    birth_date: row.birth_date ? formatDate(row.birth_date) : undefined,
    status: row.status,
    specialties: row.specialties
      ? (typeof row.specialties === 'string' ? JSON.parse(row.specialties) : row.specialties)
      : [],
    is_admin: Boolean(row.is_admin),
  }
}

function formatWorkshop(row: any): Workshop {
  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    instructor: row.instructor || undefined,
    date: row.date ? formatDate(row.date) : undefined,
    schedule: row.schedule || undefined,
    capacity: row.capacity,
    cost: row.cost,
    enrolled: row.enrolled,
    status: row.status,
  }
}

function formatGroup(row: any): Group {
  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    coordinator: row.coordinator || undefined,
    day: row.day || undefined,
    schedule: row.schedule || undefined,
    participants: row.participants,
    status: row.status,
  }
}

function formatActivity(row: any): Activity {
  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    status: row.status,
  }
}

function formatPayment(row: any): Payment {
  return {
    id: row.id,
    user_id: row.user_id,
    concept: row.concept,
    amount: row.amount,
    due_date: formatDate(row.due_date),
    payment_method: row.payment_method || null,
    status: row.status,
    payment_date: row.payment_date ? formatDate(row.payment_date) : null,
  }
}

function formatInventoryItem(row: any): InventoryItem {
  return {
    id: row.id,
    name: row.name,
    category: row.category || undefined,
    quantity: row.quantity,
    minimum_stock: row.minimum_stock,
    price: Number(row.price),
    supplier: row.supplier || undefined,
    assigned_volunteer_id: row.assigned_volunteer_id || null,
    entry_date: formatDate(row.entry_date),
  }
}

function formatEnrollment(row: any): Enrollment {
  return {
    id: row.id,
    user_id: row.user_id,
    type: row.type,
    item_id: row.item_id,
    enrollment_date: formatDate(row.enrollment_date),
    status: row.status,
  }
}

// ============================================================
// Volunteers
// ============================================================

export async function getVolunteers(): Promise<Volunteer[]> {
  const rows = await query('SELECT * FROM voluntarios ORDER BY id ASC')
  return rows.map(formatVolunteer)
}

export async function getVolunteerByEmail(email: string): Promise<Volunteer | null> {
  const rows = await query('SELECT * FROM voluntarios WHERE email = ? LIMIT 1', [email])
  if (rows.length === 0) return null
  return formatVolunteer(rows[0])
}

/** Returns volunteer + raw pin_hash for authentication (not exposed in normal API) */
export async function getVolunteerByEmailForAuth(
  email: string
): Promise<{ volunteer: Volunteer; pin_hash: string | null } | null> {
  const rows = await query('SELECT * FROM voluntarios WHERE email = ? LIMIT 1', [email])
  if (rows.length === 0) return null
  return { volunteer: formatVolunteer(rows[0]), pin_hash: rows[0].pin_hash || null }
}

/** Stores a bcrypt-hashed PIN for a volunteer */
export async function setVolunteerPin(id: number, hashedPin: string): Promise<void> {
  await query('UPDATE voluntarios SET pin_hash = ? WHERE id = ?', [hashedPin, id])
}

export async function createVolunteer(data: Partial<Volunteer>): Promise<Volunteer> {
  const specialties = JSON.stringify(data.specialties || [])
  const result: any = await query(
    `INSERT INTO voluntarios (name, last_name, age, gender, photo, phone, email, registration_date, birth_date, status, specialties, is_admin)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.name,
      data.last_name || null,
      data.age || null,
      data.gender || null,
      data.photo || null,
      data.phone || null,
      data.email || null,
      data.registration_date || new Date().toISOString().split('T')[0],
      data.birth_date || null,
      data.status || 'activo',
      specialties,
      data.is_admin ? 1 : 0,
    ]
  )
  const id = (result as any).insertId
  const rows = await query('SELECT * FROM voluntarios WHERE id = ?', [id])
  return formatVolunteer(rows[0])
}

export async function updateVolunteer(id: number, data: Partial<Volunteer>): Promise<Volunteer> {
  const specialties = data.specialties !== undefined ? JSON.stringify(data.specialties) : undefined

  const fields: string[] = []
  const values: any[] = []

  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name) }
  if (data.last_name !== undefined) { fields.push('last_name = ?'); values.push(data.last_name) }
  if (data.age !== undefined) { fields.push('age = ?'); values.push(data.age) }
  if (data.gender !== undefined) { fields.push('gender = ?'); values.push(data.gender) }
  if (data.photo !== undefined) { fields.push('photo = ?'); values.push(data.photo) }
  if (data.phone !== undefined) { fields.push('phone = ?'); values.push(data.phone) }
  if (data.email !== undefined) { fields.push('email = ?'); values.push(data.email) }
  if (data.registration_date !== undefined) { fields.push('registration_date = ?'); values.push(data.registration_date) }
  if (data.birth_date !== undefined) { fields.push('birth_date = ?'); values.push(data.birth_date) }
  if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status) }
  if (specialties !== undefined) { fields.push('specialties = ?'); values.push(specialties) }
  if (data.is_admin !== undefined) { fields.push('is_admin = ?'); values.push(data.is_admin ? 1 : 0) }

  if (fields.length > 0) {
    values.push(id)
    await query(`UPDATE voluntarios SET ${fields.join(', ')} WHERE id = ?`, values)
  }

  const rows = await query('SELECT * FROM voluntarios WHERE id = ?', [id])
  return formatVolunteer(rows[0])
}

export async function deleteVolunteer(id: number): Promise<void> {
  await query('DELETE FROM voluntarios WHERE id = ?', [id])
}

// ============================================================
// Workshops (Talleres)
// ============================================================

export async function getWorkshops(): Promise<Workshop[]> {
  const rows = await query('SELECT * FROM talleres ORDER BY id ASC')
  return rows.map(formatWorkshop)
}

export async function createWorkshop(data: Partial<Workshop>): Promise<Workshop> {
  const result: any = await query(
    `INSERT INTO talleres (name, description, instructor, date, schedule, capacity, cost, enrolled, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.name,
      data.description || null,
      data.instructor || null,
      data.date || null,
      data.schedule || null,
      data.capacity || 0,
      data.cost || 0,
      0,
      data.status || 'activo',
    ]
  )
  const id = result.insertId
  const rows = await query('SELECT * FROM talleres WHERE id = ?', [id])
  return formatWorkshop(rows[0])
}

export async function updateWorkshop(id: number, data: Partial<Workshop>): Promise<Workshop> {
  const fields: string[] = []
  const values: any[] = []

  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name) }
  if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description) }
  if (data.instructor !== undefined) { fields.push('instructor = ?'); values.push(data.instructor) }
  if (data.date !== undefined) { fields.push('date = ?'); values.push(data.date) }
  if (data.schedule !== undefined) { fields.push('schedule = ?'); values.push(data.schedule) }
  if (data.capacity !== undefined) { fields.push('capacity = ?'); values.push(data.capacity) }
  if (data.cost !== undefined) { fields.push('cost = ?'); values.push(data.cost) }
  if (data.enrolled !== undefined) { fields.push('enrolled = ?'); values.push(data.enrolled) }
  if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status) }

  if (fields.length > 0) {
    values.push(id)
    await query(`UPDATE talleres SET ${fields.join(', ')} WHERE id = ?`, values)
  }

  const rows = await query('SELECT * FROM talleres WHERE id = ?', [id])
  return formatWorkshop(rows[0])
}

export async function deleteWorkshop(id: number): Promise<void> {
  await query('DELETE FROM talleres WHERE id = ?', [id])
}

// ============================================================
// Groups (Grupos)
// ============================================================

export async function getGroups(): Promise<Group[]> {
  const rows = await query('SELECT * FROM grupos ORDER BY id ASC')
  return rows.map(formatGroup)
}

export async function createGroup(data: Partial<Group>): Promise<Group> {
  const result: any = await query(
    `INSERT INTO grupos (name, description, coordinator, day, schedule, participants, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      data.name,
      data.description || null,
      data.coordinator || null,
      data.day || null,
      data.schedule || null,
      0,
      data.status || 'activo',
    ]
  )
  const id = result.insertId
  const rows = await query('SELECT * FROM grupos WHERE id = ?', [id])
  return formatGroup(rows[0])
}

export async function updateGroup(id: number, data: Partial<Group>): Promise<Group> {
  const fields: string[] = []
  const values: any[] = []

  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name) }
  if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description) }
  if (data.coordinator !== undefined) { fields.push('coordinator = ?'); values.push(data.coordinator) }
  if (data.day !== undefined) { fields.push('day = ?'); values.push(data.day) }
  if (data.schedule !== undefined) { fields.push('schedule = ?'); values.push(data.schedule) }
  if (data.participants !== undefined) { fields.push('participants = ?'); values.push(data.participants) }
  if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status) }

  if (fields.length > 0) {
    values.push(id)
    await query(`UPDATE grupos SET ${fields.join(', ')} WHERE id = ?`, values)
  }

  const rows = await query('SELECT * FROM grupos WHERE id = ?', [id])
  return formatGroup(rows[0])
}

export async function deleteGroup(id: number): Promise<void> {
  await query('DELETE FROM grupos WHERE id = ?', [id])
}

// ============================================================
// Activities (Actividades)
// ============================================================

export async function getActivities(): Promise<Activity[]> {
  const rows = await query('SELECT * FROM actividades ORDER BY id ASC')
  return rows.map(formatActivity)
}

export async function createActivity(data: Partial<Activity>): Promise<Activity> {
  const result: any = await query(
    `INSERT INTO actividades (name, description, status) VALUES (?, ?, ?)`,
    [data.name, data.description || null, data.status || 'activo']
  )
  const id = result.insertId
  const rows = await query('SELECT * FROM actividades WHERE id = ?', [id])
  return formatActivity(rows[0])
}

export async function updateActivity(id: number, data: Partial<Activity>): Promise<Activity> {
  const fields: string[] = []
  const values: any[] = []

  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name) }
  if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description) }
  if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status) }

  if (fields.length > 0) {
    values.push(id)
    await query(`UPDATE actividades SET ${fields.join(', ')} WHERE id = ?`, values)
  }

  const rows = await query('SELECT * FROM actividades WHERE id = ?', [id])
  return formatActivity(rows[0])
}

export async function deleteActivity(id: number): Promise<void> {
  await query('DELETE FROM actividades WHERE id = ?', [id])
}

// ============================================================
// Payments (Pagos)
// ============================================================

export async function getPayments(): Promise<Payment[]> {
  const rows = await query('SELECT * FROM pagos ORDER BY id ASC')
  return rows.map(formatPayment)
}

export async function createPayment(data: Partial<Payment>): Promise<Payment> {
  const result: any = await query(
    `INSERT INTO pagos (user_id, concept, amount, due_date, payment_method, status, payment_date)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      data.user_id,
      data.concept,
      data.amount,
      data.due_date,
      data.payment_method || null,
      data.status || 'pendiente',
      null,
    ]
  )
  const id = result.insertId
  const rows = await query('SELECT * FROM pagos WHERE id = ?', [id])
  return formatPayment(rows[0])
}

export async function updatePayment(id: number, data: Partial<Payment>): Promise<Payment> {
  const fields: string[] = []
  const values: any[] = []

  if (data.user_id !== undefined) { fields.push('user_id = ?'); values.push(data.user_id) }
  if (data.concept !== undefined) { fields.push('concept = ?'); values.push(data.concept) }
  if (data.amount !== undefined) { fields.push('amount = ?'); values.push(data.amount) }
  if (data.due_date !== undefined) { fields.push('due_date = ?'); values.push(data.due_date) }
  if (data.payment_method !== undefined) { fields.push('payment_method = ?'); values.push(data.payment_method) }
  if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status) }
  if (data.payment_date !== undefined) { fields.push('payment_date = ?'); values.push(data.payment_date) }

  if (fields.length > 0) {
    values.push(id)
    await query(`UPDATE pagos SET ${fields.join(', ')} WHERE id = ?`, values)
  }

  const rows = await query('SELECT * FROM pagos WHERE id = ?', [id])
  return formatPayment(rows[0])
}

export async function deletePayment(id: number): Promise<void> {
  await query('DELETE FROM pagos WHERE id = ?', [id])
}

// ============================================================
// Inventory (Inventario)
// ============================================================

export async function getInventory(): Promise<InventoryItem[]> {
  const rows = await query('SELECT * FROM inventario ORDER BY id ASC')
  return rows.map(formatInventoryItem)
}

export async function createInventoryItem(data: Partial<InventoryItem>): Promise<InventoryItem> {
  const result: any = await query(
    `INSERT INTO inventario (name, category, quantity, minimum_stock, price, supplier, assigned_volunteer_id, entry_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.name,
      data.category || null,
      data.quantity || 0,
      data.minimum_stock || 1,
      data.price || 0,
      data.supplier || null,
      data.assigned_volunteer_id || null,
      data.entry_date || new Date().toISOString().split('T')[0],
    ]
  )
  const id = result.insertId
  const rows = await query('SELECT * FROM inventario WHERE id = ?', [id])
  return formatInventoryItem(rows[0])
}

export async function updateInventoryItem(id: number, data: Partial<InventoryItem>): Promise<InventoryItem> {
  const fields: string[] = []
  const values: any[] = []

  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name) }
  if (data.category !== undefined) { fields.push('category = ?'); values.push(data.category) }
  if (data.quantity !== undefined) { fields.push('quantity = ?'); values.push(data.quantity) }
  if (data.minimum_stock !== undefined) { fields.push('minimum_stock = ?'); values.push(data.minimum_stock) }
  if (data.price !== undefined) { fields.push('price = ?'); values.push(data.price) }
  if (data.supplier !== undefined) { fields.push('supplier = ?'); values.push(data.supplier) }
  if ('assigned_volunteer_id' in data) { fields.push('assigned_volunteer_id = ?'); values.push(data.assigned_volunteer_id || null) }
  if (data.entry_date !== undefined) { fields.push('entry_date = ?'); values.push(data.entry_date) }

  if (fields.length > 0) {
    values.push(id)
    await query(`UPDATE inventario SET ${fields.join(', ')} WHERE id = ?`, values)
  }

  const rows = await query('SELECT * FROM inventario WHERE id = ?', [id])
  return formatInventoryItem(rows[0])
}

export async function deleteInventoryItem(id: number): Promise<void> {
  await query('DELETE FROM inventario WHERE id = ?', [id])
}

// ============================================================
// Enrollments (Inscripciones)
// ============================================================

export async function getEnrollments(): Promise<Enrollment[]> {
  const rows = await query('SELECT * FROM inscripciones ORDER BY id ASC')
  return rows.map(formatEnrollment)
}

export async function createEnrollment(data: Partial<Enrollment>): Promise<Enrollment> {
  const result: any = await query(
    `INSERT INTO inscripciones (user_id, type, item_id, enrollment_date, status)
     VALUES (?, ?, ?, ?, ?)`,
    [
      data.user_id,
      data.type,
      data.item_id,
      data.enrollment_date || new Date().toISOString().split('T')[0],
      data.status || 'confirmada',
    ]
  )
  const id = result.insertId
  const rows = await query('SELECT * FROM inscripciones WHERE id = ?', [id])
  return formatEnrollment(rows[0])
}

export async function getUserEnrollments(userId: number): Promise<{ workshops: number[], groups: number[], activities: number[] }> {
  const rows = await query(
    'SELECT type, item_id FROM inscripciones WHERE user_id = ?',
    [userId]
  )
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
  const parents = await query('SELECT * FROM pendientes ORDER BY created_date ASC')
  const subItems = await query('SELECT * FROM pending_items ORDER BY created_date ASC')

  return parents.map((p: any) => ({
    id: p.id,
    description: p.description,
    assigned_volunteer_id: p.assigned_volunteer_id || '',
    completed: Boolean(p.completed),
    created_date: formatDatetime(p.created_date),
    completed_date: p.completed_date ? formatDatetime(p.completed_date) : undefined,
    sub_items: subItems
      .filter((s: any) => s.pending_id === p.id)
      .map((s: any) => ({
        id: s.id,
        description: s.description,
        assigned_volunteer_id: s.assigned_volunteer_id || '',
        completed: Boolean(s.completed),
        created_date: formatDatetime(s.created_date),
        completed_date: s.completed_date ? formatDatetime(s.completed_date) : undefined,
      })),
  }))
}

export async function savePendingTasks(tasks: PendingTask[]): Promise<void> {
  const conn = await (await import('@/lib/db')).default.getConnection()
  try {
    await conn.beginTransaction()
    await conn.execute('DELETE FROM pending_items')
    await conn.execute('DELETE FROM pendientes')

    for (const task of tasks) {
      await conn.execute(
        `INSERT INTO pendientes (id, description, assigned_volunteer_id, completed, created_date, completed_date)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          task.id,
          task.description,
          task.assigned_volunteer_id || null,
          task.completed ? 1 : 0,
          task.created_date,
          task.completed_date || null,
        ]
      )

      if (task.sub_items && task.sub_items.length > 0) {
        for (const sub of task.sub_items) {
          await conn.execute(
            `INSERT INTO pending_items (id, pending_id, description, assigned_volunteer_id, completed, created_date, completed_date)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              sub.id,
              task.id,
              sub.description,
              sub.assigned_volunteer_id || null,
              sub.completed ? 1 : 0,
              sub.created_date,
              sub.completed_date || null,
            ]
          )
        }
      }
    }

    await conn.commit()
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
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

// ============================================================
// Calendar (Calendarios)
// ============================================================

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

const CALENDAR_INSTANCE_SELECT = `
  SELECT
    ci.id, ci.type, ci.source_id, ci.date, ci.start_time, ci.end_time, ci.notes, ci.status,
    coord_v.id   AS coord_id,   coord_v.name   AS coord_name,   coord_v.last_name AS coord_last_name,
    cocoord_v.id AS cocoord_id, cocoord_v.name AS cocoord_name, cocoord_v.last_name AS cocoord_last_name
  FROM calendar_instances ci
  LEFT JOIN calendar_assignments coord_ca
    ON coord_ca.instance_id = ci.id AND coord_ca.role = 'coordinator'
  LEFT JOIN voluntarios coord_v ON coord_v.id = coord_ca.volunteer_id
  LEFT JOIN calendar_assignments cocoord_ca
    ON cocoord_ca.instance_id = ci.id AND cocoord_ca.role = 'co_coordinator'
  LEFT JOIN voluntarios cocoord_v ON cocoord_v.id = cocoord_ca.volunteer_id
`

function formatCalendarInstance(row: any): CalendarInstance {
  return {
    id: row.id,
    type: row.type,
    source_id: row.source_id ?? null,
    date: formatDate(row.date),
    start_time: row.start_time ? String(row.start_time) : '10:00:00',
    end_time: row.end_time ? String(row.end_time) : '12:00:00',
    notes: row.notes || null,
    status: row.status,
    coordinator: row.coord_id
      ? { id: row.coord_id, name: row.coord_name, last_name: row.coord_last_name || '' }
      : null,
    co_coordinator: row.cocoord_id
      ? { id: row.cocoord_id, name: row.cocoord_name, last_name: row.cocoord_last_name || '' }
      : null,
  }
}

async function fetchCalendarInstanceById(id: number): Promise<CalendarInstance> {
  const rows = await query(
    `${CALENDAR_INSTANCE_SELECT} WHERE ci.id = ?`,
    [id]
  )
  return formatCalendarInstance(rows[0])
}

export async function getCalendarInstances(
  year: number,
  month: number | null,
  filters?: { type?: string; volunteer_id?: number }
): Promise<CalendarInstance[]> {
  let sql = `${CALENDAR_INSTANCE_SELECT} WHERE YEAR(ci.date) = ?`
  const params: any[] = [year]
  if (month !== null) {
    sql += ' AND MONTH(ci.date) = ?'
    params.push(month)
  }

  if (filters?.type) {
    sql += ' AND ci.type = ?'
    params.push(filters.type)
  }

  if (filters?.volunteer_id) {
    sql += ' AND (coord_ca.volunteer_id = ? OR cocoord_ca.volunteer_id = ?)'
    params.push(filters.volunteer_id, filters.volunteer_id)
  }

  sql += ' ORDER BY ci.date ASC, ci.start_time ASC'
  const rows = await query(sql, params)
  return rows.map(formatCalendarInstance)
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
  const result: any = await query(
    `INSERT INTO calendar_instances (type, source_id, date, start_time, end_time, notes, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      data.type,
      data.source_id || null,
      data.date,
      data.start_time || '10:00:00',
      data.end_time || '12:00:00',
      data.notes || null,
      data.status || 'programado',
    ]
  )
  return fetchCalendarInstanceById(result.insertId)
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
  const fields: string[] = []
  const values: any[] = []

  if (data.type !== undefined) { fields.push('type = ?'); values.push(data.type) }
  if (data.date !== undefined) { fields.push('date = ?'); values.push(data.date) }
  if (data.start_time !== undefined) { fields.push('start_time = ?'); values.push(data.start_time) }
  if (data.end_time !== undefined) { fields.push('end_time = ?'); values.push(data.end_time) }
  if ('source_id' in data) { fields.push('source_id = ?'); values.push(data.source_id ?? null) }
  if ('notes' in data) { fields.push('notes = ?'); values.push(data.notes ?? null) }
  if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status) }

  if (fields.length > 0) {
    values.push(id)
    await query(`UPDATE calendar_instances SET ${fields.join(', ')} WHERE id = ?`, values)
  }

  return fetchCalendarInstanceById(id)
}

export async function deleteCalendarInstance(id: number): Promise<void> {
  await query('DELETE FROM calendar_instances WHERE id = ?', [id])
}

export type BulkDeleteScope = 'month' | 'type' | 'series' | 'all'

export interface BulkDeleteFilters {
  scope: BulkDeleteScope
  year?: number
  month?: number
  type?: string
  source_id?: number | null
}

function buildBulkWhereClause(filters: BulkDeleteFilters): { where: string; params: any[] } {
  const params: any[] = []
  if (filters.scope === 'month') {
    return { where: 'YEAR(date) = ? AND MONTH(date) = ?', params: [filters.year, filters.month] }
  } else if (filters.scope === 'type') {
    return { where: 'type = ?', params: [filters.type] }
  } else if (filters.scope === 'series') {
    if (filters.source_id != null) {
      return { where: 'type = ? AND source_id = ?', params: [filters.type, filters.source_id] }
    } else {
      return { where: 'type = ? AND source_id IS NULL', params: [filters.type] }
    }
  } else {
    // all
    return { where: '1=1', params: [] }
  }
}

export async function countCalendarInstancesBulk(filters: BulkDeleteFilters): Promise<number> {
  const { where, params } = buildBulkWhereClause(filters)
  const rows = await query(`SELECT COUNT(*) AS cnt FROM calendar_instances WHERE ${where}`, params)
  return Number(rows[0]?.cnt ?? 0)
}

export async function deleteCalendarInstancesBulk(filters: BulkDeleteFilters): Promise<{ deleted: number }> {
  const { where, params } = buildBulkWhereClause(filters)
  const result: any = await query(`DELETE FROM calendar_instances WHERE ${where}`, params)
  return { deleted: result.affectedRows ?? 0 }
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
  const intervalDays = params.interval_days ?? 14
  const startTime = params.start_time || '10:00:00'
  const endHour = parseInt(startTime.split(':')[0]) + 2
  const endTime = `${String(endHour).padStart(2, '0')}:${startTime.split(':')[1] || '00'}:00`

  const start = new Date(params.start_date + 'T12:00:00')
  const end = new Date(params.end_date + 'T12:00:00')

  const types = ['grupo', 'taller']
  let typeIndex = params.first_type === 'taller' ? 1 : 0

  const created: CalendarInstance[] = []
  let current = new Date(start)

  while (current <= end) {
    const type = types[typeIndex % 2]
    const source_id = type === 'grupo'
      ? (params.source_group_id || null)
      : (params.source_workshop_id || null)

    const dateStr = current.toISOString().split('T')[0]
    const inst = await createCalendarInstance({
      type,
      date: dateStr,
      start_time: startTime,
      end_time: endTime,
      source_id,
    })
    created.push(inst)

    current = new Date(current.getTime() + intervalDays * 24 * 60 * 60 * 1000)
    typeIndex++
  }

  return { created: created.length, instances: created }
}

export async function setCalendarAssignment(
  instance_id: number,
  role: string,
  volunteer_id: number
): Promise<void> {
  await query(
    `INSERT INTO calendar_assignments (instance_id, volunteer_id, role)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE volunteer_id = VALUES(volunteer_id), updated_at = CURRENT_TIMESTAMP`,
    [instance_id, volunteer_id, role]
  )
}

export async function removeCalendarAssignment(instance_id: number, role: string): Promise<void> {
  await query(
    'DELETE FROM calendar_assignments WHERE instance_id = ? AND role = ?',
    [instance_id, role]
  )
}

// ============================================================
// Participants (Participantes)
// ============================================================

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

function formatParticipant(row: any): Participant {
  return {
    id: row.id,
    email: row.email,
    is_active: Boolean(row.is_active),
    created_at: row.created_at,
  }
}

function formatParticipantProfile(row: any): ParticipantProfile {
  return {
    id: row.id,
    participant_id: row.participant_id,
    name: row.name || null,
    last_name: row.last_name || null,
    phone: row.phone || null,
    birth_date: row.birth_date ? String(row.birth_date).slice(0, 10) : null,
    city: row.city || null,
    province: row.province || null,
    address: row.address || null,
    emergency_contact_name: row.emergency_contact_name || null,
    emergency_contact_phone: row.emergency_contact_phone || null,
    notes: row.notes || null,
    accepts_notifications: Boolean(row.accepts_notifications),
    accepts_whatsapp: Boolean(row.accepts_whatsapp),
  }
}

/** Returns participant + raw pin_hash for authentication */
export async function getParticipantByEmailForAuth(
  email: string
): Promise<{ participant: Participant; pin_hash: string | null } | null> {
  const rows = await query('SELECT * FROM participants WHERE email = ? AND is_active = 1 LIMIT 1', [email])
  if (rows.length === 0) return null
  const row: any = rows[0]
  return { participant: formatParticipant(row), pin_hash: row.pin_hash || null }
}

/** Stores a bcrypt-hashed PIN for a participant */
export async function setParticipantPin(id: number, hashedPin: string): Promise<void> {
  await query('UPDATE participants SET pin_hash = ? WHERE id = ?', [hashedPin, id])
}

/** Creates a new participant account */
export async function createParticipant(email: string, hashedPin?: string): Promise<Participant> {
  const result: any = await query(
    'INSERT INTO participants (email, pin_hash) VALUES (?, ?)',
    [email, hashedPin || null]
  )
  const rows = await query('SELECT * FROM participants WHERE id = ? LIMIT 1', [result.insertId])
  return formatParticipant(rows[0])
}

/** Returns the profile of a participant (or null if not created yet) */
export async function getParticipantProfile(participant_id: number): Promise<ParticipantProfile | null> {
  const rows = await query(
    'SELECT * FROM participant_profiles WHERE participant_id = ? LIMIT 1',
    [participant_id]
  )
  if (rows.length === 0) return null
  return formatParticipantProfile(rows[0])
}

/** Creates or updates a participant's profile */
export async function upsertParticipantProfile(
  participant_id: number,
  data: Partial<ParticipantProfile>
): Promise<ParticipantProfile> {
  const existing = await getParticipantProfile(participant_id)

  const fields = [
    'name', 'last_name', 'phone', 'birth_date', 'city', 'province',
    'address', 'emergency_contact_name', 'emergency_contact_phone',
    'notes', 'accepts_notifications', 'accepts_whatsapp',
  ]

  if (!existing) {
    // INSERT
    const cols = ['participant_id', ...fields.filter(f => f in data)]
    const vals = [
      participant_id,
      ...fields
        .filter(f => f in data)
        .map(f => {
          const v = (data as any)[f]
          if (f === 'accepts_notifications' || f === 'accepts_whatsapp') return v ? 1 : 0
          return v ?? null
        }),
    ]
    await query(
      `INSERT INTO participant_profiles (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
      vals
    )
  } else {
    // UPDATE
    const setCols = fields.filter(f => f in data).map(f => `${f} = ?`)
    if (setCols.length === 0) return existing
    const vals = fields
      .filter(f => f in data)
      .map(f => {
        const v = (data as any)[f]
        if (f === 'accepts_notifications' || f === 'accepts_whatsapp') return v ? 1 : 0
        return v ?? null
      })
    vals.push(participant_id)
    await query(
      `UPDATE participant_profiles SET ${setCols.join(', ')} WHERE participant_id = ?`,
      vals
    )
  }

  const updated = await getParticipantProfile(participant_id)
  return updated!
}

/** Returns counts of volunteers and participants for the dashboard */
export async function getPersonasCounts(): Promise<{ volunteers: number; participants: number }> {
  const [vRows, pRows] = await Promise.all([
    query('SELECT COUNT(*) AS cnt FROM voluntarios WHERE status = ?', ['activo']),
    query('SELECT COUNT(*) AS cnt FROM participants WHERE is_active = 1'),
  ])
  return {
    volunteers: Number((vRows[0] as any)?.cnt ?? 0),
    participants: Number((pRows[0] as any)?.cnt ?? 0),
  }
}

export async function importAllData(data: AllData): Promise<void> {
  const conn = await (await import('@/lib/db')).default.getConnection()
  try {
    await conn.beginTransaction()

    // Truncate in correct order to respect foreign keys
    await conn.execute('SET FOREIGN_KEY_CHECKS = 0')
    await conn.execute('TRUNCATE TABLE pending_items')
    await conn.execute('TRUNCATE TABLE pendientes')
    await conn.execute('TRUNCATE TABLE inscripciones')
    await conn.execute('TRUNCATE TABLE pagos')
    await conn.execute('TRUNCATE TABLE inventario')
    await conn.execute('TRUNCATE TABLE actividades')
    await conn.execute('TRUNCATE TABLE grupos')
    await conn.execute('TRUNCATE TABLE talleres')
    await conn.execute('TRUNCATE TABLE voluntarios')
    await conn.execute('SET FOREIGN_KEY_CHECKS = 1')

    // Insert volunteers
    for (const v of data.volunteers || []) {
      await conn.execute(
        `INSERT INTO voluntarios (id, name, last_name, age, gender, photo, phone, email, registration_date, birth_date, status, specialties, is_admin)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [v.id, v.name, v.last_name || null, v.age || null, v.gender || null, v.photo || null,
         v.phone || null, v.email || null, v.registration_date, v.birth_date || null,
         v.status, JSON.stringify(v.specialties || []), v.is_admin ? 1 : 0]
      )
    }

    // Insert workshops
    for (const w of data.workshops || []) {
      await conn.execute(
        `INSERT INTO talleres (id, name, description, instructor, date, schedule, capacity, cost, enrolled, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [w.id, w.name, w.description || null, w.instructor || null, w.date || null,
         w.schedule || null, w.capacity, w.cost, w.enrolled, w.status]
      )
    }

    // Insert groups
    for (const g of data.groups || []) {
      await conn.execute(
        `INSERT INTO grupos (id, name, description, coordinator, day, schedule, participants, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [g.id, g.name, g.description || null, g.coordinator || null, g.day || null,
         g.schedule || null, g.participants, g.status]
      )
    }

    // Insert activities
    for (const a of data.activities || []) {
      await conn.execute(
        `INSERT INTO actividades (id, name, description, date, schedule, location, capacity, cost, enrolled, is_free, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [a.id, a.name, a.description || null, a.date || null, a.schedule || null,
         a.location || null, a.capacity, a.cost, a.enrolled, a.is_free ? 1 : 0, a.status]
      )
    }

    // Insert payments
    for (const p of data.payments || []) {
      await conn.execute(
        `INSERT INTO pagos (id, user_id, concept, amount, due_date, payment_method, status, payment_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [p.id, p.user_id, p.concept, p.amount, p.due_date, p.payment_method || null,
         p.status, p.payment_date || null]
      )
    }

    // Insert inventory
    for (const i of data.inventory || []) {
      await conn.execute(
        `INSERT INTO inventario (id, name, category, quantity, minimum_stock, price, supplier, assigned_volunteer_id, entry_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [i.id, i.name, i.category || null, i.quantity, i.minimum_stock, i.price,
         i.supplier || null, i.assigned_volunteer_id || null, i.entry_date]
      )
    }

    // Insert enrollments
    for (const e of data.enrollments || []) {
      await conn.execute(
        `INSERT INTO inscripciones (id, user_id, type, item_id, enrollment_date, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [e.id, e.user_id, e.type, e.item_id, e.enrollment_date, e.status]
      )
    }

    // Insert pending tasks
    for (const task of data.pending_tasks || []) {
      await conn.execute(
        `INSERT INTO pendientes (id, description, assigned_volunteer_id, completed, created_date, completed_date)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [task.id, task.description, task.assigned_volunteer_id || null,
         task.completed ? 1 : 0, task.created_date, task.completed_date || null]
      )
      for (const sub of task.sub_items || []) {
        await conn.execute(
          `INSERT INTO pending_items (id, pending_id, description, assigned_volunteer_id, completed, created_date, completed_date)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [sub.id, task.id, sub.description, sub.assigned_volunteer_id || null,
           sub.completed ? 1 : 0, sub.created_date, sub.completed_date || null]
        )
      }
    }

    await conn.commit()
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}
