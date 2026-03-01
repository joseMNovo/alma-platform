"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Heart } from "lucide-react"

interface ProfileCompletionModalProps {
  user: { role: string }
}

export default function ProfileCompletionModal({ user }: ProfileCompletionModalProps) {
  const [open, setOpen] = useState(false)
  const [registrationRole, setRegistrationRole] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const flag = localStorage.getItem("alma_new_registration")
    if (flag) {
      setRegistrationRole(flag)
      setOpen(true)
    }
  }, [])

  const handleClose = () => {
    localStorage.removeItem("alma_new_registration")
    setOpen(false)
  }

  const handleCompleteProfile = () => {
    localStorage.removeItem("alma_new_registration")
    setOpen(false)
    if (registrationRole === "participante") {
      router.push("/mis-datos")
    } else {
      router.push("/voluntarios?editSelf=true")
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) handleClose() }}>
      <DialogContent className="sm:max-w-md mx-4 sm:mx-0">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Heart className="w-6 h-6 text-[#4dd0e1]" />
            ¡Bienvenido/a a ALMA!
          </DialogTitle>
          <DialogDescription className="text-gray-600 text-sm leading-relaxed pt-2">
            Tu cuenta fue creada exitosamente. Para aprovechar mejor la plataforma, te recomendamos completar tu perfil.
            ¡Podés hacerlo cuando quieras!
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button
            variant="outline"
            onClick={handleClose}
            className="w-full sm:w-auto border-gray-300 text-gray-600 hover:bg-gray-50"
          >
            Hacerlo después
          </Button>
          <Button
            onClick={handleCompleteProfile}
            className="w-full sm:w-auto bg-[#0099b0] hover:bg-[#007a8e] text-white"
          >
            Completar perfil
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
