# Deployment Guide — Nuestra Historia

## Arquitectura

```
┌─────────────────┐       ┌─────────────────────────┐
│  FRONTEND       │       │  BACKEND (API)           │
│  Vercel         │──────▶│  Replit / Railway / etc  │
│  (estático)     │ /api  │  (Express 5 + PostgreSQL)│
└─────────────────┘       └─────────────────────────┘
```

- **Frontend**: Build estático de React + Vite, desplegado en Vercel.
- **Backend**: Express 5 con PostgreSQL, desplegado en Replit u otro servicio.
- **Comunicación**: Frontend llama al backend via `VITE_API_URL`.

---

## Paso 1: Desplegar el Backend (API)

El backend necesita un servicio que ejecute Express 24/7.

### Opción A: Replit (recomendado para empezar)

1. Importa el repo en Replit
2. Configura los Secrets:
   - `DATABASE_URL`
   - `SOL_ADMIN_PASSWORD`
   - `AARON_ADMIN_PASSWORD`
   - `PORT` = `5000`
   - `BASE_PATH` = `/`
   - `PRIVATE_OBJECT_DIR`
3. Ejecuta el proyecto
4. Anota la URL del backend (ej: `https://tu-repl.repl.co`)

### Opción B: Railway

1. Crea un proyecto en Railway
2. Conecta el repo
3. Configura las variables de entorno
4. Deploy manual o automático

### Opción C: Render

1. Crea un Web Service en Render
2. Build command: `pnpm install && pnpm --filter @workspace/api-server run build`
3. Start command: `node --enable-source-maps artifacts/api-server/dist/index.mjs`
4. Configura las variables de entorno

---

## Paso 2: Desplegar el Frontend en Vercel

1. Importa el repo en Vercel
2. Configura:
   - **Framework Preset**: Vite
   - **Root Directory**: `artifacts/nuestra-historia`
   - **Build Command**: `cd ../.. && pnpm install && pnpm --filter @workspace/nuestra-historia run build`
   - **Output Directory**: `dist/public`
3. Configura las Environment Variables en Vercel:
   ```
   VITE_API_URL=https://tu-backend-url.vercel.app
   BASE_PATH=/
   ```
4. Deploy

---

## Variables de Entorno

### Frontend (Vercel)

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `VITE_API_URL` | Sí | URL completa del backend API |
| `BASE_PATH` | No | Path base de Vite (default: `/`) |

### Backend (Replit/Railway/Render)

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `DATABASE_URL` | Sí | URL de PostgreSQL |
| `SOL_ADMIN_PASSWORD` | Sí | Contraseña de Sol |
| `AARON_ADMIN_PASSWORD` | Sí | Contraseña de Aaron |
| `PORT` | Sí | Puerto del servidor |
| `BASE_PATH` | No | Path base |
| `PRIVATE_OBJECT_DIR` | Sí | Directorio en GCS |
| `NODE_ENV` | No | `development` o `production` |

---

## Limitaciones Conocidas

1. **Storage**: Los archivos subidos (fotos/videos) dependen del sidecar de Replit.
   Si el backend está en otro servicio, necesitarás configurar Google Cloud Storage
   con credenciales reales (service account).

2. **Sesiones**: Las sesiones se almacenan en memoria. Si el backend se reinicia,
   todas las sesiones activas se pierden (los admins deben volver a loguearse).

3. **URL del Frontend**: Después del deploy, Vercel te asignará una URL como
   `https://nuestra-historia.vercel.app`.

4. **URL del Backend**: El backend debe estar corriendo 24/7 para que el frontend
   funcione. Si usas Replit free, se detiene después de inactividad.

---

## Verificación Post-Deploy

1. Abre la URL de Vercel
2. La página pública debe cargar (con datos si la API está activa, o con error si no)
3. Navega a `/admin`
4. Intenta loguearte
5. Verifica que las imágenes cargan (si hay contenido en la DB)
