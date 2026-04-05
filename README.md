> **TL;DR:** Web **Next.js** para **Alzheimer Rosario**: talleres, grupos, actividades, pagos e inventario en un solo lugar, con roles.
>
> **Correrlo:** `npm install --legacy-peer-deps` → `npm run dev` (o `pnpm install` / `pnpm dev`) → **http://localhost:3000**. Opcional: `.env.local`; si no, credenciales por defecto en la sección de configuración más abajo.

# ALMA - Plataforma de Gestión para Alzheimer Rosario

## Descripción

ALMA es una plataforma web de gestión integral diseñada específicamente para la organización Alzheimer Rosario. La aplicación permite gestionar talleres, grupos de apoyo, actividades, pagos, inventario y comunicaciones de manera centralizada y eficiente.

## Características Principales

### 🎯 Módulos de Gestión
- **Inventario**: Gestión de materiales didácticos y mobiliario
- **Voluntarios**: Administración de voluntarios y permisos
- **Pendientes**: Sistema de tareas y categorías con asignación de voluntarios
- **Talleres**: Gestión completa de talleres de memoria y estimulación cognitiva
- **Grupos**: Administración de grupos de apoyo familiar y para cuidadores
- **Actividades**: Organización de charlas, jornadas y eventos
- **Pagos**: Control de cuotas mensuales y pagos de servicios
- **Reportes**: Análisis y estadísticas del sistema
- **Configuración**: Ajustes del sistema y usuarios

### 🔐 Sistema de Autenticación
- Login seguro con roles diferenciados (Admin/Usuario)
- Control de acceso basado en permisos
- Sesiones persistentes con localStorage
- Configuración de credenciales mediante variables de entorno

### 📱 Diseño Responsivo
- Interfaz adaptativa para desktop, tablet y móvil
- Navegación optimizada para dispositivos móviles
- Componentes UI modernos con Tailwind CSS

## Tecnologías Utilizadas

### Frontend
- **Next.js 15** - Framework React con App Router
- **React 19** - Biblioteca de interfaz de usuario
- **TypeScript** - Tipado estático para JavaScript
- **Tailwind CSS** - Framework de estilos utilitarios
- **Radix UI** - Componentes accesibles y personalizables
- **Lucide React** - Iconografía moderna

### Backend
- **Next.js API Routes** - API REST integrada
- **JSON** - Base de datos en archivo (para desarrollo)

### Herramientas de Desarrollo
- **pnpm** - Gestor de paquetes
- **PostCSS** - Procesador de CSS
- **ESLint** - Linter para JavaScript/TypeScript

## Requisitos del Sistema

- **Node.js**: Versión 18 o superior
- **pnpm**: Versión 8 o superior (recomendado)
- **Navegador**: Chrome, Firefox, Safari o Edge (versiones recientes)

## Instalación y Configuración

### 1. Clonar el Repositorio
```bash
git clone <url-del-repositorio>
cd alma-platform
```

### 2. Instalar Dependencias

#### Opción A: Con npm (Recomendado)
```bash
# Instalar dependencias con resolución de conflictos
npm install --legacy-peer-deps
```

#### Opción B: Con pnpm
```bash
# Instalar pnpm si no lo tienes
npm install -g pnpm

# Instalar dependencias del proyecto
pnpm install
```

**Nota**: Si encuentras errores de dependencias con React 19, usa `--legacy-peer-deps` con npm o actualiza a una versión compatible de `vaul`.

### 3. Configurar Variables de Entorno
Crear un archivo `.env.local` en la raíz del proyecto con las credenciales de acceso:

```bash
# Credenciales de Administrador
ADMIN_EMAIL=admin@alma.com
ADMIN_PASSWORD=admin123

# Credenciales de José (Usuario especial con acceso a Ajustes)
JOSE_EMAIL=email
JOSE_PASSWORD=pass

# Configuración de la aplicación
NEXT_PUBLIC_APP_NAME=ALMA Platform
NEXT_PUBLIC_APP_VERSION=1.0.0
```

**Credenciales por defecto** (si no creas el archivo `.env.local`):
- **Administrador**: `admin@alma.com` / `admin123`
- **José**: `email` / `pass`

> 📋 **Nota**: Para más detalles sobre configuración de credenciales, consulta el archivo `CONFIGURACION_CREDENCIALES.md`

### 4. Ejecutar en Modo Desarrollo
```bash
# Con npm
npm run dev

# Con pnpm
pnpm dev
```

La aplicación estará disponible en: `http://localhost:3000`

### 5. Compilar para Producción
```bash
# Con npm
npm run build
npm start

# Con pnpm
pnpm build
pnpm start
```

## Estructura del Proyecto

