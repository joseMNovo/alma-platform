import fs from 'fs'
import path from 'path'

const DATA_FILE_PATH = path.join(process.cwd(), 'lib', 'data.json')

export interface Database {
  usuarios: User[]
  talleres: Taller[]
  grupos: Grupo[]
  actividades: Actividad[]
  pagos: Pago[]
  inventario: InventarioItem[]
  voluntarios: Voluntario[]
  inscripciones: Inscripcion[]
}

export interface User {
  id: number
  nombre: string
  email: string
  password: string
  rol: string
  telefono: string
  fechaRegistro: string
  inscripciones?: {
    talleres: number[]
    grupos: number[]
    actividades: number[]
  }
}

export interface Taller {
  id: number
  nombre: string
  descripcion: string
  instructor: string
  fecha: string
  horario: string
  cupos: number
  inscritos: number
  costo: number
  estado: string
}

export interface Grupo {
  id: number
  nombre: string
  descripcion: string
  coordinador: string
  dia: string
  horario: string
  participantes: number
  estado: string
}

export interface Actividad {
  id: number
  nombre: string
  descripcion: string
  fecha: string
  horario: string
  lugar: string
  cupos: number
  inscritos: number
  gratuita: boolean
  costo?: number
  estado: string
}

export interface Pago {
  id: number
  usuarioId: number
  concepto: string
  monto: number
  fechaVencimiento: string
  fechaPago: string | null
  metodoPago: string | null
  estado: string
}

export interface InventarioItem {
  id: number
  nombre: string
  categoria: string
  cantidad: number
  stockMinimo: number
  precio: number
  proveedor: string
  fechaIngreso: string
  voluntarioAsignado?: number | null
}

export interface Voluntario {
  id: number
  nombre: string
  edad?: number
  sexo?: string
  foto?: string | null
  telefono?: string
  email?: string
  fechaRegistro: string
  estado: string
  especialidades?: string[]
}

export interface Inscripcion {
  id: number
  usuarioId: number
  tipo: string
  itemId: number
  fechaInscripcion: string
  estado: string
}

// Función para leer los datos del archivo JSON
export function readData(): Database {
  try {
    const fileContent = fs.readFileSync(DATA_FILE_PATH, 'utf8')
    return JSON.parse(fileContent)
  } catch (error) {
    console.error('Error leyendo el archivo de datos:', error)
    // Retornar estructura vacía si hay error
    return {
      usuarios: [],
      talleres: [],
      grupos: [],
      actividades: [],
      pagos: [],
      inventario: [],
      voluntarios: [],
      inscripciones: []
    }
  }
}

// Función para escribir los datos al archivo JSON
export function writeData(data: Database): void {
  try {
    const jsonString = JSON.stringify(data, null, 2)
    fs.writeFileSync(DATA_FILE_PATH, jsonString, 'utf8')
    console.log('Datos guardados exitosamente')
  } catch (error) {
    console.error('Error escribiendo el archivo de datos:', error)
    throw new Error('Error al guardar los datos')
  }
}

// Función para obtener el siguiente ID disponible
export function getNextId(items: any[]): number {
  if (items.length === 0) return 1
  return Math.max(...items.map(item => item.id)) + 1
}
