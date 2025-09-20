/**
 * Módulo para manejar las peticiones a la API
 */

const API_URL = "http://localhost:5000/api"

// Clase para manejar las peticiones a la API
class API {
  // Método para hacer peticiones GET
  static async get(endpoint) {
    try {
      const response = await fetch(`${API_URL}${endpoint}`)

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error("Error en GET:", error)
      throw error
    }
  }

  // Método para hacer peticiones POST
  static async post(endpoint, data) {
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error("Error en POST:", error)
      throw error
    }
  }

  // Método para hacer peticiones PUT
  static async put(endpoint, data) {
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error("Error en PUT:", error)
      throw error
    }
  }

  // Método para hacer peticiones DELETE
  static async delete(endpoint) {
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error("Error en DELETE:", error)
      throw error
    }
  }
}

// Módulos específicos para cada entidad
const AuthAPI = {
  login: async (email, password) => {
    try {
      return await API.post("/auth/login", { email, password })
    } catch (error) {
      throw error
    }
  },

  getUsers: async () => {
    try {
      return await API.get("/auth/users")
    } catch (error) {
      throw error
    }
  },
}

const TalleresAPI = {
  getAll: async () => {
    try {
      return await API.get("/talleres")
    } catch (error) {
      throw error
    }
  },

  getById: async (id) => {
    try {
      return await API.get(`/talleres/${id}`)
    } catch (error) {
      throw error
    }
  },

  create: async (data) => {
    try {
      return await API.post("/talleres", data)
    } catch (error) {
      throw error
    }
  },

  update: async (id, data) => {
    try {
      return await API.put(`/talleres/${id}`, data)
    } catch (error) {
      throw error
    }
  },

  delete: async (id) => {
    try {
      return await API.delete(`/talleres/${id}`)
    } catch (error) {
      throw error
    }
  },

  inscribir: async (tallerId, usuarioId) => {
    try {
      return await API.post("/talleres/inscripcion", { tallerId, usuarioId })
    } catch (error) {
      throw error
    }
  },
}

const GruposAPI = {
  getAll: async () => {
    try {
      return await API.get("/grupos")
    } catch (error) {
      throw error
    }
  },

  getById: async (id) => {
    try {
      return await API.get(`/grupos/${id}`)
    } catch (error) {
      throw error
    }
  },

  create: async (data) => {
    try {
      return await API.post("/grupos", data)
    } catch (error) {
      throw error
    }
  },

  update: async (id, data) => {
    try {
      return await API.put(`/grupos/${id}`, data)
    } catch (error) {
      throw error
    }
  },

  delete: async (id) => {
    try {
      return await API.delete(`/grupos/${id}`)
    } catch (error) {
      throw error
    }
  },

  inscribir: async (grupoId, usuarioId) => {
    try {
      return await API.post("/grupos/inscripcion", { grupoId, usuarioId })
    } catch (error) {
      throw error
    }
  },
}

const ActividadesAPI = {
  getAll: async () => {
    try {
      return await API.get("/actividades")
    } catch (error) {
      throw error
    }
  },

  getById: async (id) => {
    try {
      return await API.get(`/actividades/${id}`)
    } catch (error) {
      throw error
    }
  },

  create: async (data) => {
    try {
      return await API.post("/actividades", data)
    } catch (error) {
      throw error
    }
  },

  update: async (id, data) => {
    try {
      return await API.put(`/actividades/${id}`, data)
    } catch (error) {
      throw error
    }
  },

  delete: async (id) => {
    try {
      return await API.delete(`/actividades/${id}`)
    } catch (error) {
      throw error
    }
  },

  inscribir: async (actividadId, usuarioId) => {
    try {
      return await API.post("/actividades/inscripcion", { actividadId, usuarioId })
    } catch (error) {
      throw error
    }
  },
}

const PagosAPI = {
  getAll: async () => {
    try {
      return await API.get("/pagos")
    } catch (error) {
      throw error
    }
  },

  getById: async (id) => {
    try {
      return await API.get(`/pagos/${id}`)
    } catch (error) {
      throw error
    }
  },

  create: async (data) => {
    try {
      return await API.post("/pagos", data)
    } catch (error) {
      throw error
    }
  },

  update: async (id, data) => {
    try {
      return await API.put(`/pagos/${id}`, data)
    } catch (error) {
      throw error
    }
  },

  delete: async (id) => {
    try {
      return await API.delete(`/pagos/${id}`)
    } catch (error) {
      throw error
    }
  },

  marcarPagado: async (id, metodoPago) => {
    try {
      return await API.put(`/pagos/${id}/pagar`, { metodoPago })
    } catch (error) {
      throw error
    }
  },
}

const InventarioAPI = {
  getAll: async () => {
    try {
      return await API.get("/inventario")
    } catch (error) {
      throw error
    }
  },

  getById: async (id) => {
    try {
      return await API.get(`/inventario/${id}`)
    } catch (error) {
      throw error
    }
  },

  create: async (data) => {
    try {
      return await API.post("/inventario", data)
    } catch (error) {
      throw error
    }
  },

  update: async (id, data) => {
    try {
      return await API.put(`/inventario/${id}`, data)
    } catch (error) {
      throw error
    }
  },

  delete: async (id) => {
    try {
      return await API.delete(`/inventario/${id}`)
    } catch (error) {
      throw error
    }
  },

  actualizarStock: async (id, cantidad) => {
    try {
      return await API.put(`/inventario/${id}/stock`, { cantidad })
    } catch (error) {
      throw error
    }
  },
}

const EmailsAPI = {
  getAll: async () => {
    try {
      return await API.get("/emails")
    } catch (error) {
      throw error
    }
  },

  send: async (data) => {
    try {
      return await API.post("/emails/send", data)
    } catch (error) {
      throw error
    }
  },
}

const ReportesAPI = {
  getResumen: async () => {
    try {
      return await API.get("/reportes/resumen")
    } catch (error) {
      throw error
    }
  },

  getFinanciero: async (periodo) => {
    try {
      return await API.get(`/reportes/financiero?periodo=${periodo}`)
    } catch (error) {
      throw error
    }
  },

  getActividades: async (periodo) => {
    try {
      return await API.get(`/reportes/actividades?periodo=${periodo}`)
    } catch (error) {
      throw error
    }
  },

  getInventario: async () => {
    try {
      return await API.get("/reportes/inventario")
    } catch (error) {
      throw error
    }
  },

  exportar: async (tipo, formato) => {
    try {
      return await API.get(`/reportes/exportar?tipo=${tipo}&formato=${formato}`)
    } catch (error) {
      throw error
    }
  },
}

const ConfiguracionAPI = {
  get: async () => {
    try {
      return await API.get("/configuracion")
    } catch (error) {
      throw error
    }
  },

  update: async (data) => {
    try {
      return await API.put("/configuracion", data)
    } catch (error) {
      throw error
    }
  },

  testEmail: async (email) => {
    try {
      return await API.post("/configuracion/test-email", { email })
    } catch (error) {
      throw error
    }
  },
}
