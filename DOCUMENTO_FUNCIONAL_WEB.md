# Documento funcional (Web) — Catálogo Unitrade

> **Objetivo**: explicar cómo usar la web (menús, pantallas y botones) y detallar los llamados a la API que dispara la UI (requests + filtros).

## URL (Vercel)

- **Producción**: `https://TU-URL-EN-VERCEL.vercel.app` *(editar)*

## Acceso y roles

### Login

- **URL**: `/login`
- **Credencial**: una **contraseña** (no hay usuario).
- **Resultado**: al ingresar, se crea la cookie **HTTP Only** `auth_token` (JWT) con rol:
  - **Usuario** (password “normal”)
  - **Admin** (password “admin”)

### Permisos (qué puede hacer cada rol)

- **Usuario**
  - Navegar listados y detalles.
  - Editar campos “del catálogo” (descripción, sección, etc.) desde los detalles.
  - Evaluar y guardar **Score**.
- **Admin**
  - Todo lo anterior, más:
  - **Sincronizar** desde Redmine (botón circular de sync en listados).
  - **Actualizar Epics** de una funcionalidad.
  - **Mostrar/Ocultar** requerimientos (menú contextual en Req. Clientes).
  - Gestión “Cliente Redmine” en el módulo **Clientes** (Mapeo).

> Nota: algunas acciones pueden estar ocultas/deshabilitadas en UI para usuario, pero además el backend valida permisos (por ejemplo, sincronización y acciones admin responden `403` si no sos admin).

## Navegación (menú lateral)

El menú lateral (`sidebar`) tiene estos accesos:

- **Funcionalidades** (`/funcionalidades`): catálogo principal (búsqueda, filtros, score, detalle).
- **Clientes** (`/mapa`): “mapa” de adopción por cliente vs funcionalidad.
- **Req. Clientes** (`/req-clientes`): requerimientos de clientes sincronizados desde Redmine (solo consulta) + campos editables del catálogo.
- **Proyectos Internos** (`/proyectos-internos`): backlog interno sincronizado desde Redmine.
- **Ideas/Mejoras** (`/ideas-mejoras`): backlog de ideas internas (creación manual).

### Botón “Contraer/Expandir” del sidebar

- **Acción**: contrae/expande el menú lateral.
- **Persistencia**: guarda estado en `localStorage` (`sidebarCollapsed=true/false`).

## Conceptos clave (para entender la herramienta)

- **Funcionalidad**: ítem principal del catálogo (viene de Redmine y se “enriquece” en esta web con campos editables).
- **Sponsor**: se muestra como **Cliente** (proviene del nombre del proyecto/issue en Redmine o campos mapeados).
- **Sección**: clasificación funcional (Operatorias, Backoffice, etc.). Se usa para filtros.
- **Score**: prioridad calculada en base a criterios (sliders 0–10). Se guarda por ítem.
- **Redmine**:
  - La web **no modifica Redmine** (solo consulta), pero sincroniza datos hacia su base local.
  - Los links “Ver en Redmine” usan `REDMINE_PUBLIC_URL` (si existe) o `REDMINE_URL`.

---

## Módulo: Funcionalidades (`/funcionalidades`)

### Qué se ve

- Listado en **Vista lista** o **Vista tarjetas**
- Filtros por **Sección** (multi) y **Sponsor** (multi)
- Ordenamiento por columnas (click en header)
- Búsqueda + sugerencias
- (Admin) botón **Sincronizar** (círculo) y botón **Agregar**

### Botones y comportamiento

- **Sección / Sponsor (filtros)**: abre dropdown con checkboxes; al marcar/desmarcar actualiza el listado.
- **Borrar filtros**: elimina filtros activos.
- **Vista lista / Vista tarjetas**: cambia la presentación (mantiene filtros).
- **Ordenar columnas**: click en el encabezado → alterna `asc/desc`.
- **Buscar**: Enter aplica `busqueda=...`.
- **Sugerencias de búsqueda**: aparecen al escribir (mínimo 2 caracteres).
- **(Admin) Sincronizar con Redmine**: dispara una sincronización manual.
- **(Admin) Agregar**: abre modal “Nueva Funcionalidad” (creación manual).
- **Eliminar**:
  - En vista tarjetas: botón “⋮” elimina la funcionalidad.
  - En detalle: botón “Eliminar” (visible para admin).

