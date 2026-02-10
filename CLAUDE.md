# GoroReads (leaflist)

Tracker de lecturas de manga, manhwa, novelas y webtoons con funciones sociales. Toda la UI esta en espanol.

## Stack

- **Framework**: Astro 5 con Preact como UI framework (`client:load` para interactividad)
- **Lenguaje**: TypeScript (strict, jsx: react-jsx, jsxImportSource: preact)
- **Backend**: Firebase (Auth + Firestore) - todo client-side, sin SSR adapter
- **Estilos**: CSS-in-JS via `<style>{``}</style>` dentro de cada componente + CSS variables globales en `src/styles/variables.css`
- **Sin testing framework** configurado

## Comandos

- `npm run dev` - servidor de desarrollo
- `npm run build` - build de produccion (requiere adapter para SSR, actualmente falla)
- `npx astro check` - type checking (1 error pre-existente en ReadingList.tsx: ReadingMeasureUnit)
- `npx tsc --noEmit` - type check sin emitir

## Arquitectura

```
src/
  config/firebase.ts          # Inicializacion Firebase (env vars PUBLIC_FIREBASE_*)
  domain/
    entities/                  # Modelos: User, Reading, CustomList
    interfaces/                # Contratos: IAuthService, IReadingRepository, IFriendRepository, INotificationRepository, ICustomListRepository
  infrastructure/firebase/     # Implementaciones Firestore de cada interface
  components/
    auth/                      # LoginForm, RegisterForm, UsernameSetupModal
    readings/                  # ReadingList, ReadingCard, ReadingForm, ReadingFilters, ReadingDetailsModal, StartReadingModal
    lists/                     # ListManager, CustomListCard, CustomListModal, PublicListView
    social/                    # SocialHub, FriendList, FriendRequestList, UserSearch
    notifications/             # NotificationBell
    Header.tsx                 # Header global con nav y NotificationBell
  layouts/                     # AuthLayout (login/register), BaseLayout (app con global.css)
  pages/                       # Rutas Astro
  styles/                      # variables.css (design tokens), global.css (componentes base)
```

## Patrones clave

- **Repository pattern**: Interfaces en `domain/interfaces/`, implementaciones en `infrastructure/firebase/`
- **Singletons**: Cada repository exporta una instancia (`export const friendRepository = new FirestoreFriendRepository()`)
  - Excepcion: `userRepository` es un objeto literal, no una clase
- **Barrel exports**: `domain/interfaces/index.ts` y `infrastructure/firebase/index.ts` (incompletos: no exportan friend, customList, ni user repos)
- **Importaciones directas**: Los componentes importan directamente del archivo del repo (ej: `from '../../infrastructure/firebase/FirestoreFriendRepository'`), no del barrel
- **Componentes Preact**: Hooks de `preact/hooks`, sin clases. Props tipadas con interfaces locales
- **CSS scoped**: Cada componente tiene su propio `<style>` tag inline usando CSS variables del design system

## Colecciones Firestore

| Coleccion | Descripcion | Seguridad |
|---|---|---|
| `users/{userId}` | Perfil de usuario (email, username, displayName) | Read: auth, Write: owner |
| `users/{userId}/friends/{friendId}` | Subcol de amigos (bidireccional) | Read: auth, Write: owner o friend |
| `usernames/{username}` | Reserva de usernames (lowercase) | Read: public, Create: auth |
| `readings/{readingId}` | Lecturas con tracking de progreso | CRUD: solo owner |
| `customLists/{listId}` | Listas publicas/privadas con readings embebidas | Read: public o owner, Write: owner |
| `customLists/{listId}/likes/{likeId}` | Likes en listas | Read: public, Write: auth |
| `customLists/{listId}/comments/{commentId}` | Comentarios en listas | Read: public, Create: auth, Delete: owner |
| `friend_requests/{requestId}` | Solicitudes de amistad (pending/accepted/rejected) | CRUD: from/to user |
| `notifications/{notificationId}` | Notificaciones (ej: friend_request_accepted) | Read/Update/Delete: destinatario, Create: auth |

## Rutas

| Ruta | Pagina | Componente principal |
|---|---|---|
| `/` | Login | LoginForm |
| `/register` | Registro | RegisterForm |
| `/dashboard` | Dashboard de lecturas | ReadingList |
| `/lists` | Mis listas | ListManager |
| `/list/[slug]` | Lista publica | PublicListView |
| `/social` | Comunidad (amigos, solicitudes, busqueda) | SocialHub |

## Design system (CSS variables)

- **Colores fondo**: `--bg-primary` (#0a0a0f), `--bg-secondary` (#12121a), `--bg-card` (#1a1a28) - tema oscuro
- **Acentos**: `--accent-primary` (purple #8b5cf6), `--accent-secondary` (cyan #06b6d4)
- **Status**: `--status-to-read`, `--status-reading`, `--status-completed`, `--status-dropped` (rojo, usado para badges), `--status-on-hold`
- **Categorias**: `--cat-manga`, `--cat-manhwa`, etc.
- **Espaciado**: `--space-1` a `--space-12`
- **Transiciones**: `--transition-fast`, `--transition-normal`

## Entidades principales

### User
`{ id, email, username, displayName?, photoURL?, createdAt, isProfileComplete? }`

### Reading
`{ id, userId, title, imageUrl?, category, status, measureUnit, tags[], currentChapter?, totalChapters?, notes?, referenceUrl?, isFavorite, startedAt?, finishedAt?, createdAt, updatedAt }`
- Categories: manga, manhwa, manhua, novel, light-novel, webtoon, other
- Statuses: to-read, reading, completed, dropped, on-hold

### CustomList
`{ id, userId, userName, name, description?, slug, coverImage?, readings: ListReading[], visibility, likesCount, createdAt, updatedAt }`
- Visibility: private, public, link

### FriendRequest
`{ id, fromUserId, fromUsername, fromUserPhotoUrl?, toUserId, status, createdAt }`

### Notification
`{ id, userId, type, title, message, fromUserId, fromUsername, fromUserPhotoUrl?, read, createdAt }`
- Types: `'friend_request_accepted'` (extensible)

## Notas

- La app no tiene SSR adapter configurado (el `astro build` falla). Se usa como SPA con `client:load`
- Auth flow: Login con email/password -> si el usuario no tiene username, muestra UsernameSetupModal
- Las amistades son bidireccionales: al aceptar una solicitud se crean 2 docs en subcollections de friends (via transaction)
- El sistema de notificaciones usa `onSnapshot` para conteo de no-leidas en tiempo real
- No hay framework de testing configurado
