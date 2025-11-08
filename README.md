# Catálogo de Funcionalidades

Sistema de gestión de funcionalidades con scoring y mapa de clientes.

## 🚀 Características

- **Gestión de Funcionalidades**: Lista y tarjetas con filtros y búsqueda
- **Sistema de Score**: Calculadora de puntaje basada en 8 criterios
- **Mapa de Clientes**: Visualización de estados comerciales

## 📋 Tecnologías

- Node.js + Express
- PostgreSQL (Neon)
- EJS Templates
- Tailwind CSS (diseño similar a Google Drive)
- Vercel

## 🔧 Instalación

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Edita .env y añade tu DATABASE_URL de Neon

# Crear tablas en Neon (ejecuta el SQL de database.sql)

# Iniciar servidor de desarrollo
npm run dev
```

## 📁 Estructura de Base de Datos

### Tablas:
- **funcionalidades**: Almacena las funcionalidades del producto
- **clientes**: Lista de clientes
- **cliente_funcionalidad**: Relación con estado comercial
- **score**: Criterios de puntuación de cada funcionalidad

## 📊 Criterios de Score

El sistema evalúa funcionalidades basándose en:
- Origen (40%)
- Facturación (20%)
- Urgencia (20%)
- Facturación Potencial (20%)
- Impacto en cliente (33%)
- Esfuerzo (33%)
- Incertidumbre (33%)
- Riesgo (Score final)

## 🚀 Deploy en Vercel

1. Sube el código a GitHub
2. Conecta con Vercel
3. Configura `DATABASE_URL` en variables de entorno
4. Deploy

## 📝 Variables de Entorno

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | URL de conexión a PostgreSQL (Neon) |
| `PORT` | Puerto del servidor (default: 3000) |
| `NODE_ENV` | Entorno (development/production) |