### Requests y filtros (cómo se arma)

#### 1) Listado (página)

- **GET** `/funcionalidades`
- **Query params (filtros)**:
  - `busqueda` (string)
  - `seccion` (string) *(compatibilidad, filtro simple)*
  - `secciones` (repetible) *(multi select)*. Ej: `...?secciones=Backoffice&secciones=Mercados`
  - `sponsor` (string) *(compatibilidad, filtro simple)*
  - `sponsors` (repetible) *(multi select)*. Ej: `...?sponsors=UT%20Bancor&sponsors=UT%20Galicia`
  - `orden` (string): `score_total` (default), `titulo`, `seccion`, `fecha_creacion`, `sponsor`, etc.
  - `direccion` (string): `asc` | `desc`
  - `vista` (string): `lista` | `tarjetas`

#### 2) Sugerencias de búsqueda (AJAX)

- **GET** `/api/funcionalidades/sugerencias?q=<texto>`
- **Filtro aplicado**:
  - `q` debe tener **>= 2 caracteres** (si no, devuelve lista vacía).
- **Respuesta**: `[{ id, titulo, seccion, sponsor }]` (máximo 8 sugerencias).

#### 3) Cargar funcionalidades para sugerencias (AJAX)

- **GET** `/api/funcionalidades`
- **Query params**:
  - `busqueda`, `seccion`, `orden`, `direccion` (opcionales)
- **Uso**: pre-carga dataset en memoria para sugerencias “locales” (según página).

#### 4) Sincronizar con Redmine (admin)

- **POST** `/api/redmine/sincronizar`
- **Headers**: `Content-Type: application/json`
- **Body (UI envía)**:

```json
{
  "project_id": null,
  "tracker_id": null,
  "max_total": null
}
```

- **Filtros aplicados del lado servidor**:
  - `project_id`: si viene null → usa `REDMINE_DEFAULT_PROJECT`
  - `tracker_id`: si viene null → usa `REDMINE_DEFAULT_TRACKER`
  - `max_total`: si viene null → puede usar `REDMINE_SYNC_LIMIT`
  - En la obtención de proyectos, filtra por custom fields:
    - `cf_19 = REDMINE_PROJECT_PRODUCT_FILTER` (default “Unitrade”)
    - `cf_95 = REDMINE_PROJECT_CATALOG_FILTER` (default “1”)

#### 5) Crear funcionalidad manual (admin en UI)

- **POST** `/funcionalidades`
- **Headers**: `Content-Type: application/json`
- **Body (modal)**: combina campos de catálogo + campos “tipo Redmine” opcionales:

```json
{
  "titulo": "Texto",
  "titulo_personalizado": "Texto",
  "descripcion": "Texto o null",
  "seccion": "Operatorias | ... | null",
  "monto": 50000,
  "redmine_id": "opcional (identifier) o null",
  "proyecto": "opcional",
  "cliente": "opcional",
  "reventa": "Si | No | null",
  "fecha_creacion": "YYYY-MM-DD o null",
  "total_spent_hours": 12.5
}
```

#### 6) Eliminar funcionalidad

- **DELETE** `/funcionalidades/:id`
- `:id` suele ser `redmine_id` (identifier del proyecto) o id interno.

---

## Detalle de Funcionalidad (`/funcionalidades/:id`)

### Botones y comportamiento

- **Volver**: vuelve a la pantalla anterior (historial del navegador).
- **Editar / Guardar**:
  - Entra en modo edición (muestra inputs) y al volver a “Guardar” persiste cambios.
  - Guarda “cambios pendientes” en `localStorage` bajo la clave `cambiosPendientes_<id>`.
