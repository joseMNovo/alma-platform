/**
 * La cola de ventas del puesto.
 *
 * El problema que resuelve: en una feria la señal es mala, y hoy cada venta es
 * un POST. Si falla, la venta se pierde — pero la plata ya se cobró en la
 * mano. Queda un desfasaje que alguien tiene que reconstruir de memoria.
 *
 * La regla de acá: **toda venta se escribe primero en el teléfono.** Mandarla
 * al servidor es un intento posterior. Con eso, "modo offline" deja de cambiar
 * a dónde van los datos y pasa a ser puramente cosmético — un color y un
 * contador. Un modo que no cambia el camino del dato no se puede
 * desincronizar ni perder nada.
 *
 * ── Por qué localStorage y no IndexedDB ───────────────────────────────
 *
 * Una venta guardada ocupa unos 350 bytes. Doscientas son 70 KB, contra los
 * 5 MB que da localStorage: no hay escenario realista donde se llene.
 *
 * Y gana en lo que importa acá: es SÍNCRONO. Guardar la venta pasa dentro del
 * mismo click que la cobra, sin un await en el medio donde la app pueda
 * cerrarse o el teléfono matarla. IndexedDB daría más espacio del que hace
 * falta a cambio de una carrera en el camino más caliente del sistema.
 *
 * Si algún día esto guarda fotos o cientos de miles de ventas, se cambia. Hoy
 * sería elegir el problema equivocado.
 */

const CLAVE = "alma_venta_cola"

/** Tope de seguridad. No es el límite de localStorage —está lejísimos— sino
 *  una red por si algo escribe en loop: mejor cortar que llenar el teléfono. */
const TOPE = 500

export type EstadoVenta = "pendiente" | "rechazada"

export interface ItemCola {
  product_id: number
  quantity: number
  /** Solo para mostrarlo sin tener el catálogo a mano. El precio que vale es
   *  el de la base: el backend lo recalcula y nunca usa este. */
  product_name?: string
  unit_price?: number
}

export interface VentaEnCola {
  /** Lo genera el TELÉFONO antes de mandar nada. Es lo que hace que la misma
   *  venta no entre dos veces, venga por reintento o por archivo importado. */
  client_uuid: string
  occurred_at: string
  payment_method: "efectivo" | "transferencia"
  items: ItemCola[]
  customer_name?: string | null
  customer_email?: string | null
  /** Para mostrarlo en la tira mientras no está confirmado por el servidor. */
  total: number
  estado: EstadoVenta
  /** Por qué el servidor la rechazó. Solo en estado "rechazada". */
  motivo?: string
}

/** Identificador único. `crypto.randomUUID` no existe en contextos no seguros
 *  ni en navegadores viejos, así que hay una vuelta de respaldo. */
export function nuevoUuid(): string {
  const c = globalThis.crypto as Crypto | undefined
  if (c?.randomUUID) return c.randomUUID()
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0
    return (ch === "x" ? r : (r & 0x3) | 0x8).toString(16)
  })
}

/**
 * Todo lo que hay guardado.
 *
 * Nunca tira: si el contenido quedó corrupto devuelve una lista vacía en vez
 * de romper la pantalla. Una caja que no abre es peor que una caja sin
 * historial.
 */
export function leer(): VentaEnCola[] {
  try {
    const crudo = localStorage.getItem(CLAVE)
    const datos = crudo ? JSON.parse(crudo) : []
    return Array.isArray(datos) ? datos : []
  } catch {
    return []
  }
}

function escribir(ventas: VentaEnCola[]) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(ventas.slice(0, TOPE)))
  } catch {
    // Sin espacio o almacenamiento bloqueado. No hay nada sensato que hacer
    // acá: quien llama se entera porque la venta no aparece en la tira.
  }
}

/** Guarda una venta nueva. Devuelve la fila, ya con su identificador. */
export function encolar(v: Omit<VentaEnCola, "client_uuid" | "occurred_at" | "estado">): VentaEnCola {
  const fila: VentaEnCola = {
    ...v,
    client_uuid: nuevoUuid(),
    occurred_at: new Date().toISOString(),
    estado: "pendiente",
  }
  escribir([fila, ...leer()])
  return fila
}

