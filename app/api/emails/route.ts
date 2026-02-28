import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { to, subject, message, type } = await request.json()

    if (!to || !subject || !message) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
    }

    // TODO: integrar con Resend (ya configurado en el proyecto via RESEND_API_KEY)
    // o con Nodemailer usando SMTP_HOST, SMTP_USER, SMTP_PASS desde variables de entorno.
    // Por ahora el envío de email no está implementado.
    console.log("Email pendiente de envío:", {
      to,
      subject,
      type,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      message: "Email registrado para envío",
      emailId: Math.random().toString(36).substr(2, 9),
    })
  } catch (error) {
    console.error("Error al procesar email:", error)
    return NextResponse.json({ error: "Error al enviar email" }, { status: 500 })
  }
}

export async function GET() {
  try {
    const emailHistory = [
      {
        id: 1,
        to: "maria@email.com",
        subject: "Recordatorio de Pago - Cuota Diciembre",
        type: "recordatorio_pago",
        sent: "2024-12-20T10:00:00Z",
        status: "sent",
      },
      {
        id: 2,
        to: "juan@email.com",
        subject: "Confirmación de Inscripción - Charla sobre Alzheimer",
        type: "confirmacion_inscripcion",
        sent: "2024-12-19T15:30:00Z",
        status: "sent",
      },
      {
        id: 3,
        to: "maria@email.com",
        subject: "Confirmación de Inscripción - Taller de Memoria Básico",
        type: "confirmacion_inscripcion",
        sent: "2024-12-18T09:15:00Z",
        status: "sent",
      },
      {
        id: 4,
        to: "juan@email.com",
        subject: "Nueva Actividad Disponible - Jornada de Estimulación",
        type: "nueva_actividad",
        sent: "2024-12-17T14:20:00Z",
        status: "sent",
      },
    ]

    return NextResponse.json(emailHistory)
  } catch (error) {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 })
  }
}
