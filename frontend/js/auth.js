/**
 * Módulo para manejar la autenticación
 */

// Función para crear elementos HTML
function createElement(tag, attributes, textContent) {
  const element = document.createElement(tag)
  for (const key in attributes) {
    element.setAttribute(key, attributes[key])
  }
  if (textContent) {
    element.textContent = textContent
  }
  return element
}

// Clase para manejar la autenticación
class Auth {
  constructor() {
    this.user = null
    this.isAuthenticated = false
    this.listeners = []

    // Cargar usuario desde localStorage
    this.loadUser()
  }

  // Cargar usuario desde localStorage
  loadUser() {
    const userData = localStorage.getItem("alma_user")
    if (userData) {
      try {
        this.user = JSON.parse(userData)
        this.isAuthenticated = true
        this.notifyListeners()
      } catch (error) {
        console.error("Error al cargar usuario:", error)
        this.logout()
      }
    }
  }

  // Iniciar sesión
  async login(email, password) {
    try {
      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al iniciar sesión")
      }

      const data = await response.json()
      this.user = data.user
      this.isAuthenticated = true

      // Guardar en localStorage
      localStorage.setItem("alma_user", JSON.stringify(this.user))

      // Notificar a los listeners
      this.notifyListeners()

      return this.user
    } catch (error) {
      console.error("Error en login:", error)
      throw error
    }
  }

  // Cerrar sesión
  logout() {
    this.user = null
    this.isAuthenticated = false
    localStorage.removeItem("alma_user")

    // Notificar a los listeners
    this.notifyListeners()
  }

  // Verificar si el usuario está autenticado
  isUserAuthenticated() {
    return this.isAuthenticated
  }

  // Obtener usuario actual
  getCurrentUser() {
    return this.user
  }

  // Verificar si el usuario es administrador
  isAdmin() {
    return this.user && this.user.rol === "admin"
  }

  // Agregar listener para cambios de autenticación
  addAuthListener(listener) {
    this.listeners.push(listener)
  }

  // Eliminar listener
  removeAuthListener(listener) {
    this.listeners = this.listeners.filter((l) => l !== listener)
  }

  // Notificar a los listeners
  notifyListeners() {
    this.listeners.forEach((listener) => {
      listener(this.isAuthenticated, this.user)
    })
  }
}

// Instancia única de Auth
const auth = new Auth()

// Componente de formulario de login
function renderLoginForm(container) {
  // Limpiar contenedor
  container.innerHTML = ""

  // Crear estructura del login
  const loginContainer = createElement("div", { className: "login-container" })

  const loginCard = createElement("div", { className: "login-card" })

  const loginHeader = createElement("div", { className: "login-header" })
  const logoDiv = createElement("div", { className: "login-logo" })
  const logoImg = createElement("img", { src: "images/alma-logo.png", alt: "ALMA - Alzheimer Rosario" })
  logoDiv.appendChild(logoImg)

  const loginTitle = createElement("h1", { className: "login-title" }, "Bienvenido")
  const loginDescription = createElement(
    "p",
    { className: "login-description" },
    "Ingresa tus credenciales para acceder a la plataforma",
  )

  loginHeader.appendChild(logoDiv)
  loginHeader.appendChild(loginTitle)
  loginHeader.appendChild(loginDescription)

  const loginForm = createElement("form", { className: "login-form" })

  // Campo de email
  const emailGroup = createElement("div", { className: "form-group" })
  const emailLabel = createElement("label", { className: "form-label", for: "email" }, "Email")
  const emailInput = createElement("input", {
    type: "email",
    id: "email",
    name: "email",
    className: "form-control",
    placeholder: "tu@email.com",
    required: true,
  })
  emailGroup.appendChild(emailLabel)
  emailGroup.appendChild(emailInput)

  // Campo de contraseña
  const passwordGroup = createElement("div", { className: "form-group" })
  const passwordLabel = createElement("label", { className: "form-label", for: "password" }, "Contraseña")
  const passwordInput = createElement("input", {
    type: "password",
    id: "password",
    name: "password",
    className: "form-control",
    placeholder: "••••••••",
    required: true,
  })
  passwordGroup.appendChild(passwordLabel)
  passwordGroup.appendChild(passwordInput)

  // Contenedor para mensajes de error
  const errorContainer = createElement("div", { className: "alert alert-danger", style: "display: none;" })

  // Botón de login
  const submitButton = createElement(
    "button",
    {
      type: "submit",
      className: "btn btn-primary w-full",
      id: "login-button",
    },
    "Iniciar Sesión",
  )

  loginForm.appendChild(emailGroup)
  loginForm.appendChild(passwordGroup)
  loginForm.appendChild(errorContainer)
  loginForm.appendChild(submitButton)

  // Footer con credenciales de prueba
  const loginFooter = createElement("div", { className: "login-footer" })
  loginFooter.innerHTML = `
        <p>Credenciales de prueba:</p>
        <p><strong>Admin:</strong> admin@alma.com / admin123</p>
        <p><strong>Usuario:</strong> maria@email.com / user123</p>
    `

  loginCard.appendChild(loginHeader)
  loginCard.appendChild(loginForm)
  loginCard.appendChild(loginFooter)

  loginContainer.appendChild(loginCard)
  container.appendChild(loginContainer)

  // Manejar envío del formulario
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault()

    const email = emailInput.value
    const password = passwordInput.value

    // Cambiar estado del botón
    submitButton.disabled = true
    submitButton.innerHTML = "Iniciando sesión..."
    errorContainer.style.display = "none"

    try {
      await auth.login(email, password)
      // El listener se encargará de actualizar la UI
    } catch (error) {
      errorContainer.textContent = error.message || "Error al iniciar sesión"
      errorContainer.style.display = "block"

      // Restaurar botón
      submitButton.disabled = false
      submitButton.innerHTML = "Iniciar Sesión"
    }
  })
}
