# 🚀 Instrucciones de Instalación y Uso - Catálogo de Funcionalidades

## 📋 Descripción

Sistema de gestión de funcionalidades con scoring y mapa de clientes. Diseño similar a Google Drive con interfaz minimalista.

---

## 🔧 Instalación

### 1. Instalar Dependencias

```bash
cd Catalogo
npm install
```

### 2. Configurar Base de Datos en Neon

1. **Crear cuenta en Neon:**
   - Ve a [https://neon.tech](https://neon.tech)
   - Crea una cuenta (gratis)
   - Crea un nuevo proyecto llamado "catalogo"

2. **Obtener DATABASE_URL:**
   - En el dashboard de Neon, copia la `DATABASE_URL`
   - Se verá así: `postgresql://user:password@host/database?sslmode=require`

3. **Crear tablas:**
   - Ve al SQL Editor en Neon
   - Copia el contenido completo del archivo `database.sql`
   - Pega y ejecuta en el SQL Editor
   - Verifica que se crearon las tablas: `funcionalidades`, `clientes`, `score`, `cliente_funcionalidad`

### 3. Configurar Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

```bash
# Copia el ejemplo
cp .env.example .env
```

Edita el archivo `.env` y añade tu `DATABASE_URL` de Neon:

```env
DATABASE_URL=postgresql://tu_usuario:tu_password@tu_host/tu_database?sslmode=require
PORT=3000
NODE_ENV=development
```

### 4. Iniciar el Servidor

```bash
npm run dev
```

Abre tu navegador en: `http://localhost:3000`

---

## 🎯 Funcionalidades

### 1. Módulo de Funcionalidades

**Acceso:** Menú lateral > Funcionalidades

**Características:**
- ✅ Vista de lista y tarjetas (toggle en la barra superior)
- ✅ Búsqueda en tiempo real
- ✅ Filtros por sección
- ✅ Ordenamiento por columnas (título, score, monto, fecha)
- ✅ Crear, editar y eliminar funcionalidades

**Campos de una funcionalidad:**
- Título
- Descripción
- Sponsor
- Epic Redmine
- Productivo en (fecha)
- Sección
- Monto
- Score (calculado automáticamente)

### 2. Módulo de Score

**Acceso:** Menú lateral > Score

**Características:**
- ✅ Ranking de funcionalidades por score
- ✅ Calculadora de score con 8 criterios
- ✅ Estadísticas globales
- ✅ Actualización en tiempo real

**Criterios de Evaluación (valores de 1 a 5):**
1. **Origen** (peso: 40%)
2. **Facturación** (peso: 20%)
3. **Urgencia** (peso: 20%)
4. **Facturación Potencial** (peso: 20%)
5. **Impacto en Cliente** (peso: 33.33%)
6. **Esfuerzo** (peso: 33.33%)
7. **Incertidumbre** (peso: 33.33%)
8. **Riesgo** (peso: 33.33%)

**Cómo evaluar una funcionalidad:**
1. Ve al módulo de Score
2. Click en "Evaluar" en la funcionalidad deseada
3. Ajusta los sliders de cada criterio (0-5)
4. El score se calcula automáticamente
5. Click en "Guardar Score"

### 3. Módulo de Mapa

**Acceso:** Menú lateral > Mapa de Clientes

**Características:**
- ✅ Vista de matriz clientes × funcionalidades
- ✅ Estados comerciales: Implementado, En Desarrollo, Planificado, Cancelado
- ✅ Estadísticas por estado
- ✅ Top funcionalidades más implementadas
- ✅ Actualización rápida de estados

**Cómo usar el mapa:**
1. Click en cualquier celda vacía para agregar un estado
2. Click en una celda con estado para modificarlo
3. Los colores indican el estado:
   - 🟢 Verde: Implementado
   - 🔵 Azul: En Desarrollo
   - 🟡 Amarillo: Planificado
   - ⚪ Gris: Cancelado

---

## 📊 Datos de Ejemplo

El archivo `database.sql` incluye datos de ejemplo:
- 4 clientes (Banco A, Retail B, Fintech C, Seguros D)
- 4 funcionalidades con sus scores
- Relaciones cliente-funcionalidad de ejemplo

---

## 🎨 Diseño

El diseño está inspirado en Google Drive con:
- **Sidebar izquierdo:** Navegación principal
- **Header:** Barra de búsqueda
- **Toolbar:** Filtros y acciones
- **Contenido:** Vista de lista o tarjetas
- **Colores minimalistas:** Azul primario (#1a73e8), grises neutros

---

## 🚀 Deploy en Vercel

### 1. Preparar el proyecto

```bash
git init
git add .
git commit -m "feat: Sistema de catálogo de funcionalidades"
```

### 2. Subir a GitHub

```bash
git branch -M main
git remote add origin https://github.com/tu-usuario/catalogo.git
git push -u origin main
```

### 3. Deploy en Vercel

1. Ve a [vercel.com](https://vercel.com)
2. Click en "Add New Project"
3. Importa tu repositorio de GitHub
4. Configura las variables de entorno:
   - `DATABASE_URL`: Tu URL de Neon
   - `NODE_ENV`: production
5. Click en "Deploy"

### 4. Verificar

Una vez desplegado, verifica que:
- La aplicación carga correctamente
- Las funcionalidades se muestran
- Puedes crear y editar registros

---

## 🔄 Integración con API Externa (Futuro)

El sistema está preparado para recibir datos de una API externa. Para implementarlo:

1. **Crear un servicio de sincronización:**

```javascript
// src/services/apiExterna.js
async function sincronizarFuncionalidades() {
    const response = await fetch('https://api-externa.com/funcionalidades');
    const datos = await response.json();
    
    // Insertar/actualizar en la base de datos
    for (const item of datos) {
        await FuncionalidadModel.crear(item);
    }
}
```

2. **Programar sincronización automática:**
   - Usar cron jobs
   - Webhook desde la API externa
   - Sincronización manual desde la interfaz

---

## 📝 API Endpoints

El sistema expone varios endpoints REST:

### Funcionalidades
- `GET /api/funcionalidades` - Listar todas
- `GET /funcionalidades/:id` - Obtener una
- `POST /funcionalidades` - Crear nueva
- `PUT /funcionalidades/:id` - Actualizar
- `DELETE /funcionalidades/:id` - Eliminar

### Score
- `GET /api/scores/ranking` - Obtener ranking
- `PUT /score/:id` - Actualizar score
- `POST /score/calcular-preview` - Calcular sin guardar

### Mapa
- `GET /mapa/datos` - Obtener datos del mapa
- `PUT /mapa/estado/:clienteId/:funcionalidadId` - Actualizar estado

### Utilidades
- `GET /api/health` - Health check
- `GET /api/estadisticas` - Estadísticas generales

---

## 🐛 Solución de Problemas

### Error: "Cannot find module"
```bash
npm install
```

### Error: "ECONNREFUSED" (Base de datos)
1. Verifica que `.env` existe y tiene `DATABASE_URL`
2. Verifica que la URL de Neon es correcta
3. Verifica que ejecutaste el SQL para crear tablas

### No se muestran las funcionalidades
1. Verifica que las tablas existen en Neon
2. Ejecuta el SQL de datos de ejemplo
3. Revisa los logs del servidor

### Estilos no se cargan
1. Verifica que la carpeta `public` existe
2. Reinicia el servidor (`npm run dev`)
3. Limpia caché del navegador (Ctrl+Shift+R)

---

## 📚 Estructura del Proyecto

```
Catalogo/
├── src/
│   ├── app.js                 # Servidor principal
│   ├── config/
│   │   └── database.js        # Conexión a PostgreSQL
│   ├── models/                # Modelos de datos
│   │   ├── FuncionalidadModel.js
│   │   ├── ScoreModel.js
│   │   ├── ClienteModel.js
│   │   └── MapaModel.js
│   ├── controllers/           # Controladores
│   │   ├── funcionalidadesController.js
│   │   ├── scoreController.js
│   │   └── mapaController.js
│   ├── routes/                # Rutas
│   ├── views/                 # Vistas EJS
│   │   ├── layouts/
│   │   ├── partials/
│   │   └── pages/
│   └── public/                # Archivos estáticos
│       ├── css/
│       └── js/
├── database.sql               # SQL para crear tablas
├── README.md
├── INSTRUCCIONES.md          # Este archivo
└── package.json
```

---

## 💡 Tips de Uso

1. **Usa la búsqueda:** La barra superior busca en título, descripción, sponsor y sección
2. **Cambia de vista:** Usa los botones de lista/tarjetas según tu preferencia
3. **Ordena por score:** Click en el header "Score" para ordenar de mayor a menor
4. **Evalúa regularmente:** Actualiza los scores según cambien las prioridades
5. **Monitorea el mapa:** El mapa te da una vista general del estado de cada cliente

---

## 🔜 Próximas Mejoras

- [ ] Integración con API externa para sincronización automática
- [ ] Exportación a Excel/PDF
- [ ] Gráficos y analytics
- [ ] Historial de cambios
- [ ] Comentarios y colaboración
- [ ] Notificaciones
- [ ] Búsqueda avanzada con filtros múltiples

---

## 📞 Soporte

Si tienes problemas:
1. Revisa esta documentación
2. Verifica los logs del servidor
3. Revisa los logs de Vercel (si está desplegado)
4. Consulta la documentación de Neon

---

**¡Listo para usar!** 🎉

Tu sistema de catálogo está configurado y funcionando. Comienza creando tus primeras funcionalidades y evaluándolas con el sistema de score.

