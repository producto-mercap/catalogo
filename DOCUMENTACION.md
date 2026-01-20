# Documentación Técnica y Funcional - Catálogo Unitrade

## 📋 Índice

1. [Descripción General](#descripción-general)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Integración con Redmine](#integración-con-redmine)
4. [Estructura de Base de Datos](#estructura-de-base-de-datos)
5. [Llamados a la API de Redmine](#llamados-a-la-api-de-redmine)
6. [Criterios de Filtrado](#criterios-de-filtrado)
7. [Persistencia de Datos](#persistencia-de-datos)
8. [Construcción de Vistas](#construcción-de-vistas)
9. [Campos Editables vs Solo Lectura](#campos-editables-vs-solo-lectura)
10. [Endpoints API](#endpoints-api)
11. [Configuración y Despliegue](#configuración-y-despliegue)

---

## Descripción General

**Catálogo Unitrade** es un sistema de gestión de funcionalidades y scoring con mapa de clientes que se integra con Redmine para sincronizar proyectos, epics e issues. El sistema permite:

- Sincronizar proyectos y funcionalidades desde Redmine
- Gestionar scoring de funcionalidades
- Mapear clientes y versiones de productos
- Gestionar requerimientos de clientes
- Gestionar proyectos internos
- Gestionar ideas de mejora

### Tecnologías Utilizadas

- **Backend**: Node.js + Express
- **Frontend**: EJS (templates) + JavaScript vanilla
- **Base de Datos**: PostgreSQL (Neon)
- **Hosting**: Vercel
- **Autenticación**: JWT (JSON Web Tokens)
- **Sesiones**: PostgreSQL Store (connect-pg-simple)
- **Librerías principales**: 
  - `pg` (PostgreSQL)
  - `jsonwebtoken` (autenticación)
  - `express-session` (sesiones)
  - `connect-pg-simple` (store de sesiones)

---

## Arquitectura del Sistema

### Estructura de Directorios

```
catalogo/
├── src/
│   ├── app.js                    # Punto de entrada principal
│   ├── config/
│   │   └── database.js           # Configuración de pool de conexiones PostgreSQL
│   ├── controllers/              # Lógica de negocio por módulo
│   │   ├── funcionalidadesController.js
│   │   ├── scoreController.js
│   │   ├── mapaController.js
│   │   ├── proyectosInternosController.js
│   │   ├── reqClientesController.js
│   │   └── ideasMejorasController.js
│   ├── models/                   # Modelos de datos
│   │   ├── FuncionalidadModel.js
│   │   ├── ScoreModel.js
│   │   ├── MapaModel.js
│   │   ├── ProyectosInternosModel.js
│   │   ├── ReqClientesModel.js
│   │   ├── IdeasMejorasModel.js
│   │   ├── EpicModel.js
│   │   └── ClienteModel.js
│   ├── routes/                   # Definición de rutas
│   │   ├── indexRoutes.js
│   │   ├── funcionalidadesRoutes.js
│   │   ├── scoreRoutes.js
│   │   ├── mapaRoutes.js
│   │   ├── proyectosInternosRoutes.js
│   │   ├── reqClientesRoutes.js
│   │   ├── ideasMejorasRoutes.js
│   │   ├── redmineRoutes.js
│   │   ├── apiRoutes.js
│   │   └── authRoutes.js
│   ├── services/                 # Servicios externos
│   │   ├── redmineDirectService.js    # API directa de Redmine (READ-ONLY)
│   │   ├── redmineService.js          # API vía Google Apps Script (DEPRECATED)
│   │   └── sincronizacionService.js   # Lógica de sincronización
│   ├── middleware/
│   │   └── authJWT.js           # Middleware de autenticación JWT
│   ├── public/                   # Archivos estáticos
│   │   ├── css/
│   │   │   └── main.css
│   │   ├── js/
│   │   │   └── main.js
│   │   └── images/
│   └── views/                    # Templates EJS
│       ├── layouts/
│       │   └── main.ejs
│       ├── pages/
│       │   ├── funcionalidades.ejs
│       │   ├── funcionalidad-detalle.ejs
│       │   ├── score.ejs
│       │   ├── mapa.ejs
│       │   ├── proyectos-internos.ejs
│       │   ├── req-clientes.ejs
│       │   ├── ideas-mejoras.ejs
│       │   ├── login.ejs
│       │   └── 404.ejs
│       └── partials/
│           ├── header.ejs
│           └── sidebar.ejs
├── scripts/                      # Scripts auxiliares
├── package.json
├── vercel.json                   # Configuración Vercel
└── .env                          # Variables de entorno (no versionado)
```

### Flujo de Datos

1. **Usuario** → Interactúa con la interfaz (EJS)
2. **Frontend (JS)** → Realiza peticiones AJAX a `/api/*`
3. **Backend (Express)** → Procesa en `controllers/`
4. **Servicios** → Consultan API de Redmine o BD
5. **Base de Datos** → Almacena datos persistentes
6. **Respuesta** → JSON o renderizado EJS

---

## Integración con Redmine

### Servicio Principal: `redmineDirectService.js`

**⚠️ IMPORTANTE**: Este servicio es **READ-ONLY** (solo consultas). **NUNCA** se realizan modificaciones en Redmine desde este sistema.

### Autenticación

**Método**: API Key (token) de Redmine

**Configuración**:
- `REDMINE_URL`: URL base de Redmine (ej: `https://redmine.mercap.net`)
- `REDMINE_TOKEN`: API Key de Redmine (se envía como parámetro `key` en la query string)

**Headers**:
```javascript
{
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'Catalogo-NodeJS/1.0'
}
```

### Endpoints de Redmine Utilizados

#### 1. Obtener Issues
```
GET /issues.json
```

**Parámetros de Query**:
- `project_id` (string) - ID o identifier del proyecto (ej: `ut-bancor`, `ut-mercap`)
- `status_id` (string) - ID del estado (`*` para todos, `8` para específico)
- `tracker_id` (string, opcional) - ID del tracker (ej: `10` para Epic, `19` para Proyecto Interno, `29` para Req Cliente)
- `limit` (number) - Límite de resultados (máximo recomendado: 100 por request)
- `offset` (number) - Offset para paginación
- `key` (string) - API Key de Redmine
- `cf_XX` (string, opcional) - Custom field ID para filtrar (ej: `cf_23` para Services-ID)

**Ejemplo de Request**:
```
GET https://redmine.mercap.net/issues.json?project_id=ut-bancor&status_id=*&tracker_id=19&limit=100&offset=0&key=API_KEY
```

**Formato Respuesta**:
```json
{
  "total_count": 150,
  "offset": 0,
  "limit": 100,
  "issues": [
    {
      "id": 12345,
      "subject": "Título del issue",
      "description": "Descripción...",
      "project": {
        "id": 100,
        "name": "UT Bancor | Proyecto",
        "identifier": "ut-bancor"
      },
      "status": {
        "id": 1,
        "name": "Nuevo"
      },
      "tracker": {
        "id": 19,
        "name": "Epic"
      },
      "custom_fields": [
        {
          "id": 15,
          "name": "Fecha real de finalización",
          "value": "2024-01-15"
        },
        {
          "id": 23,
          "name": "Services-ID",
          "value": "SERV-123"
        }
      ],
      "created_on": "2024-01-01T10:00:00Z",
      "total_spent_hours": 120.5,
      "parent": {
        "id": 12340
      }
    }
  ]
}
```

#### 2. Obtener Proyectos
```
GET /projects.json
```

**Parámetros de Query**:
- `limit` (number) - Límite de resultados (máximo: 100)
- `offset` (number) - Offset para paginación
- `key` (string) - API Key de Redmine
- `cf_19` (string, opcional) - Custom field 19 (Producto) - Filtro: `Unitrade`
- `cf_95` (string, opcional) - Custom field 95 (Catálogo) - Filtro: `1`

**Ejemplo de Request**:
```
GET https://redmine.mercap.net/projects.json?limit=100&offset=0&cf_19=Unitrade&cf_95=1&key=API_KEY
```

**Formato Respuesta**:
```json
{
  "total_count": 50,
  "offset": 0,
  "limit": 100,
  "projects": [
    {
      "id": 100,
      "name": "UT Bancor | Proyecto",
      "identifier": "ut-bancor",
      "created_on": "2024-01-01T10:00:00Z",
      "custom_fields": [
        {
          "id": 93,
          "name": "Es Reventa",
          "value": "1"
        }
      ]
    }
  ]
}
```

---

## Llamados a la API de Redmine

### Funciones Principales

#### 1. `obtenerIssues(options)`

**Ubicación**: `src/services/redmineDirectService.js`

**Parámetros**:
```javascript
{
    project_id: 'ut-bancor',    // ID del proyecto (default: REDMINE_DEFAULT_PROJECT)
    status_id: '*',              // Estado ('*' para todos)
    limit: 100,                  // Límite de resultados (default: 15, max recomendado: 100)
    offset: 0,                   // Offset para paginación
    tracker_id: '19'             // ID del tracker (opcional)
}
```

**Proceso**:
1. Valida credenciales (`REDMINE_URL` y `REDMINE_TOKEN`)
2. Construye URL con parámetros
3. Realiza request GET a `/issues.json`
4. Maneja errores HTTP (500, 404, etc.)
5. Retorna datos JSON parseados

**Características**:
- Paginación automática con `obtenerTodosLosIssues()`
- Delay de 200ms entre requests para no saturar el servidor
- Logging detallado (oculta el token en logs)

#### 2. `obtenerTodosLosIssues(project_id, tracker_id, maxTotal)`

**Funcionalidad**: Obtiene todos los issues de un proyecto con paginación automática

**Proceso**:
1. Realiza requests paginados (100 por request)
2. Acumula resultados en array
3. Continúa hasta obtener todos o alcanzar `maxTotal`
4. Retorna array completo de issues

**Límites**:
- Máximo 100 issues por request (límite de Redmine)
- Delay de 200ms entre requests
- Variable de entorno `REDMINE_LIMIT_PER_REQUEST` (default: 100)

#### 3. `obtenerProyectos(options)`

**Parámetros**:
```javascript
{
    limit: 100,                  // Límite (máximo: 100)
    offset: 0,                   // Offset
    producto: 'Unitrade',        // Filtro cf_19 (default: REDMINE_PROJECT_PRODUCT_FILTER)
    catalogo: '1'                // Filtro cf_95 (default: REDMINE_PROJECT_CATALOG_FILTER)
}
```

**Filtros Aplicados**:
- `cf_19 = 'Unitrade'` - Solo proyectos del producto Unitrade
- `cf_95 = '1'` - Solo proyectos marcados para catálogo

#### 4. `obtenerIssuesProyectosInternos(options)`

**Parámetros**:
```javascript
{
    project_id: 'ut-mercap',    // Proyecto interno (default: REDMINE_INTERNAL_PROJECT)
    tracker_id: '19',            // Tracker Epic (default: REDMINE_INTERNAL_TRACKER)
    cf_23: '*',                  // Custom field 23 (Services-ID) - '*' para todos
    limit: 100,                  // Límite (máximo: 100)
    status_id: '*'               // Estado
}
```

**Filtros Aplicados**:
- `project_id = 'ut-mercap'` - Proyecto interno
- `tracker_id = '19'` - Solo Epics
- `cf_23 = '*'` - Opcional: filtrar por Services-ID

#### 5. `obtenerIssuesReqClientes(options)`

**Parámetros**:
```javascript
{
    project_id: 'ut',            // Proyecto principal (default: 'ut')
    tracker_id: '29',            // Tracker Req Cliente (default: '29')
    status_id: '*',              // Estado
    limit: 100                    // Límite (máximo: 100)
}
```

**Filtros Aplicados**:
- `project_id = 'ut'` - Proyecto principal
- `tracker_id = '29'` - Solo requerimientos de clientes

---

## Criterios de Filtrado

### 1. Funcionalidades (Catálogo)

**Endpoint**: `POST /api/redmine/sincronizar`

**Filtros Aplicados**:
1. **Proyectos**:
   - `cf_19 = 'Unitrade'` - Solo proyectos del producto Unitrade
   - `cf_95 = '1'` - Solo proyectos marcados para catálogo
   - Orden: Por fecha de creación (más recientes primero)

2. **Mapeo de Proyectos**:
   - Extrae `cliente` desde `titulo` del proyecto (antes de `|`)
   - Ejemplo: `"UT Bancor | Proyecto"` → `cliente = "UT Bancor"`
   - Normaliza `reventa` desde custom field 93 (`Si`/`No`/`null`)

3. **Límites**:
   - Máximo 100 proyectos por sincronización (configurable con `REDMINE_SYNC_LIMIT`)
   - Variable de entorno `MAX_PROJECT_SYNC = 100`

### 2. Proyectos Internos

**Endpoint**: `POST /api/redmine/sincronizar-proyectos-internos`

**Filtros Aplicados**:
1. **Proyecto**: `project_id = 'ut-mercap'` (configurable con `REDMINE_INTERNAL_PROJECT`)
2. **Tracker**: `tracker_id = '19'` (Epic) - configurable con `REDMINE_INTERNAL_TRACKER`
3. **Custom Field 23**: `cf_23 = '*'` (Services-ID) - opcional, configurable con `REDMINE_INTERNAL_CF23`
4. **Estado**: `status_id = '*'` (todos los estados)

**Mapeo de Issues**:
- `redmine_id`: ID del issue
- `titulo`: `issue.subject`
- `proyecto_completo`: `issue.project.name`
- `fecha_creacion`: `issue.created_on`
- `fecha_real_finalizacion`: Custom field 15
- `total_spent_hours`: `issue.total_spent_hours`
- `services_id`: Custom field 23
- `estado_redmine`: `issue.status.name`

**Límites**:
- Máximo 100 issues por sincronización (límite de Redmine)

### 3. Requerimientos de Clientes

**Endpoint**: `POST /api/redmine/sincronizar-req-clientes`

**Filtros Aplicados**:
1. **Proyecto**: `project_id = 'ut'` (proyecto principal)
2. **Tracker**: `tracker_id = '29'` (Requerimiento de Cliente)
3. **Estado**: `status_id = '*'` (todos los estados)

**Validaciones**:
1. **Omitir si**: `proyecto_completo = 'UT Mercap | Mantenimiento'` (mantenimiento)
2. **Omitir si**: `proyecto_completo` existe en `redmine_funcionalidades.titulo` (ya está en funcionalidades)

**Mapeo de Issues**:
- `redmine_id`: ID del issue
- `titulo`: `issue.subject` (limpia prefijos como "Análisis de alto nivel para: ")
- `descripcion`: `issue.description`
- `proyecto_completo`: `issue.project.name`
- `cliente`: Extraído desde `proyecto_completo` (antes de `|`)
- `fecha_creacion`: `issue.created_on`
- `fecha_real_finalizacion`: Custom field 15
- `total_spent_hours`: `issue.total_spent_hours`
- `estado_redmine`: `issue.status.name`
- `cf_91`: Custom field 91 (Es Reventa) - normalizado a `"Si"`/`"No"`/`null`
- `cf_92`: Custom field 92 (Proyecto Sponsor)
- `id_epic`: `issue.parent.id` (ID del epic padre)

**Límites**:
- Máximo 100 issues por sincronización (límite de Redmine)

### 4. Epics

**Endpoint**: `POST /api/epics/sincronizar` (desde funcionalidad-detalle)

**Filtros Aplicados**:
1. **Proyecto**: `project_id = proyectoCodigo` (identifier del proyecto de la funcionalidad)
2. **Tracker**: `tracker_id = '10'` (Epic) - configurable
3. **Estado**: `status_id = '*'` (todos los estados)

**Mapeo de Issues**:
- `epic_redmine_id`: `issue.id`
- `titulo`: `issue.subject`
- `fecha_inicio`: Custom field (si existe)
- `fecha_finalizacion`: Custom field 15 (Fecha real de finalización)
- `horas_dedicadas`: `issue.total_spent_hours`

---

## Persistencia de Datos

### Tablas de Redmine (Solo Lectura - Sincronizadas)

#### Tabla: `redmine_funcionalidades`

**Origen**: Proyectos de Redmine sincronizados

**Columnas**:
- `redmine_id` (VARCHAR, PRIMARY KEY) - Identifier del proyecto (ej: `ut-bancor`)
- `titulo` (TEXT) - Nombre completo del proyecto desde Redmine
- `cliente` (VARCHAR) - Cliente extraído desde título (antes de `|`)
- `fecha_creacion` (TIMESTAMP) - Fecha de creación del proyecto
- `reventa` (VARCHAR) - `Si`/`No`/`null` desde custom field 93
- `total_spent_hours` (NUMERIC) - Horas totales dedicadas
- `sincronizado_en` (TIMESTAMP) - Última sincronización

**Operaciones**:
- **INSERT/UPDATE**: `INSERT ... ON CONFLICT (redmine_id) DO UPDATE` - Solo en sincronización
- **SELECT**: Consultas desde vistas combinadas

**⚠️ IMPORTANTE**: Esta tabla **NO se edita manualmente**. Solo se actualiza en sincronización.

#### Tabla: `redmine_proyectos_internos`

**Origen**: Issues de tipo Epic del proyecto `ut-mercap`

**Columnas**:
- `redmine_id` (INTEGER, PRIMARY KEY) - ID del issue en Redmine
- `titulo` (TEXT) - Título del issue
- `proyecto_completo` (TEXT) - Nombre completo del proyecto
- `fecha_creacion` (TIMESTAMP) - Fecha de creación
- `fecha_real_finalizacion` (DATE) - Custom field 15
- `total_spent_hours` (NUMERIC) - Horas dedicadas
- `services_id` (VARCHAR) - Custom field 23 (Services-ID)
- `estado_redmine` (VARCHAR) - Estado desde `status.name`
- `sincronizado_en` (TIMESTAMP) - Última sincronización

**Operaciones**:
- **INSERT/UPDATE**: Solo en sincronización
- **SELECT**: Consultas desde modelos

#### Tabla: `redmine_req_clientes`

**Origen**: Issues de tipo Requerimiento de Cliente del proyecto `ut`

**Columnas**:
- `redmine_id` (INTEGER, PRIMARY KEY) - ID del issue
- `titulo` (TEXT) - Título del issue (limpio de prefijos)
- `descripcion` (TEXT) - Descripción desde Redmine
- `proyecto_completo` (TEXT) - Nombre completo del proyecto
- `cliente` (VARCHAR) - Cliente extraído desde `proyecto_completo`
- `fecha_creacion` (TIMESTAMP) - Fecha de creación
- `fecha_real_finalizacion` (DATE) - Custom field 15
- `total_spent_hours` (NUMERIC) - Horas dedicadas
- `estado_redmine` (VARCHAR) - Estado desde `status.name`
- `cf_91` (VARCHAR) - Es Reventa (`Si`/`No`/`null`)
- `cf_92` (VARCHAR) - Proyecto Sponsor
- `id_epic` (INTEGER) - ID del epic padre (`issue.parent.id`)
- `sincronizado_en` (TIMESTAMP) - Última sincronización

**Operaciones**:
- **INSERT/UPDATE**: Solo en sincronización
- **SELECT**: Consultas desde modelos

### Tablas Editables (Datos del Catálogo)

#### Tabla: `funcionalidades`

**Origen**: Creada automáticamente desde sincronización, datos editables por usuario

**Columnas**:
- `id` (SERIAL, PRIMARY KEY) - ID interno
- `redmine_id` (VARCHAR, UNIQUE) - Referencia a `redmine_funcionalidades.redmine_id`
- `titulo_personalizado` (TEXT) - **EDITABLE** - Título personalizado (sobrescribe título de Redmine)
- `descripcion` (TEXT) - **EDITABLE** - Descripción de la funcionalidad
- `seccion` (VARCHAR) - **EDITABLE** - Sección (Operatorias, Reportes e interfaces, Backoffice, etc.)
- `monto` (NUMERIC) - **EDITABLE** - Monto estimado (solo admin)
- `created_at` (TIMESTAMP) - Fecha de creación
- `updated_at` (TIMESTAMP) - Fecha de última actualización

**Operaciones**:
- **INSERT**: Automático en sincronización (solo `redmine_id` y `titulo_personalizado` inicial)
- **UPDATE**: Solo campos editables (`descripcion`, `seccion`, `monto`, `titulo_personalizado`)
- **SELECT**: Desde vista `v_funcionalidades_completas`

**⚠️ IMPORTANTE**: 
- Los datos de Redmine (`titulo`, `cliente`, `fecha_creacion`, etc.) **NO se guardan aquí**
- Se obtienen desde `redmine_funcionalidades` mediante JOIN
- Los campos editables **SIEMPRE persisten** (no se sobrescriben en sincronización)

#### Tabla: `proyectos_internos`

**Origen**: Creada automáticamente desde sincronización de proyectos internos

**Columnas**:
- `id` (SERIAL, PRIMARY KEY)
- `redmine_id` (INTEGER, UNIQUE) - Referencia a `redmine_proyectos_internos.redmine_id`
- `seccion` (VARCHAR) - **EDITABLE** - Sección del proyecto

**Operaciones**:
- **INSERT**: Automático en sincronización
- **UPDATE**: Solo campos editables
- **SELECT**: Con JOIN a `redmine_proyectos_internos`

#### Tabla: `req_clientes`

**Origen**: Creada automáticamente desde sincronización de requerimientos

**Columnas**:
- `id` (SERIAL, PRIMARY KEY)
- `redmine_id` (INTEGER, UNIQUE) - Referencia a `redmine_req_clientes.redmine_id`
- `seccion` (VARCHAR) - **EDITABLE** - Sección del requerimiento

**Operaciones**:
- **INSERT**: Automático en sincronización (con validación de duplicados)
- **UPDATE**: Solo campos editables
- **SELECT**: Con JOIN a `redmine_req_clientes`

### Vista: `v_funcionalidades_completas`

**Propósito**: Combinar datos de Redmine con datos editables

**Columnas**:
- Datos de `redmine_funcionalidades`: `redmine_id`, `titulo`, `cliente`, `fecha_creacion`, `reventa`, `total_spent_hours`
- Datos de `funcionalidades`: `titulo_personalizado`, `descripcion`, `seccion`, `monto`
- Datos de `score`: `score_calculado`, `origen`, `facturacion`, etc.

**Uso**: Consulta principal para listar funcionalidades con todos los datos

---

## Construcción de Vistas

### Patrón de Vistas: Modo Lectura vs Modo Edición

Las vistas utilizan un patrón de **doble renderizado**: un div para modo lectura y otro para modo edición.

**Ejemplo** (funcionalidad-detalle.ejs):

```ejs
<!-- Modo Lectura -->
<div id="descripcionView" style="display: block;">
    <%= funcionalidad.descripcion || 'Sin descripción' %>
</div>

<!-- Modo Edición -->
<div id="descripcionEdit" style="display: none;">
    <textarea 
        id="descripcionInput" 
        class="input"
    ><%= funcionalidad.descripcion || '' %></textarea>
</div>
```

**Toggle de Modo**:
```javascript
function toggleEdicion() {
    modoEdicion = !modoEdicion;
    if (modoEdicion) {
        descripcionView.style.display = 'none';
        descripcionEdit.style.display = 'block';
        // ... otros campos
    } else {
        descripcionView.style.display = 'block';
        descripcionEdit.style.display = 'none';
        guardarCambios(); // Guarda al salir del modo edición
    }
}
```

### Origen de Datos en Vistas

#### Datos desde Redmine (Solo Lectura)

**Se obtienen desde**:
- `redmine_funcionalidades` (para funcionalidades)
- `redmine_proyectos_internos` (para proyectos internos)
- `redmine_req_clientes` (para requerimientos)

**Campos mostrados**:
- `titulo` - Título desde Redmine (solo lectura, link a Redmine)
- `cliente` - Cliente extraído (solo lectura)
- `fecha_creacion` - Fecha de creación (solo lectura)
- `fecha_real_finalizacion` - Custom field 15 (solo lectura)
- `total_spent_hours` - Horas dedicadas (solo lectura)
- `estado_redmine` - Estado actual (solo lectura)
- `proyecto_completo` - Nombre completo del proyecto (solo lectura)

**Renderizado**:
```ejs
<!-- Ejemplo: Sponsor (cliente desde Redmine) -->
<div style="color: var(--text-secondary); font-size: 13px;">
    Sponsor
</div>
<span style="font-weight: 500;">
    <%= funcionalidad.cliente || '-' %>
</span>
<!-- NO tiene modo edición - es solo lectura -->
```

#### Datos Editables

**Se obtienen desde**:
- `funcionalidades` (para funcionalidades)
- `proyectos_internos` (para proyectos internos)
- `req_clientes` (para requerimientos)

**Campos editables**:
- `titulo_personalizado` - Título personalizado (sobrescribe título de Redmine)
- `descripcion` - Descripción de la funcionalidad
- `seccion` - Sección (dropdown con opciones predefinidas)
- `monto` - Monto estimado (solo admin)

**Renderizado**:
```ejs
<!-- Modo Lectura -->
<div id="descripcionView">
    <%= funcionalidad.descripcion || 'Sin descripción' %>
</div>

<!-- Modo Edición -->
<div id="descripcionEdit" style="display: none;">
    <textarea id="descripcionInput"><%= funcionalidad.descripcion || '' %></textarea>
</div>
```

### Identificación de Campos Editables vs Solo Lectura

#### Campos de Solo Lectura (Redmine)

**Identificadores**:
1. **No tienen div de edición**: Solo tienen un div de visualización
2. **Tienen link a Redmine**: Si tienen `redmine_id`, muestran link a Redmine
3. **Están en sección "Información de Redmine"**: En algunas vistas hay una sección dedicada
4. **No se guardan en tabla editable**: Están solo en tablas `redmine_*`

**Ejemplos**:
- `cliente` (sponsor) - Solo lectura, viene de Redmine
- `fecha_creacion` - Solo lectura, viene de Redmine
- `total_spent_hours` - Solo lectura, viene de Redmine
- `estado_redmine` - Solo lectura, viene de Redmine

#### Campos Editables

**Identificadores**:
1. **Tienen dos divs**: Uno para lectura (`*View`) y otro para edición (`*Edit`)
2. **Se muestran/ocultan con `toggleEdicion()`**: Cambian según el modo
3. **Se guardan en tabla editable**: Están en `funcionalidades`, `proyectos_internos`, etc.
4. **Tienen input/textarea/select**: Elementos de formulario en modo edición

**Ejemplos**:
- `titulo_personalizado` - Editable, guardado en `funcionalidades`
- `descripcion` - Editable, guardado en `funcionalidades`
- `seccion` - Editable (dropdown), guardado en `funcionalidades`
- `monto` - Editable (solo admin), guardado en `funcionalidades`

### Guardado de Cambios

**Endpoint**: `PUT /api/funcionalidades/:id`

**Body**:
```json
{
    "titulo_personalizado": "Título personalizado",
    "descripcion": "Descripción editada",
    "seccion": "Operatorias",
    "monto": 50000
}
```

**Proceso**:
1. Usuario edita campos en modo edición
2. Al salir del modo edición, se llama `guardarCambios()`
3. Se envía PUT request con campos editables
4. Backend actualiza solo campos editables en tabla `funcionalidades`
5. **NO se actualizan** datos de Redmine (solo lectura)

---

## Campos Editables vs Solo Lectura

### Funcionalidades

#### Campos de Solo Lectura (Redmine)

| Campo | Origen | Tabla | Descripción |
|-------|--------|-------|-------------|
| `redmine_id` | Redmine | `redmine_funcionalidades` | Identifier del proyecto |
| `titulo` | Redmine | `redmine_funcionalidades` | Título completo del proyecto |
| `cliente` | Redmine | `redmine_funcionalidades` | Cliente extraído desde título |
| `fecha_creacion` | Redmine | `redmine_funcionalidades` | Fecha de creación del proyecto |
| `reventa` | Redmine | `redmine_funcionalidades` | Si/No desde custom field 93 |
| `total_spent_hours` | Redmine | `redmine_funcionalidades` | Horas totales dedicadas |

**Renderizado**: Solo visualización, link a Redmine si aplica

#### Campos Editables

| Campo | Tabla | Tipo | Descripción |
|-------|-------|------|-------------|
| `titulo_personalizado` | `funcionalidades` | TEXT | Título personalizado (sobrescribe título de Redmine) |
| `descripcion` | `funcionalidades` | TEXT | Descripción de la funcionalidad |
| `seccion` | `funcionalidades` | VARCHAR | Sección (dropdown: Operatorias, Reportes e interfaces, Backoffice, Mercados, Contabilidad, Valuacion) |
| `monto` | `funcionalidades` | NUMERIC | Monto estimado (solo admin) |

**Renderizado**: Modo lectura + modo edición (input/textarea/select)

### Proyectos Internos

#### Campos de Solo Lectura (Redmine)

| Campo | Origen | Tabla | Descripción |
|-------|--------|-------|-------------|
| `redmine_id` | Redmine | `redmine_proyectos_internos` | ID del issue |
| `titulo` | Redmine | `redmine_proyectos_internos` | Título del issue |
| `proyecto_completo` | Redmine | `redmine_proyectos_internos` | Nombre completo del proyecto |
| `fecha_creacion` | Redmine | `redmine_proyectos_internos` | Fecha de creación |
| `fecha_real_finalizacion` | Redmine | `redmine_proyectos_internos` | Custom field 15 |
| `total_spent_hours` | Redmine | `redmine_proyectos_internos` | Horas dedicadas |
| `services_id` | Redmine | `redmine_proyectos_internos` | Custom field 23 |
| `estado_redmine` | Redmine | `redmine_proyectos_internos` | Estado desde `status.name` |

#### Campos Editables

| Campo | Tabla | Tipo | Descripción |
|-------|-------|------|-------------|
| `seccion` | `proyectos_internos` | VARCHAR | Sección del proyecto |

### Requerimientos de Clientes

#### Campos de Solo Lectura (Redmine)

| Campo | Origen | Tabla | Descripción |
|-------|--------|-------|-------------|
| `redmine_id` | Redmine | `redmine_req_clientes` | ID del issue |
| `titulo` | Redmine | `redmine_req_clientes` | Título del issue (limpio) |
| `descripcion` | Redmine | `redmine_req_clientes` | Descripción desde Redmine |
| `proyecto_completo` | Redmine | `redmine_req_clientes` | Nombre completo del proyecto |
| `cliente` | Redmine | `redmine_req_clientes` | Cliente extraído |
| `fecha_creacion` | Redmine | `redmine_req_clientes` | Fecha de creación |
| `fecha_real_finalizacion` | Redmine | `redmine_req_clientes` | Custom field 15 |
| `total_spent_hours` | Redmine | `redmine_req_clientes` | Horas dedicadas |
| `estado_redmine` | Redmine | `redmine_req_clientes` | Estado |
| `cf_91` | Redmine | `redmine_req_clientes` | Es Reventa (Si/No) |
| `cf_92` | Redmine | `redmine_req_clientes` | Proyecto Sponsor |
| `id_epic` | Redmine | `redmine_req_clientes` | ID del epic padre |

#### Campos Editables

| Campo | Tabla | Tipo | Descripción |
|-------|-------|------|-------------|
| `seccion` | `req_clientes` | VARCHAR | Sección del requerimiento |

---

## Endpoints API

### Sincronización con Redmine

#### Sincronizar Funcionalidades (Catálogo)
```
POST /api/redmine/sincronizar
```

**Requiere**: Permisos de administrador

**Body**:
```json
{
    "project_id": "ut-bancor",    // Opcional (default: REDMINE_DEFAULT_PROJECT)
    "tracker_id": "19",            // Opcional (default: REDMINE_DEFAULT_TRACKER)
    "max_total": 100               // Opcional (default: sin límite, max: 100)
}
```

**Proceso**:
1. Obtiene proyectos de Redmine filtrados (`cf_19='Unitrade'`, `cf_95='1'`)
2. Mapea proyectos a formato de catálogo
3. Inserta/actualiza en `redmine_funcionalidades`
4. Crea funcionalidades vacías en `funcionalidades` para proyectos nuevos
5. **NO actualiza** funcionalidades existentes (datos editables persisten)

**Respuesta**:
```json
{
    "success": true,
    "message": "Sincronización completada exitosamente",
    "redmine_funcionalidades": {
        "insertados": 10,
        "actualizados": 5,
        "total": 15
    },
    "funcionalidades": {
        "nuevas": 10,
        "actualizadas": 0
    }
}
```

#### Sincronizar Proyectos Internos
```
POST /api/redmine/sincronizar-proyectos-internos
```

**Requiere**: Permisos de administrador

**Body**:
```json
{
    "tracker_id": "19",            // Opcional (default: REDMINE_INTERNAL_TRACKER)
    "max_total": 100,              // Opcional (default: 100, max: 100)
    "cf_23": "*"                   // Opcional (default: REDMINE_INTERNAL_CF23)
}
```

**Proceso**:
1. Obtiene issues del proyecto `ut-mercap` con tracker `19` (Epic)
2. Filtra por custom field 23 (Services-ID) si se especifica
3. Mapea issues a formato de proyectos internos
4. Inserta/actualiza en `redmine_proyectos_internos`
5. Crea proyectos vacíos en `proyectos_internos` para issues nuevos
6. **NO actualiza** proyectos existentes

**Respuesta**:
```json
{
    "success": true,
    "message": "Sincronización de proyectos internos completada exitosamente",
    "redmine_proyectos_internos": {
        "insertados": 20,
        "actualizados": 10,
        "total": 30
    },
    "proyectos_internos": {
        "nuevos": 20,
        "actualizados": 0
    }
}
```

#### Sincronizar Requerimientos de Clientes
```
POST /api/redmine/sincronizar-req-clientes
```

**Requiere**: Permisos de administrador

**⚠️ SOLO CONSULTAS** - No se realizan modificaciones en Redmine

**Body**:
```json
{
    "tracker_id": "29",            // Opcional (default: '29')
    "max_total": 100               // Opcional (default: 100, max: 100)
}
```

**Proceso**:
1. Obtiene issues del proyecto `ut` con tracker `29` (Requerimiento de Cliente)
2. Valida y omite:
   - Proyectos de mantenimiento (`UT Mercap | Mantenimiento`)
   - Proyectos que ya existen en `redmine_funcionalidades`
3. Mapea issues a formato de requerimientos
4. Inserta/actualiza en `redmine_req_clientes`
5. Crea requerimientos vacíos en `req_clientes` para issues nuevos
6. **NO actualiza** requerimientos existentes

**Respuesta**:
```json
{
    "success": true,
    "message": "Sincronización de requerimientos de clientes completada exitosamente",
    "redmine_req_clientes": {
        "insertados": 15,
        "actualizados": 5,
        "omitidos": 2,
        "total": 22
    },
    "req_clientes": {
        "nuevos": 15,
        "actualizados": 0
    }
}
```

### Funcionalidades

#### Obtener Todas las Funcionalidades
```
GET /funcionalidades?busqueda=texto&seccion=Operatorias&sponsor=UT+Bancor&orden=score_total&direccion=desc
```

**Filtros**:
- `busqueda` - Búsqueda en título, descripción, cliente, sección
- `seccion` - Filtro por sección única
- `secciones[]` - Filtro por múltiples secciones
- `sponsor` - Filtro por sponsor (cliente) único
- `sponsors[]` - Filtro por múltiples sponsors
- `orden` - Ordenamiento: `titulo`, `score_total`, `monto`, `fecha_creacion`, `cliente`, `seccion`
- `direccion` - `asc` o `desc`

**Respuesta**: Renderiza página EJS con funcionalidades

#### Obtener Detalle de Funcionalidad
```
GET /funcionalidades/:id
```

**Parámetro**: `id` es el `redmine_id` (identifier del proyecto)

**Respuesta**: Renderiza página EJS con:
- Datos de Redmine (solo lectura)
- Datos editables (con modo edición)
- Epics relacionados
- Clientes productivos
- Requerimientos de clientes interesados

#### Actualizar Funcionalidad
```
PUT /api/funcionalidades/:id
```

**Body**:
```json
{
    "titulo_personalizado": "Título personalizado",
    "descripcion": "Descripción editada",
    "seccion": "Operatorias",
    "monto": 50000
}
```

**Proceso**:
1. Valida que la funcionalidad exista
2. Actualiza **solo campos editables** en tabla `funcionalidades`
3. **NO actualiza** datos de Redmine
4. Retorna funcionalidad actualizada

**Respuesta**:
```json
{
    "success": true,
    "funcionalidad": {
        "redmine_id": "ut-bancor",
        "titulo_personalizado": "Título personalizado",
        "descripcion": "Descripción editada",
        "seccion": "Operatorias",
        "monto": 50000,
        // ... otros campos desde vista
    }
}
```

---

## Configuración y Despliegue

### Variables de Entorno

**Archivo**: `.env` (no versionado)

```env
# Puerto del servidor (desarrollo)
PORT=3000

# Entorno
NODE_ENV=development

# Base de datos PostgreSQL (Neon)
DATABASE_URL=postgresql://user:password@host/database?sslmode=require

# Redmine API
REDMINE_URL=https://redmine.mercap.net
REDMINE_TOKEN=your_api_key_here

# Redmine - Proyectos por defecto
REDMINE_DEFAULT_PROJECT=ut-bancor
REDMINE_DEFAULT_TRACKER=19

# Redmine - Proyectos Internos
REDMINE_INTERNAL_PROJECT=ut-mercap
REDMINE_INTERNAL_TRACKER=19
REDMINE_INTERNAL_CF23=*

# Redmine - Filtros de Catálogo
REDMINE_PROJECT_PRODUCT_FILTER=Unitrade
REDMINE_PROJECT_CATALOG_FILTER=1

# Redmine - Custom Fields
REDMINE_CUSTOM_FIELD_CLIENTE_ID=20
REDMINE_CUSTOM_FIELD_SPONSOR_ID=94
REDMINE_CUSTOM_FIELD_REVENTA_ID=93

# Redmine - Límites
REDMINE_LIMIT_PER_REQUEST=100
REDMINE_SYNC_LIMIT=100

# Redmine - URL pública (para links)
REDMINE_PUBLIC_URL=https://redmine.mercap.net

# Autenticación JWT
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=24h

# Sesiones
SESSION_SECRET=your_session_secret_here
```

### Configuración de Base de Datos

**Archivo**: `src/config/database.js`

**Pool de Conexiones**:
- Máximo: 20 conexiones
- Timeout inactivo: 30 segundos
- Timeout de conexión: 10 segundos
- SSL: Requerido (para Neon)
- Search path: `public` (configurado en connection string)

### Despliegue en Vercel

**Archivo**: `vercel.json`

**Configuración**:
- Build: `@vercel/node`
- Entry point: `src/app.js`
- Routes: Todas las rutas van a `src/app.js`

**Variables de Entorno en Vercel**:
- `DATABASE_URL`
- `NODE_ENV=production`
- `REDMINE_URL`
- `REDMINE_TOKEN`
- `REDMINE_PUBLIC_URL`
- `JWT_SECRET`
- `SESSION_SECRET`
- Todas las variables de configuración de Redmine

### Scripts NPM

```json
{
  "dev": "nodemon src/app.js",
  "start": "node src/app.js",
  "build": "echo 'Build completado'",
  "vercel-build": "echo 'Vercel build completado'",
  "test:redmine": "node test-redmine.js"
}
```

---

## Notas Importantes

### Separación de Datos

**Principio Fundamental**: 
- **Datos de Redmine** → Tablas `redmine_*` (solo lectura, sincronizadas)
- **Datos del Catálogo** → Tablas editables (`funcionalidades`, `proyectos_internos`, etc.)

**Ventajas**:
- Los datos editables **nunca se pierden** en sincronización
- Los datos de Redmine se actualizan automáticamente
- Separación clara de responsabilidades

### Sincronización

**Reglas**:
1. **Solo lectura**: El sistema **NUNCA** modifica Redmine
2. **Upsert**: Usa `INSERT ... ON CONFLICT DO UPDATE` para insertar o actualizar
3. **No sobrescribe editables**: Los campos editables **SIEMPRE persisten**
4. **Crea registros vacíos**: Para nuevos proyectos/issues, crea registros vacíos en tablas editables

### Mapeo de Datos

**Extracción de Cliente**:
- Desde `titulo` del proyecto: `"UT Bancor | Proyecto"` → `cliente = "UT Bancor"`
- Desde `proyecto_completo` del issue: `"UT Mercap | Mantenimiento"` → `cliente = "UT Mercap"`

**Normalización**:
- `reventa`: `"1"` → `"Si"`, `"0"` → `"No"`, vacío → `null`
- `cf_91` (Es Reventa): Similar a `reventa`
- Fechas: Se convierten a formato ISO/TIMESTAMP

### Performance

- **Paginación**: Máximo 100 registros por request (límite de Redmine)
- **Delay entre requests**: 200ms para no saturar el servidor
- **Límites configurables**: Variables de entorno para controlar sincronización
- **Pool de conexiones**: Reutiliza conexiones para mejor performance

---

## Contacto y Mantenimiento

Este proyecto está en modo de mantenimiento limitado. Para nuevas funcionalidades o correcciones, consultar con el equipo de desarrollo.

**Autor**: Mercap Software
**Versión**: 1.0
**Licencia**: MIT