- **Evaluar**: abre calculadora de Score para esa funcionalidad.
- **(Admin) Epics**: sincroniza epics desde Redmine para el proyecto y recarga.
- **(Admin) Eliminar**: elimina la funcionalidad y vuelve al listado.
- **Productivo en → Versión**:
  - En modo edición, aparece un input por cliente productivo; al perder foco (blur) guarda la versión.

### Requests (cómo se arma)

#### 1) Guardar cambios del catálogo (campos editables)

- **PUT** `/funcionalidades/:id`
- **Headers**: `Content-Type: application/json`
- **Body**:

```json
{
  "titulo_personalizado": "Texto o null",
  "descripcion": "Texto",
  "seccion": "Texto",
  "monto": 50000
}
```

#### 2) Actualizar epics (admin)

- **POST** `/funcionalidades/:id/actualizar-epics`
- **Headers**: `Content-Type: application/json`
- **Body**: *(vacío)*
- **Filtros aplicados**:
  - Si `redmine_id` es numérico → primero consulta a Redmine para obtener el `project.identifier`.
  - Luego consulta epics del proyecto:
    - `GET /issues.json?project_id=<identifier>&tracker_id=19&status_id=*`

#### 3) Guardar versión por cliente (Productivo en)

- **PUT** `/funcionalidades/:id/clientes/:clienteId/version`
- **Headers**: `Content-Type: application/json`
- **Body**:

```json
{ "version": "1.0.0" }
```

---

## Módulo: Clientes (Mapa) (`/mapa`)

### Qué se ve

- Tabla “Funcionalidad × Cliente” con estados comerciales por celda.
- Flechas laterales para scroll horizontal (cuando hay muchas columnas).
- Métricas y gráficos (estados comerciales, top clientes, top funcionalidades).
- (Admin) panel “Gestión de Cliente Redmine”.

### Botones y comportamiento

- **Celda “+” / estado**:
  - Click abre dropdown de estados.
  - Seleccionar un estado actualiza la relación.
  - Opción **Limpiar** elimina la relación (queda “+”).
- **(Admin) Gestión de Cliente Redmine**
  - Seleccionar “Cliente (Web)” carga relaciones actuales.
  - “Agregar” agrega una relación cliente↔cliente_redmine.
  - “Eliminar” elimina una relación cliente↔cliente_redmine.

### Requests (cómo se arma)

#### 1) Actualizar estado comercial (crear/actualizar relación)

- **PUT** `/mapa/estado/:clienteId/:funcionalidadId`
- **Headers**: `Content-Type: application/json`
- **Body**:

```json
{ "estado_comercial": "productivo" }
```

- **Estados válidos**:
  - `productivo`, `interesado`, `rechazado`, `en desarrollo`, `Propuesta enviada`
- **Eliminar relación** (limpiar):
  - Enviar `estado_comercial: null` o `""` → el backend elimina la relación.

#### 2) (Admin) Obtener lista de clientes Redmine

- **GET** `/mapa/clientes-redmine`

#### 3) (Admin) Obtener relaciones cliente↔cliente_redmine de un cliente

- **GET** `/mapa/clientes/:clienteId/cliente-redmine`

#### 4) (Admin) Actualizar relaciones cliente↔cliente_redmine

- **PUT** `/mapa/clientes/:clienteId/cliente-redmine`
- **Headers**: `Content-Type: application/json`
- **Body**:

```json
{
  "clientesRedmine": ["Cliente Redmine A", "Cliente Redmine B"]
}
```

---

## Módulo: Req. Clientes (`/req-clientes`)

### Qué se ve

- Listado en vista lista/tarjetas.
- Filtro por Sección (multi).
- Búsqueda + sugerencias.
- (Admin) “Mostrar ocultos”.
- (Admin) sincronización “SOLO CONSULTA” desde Redmine.

### Botones y comportamiento

- **Sincronizar** (admin): consulta Redmine y actualiza la base local (no escribe en Redmine).
- **Mostrar ocultos** (admin): agrega/quita `mostrarOcultos=true` en la URL.
- **Ocultar/Mostrar** (admin): en vista lista, click derecho sobre un ítem abre menú contextual.
- **Eliminar**: en tarjetas, “⋮” elimina el requerimiento.
- **Evaluar**: disponible desde el detalle.

