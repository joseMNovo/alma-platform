import { Resend } from "resend"
import { emailVerificationTemplate } from "@/lib/templates/emailVerification.template"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendVerificationEmail(
  to: string,
  verifyUrl: string
): Promise<void> {
  const from = process.env.MAIL_FROM ?? "noreply@alma.rosario.org"

  const { error } = await resend.emails.send({
    from,
    to,
    subject: "Verificá tu cuenta — ALMA Rosario",
    html: emailVerificationTemplate(verifyUrl),
  })

  if (error) {
    throw new Error(`Resend error: ${error.message}`)
  }
}
