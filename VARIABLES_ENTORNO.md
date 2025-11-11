# Variables de Entorno - Catálogo

Este documento describe todas las variables de entorno necesarias para el proyecto.

## 📋 Configuración

1. Crea un archivo `.env` en la raíz del proyecto (carpeta `catalogo/`)
2. Copia las variables necesarias desde este documento
3. Completa con tus valores reales
4. **IMPORTANTE**: El archivo `.env` ya está en `.gitignore` y NO se subirá a GitHub

---

## 🔐 Variables Obligatorias (Producción)

### Base de Datos
```env
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
```
- URL de conexión a PostgreSQL (Neon, Supabase, etc.)

### Autenticación
```env
LOGIN_PASSWORD=tu_contraseña_segura_aqui
```
- Contraseña para acceder al sistema de login
- ⚠️ **OBLIGATORIA en producción** - Sin esto, la aplicación NO iniciará en Vercel
- En desarrollo local, si no está configurada, se usará una contraseña por defecto (con advertencia)

```env
JWT_SECRET=tu_jwt_secret_muy_seguro_aqui
SESSION_SECRET=tu_session_secret_muy_seguro_aqui
```
- Secrets para JWT y sesiones
- Genera claves seguras: `openssl rand -base64 32`

### Redmine API
```env
REDMINE_URL=https://redmine.mercap.net
REDMINE_TOKEN=tu_api_key_de_redmine_aqui
```
- URL de la instancia de Redmine
- API Key de Redmine (obtener desde: Redmine → My Account → API access key)

---

## ⚙️ Variables Opcionales

### Redmine - Configuración Avanzada
```env
# Límite de issues por request (default: 100)
REDMINE_LIMIT_PER_REQUEST=100

# Límite máximo de issues a sincronizar (para pruebas)
REDMINE_SYNC_LIMIT=50
```

### Servidor
```env
# Puerto del servidor (default: 3000)
PORT=3000

# Entorno de ejecución
NODE_ENV=production

# Debug de sesiones (solo para desarrollo)
DEBUG_SESSIONS=true
```

### Google OAuth (Opcional)
Solo necesario si usas `redmineService.js` (vía Google Apps Script):
```env
GOOGLE_CLIENT_ID=tu_google_client_id
GOOGLE_CLIENT_SECRET=tu_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
GOOGLE_REFRESH_TOKEN=tu_refresh_token
GOOGLE_ACCESS_TOKEN=tu_access_token
REDMINE_API_URL=https://script.google.com/...
```

---

## 🚀 Configuración en Vercel

Para configurar las variables de entorno en Vercel:

1. Ve a [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **Settings** → **Environment Variables**
4. Agrega cada variable:
   - **Name**: El nombre de la variable (ej: `LOGIN_PASSWORD`)
   - **Value**: El valor real
   - **Environments**: Selecciona Production, Preview y Development según corresponda
5. Haz clic en **Save**
6. **IMPORTANTE**: Después de agregar variables, haz un **Redeploy** del proyecto

### Variables Mínimas para Vercel:
- `DATABASE_URL`
- `LOGIN_PASSWORD` ⬅️ **NUEVA - Agregar ahora**
- `JWT_SECRET` o `SESSION_SECRET`
- `REDMINE_TOKEN`
- `REDMINE_URL`

---

## 📝 Ejemplo de archivo .env

```env
# Base de datos
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require

# Autenticación
LOGIN_PASSWORD=MiContraseñaSegura123!
JWT_SECRET=mi_jwt_secret_super_seguro_123456789
SESSION_SECRET=mi_session_secret_super_seguro_123456789

# Redmine
REDMINE_URL=https://redmine.mercap.net
REDMINE_TOKEN=abc123def456ghi789jkl012mno345pqr678

# Servidor
PORT=3000
NODE_ENV=production
```

---

## ⚠️ Seguridad

- ✅ **NUNCA** subas el archivo `.env` a GitHub
- ✅ Usa contraseñas fuertes y únicas
- ✅ Rota las contraseñas periódicamente
- ✅ En producción, usa variables de entorno de Vercel, no archivos `.env`
- ✅ Revisa los logs para asegurarte de que no se expongan credenciales

---

## 🔄 Migración desde Contraseña Hardcodeada

Si ya tenías el proyecto funcionando con la contraseña hardcodeada:

1. **IMPORTANTE**: Agrega `LOGIN_PASSWORD` a tus variables de entorno en Vercel **ANTES** del próximo deploy
2. Usa el mismo valor que estaba hardcodeado: `MPmercap767` (o cámbialo por una más segura)
3. Haz un redeploy
4. La aplicación seguirá funcionando igual, pero ahora la contraseña está en variables de entorno
5. ⚠️ **Si no configuras `LOGIN_PASSWORD` en Vercel, la aplicación NO iniciará en producción**

### Comportamiento por Entorno:

- **Producción (Vercel)**: `LOGIN_PASSWORD` es **OBLIGATORIA**. Si no está configurada, la aplicación fallará al iniciar.
- **Desarrollo Local**: Si no está en `.env`, se usará una contraseña por defecto con una advertencia en consola.