### Requests y filtros

#### 1) Listado (página)

- **GET** `/req-clientes`
- **Query params**:
  - `busqueda`
  - `secciones` (repetible)
  - `orden`, `direccion`
  - `vista` (`lista` | `tarjetas`)
  - `mostrarOcultos=true` *(solo admin en UI)*

#### 2) Sugerencias (AJAX)

- **GET** `/api/req-clientes/sugerencias?q=<texto>`
- **Condición**: `q` debe tener **>= 2 caracteres**.

#### 3) Sincronización (admin, solo consulta)

- **POST** `/api/redmine/sincronizar-req-clientes`
- **Headers**: `Content-Type: application/json`
- **Body (UI envía)**:

```json
{
  "tracker_id": null,
  "max_total": null
}
```

- **Filtros aplicados del lado servidor**:
  - `project_id = REDMINE_DEFAULT` (por defecto “ut” según configuración interna)
  - `tracker_id = 29` si no se envía
  - `status_id = *` (todos)
  - Omite mantenimiento y evita duplicados con funcionalidades del catálogo.

#### 4) Ocultar / Mostrar (admin)

- **PUT** `/req-clientes/:id/ocultar`
- **Headers**: `Content-Type: application/json`
- **Body**:

```json
{ "oculto": true }
```

#### 5) Eliminar

- **DELETE** `/req-clientes/:id`

---

## Detalle de Req. Cliente (`/req-clientes/:id`)

### Botones y comportamiento

- **Volver**
- **Editar / Guardar**: edita descripción y sección (campos del catálogo).
- **Evaluar**: abre calculadora de Score para ese requerimiento.
- **(Admin) Actualizar**: si tiene `id_epic`, consulta a Redmine el epic padre y actualiza datos del epic en la base local.

### Requests

#### 1) Guardar cambios

- **PUT** `/req-clientes/:id`
- **Headers**: `Content-Type: application/json`
- **Body**:

```json
{ "descripcion": "Texto", "seccion": "Texto" }
```

#### 2) (Admin) Actualizar Epic asociado

- **POST** `/req-clientes/:id/actualizar-epic`
- **Body**: *(vacío)*
- **Qué consulta en Redmine**: `GET /issues/<id_epic>.json?status_id=*&key=...`
- **Qué actualiza**: estado y fechas del epic (inicio/fin) en la base local.

---

## Módulo: Proyectos Internos (`/proyectos-internos`)

### Qué se ve

- Listado en vista lista/tarjetas.
- Filtro por Sección (multi), búsqueda + sugerencias, ordenamiento.
- (Admin) sincronización desde Redmine.
- Alias: `/backlog-proyectos` redirige a este módulo.

### Requests y filtros

#### 1) Listado (página)

- **GET** `/proyectos-internos`
- **Query params**: `busqueda`, `secciones`, `orden`, `direccion`, `vista`

#### 2) Sugerencias (AJAX)

- **GET** `/api/proyectos-internos/sugerencias?q=<texto>`
- **Condición**: `q` debe tener **>= 2 caracteres**.

#### 3) Sincronización (admin)

- **POST** `/api/redmine/sincronizar-proyectos-internos`
- **Headers**: `Content-Type: application/json`
- **Body (UI envía)**:

```json
{
  "tracker_id": null,
  "max_total": null
}
```

#### 4) Eliminar

- **DELETE** `/proyectos-internos/:id`

---

## Detalle de Proyecto Interno (`/proyectos-internos/:id`)

### Botones y comportamiento

- **Volver**
- **Editar / Guardar**: edita descripción y sección.
- **Evaluar**: abre calculadora de Score del proyecto.

### Request

- **PUT** `/proyectos-internos/:id`
- **Headers**: `Content-Type: application/json`
- **Body**:

```json
{ "descripcion": "Texto", "seccion": "Texto" }
```

---

