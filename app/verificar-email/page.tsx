"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { CheckCircle2, Clock, XCircle, Loader2 } from "lucide-react"
import AlmaFooter from "@/components/ui/alma-footer"
import { Suspense } from "react"

function VerificarEmailContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("token") ?? ""
  const type = searchParams.get("type") ?? ""

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    if (!token || !type) { setStatus("error"); return }

    const endpoint = type === "volunteer"
      ? "/api/voluntarios/verify-email"
      : "/api/participantes/verify-email"

    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((res) => {
        if (res.ok) setStatus("success")
        else setStatus("error")
      })
      .catch(() => setStatus("error"))
  }, [token, type])

  // Redirect participante al login después de 5 segundos
  useEffect(() => {
    if (status !== "success" || type !== "participant") return
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(interval); router.push("/") }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [status, type, router])

  return (
    <div
      className="min-h-screen flex flex-col bg-gradient-to-br from-[#4dd0e1] to-[#9a8bc2] relative overflow-hidden"
      style={{ fontFamily: "'Gotham Rounded', system-ui, sans-serif" }}
    >
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <img src="/images/alma_blanco.png" alt="ALMA" className="h-16 object-contain mx-auto" />
          </div>

          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center border border-[#b2ebf2] space-y-4">
            {status === "loading" && (
              <>
                <Loader2 className="w-12 h-12 text-[#4dd0e1] mx-auto animate-spin" />
                <h2 className="text-xl font-bold text-gray-800">Verificando tu email...</h2>
              </>
            )}

            {status === "error" && (
              <>
                <XCircle className="w-12 h-12 text-red-400 mx-auto" />
                <h2 className="text-xl font-bold text-gray-800">Link inválido o expirado</h2>
                <p className="text-gray-600 text-sm">
                  El link de verificación no es válido o ya fue utilizado. Intentá registrarte nuevamente.
                </p>
                <a
                  href="/registro"
                  className="block w-full bg-[#0099b0] hover:bg-[#007a8e] text-white font-semibold py-2.5 px-4 rounded-lg transition-all text-center shadow-md"
                >
                  Volver al registro
                </a>
              </>
            )}

            {status === "success" && type === "volunteer" && (
              <>
                <Clock className="w-12 h-12 text-[#9a8bc2] mx-auto" />
                <h2 className="text-xl font-bold text-gray-800">¡Email verificado!</h2>
                <p className="text-gray-600 text-sm">
                  Tu cuenta está pendiente de aprobación por el equipo de ALMA. Cuando sea aprobada, vas a recibir un email de confirmación para poder ingresar.
                </p>
                <div className="bg-[#f5f3ff] rounded-xl p-4 text-[#7c3aed] text-sm">
                  Mientras tanto, podés cerrar esta pestaña.
                </div>
              </>
            )}

            {status === "success" && type === "participant" && (
              <>
                <CheckCircle2 className="w-12 h-12 text-[#0099b0] mx-auto" />
                <h2 className="text-xl font-bold text-gray-800">¡Email verificado!</h2>
                <p className="text-gray-600 text-sm">
                  Tu cuenta está activa. Ya podés iniciar sesión.
                </p>
                <p className="text-gray-400 text-sm">
                  Redirigiendo en <span className="font-bold text-[#0099b0]">{countdown}</span> segundos...
                </p>
                <a
                  href="/"
                  className="block w-full bg-[#0099b0] hover:bg-[#007a8e] text-white font-semibold py-2.5 px-4 rounded-lg transition-all text-center shadow-md"
                >
                  Ir al inicio de sesión
                </a>
              </>
            )}
          </div>
        </div>
      </div>
      <AlmaFooter floating />
    </div>
  )
}

export default function VerificarEmailPage() {
  return (
    <Suspense>
      <VerificarEmailContent />
    </Suspense>
  )
}
