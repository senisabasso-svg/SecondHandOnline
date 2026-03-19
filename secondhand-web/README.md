# SecondHand Web (migraciÃ³n desde ProyectoMago / Java Swing)

Equivalente en **React + API Node** del gestor de segunda mano: proveedores, productos (prendas), venta con carrito e informes.

## Estructura

- `backend/` â€” Express + Prisma + **PostgreSQL** (pensado para Railway).
- `frontend/` â€” Vite + React + TypeScript (pensado para **Cloudflare Pages**).

## Desarrollo local

### Base de datos

Necesitas PostgreSQL y una URL de conexiÃ³n, por ejemplo:

```
postgresql://usuario:clave@localhost:5432/secondhand
```

### Backend

```bash
cd backend
copy .env.example .env   # edita DATABASE_URL
npm install
npx prisma db push
npm run dev
```

API en `http://localhost:3001`. Health: `GET /health`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

En desarrollo, Vite hace proxy de `/api` a `localhost:3001`, asÃ­ que no hace falta `VITE_API_URL`.

## Despliegue

### Railway (API + PostgreSQL)

1. Crea un proyecto en [Railway](https://railway.app).
2. AÃ±ade el plugin **PostgreSQL** y copia la variable `DATABASE_URL` que genera (o usa la referencia automÃ¡tica al enlazar el servicio).
3. Crea un servicio **desde GitHub** apuntando a este repo, **root directory**: `secondhand-web/backend`.
4. Variables de entorno del servicio Node:
   - `DATABASE_URL` â€” la proporciona Railway al vincular Postgres (o pÃ©gala manualmente).
   - `PORT` â€” Railway lo inyecta solo; no hace falta en local.
   - `CORS_ORIGIN` â€” URL(s) de tu front en Cloudflare, separadas por coma. Ejemplo: `https://secondhand.pages.dev`
5. **Build** (Settings â†’ Deploy): opcionalmente `npm install && npx prisma generate && npx prisma db push`
6. **Start**: `npm start`
7. La **primera vez**, asegÃºrate de ejecutar migraciones/esquema contra la BD de producciÃ³n:
   - Desde tu PC con la URL de Railway:  
     `set DATABASE_URL=... && cd backend && npx prisma db push`  
   - O incluye `npx prisma db push` en el comando de build (Ãºtil para el primer deploy).

Anota la URL pÃºblica del servicio (ej. `https://secondhand-api.up.railway.app`).

### Cloudflare Pages (frontend)

1. En [Cloudflare Dashboard](https://dash.cloudflare.com) â†’ **Workers & Pages** â†’ **Create** â†’ **Pages** â†’ Conectar el repositorio.
2. **Root directory**: `secondhand-web/frontend`
3. **Build command**: `npm run build`
4. **Build output directory**: `dist`
5. **Variables de entorno** (Production):
   - `VITE_API_URL` = URL base de tu API en Railway **sin** barra final, ej. `https://secondhand-api.up.railway.app`

Tras el deploy, aÃ±ade esa misma URL (origen de Pages) en Railway en `CORS_ORIGIN` para evitar bloqueos CORS.

El archivo `public/_redirects` envÃ­a todas las rutas a `index.html` (SPA).

## Mapeo respecto al proyecto Java

| Swing / SQLite        | Web                          |
|-----------------------|------------------------------|
| ProveedorPanel        | `/proveedores`               |
| ProductoPanel         | `/productos`                 |
| PrincipalPanel (venta)| `/`                          |
| InformePanel          | `/informes`                  |
| SQLite `prueba.db`    | PostgreSQL en Railway        |

Tablas equivalentes: `proveedores`, `productos`, `ventas`, `venta_items`, opcional `menu_precios` (API `/api/menu-precios`).