## Módulo: Ideas/Mejoras (`/ideas-mejoras`)

### Qué se ve

- Backlog manual de ideas.
- “Nueva Idea” (modal), filtros por sección, búsqueda + sugerencias, vista lista/tarjetas.

### Requests

#### 1) Crear idea (modal)

- **POST** `/ideas-mejoras`
- **Headers**: `Content-Type: application/json`
- **Body**:

```json
{ "titulo": "Texto", "seccion": "Texto", "descripcion": "Texto" }
```

#### 2) Sugerencias

- **GET** `/ideas-mejoras/sugerencias?q=<texto>`
- **Condición**: `q` debe tener **>= 2 caracteres**.

#### 3) Eliminar idea

- **DELETE** `/ideas-mejoras/:id`

---

## Detalle de Idea/Mejora (`/ideas-mejoras/:id`)

### Botones

- **Volver**
- **Editar / Guardar**: edita título, descripción y sección.
- **Evaluar**: abre calculadora de Score de la idea.
- **Eliminar**

### Requests

- **PUT** `/ideas-mejoras/:id`
- **DELETE** `/ideas-mejoras/:id`
- **GET** `/ideas-mejoras/:id/score` *(abre la calculadora)*

---

## Módulo: Score

### Ranking (`/score`)

- Muestra ranking y métricas globales.
- Botón **Evaluar** abre `/score/calculadora/:id`.

### Calculadora (`/score/calculadora/:id`)

- Sliders 0–10 por criterio.
- Botón **Guardar Score** guarda y vuelve al módulo correspondiente (funcionalidades / proyectos internos / req clientes / ideas).

### Request de guardado (AJAX)

- **PUT** `/score/:id`
- **Headers**: `Content-Type: application/json`
- **Body** (criterios):

```json
{
  "facturacion": 0,
  "facturacion_potencial": 0,
  "impacto_cliente": 0,
  "esfuerzo": 0,
  "incertidumbre": 0,
  "riesgo": 0
}
```

> Nota: para proyectos internos / req clientes / ideas, el backend también acepta `origen` (si no viene, guarda 0).

---

## Variables de entorno (editar)

> **En Vercel**: Project → Settings → Environment Variables.  
> **En local**: archivo `.env` en la raíz de `catalogo/`.

```env
# === App ===
NODE_ENV=production
PORT=3000

# === Base de datos ===
DATABASE_URL=

# === Login (obligatorias) ===
LOGIN_PASSWORD=
LOGIN_PASSWORD_ADMIN=

# === JWT / sesiones ===
JWT_SECRET=
JWT_EXPIRES_IN=24h
SESSION_SECRET=

# === Redmine ===
REDMINE_URL=
REDMINE_PUBLIC_URL=
REDMINE_TOKEN=

# Defaults / filtros Redmine
REDMINE_DEFAULT_PROJECT=
REDMINE_DEFAULT_TRACKER=
REDMINE_INTERNAL_PROJECT=
REDMINE_INTERNAL_TRACKER=
REDMINE_INTERNAL_CF23=*
REDMINE_PROJECT_PRODUCT_FILTER=Unitrade
REDMINE_PROJECT_CATALOG_FILTER=1
REDMINE_LIMIT_PER_REQUEST=100
REDMINE_SYNC_LIMIT=100

# Debug
DEBUG_SESSIONS=false
```

---

## Operación (tips y resolución de problemas)

- **Me redirige a `/login` todo el tiempo**
  - Revisar que `LOGIN_PASSWORD` y `LOGIN_PASSWORD_ADMIN` estén configuradas en el entorno.
  - Verificar que el navegador acepte cookies (se usa `auth_token`).
- **El botón de sincronización está deshabilitado**
  - Solo **admin** puede sincronizar; ingresar con la contraseña admin.
- **No hay datos en listados**
  - Funcionalidades/Proyectos/Req. Clientes dependen de sincronización (manual en UI para admin).
- **Links a Redmine apuntan mal**
  - Ajustar `REDMINE_PUBLIC_URL` (prioritario) o `REDMINE_URL`.