```
alma-platform/
├── app/                          # App Router de Next.js
│   ├── api/                      # Rutas de API
│   │   ├── auth/                 # Autenticación
│   │   ├── actividades/          # Gestión de actividades
│   │   ├── emails/               # Sistema de emails
│   │   ├── grupos/               # Gestión de grupos
│   │   ├── inventario/           # Control de inventario
│   │   ├── pagos/                # Gestión de pagos
│   │   ├── pendientes/           # Gestión de tareas pendientes
│   │   ├── talleres/             # Gestión de talleres
│   │   └── voluntarios/          # Gestión de voluntarios
│   ├── globals.css               # Estilos globales
│   ├── layout.tsx                # Layout principal
│   └── page.tsx                  # Página de inicio
├── components/                   # Componentes React
│   ├── actividades/              # Componentes de actividades
│   ├── auth/                     # Componentes de autenticación
│   ├── configuracion/            # Componentes de configuración
│   ├── dashboard/                # Componentes del dashboard
│   ├── emails/                   # Componentes de emails
│   ├── grupos/                   # Componentes de grupos
│   ├── inventario/               # Componentes de inventario
│   ├── pagos/                    # Componentes de pagos
│   ├── pendientes/               # Componentes de tareas pendientes
│   ├── reportes/                 # Componentes de reportes
│   ├── talleres/                 # Componentes de talleres
│   ├── voluntarios/              # Componentes de voluntarios
│   ├── theme-provider.tsx        # Proveedor de temas
│   └── ui/                       # Componentes UI reutilizables
├── frontend/                     # Frontend adicional (legacy)
│   ├── css/                      # Estilos CSS
│   ├── js/                       # JavaScript vanilla
│   └── index.html                # HTML principal
├── hooks/                        # Custom hooks de React
├── lib/                          # Utilidades y datos
│   ├── data.json                 # Base de datos JSON
│   └── utils.ts                  # Funciones utilitarias
├── public/                       # Archivos estáticos
│   └── images/                   # Imágenes del proyecto
├── styles/                       # Estilos adicionales
├── components.json               # Configuración de shadcn/ui
├── next.config.mjs               # Configuración de Next.js
├── package.json                  # Dependencias y scripts
├── tailwind.config.ts            # Configuración de Tailwind
└── tsconfig.json                 # Configuración de TypeScript
```

## Uso de la Aplicación

### Acceso Inicial
1. Abrir la aplicación en el navegador
2. Usar las credenciales de prueba:
   - **Administrador**: `admin@alma.com` / `admin123`
   - **Usuario**: `maria@email.com` / `user123`

### Funcionalidades por Rol

#### 👨‍💼 Administrador
- Acceso completo a todos los módulos
- Gestión de inventario
- Envío de emails masivos
- Generación de reportes
- Configuración del sistema

#### 👤 Usuario
- Visualización de talleres, grupos y actividades
- Inscripción a eventos
- Consulta de pagos y estado de cuenta
- Acceso limitado según permisos

### Navegación
- **Desktop**: Navegación por pestañas en la parte superior
- **Mobile**: Menú hamburguesa con navegación lateral
- **Responsive**: Adaptación automática según el tamaño de pantalla

## 👥 Usuarios y Permisos

### Tipos de Usuario

#### 🔑 Administrador (`admin@alma.com`)
- **Acceso completo** a todos los módulos
- **Módulos disponibles**:
  - ✅ Inventario (gestión de materiales)
  - ✅ Voluntarios (gestión de comunidad)
  - ✅ Pendientes (gestión de tareas y categorías)
  - ❌ Ajustes (solo para José)

#### 🔧 José (`email`)
- **Acceso especial** con permisos extendidos
- **Módulos disponibles**:
  - ✅ Inventario (gestión de materiales)
  - ✅ Voluntarios (gestión de comunidad)
  - ✅ Pendientes (gestión de tareas y categorías)
  - ✅ **Ajustes** (importar/exportar datos JSON)

#### 👤 Usuarios Adicionales
- **Acceso estándar** para administradores
- **Módulos disponibles**:
  - ✅ Inventario
  - ✅ Voluntarios
  - ✅ Pendientes
  - ❌ Ajustes (solo para José)

### Configuración de Acceso

Las credenciales se configuran en el archivo `.env.local`:

## 📋 Módulo de Pendientes

### Características Principales
- **Sistema de Tareas**: Gestión de categorías y sub-tareas
- **Asignación de Voluntarios**: Cada tarea puede ser asignada a un voluntario específico
- **Filtros Inteligentes**: "Ver solo los míos" y "Ver completados"
- **Permisos Granulares**: Acceso diferenciado según asignación
- **CRUD Completo**: Crear, editar, eliminar y marcar como completado

