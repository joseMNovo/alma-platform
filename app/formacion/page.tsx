import { redirect } from "next/navigation"

/** La vidriera se unificó en /academia. Queda el redirect para que lo que se
 *  haya compartido con la ruta vieja siga funcionando. */
export default function FormacionRedirect() {
  redirect("/academia")
}
