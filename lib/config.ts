// Configuración de la aplicación ALMA Platform
// Para usar variables de entorno, crea un archivo .env.local con las siguientes variables:

export const config = {
  // Credenciales de Administrador (env: ADMIN_EMAIL, ADMIN_PASSWORD)
  admin: {
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  },

  // Configuración de la aplicación
  app: {
    name: process.env.NEXT_PUBLIC_APP_NAME || "ALMA Platform",
    version: "2.0.4",
  },
}

/**
 * Valida las credenciales del administrador del entorno.
 * Solo aplica al ADMIN_EMAIL; el resto de usuarios se validan contra la DB.
 * Retorna { valid: true, user } si email y pin coinciden con las vars de entorno.
 */
export function validateAdminCredentials(
  email: string,
  pin: string
): { valid: boolean; user: any | null } {
  if (!config.admin.email || !config.admin.password) {
    return { valid: false, user: null }
  }

  if (email.toLowerCase() !== config.admin.email.toLowerCase()) {
    return { valid: false, user: null }
  }

  // El PIN del admin se compara en texto plano contra ADMIN_PASSWORD del .env
  if (pin !== config.admin.password) {
    return { valid: false, user: null }
  }

  return {
    valid: true,
    user: {
      id: 0,
      name: "Administrador",
      last_name: "",
      email: config.admin.email,
      role: "admin",
      photo: null,
      phone: null,
      gender: null,
      age: null,
      status: "activo",
      specialties: [],
      registration_date: "",
      is_admin: true,
      enrollments: { workshops: [], groups: [], activities: [] },
    },
  }
}