/** Saca una venta de la cola. Se usa al anular algo que todavía no se mandó:
 *  no tiene sentido crear una venta anulada en el servidor por algo que nunca
 *  llegó a existir ahí. */
export function quitar(uuid: string) {
  escribir(leer().filter((v) => v.client_uuid !== uuid))
}

export function quitarVarias(uuids: string[]) {
  const fuera = new Set(uuids)
  escribir(leer().filter((v) => !fuera.has(v.client_uuid)))
}

/** Aparta una venta que el servidor rechazó de verdad (no por red).
 *  Deja de reintentarse sola: si falló por el contenido, va a fallar siempre. */
export function marcarRechazada(uuid: string, motivo: string) {
  escribir(leer().map((v) => (v.client_uuid === uuid ? { ...v, estado: "rechazada", motivo } : v)))
}

/** Las que todavía vale la pena intentar. */
export function pendientes(): VentaEnCola[] {
  return leer().filter((v) => v.estado === "pendiente")
}

export function rechazadas(): VentaEnCola[] {
  return leer().filter((v) => v.estado === "rechazada")
}

/** Vuelve a poner en cola las apartadas, para cuando el admin arregló lo que
 *  faltaba (un producto borrado, por ejemplo). */
export function reintentarRechazadas() {
  escribir(leer().map((v) => (v.estado === "rechazada" ? { ...v, estado: "pendiente", motivo: undefined } : v)))
}

export interface ResultadoEnvio {
  creadas: number
  repetidas: number
  rechazadas: { client_uuid: string | null; motivo: string }[]
}

/**
 * Manda lo pendiente al servidor.
 *
 * Todo el lote en UN pedido, no una venta por vez: con señal mala, un pedido
 * que llega completo vale más que seis que llegan a medias. Y como el
 * endpoint es idempotente, si se corta justo cuando el servidor ya lo
 * procesó, el reintento no duplica nada.
 *
 * Distingue las dos fallas, que se tratan distinto:
 *   · se cayó la red  → no se toca nada, se reintenta más tarde (lanza)
 *   · la rechazó el servidor → se aparta esa venta y las demás siguen
 */
export async function enviarPendientes(): Promise<ResultadoEnvio | null> {
  const lote = pendientes()
  if (lote.length === 0) return null

  const res = await fetch("/api/stand/ventas/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(lote.map(({ estado, motivo, total, ...v }) => v)),
  })
  if (!res.ok) throw new Error(`El servidor contestó ${res.status}`)

  const r: ResultadoEnvio = await res.json()

  // Las que entraron y las que ya estaban salen de la cola. Las rechazadas se
  // quedan, apartadas y con el motivo a la vista.
  const problemas = new Set((r.rechazadas ?? []).map((x) => x.client_uuid))
  quitarVarias(lote.filter((v) => !problemas.has(v.client_uuid)).map((v) => v.client_uuid))
  for (const x of r.rechazadas ?? []) {
    if (x.client_uuid) marcarRechazada(x.client_uuid, x.motivo)
  }
  return r
}

/**
 * El archivo para mandar por WhatsApp o mail.
 *
 * Es la salida de emergencia: no depende de que ese teléfono se vuelva a
 * conectar NUNCA. Si se rompe, se pierde o la persona se va de viaje con las
 * ventas adentro, el archivo las trae igual.
 *
 * Va con `client_uuid`, así que se puede importar y además dejar que el
 * teléfono sincronice solo cuando recupere señal: la caja no se duplica.
 */
export function armarExportacion(): { nombre: string; json: string } {
  const ventas = leer()
  const hoy = new Date().toISOString().slice(0, 10)
  return {
    nombre: `ventas-puesto-${hoy}.json`,
    json: JSON.stringify(
      {
        version: 1,
        generado: new Date().toISOString(),
        ventas: ventas.map(({ estado, motivo, ...v }) => v),
      },
      null,
      2,
    ),
  }
}