### Funcionalidades
- **Categorías**: Tareas principales con descripción y asignación
- **Sub-tareas**: Tareas específicas dentro de cada categoría
- **Completado**: Marcado de tareas como terminadas
- **Filtros**: Visualización personalizada según permisos
- **Asignación**: Vinculación con voluntarios del sistema

### Permisos por Usuario
- **Administradores**: Acceso completo a todas las tareas
- **Voluntarios**: Solo ven tareas asignadas a ellos
- **Mixto**: Pueden ver categorías con sub-tareas asignadas (solo lectura en categoría)

## 🚀 Instalación

```bash
# Administrador principal
ADMIN_EMAIL=admin@alma.com
ADMIN_PASSWORD=admin123

# Usuario especial (acceso a Ajustes)
JOSE_EMAIL=
JOSE_PASSWORD=
```

> 🔒 **Seguridad**: Solo José tiene acceso al módulo "Ajustes" para importar/exportar datos del sistema.

## API Endpoints

### Autenticación
- `POST /api/auth` - Iniciar sesión
- `GET /api/auth` - Obtener usuarios (sin contraseñas)

### Talleres
- `GET /api/talleres` - Listar talleres
- `POST /api/talleres` - Crear taller
- `PUT /api/talleres?id={id}` - Actualizar taller
- `DELETE /api/talleres?id={id}` - Eliminar taller
- `POST /api/talleres/inscripcion` - Inscribir usuario

### Grupos
- `GET /api/grupos` - Listar grupos
- `POST /api/grupos` - Crear grupo
- `PUT /api/grupos?id={id}` - Actualizar grupo
- `DELETE /api/grupos?id={id}` - Eliminar grupo
- `POST /api/grupos/inscripcion` - Inscribir usuario

### Actividades
- `GET /api/actividades` - Listar actividades
- `POST /api/actividades` - Crear actividad
- `PUT /api/actividades?id={id}` - Actualizar actividad
- `DELETE /api/actividades?id={id}` - Eliminar actividad
- `POST /api/actividades/inscripcion` - Inscribir usuario

### Pagos
- `GET /api/pagos` - Listar pagos
- `POST /api/pagos` - Registrar pago
- `PUT /api/pagos?id={id}` - Actualizar pago

### Inventario
- `GET /api/inventario` - Listar inventario
- `POST /api/inventario` - Agregar item
- `PUT /api/inventario?id={id}` - Actualizar item
- `DELETE /api/inventario?id={id}` - Eliminar item

### Emails
- `POST /api/emails` - Enviar email masivo

### Voluntarios
- `GET /api/voluntarios` - Listar voluntarios
- `POST /api/voluntarios` - Crear voluntario
- `PUT /api/voluntarios?id={id}` - Actualizar voluntario
- `DELETE /api/voluntarios?id={id}` - Eliminar voluntario

### Datos del Sistema
- `GET /api/data/export` - Exportar todos los datos en JSON
- `POST /api/data/import` - Importar datos desde archivo JSON

## Scripts Disponibles

```bash
# Desarrollo con npm
npm run dev       # Ejecutar en modo desarrollo
npm run build     # Compilar para producción
npm start         # Ejecutar versión de producción
npm run lint      # Ejecutar linter

# Desarrollo con pnpm
pnpm dev          # Ejecutar en modo desarrollo
pnpm build        # Compilar para producción
pnpm start        # Ejecutar versión de producción
pnpm lint         # Ejecutar linter
```

## Personalización

### Colores y Tema
Los colores principales se pueden modificar en:
- `tailwind.config.ts` - Configuración de Tailwind
- `app/globals.css` - Variables CSS personalizadas
- Componentes individuales para colores específicos

### Logo y Branding
- Reemplazar `/public/images/alma-logo.png` con el logo oficial
- Modificar metadatos en `app/layout.tsx`

### Datos Iniciales
Editar `lib/data.json` para:
- Agregar usuarios iniciales
- Configurar talleres, grupos y actividades
- Establecer inventario base

## Despliegue

### Vercel (Recomendado)
1. Conectar repositorio a Vercel
2. Configurar variables de entorno si es necesario
3. Desplegar automáticamente

### Otros Proveedores
- **Netlify**: Compatible con Next.js estático
- **Railway**: Para aplicaciones full-stack
- **Heroku**: Con configuración adicional

## Contribución

1. Fork del repositorio
2. Crear rama para nueva funcionalidad
3. Realizar cambios y commits
4. Crear Pull Request

## Soporte y Contacto

Para soporte técnico o consultas sobre la plataforma ALMA:
- Email: soporte@alma.com
- Teléfono: +54 11 1234-5678

## Licencia

Este proyecto es propiedad de ALMA - Alzheimer Rosario y está destinado para uso interno de la organización.

---

**ALMA - Alzheimer Rosario**  
*Plataforma de Gestión Integral*  
Versión 1.0.0
