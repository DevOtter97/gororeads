# 📚 GoroReads

> Tracker social de lecturas para manga, manhwa, manhua, novelas, light novels y webtoons.

GoroReads es una **PWA instalable** donde puedes llevar el control de lo que estás leyendo, organizarlo en listas, descubrir lo que leen tus amigos, y compartir tus lecturas en un feed. Diseñada para móvil y desktop, con tema oscuro y UI en español.

---

## ✨ Características

- 📖 **Biblioteca personal**: registra lecturas con portada, capítulos, estado, etiquetas, fechas y notas. Autocomplete con MyAnimeList y Open Library.
- 📋 **Listas custom**: agrupa lecturas en listas (privadas, públicas o compartibles por enlace).
- 👥 **Comunidad**: encuentra usuarios, manda solicitudes de amistad, ve sus perfiles y sus listas públicas.
- 📰 **Feed social**: comparte posts (texto, imagen, lectura, lista) que solo verán tus amigos. Comentarios, respuestas, likes y reposts.
- 🔔 **Notificaciones en tiempo real**: bell con contador de no leídas. Click te lleva al sitio relevante (post, perfil, solicitud).
- 📱 **PWA instalable**: en iOS Safari y Android Chrome. Bottom nav nativo en móvil, header inline en desktop.

---

## 🧱 Stack

- **Frontend**: [Astro 5](https://astro.build) + [Preact](https://preactjs.com) (`client:load` para hidratación)
- **Lenguaje**: TypeScript (strict)
- **Backend**: [Firebase](https://firebase.google.com) (Auth + Firestore + Storage), todo client-side
- **Hosting**: [Vercel](https://vercel.com) con `@astrojs/vercel` (rutas estáticas + serverless functions para SSR)
- **PWA**: [@vite-pwa/astro](https://vite-pwa-org.netlify.app/frameworks/astro) con manifest + service worker
- **APIs externas**:
  - [Jikan v4](https://jikan.moe) (MyAnimeList no oficial) — manga, manhwa, manhua, light novels, webtoons
  - [AniList](https://anilist.co/graphiql) — fallback de Jikan + queries cortas
  - [Open Library](https://openlibrary.org/developers/api) — novelas tradicionales

---

## 🚀 Empezar en local

### 1. Requisitos

- Node.js ≥ 20
- Una cuenta de Firebase con un proyecto creado y Firestore + Auth activos

### 2. Clonar e instalar

```bash
git clone https://github.com/DevOtter97/gororeads.git
cd gororeads
npm install
```

### 3. Configurar variables de entorno

Copia el ejemplo y rellena con los datos de tu app web de Firebase (Console → Project Settings → "Your apps"):

```bash
cp .env.example .env
```

Edita `.env`:

```dotenv
PUBLIC_FIREBASE_API_KEY=...
PUBLIC_FIREBASE_AUTH_DOMAIN=...
PUBLIC_FIREBASE_PROJECT_ID=...
PUBLIC_FIREBASE_STORAGE_BUCKET=...
PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
PUBLIC_FIREBASE_APP_ID=...
```

> Las variables `PUBLIC_*` se inyectan en el bundle del cliente. La seguridad real vive en las reglas de Firestore/Storage, no en ocultarlas.

### 4. Ejecutar

```bash
npm run dev          # http://localhost:4321
```

---

## 🧰 Scripts disponibles

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo con HMR |
| `npm run build` | Build de producción para Vercel (genera `.vercel/output/`) |
| `npm run preview` | Preview del build localmente |
| `npm run icons` | Regenera los iconos PWA desde `public/favicon.svg` |
| `npx tsc --noEmit` | Type check |
| `firebase deploy --only firestore:rules` | Despliega `firestore.rules` |
| `firebase deploy --only firestore:indexes` | Despliega índices Firestore |
| `firebase deploy --only storage` | Despliega `storage.rules` |

---

## 🗂️ Arquitectura

```
src/
├── config/firebase.ts          # Inicialización Firebase
├── domain/
│   ├── entities/               # Modelos: User, Reading, CustomList, Post, ExternalSearchResult
│   └── interfaces/             # Contratos de repositorios y servicios
├── infrastructure/
│   ├── firebase/               # Implementaciones Firestore + Storage
│   └── external/               # Clientes Jikan, AniList, Open Library
├── components/
│   ├── auth/                   # Login, registro
│   ├── readings/               # Lecturas + autocomplete
│   ├── lists/                  # Listas personalizadas
│   ├── social/                 # Comunidad, amigos, búsqueda
│   ├── home/                   # Feed, posts, comentarios, reposts
│   ├── profile/                # Perfil propio + público
│   └── notifications/          # Bell + página completa
├── layouts/                    # AuthLayout, BaseLayout
├── pages/                      # Rutas Astro
├── styles/                     # Variables y estilos globales
└── utils/                      # Helpers (compresión imagen, etc.)
```

Patrón **repository**: las interfaces viven en `domain/`, las implementaciones en `infrastructure/`. Los componentes Preact las consumen como singletons.

---

## 🔐 Reglas de seguridad

Todo el control de acceso vive en Firestore Rules y Storage Rules. Repaso rápido:

- **Posts del feed**: solo lo ven el autor o sus amigos (vía `exists()` en la subcolección `friends`).
- **Imágenes de posts**: cross-service rule en Storage que consulta Firestore para verificar amistad.
- **Listas**: privadas solo para el dueño, públicas para todos, link sólo accesible vía URL directa (no listadas en el perfil público).
- **Comentarios**: el autor del comentario es quien puede borrarlo.
- **Likes/reposts**: solo el propio usuario crea/borra el suyo.

Las reglas vienen versionadas en `firestore.rules` y `storage.rules`. Despliégalas con los comandos de Firebase CLI.

---

## 🌐 Despliegue en Vercel

1. Push a `main` → Vercel autodetecta Astro y aplica el adapter.
2. En Vercel → Project → **Settings → Environment Variables**: añade las mismas `PUBLIC_FIREBASE_*` que tienes en `.env`.
3. En Firebase Console → **Authentication → Settings → Authorized domains**: añade el dominio Vercel (`*.vercel.app` o tu dominio custom). Sin esto, login fallará por CORS.
4. Cada push a `main` lanza un deploy automático.

> El service worker (PWA) se regenera en cada build. Tras un deploy nuevo, el SW antiguo del navegador se reemplaza tras un reload (`registerType: 'autoUpdate'`).

---

## 📱 Instalar como app

### iOS Safari
1. Abre la web
2. Botón **Compartir** → **"Añadir a pantalla de inicio"**
3. Aparece como app standalone

### Android Chrome
1. Abre la web
2. Menú **⋮** → **"Instalar app"** o **"Añadir a pantalla de inicio"**
3. Aparece como app standalone

---

## 📚 APIs externas usadas

Cuando añades una lectura, el formulario consulta las APIs en función de la categoría seleccionada:

| Categoría | API primaria | Fallback |
|---|---|---|
| manga, manhwa, manhua, light-novel, webtoon | Jikan (MAL) | AniList (si Jikan falla o query <3 chars) |
| novel | Open Library | — |
| other | sin búsqueda | — |

Ninguna requiere API key. Las llamadas son client-side, debounced 400ms y cancelables (`AbortController`).

---

## 🛠️ Estado del proyecto

- ✅ MVP completo: lecturas, listas, comunidad, feed, notificaciones, PWA, deploy
- 🚧 Pendiente: testing automatizado, internacionalización (solo español por ahora), edición de posts
