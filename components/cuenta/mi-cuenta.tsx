"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UserCircle, Bell } from "lucide-react"
import MisDatos from "@/components/participantes/mis-datos"
import MisDatosVoluntario from "@/components/voluntarios/mis-datos-voluntario"
import PushToggle from "@/components/notifications/push-toggle"

/**
 * "Mi cuenta" — paraguas de datos personales + preferencias del usuario.
 * Sub-pestañas sutiles para ir sumando secciones (perfil, notificaciones, …).
 */
export default function MiCuenta({ user }: { user: any }) {
  const [tab, setTab] = useState("perfil")
  const isParticipant = user?.role === "participante"

  const subTabClass =
    "flex items-center gap-2 transition-all duration-200 active:scale-95 " +
    "data-[state=inactive]:hover:bg-[#4dd0e1]/10 data-[state=inactive]:hover:text-[#00838f] " +
    "data-[state=active]:bg-[#4dd0e1]/15 data-[state=active]:text-[#4dd0e1] data-[state=active]:font-semibold"

  return (
    <Tabs value={tab} onValueChange={setTab} className="space-y-4">
      <TabsList className="bg-white border border-gray-200 p-1 rounded-lg w-auto">
        <TabsTrigger value="perfil" className={subTabClass}>
          <UserCircle className="w-4 h-4 shrink-0" />
          <span>Perfil</span>
        </TabsTrigger>
        <TabsTrigger value="notificaciones" className={subTabClass}>
          <Bell className="w-4 h-4 shrink-0" />
          <span>Notificaciones</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="perfil">
        {isParticipant ? <MisDatos user={user} /> : <MisDatosVoluntario user={user} />}
      </TabsContent>
      <TabsContent value="notificaciones">
        <PushToggle />
      </TabsContent>
    </Tabs>
  )
}
