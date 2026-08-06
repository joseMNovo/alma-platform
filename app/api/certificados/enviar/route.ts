import { type NextRequest, NextResponse } from "next/server"
import { api } from "@/lib/api-client"
import { markCertificateSent } from "@/lib/data-manager"
import { getSessionUser } from "@/lib/serverAuth"
import { can } from "@/lib/permissions"
import { config } from "@/lib/config"
import { logInfo, logWarn, logError } from "@/lib/logger"

/**
 * POST /api/certificados/enviar — manda los certificados por mail.
 *
 * Usa el envío REAL del backend (`POST /emails/send`, que pasa por Resend).
 * NO usa `/api/emails`, que es un cascarón que loguea y devuelve éxito sin
 * mandar nada: desde acá eso sería peor que un error, porque quedaría todo
 * marcado como enviado sin que nadie reciba un mail.
 *
 * Se manda un LINK, no un adjunto: el PDF se arma en el momento desde el
 * texto congelado, así el mail nunca lleva una versión vieja, no llena
 * casillas y se abre igual desde el celular.
 *
 * Se marca como enviado UNO POR UNO y solo después de que el mail salió: si
 * se marcara antes, un fallo de Resend dejaría gente como "ya avisada" sin
 * que le haya llegado nada.
 */
export async function POST(request: NextRequest) {
  const session = getSessionUser(request)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!can(session, "capacitaciones:manage")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  try {
    const { destinatarios } = await request.json()
    if (!Array.isArray(destinatarios) || !destinatarios.length) {
      return NextResponse.json({ error: "No hay a quién mandarle" }, { status: 422 })
    }

    const base = process.env.APP_BASE_URL || new URL(request.url).origin
    let enviados = 0
    const fallaron: string[] = []

    for (const persona of destinatarios) {
      const { code, email, name, training_title } = persona ?? {}
      if (!code || !email) {
        fallaron.push(email || code || "sin datos")
        continue
      }

      const link = `${base}/certificado/${code}`
      const saludo = (name || "").trim()

      try {
        await api.post("/emails/send", {
          to: [email],
          subject: `Tu certificado de ${training_title || "la capacitación"}`,
          body:
            `<p>¡Hola${saludo ? ` ${saludo}` : ""}!</p>` +
            `<p>Ya está listo tu certificado de <strong>${training_title || "la capacitación"}</strong>. ` +
            `Podés verlo y descargarlo desde acá:</p>` +
            `<p><a href="${link}">${link}</a></p>` +
            `<p>Ese mismo link le sirve a cualquiera para verificar que el certificado es auténtico, ` +
            `así que podés compartirlo con tranquilidad.</p>` +
            `<p>Gracias por acompañarnos.</p>` +
            `<p>Equipo de ALMA Rosario · ${config.contact.email}</p>`,
          sent_by_volunteer_id: session.id || null,
        })

        await markCertificateSent(code)
        enviados += 1
      } catch (error) {
        fallaron.push(email)
        logWarn("No se pudo enviar un certificado", {
          module: "certificados", action: "enviar", user: session.id,
          meta: { code, email },
        })
      }
    }

    logInfo("Certificados enviados", {
      module: "certificados", action: "enviar", user: session.id,
      meta: { pedidos: destinatarios.length, enviados, fallaron: fallaron.length },
    })
    return NextResponse.json({ enviados, fallaron })
  } catch (error) {
    logError("Error al enviar certificados", {
      module: "certificados", action: "enviar", user: session.id, error,
    })
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
