import { type NextRequest, NextResponse } from "next/server"

// Configuración hardcodeada del servidor de email
const EMAIL_CONFIG = {
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: "alma.rosario@gmail.com",
    pass: "alma_password_2024",
  },
}

export async function POST(request: NextRequest) {
  try {
    const { to, subject, message, type } = await request.json()

    // Simulación de envío de email con configuración hardcodeada
    console.log("Configuración de email:", EMAIL_CONFIG)
    console.log("Enviando email:", {
      from: EMAIL_CONFIG.auth.user,
      to,
      subject,
      message,
      type,
      timestamp: new Date().toISOString(),
    })

    // Simular delay de envío
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Aquí se integraría con un servicio real de email como SendGrid, Nodemailer, etc.
    // Ejemplo con Nodemailer:
    /*
    const nodemailer = require('nodemailer');
    
    const transporter = nodemailer.createTransporter({
      host: EMAIL_CONFIG.host,
      port: EMAIL_CONFIG.port,
      secure: EMAIL_CONFIG.secure,
      auth: EMAIL_CONFIG.auth
    });

    await transporter.sendMail({
      from: EMAIL_CONFIG.auth.user,
      to: to,
      subject: subject,
      text: message,
      html: message.replace(/\n/g, '<br>')
    });
    */

    return NextResponse.json({
      success: true,
      message: "Email enviado correctamente",
      emailId: Math.random().toString(36).substr(2, 9),
      config: {
        server: EMAIL_CONFIG.host,
        from: EMAIL_CONFIG.auth.user,
      },
    })
  } catch (error) {
    console.error("Error al enviar email:", error)
    return NextResponse.json({ error: "Error al enviar email" }, { status: 500 })
  }
}

export async function GET() {
  try {
    // Simulación de historial de emails enviados con más datos
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
