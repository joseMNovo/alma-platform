/**
 * Utilidades generales para la aplicación
 */

// Formatear fecha a formato local
function formatDate(dateString) {
  if (!dateString) return ""
  const date = new Date(dateString)
  return date.toLocaleDateString("es-ES")
}

// Formatear moneda
function formatCurrency(amount) {
  return "$" + Number.parseFloat(amount).toLocaleString("es-AR")
}

// Crear elemento HTML con atributos y contenido
function createElement(tag, attributes = {}, content = "") {
  const element = document.createElement(tag)

  // Agregar atributos
  for (const [key, value] of Object.entries(attributes)) {
    if (key === "className") {
      element.className = value
    } else if (key === "dataset") {
      for (const [dataKey, dataValue] of Object.entries(value)) {
        element.dataset[dataKey] = dataValue
      }
    } else {
      element.setAttribute(key, value)
    }
  }

  // Agregar contenido
  if (typeof content === "string") {
    element.innerHTML = content
  } else if (content instanceof HTMLElement) {
    element.appendChild(content)
  } else if (Array.isArray(content)) {
    content.forEach((item) => {
      if (item instanceof HTMLElement) {
        element.appendChild(item)
      }
    })
  }

  return element
}

// Mostrar notificación
function showNotification(message, type = "success", duration = 3000) {
  // Crear contenedor si no existe
  let container = document.getElementById("notification-container")
  if (!container) {
    container = createElement("div", {
      id: "notification-container",
      className: "notification-container",
    })
    document.body.appendChild(container)

    // Estilos para el contenedor
    container.style.position = "fixed"
    container.style.top = "1rem"
    container.style.right = "1rem"
    container.style.zIndex = "1000"
    container.style.display = "flex"
    container.style.flexDirection = "column"
    container.style.gap = "0.5rem"
  }

  // Crear notificación
  const notification = createElement(
    "div",
    {
      className: `notification notification-${type}`,
    },
    message,
  )

  // Estilos para la notificación
  notification.style.backgroundColor =
    type === "success" ? "#d1fae5" : type === "error" ? "#fee2e2" : type === "warning" ? "#fef3c7" : "#e0f2fe"
  notification.style.color =
    type === "success" ? "#065f46" : type === "error" ? "#b91c1c" : type === "warning" ? "#92400e" : "#0369a1"
  notification.style.padding = "0.75rem 1rem"
  notification.style.borderRadius = "0.375rem"
  notification.style.boxShadow = "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)"
  notification.style.minWidth = "200px"
  notification.style.maxWidth = "400px"
  notification.style.animation = "slideIn 0.3s ease-out forwards"

  // Agregar animación
  const style = document.createElement("style")
  style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `
  document.head.appendChild(style)

  // Agregar al contenedor
  container.appendChild(notification)

  // Eliminar después de la duración
  setTimeout(() => {
    notification.style.animation = "slideOut 0.3s ease-in forwards"
    setTimeout(() => {
      container.removeChild(notification)
      if (container.children.length === 0) {
        document.body.removeChild(container)
      }
    }, 300)
  }, duration)
}

// Validar formulario
function validateForm(formData, rules) {
  const errors = {}

  for (const field in rules) {
    const value = formData[field]
    const fieldRules = rules[field]

    if (fieldRules.required && (!value || value.trim() === "")) {
      errors[field] = "Este campo es obligatorio"
      continue
    }

    if (fieldRules.minLength && value.length < fieldRules.minLength) {
      errors[field] = `Debe tener al menos ${fieldRules.minLength} caracteres`
      continue
    }

    if (fieldRules.maxLength && value.length > fieldRules.maxLength) {
      errors[field] = `Debe tener como máximo ${fieldRules.maxLength} caracteres`
      continue
    }

    if (fieldRules.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      errors[field] = "Debe ser un email válido"
      continue
    }

    if (fieldRules.numeric && !/^\d+$/.test(value)) {
      errors[field] = "Debe ser un valor numérico"
      continue
    }

    if (fieldRules.min && Number.parseFloat(value) < fieldRules.min) {
      errors[field] = `Debe ser mayor o igual a ${fieldRules.min}`
      continue
    }

    if (fieldRules.max && Number.parseFloat(value) > fieldRules.max) {
      errors[field] = `Debe ser menor o igual a ${fieldRules.max}`
      continue
    }

    if (fieldRules.pattern && !fieldRules.pattern.test(value)) {
      errors[field] = fieldRules.message || "Formato inválido"
      continue
    }

    if (fieldRules.custom && typeof fieldRules.custom === "function") {
      const customError = fieldRules.custom(value, formData)
      if (customError) {
        errors[field] = customError
        continue
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}

// Mostrar errores de formulario
function showFormErrors(form, errors) {
  // Limpiar errores anteriores
  const errorElements = form.querySelectorAll(".form-error")
  errorElements.forEach((el) => el.remove())

  // Mostrar nuevos errores
  for (const field in errors) {
    const input = form.querySelector(`[name="${field}"]`)
    if (input) {
      input.classList.add("is-invalid")

      const errorElement = createElement(
        "div",
        {
          className: "form-error text-danger text-xs mt-1",
        },
        errors[field],
      )

      input.parentNode.appendChild(errorElement)
    }
  }
}

// Limpiar errores de formulario
function clearFormErrors(form) {
  const errorElements = form.querySelectorAll(".form-error")
  errorElements.forEach((el) => el.remove())

  const invalidInputs = form.querySelectorAll(".is-invalid")
  invalidInputs.forEach((input) => input.classList.remove("is-invalid"))
}

// Obtener datos de formulario como objeto
function getFormData(form) {
  const formData = new FormData(form)
  const data = {}

  for (const [key, value] of formData.entries()) {
    data[key] = value
  }

  return data
}

// Confirmar acción
function confirmAction(message, callback) {
  if (confirm(message)) {
    callback()
  }
}

// Generar ID único
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

// Debounce para evitar múltiples llamadas
function debounce(func, wait = 300) {
  let timeout

  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }

    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// Obtener parámetros de URL
function getUrlParams() {
  const params = {}
  const queryString = window.location.search
  const urlParams = new URLSearchParams(queryString)

  for (const [key, value] of urlParams.entries()) {
    params[key] = value
  }

  return params
}

// Navegar a una ruta
function navigateTo(path) {
  window.history.pushState({}, "", path)
  window.dispatchEvent(new Event("popstate"))
}
