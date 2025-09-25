// Configuración de la aplicación ALMA Platform
// Para usar variables de entorno, crea un archivo .env.local con las siguientes variables:

export const config = {
  // Credenciales de Administrador
  admin: {
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD
  },
  
  // Credenciales de José (Usuario especial con acceso a Ajustes)
  jose: {
    email: process.env.JOSE_EMAIL, 
    password: process.env.JOSE_PASSWORD
  },
  
  // Configuración de la aplicación
  app: {
    name: process.env.NEXT_PUBLIC_APP_NAME || "ALMA Platform",
    version: process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0"
  }
}

// Función para validar credenciales (solo email)
export function validateCredentials(email: string, password: string) {
  // Validar administrador (solo email)
  if (email === config.admin.email) {
    return {
      valid: true,
      user: {
        id: 1,
        nombre: "Administrador",
        email: config.admin.email,
        rol: "admin"
      }
    }
  }
  
  // Validar José (solo email)
  if (email === config.jose.email) {
    return {
      valid: true,
      user: {
        id: 2,
        nombre: "José",
        email: config.jose.email,
        rol: "admin"
      }
    }
  }
  
  return { valid: false, user: null }
}
