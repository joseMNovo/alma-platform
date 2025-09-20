# 🔐 Configuración de Credenciales - ALMA Platform

## 📋 Instrucciones de Configuración

Para configurar las credenciales de acceso a la plataforma ALMA, sigue estos pasos:

### 1. Crear Archivo de Variables de Entorno

Crea un archivo llamado `.env.local` en la raíz del proyecto con el siguiente contenido:

```bash
# Credenciales de Administrador
ADMIN_EMAIL=admin@alma.com
ADMIN_PASSWORD=admin123

# Credenciales de José (Usuario especial con acceso a Ajustes)
JOSE_EMAIL=jose@alma.com
JOSE_PASSWORD=jose123

# Configuración de la aplicación
NEXT_PUBLIC_APP_NAME=ALMA Platform
NEXT_PUBLIC_APP_VERSION=1.0.0
```

### 2. Personalizar Credenciales

Puedes cambiar las credenciales por defecto modificando los valores en el archivo `.env.local`:

```bash
# Ejemplo de credenciales personalizadas
ADMIN_EMAIL=tu_admin@tudominio.com
ADMIN_PASSWORD=tu_password_admin_seguro

JOSE_EMAIL=jose@tudominio.com
JOSE_PASSWORD=password_jose_seguro
```

### 3. Reiniciar la Aplicación

Después de crear o modificar el archivo `.env.local`, reinicia la aplicación:

```bash
# Detener la aplicación (Ctrl+C)
# Luego ejecutar nuevamente:
npm run dev
```

## 🔑 Credenciales por Defecto

Si no creas el archivo `.env.local`, la aplicación usará estas credenciales por defecto:

### Administrador
- **Email**: `admin@alma.com`
- **Password**: `admin123`
- **Acceso**: Todos los módulos (Inventario, Voluntarios)

### José (Usuario Especial)
- **Email**: `jose@alma.com`
- **Password**: `jose123`
- **Acceso**: Todos los módulos + Ajustes (Importar/Exportar JSON)

## 🛡️ Seguridad

### Archivos Ignorados
- El archivo `.env.local` está en `.gitignore` y NO se subirá al repositorio
- Las credenciales permanecen seguras en tu servidor local

### Recomendaciones de Seguridad
1. **Usa contraseñas seguras** con al menos 8 caracteres
2. **Incluye números y símbolos** en las contraseñas
3. **No compartas** el archivo `.env.local`
4. **Cambia las credenciales** antes de usar en producción

## 🔄 Sistema de Autenticación

### Prioridad de Validación
1. **Primero**: Valida credenciales del archivo `.env.local`
2. **Segundo**: Valida usuarios adicionales del archivo `lib/data.json`

### Usuarios Adicionales
Puedes agregar más usuarios editando el archivo `lib/data.json` en la sección `usuarios`:

```json
{
  "usuarios": [
    {
      "id": 3,
      "nombre": "Usuario Adicional",
      "email": "usuario@ejemplo.com",
      "password": "password123",
      "rol": "admin"
    }
  ]
}
```

## 📱 Acceso a Módulos

### Administrador (`admin@alma.com`)
- ✅ Inventario
- ✅ Voluntarios
- ❌ Ajustes (solo para José)

### José (`jose@alma.com`)
- ✅ Inventario
- ✅ Voluntarios
- ✅ Ajustes (Importar/Exportar JSON)

### Usuarios Adicionales
- ✅ Inventario
- ✅ Voluntarios
- ❌ Ajustes (solo para José)

## 🚨 Solución de Problemas

### Error: "Credenciales inválidas"
1. Verifica que el archivo `.env.local` existe
2. Revisa que las credenciales son correctas
3. Reinicia la aplicación después de cambios

### Error: "Usuario no encontrado"
1. Verifica el formato del email
2. Asegúrate de que el usuario existe en `.env.local` o `data.json`
3. Revisa que el rol sea "admin"

### No se puede acceder a Ajustes
1. Verifica que estés logueado como José (`jose@alma.com`)
2. Confirma que el email en `.env.local` coincide exactamente

## 📞 Soporte

Si tienes problemas con la configuración, verifica:
1. ✅ Archivo `.env.local` creado correctamente
2. ✅ Variables de entorno con nombres exactos
3. ✅ Aplicación reiniciada después de cambios
4. ✅ Credenciales sin espacios extra

---

**¡Listo!** Con esta configuración tendrás control total sobre las credenciales de acceso a la plataforma ALMA. 🎉
