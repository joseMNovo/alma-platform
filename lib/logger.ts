/**
 * lib/logger.ts — ALMA Platform — Logger central (winston)
 * =========================================================
 * Uso:  import { logInfo, logWarn, logError } from '@/lib/logger'
 *
 * Formato: timestamp | LEVEL | user=X | module=Y | action=Z | message=... | meta={...}
 *
 * Dev  → logs/dev/app.log  + consola colorizada
 * Prod → logs/prod/app.log + consola sin color
 */

import winston from 'winston'
import path from 'path'
import fs from 'fs'

const isDev = (process.env.NODE_ENV || 'development') !== 'production'
const logDir = path.join(process.cwd(), 'logs', isDev ? 'dev' : 'prod')

// Crear carpeta de logs si no existe
try {
  fs.mkdirSync(logDir, { recursive: true })
} catch {
  // ignorar si ya existe o hay error de permisos
}

// ── Formato de archivo ──────────────────────────────────────────────────────
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.printf(({ level, message, timestamp, user, module: mod, action, meta }) => {
    const levelStr = String(level).toUpperCase().padEnd(5)
    const userPart = user != null ? `user=${user}` : 'user=anonymous'
    const modulePart = mod ? ` | module=${mod}` : ''
    const actionPart = action ? ` | action=${action}` : ''
    const metaPart = meta ? ` | meta=${JSON.stringify(meta)}` : ''
    return `${timestamp} | ${levelStr} | ${userPart}${modulePart}${actionPart} | message=${message}${metaPart}`
  })
)

// ── Formato de consola ──────────────────────────────────────────────────────
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss.SSS' }),
  winston.format.printf(({ level, message, timestamp, user, module: mod, action, meta }) => {
    const userPart = user != null ? `user=${user}` : 'user=anonymous'
    const parts: string[] = [String(timestamp), level, userPart]
    if (mod) parts.push(`module=${mod}`)
    if (action) parts.push(`action=${action}`)
    parts.push(String(message))
    if (meta) parts.push(JSON.stringify(meta))
    return parts.join(' | ')
  })
)

// ── Logger de winston ───────────────────────────────────────────────────────
const winstonLogger = winston.createLogger({
  level: isDev ? 'debug' : 'info',
  transports: [
    new winston.transports.Console({ format: consoleFormat }),
    new winston.transports.File({
      filename: path.join(logDir, 'app.log'),
      format: fileFormat,
      maxsize: 10 * 1024 * 1024, // 10 MB por archivo
      maxFiles: 5,
      tailable: true,
    }),
  ],
})

// ── Contexto de log ─────────────────────────────────────────────────────────
export interface LogContext {
  /** ID de usuario autenticado (o null/undefined para anonymous) */
  user?: number | string | null
  /** Módulo de negocio (auth, calendar, grupos, etc.) */
  module?: string
  /** Acción específica (login_success, create_group, etc.) */
  action?: string
  /** Metadata adicional (NO incluir passwords ni tokens completos) */
  meta?: Record<string, any>
}

// ── Helpers de logging ──────────────────────────────────────────────────────

export function logInfo(message: string, ctx: LogContext = {}): void {
  winstonLogger.info(message, ctx)
}

export function logWarn(message: string, ctx: LogContext = {}): void {
  winstonLogger.warn(message, ctx)
}

export function logError(message: string, ctx: LogContext & { error?: any } = {}): void {
  const { error, ...rest } = ctx
  let meta = rest.meta || {}
  if (error) {
    meta = {
      ...meta,
      error: error?.message || String(error),
      ...(isDev && error?.stack ? { stack: error.stack } : {}),
    }
  }
  winstonLogger.error(message, { ...rest, meta: Object.keys(meta).length ? meta : undefined })
}

export function logDebug(message: string, ctx: LogContext = {}): void {
  winstonLogger.debug(message, ctx)
}

export default winstonLogger
