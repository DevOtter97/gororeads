import { useState, useEffect } from 'preact/hooks';
import { authService } from '../infrastructure/firebase/FirebaseAuthService';
import type { User } from '../domain/entities/User';

export interface UseAuthOptions {
    /**
     * Si se proporciona, redirige a esta URL cuando el usuario no esta
     * autenticado. Util para paginas que requieren login.
     *
     * Ejemplos:
     * - `'/'` para paginas que requieren auth (RootGate decide login)
     * - `undefined` para paginas publicas que opcionalmente muestran datos
     *   distintos si hay sesion (ej. lista publica)
     */
    redirectIfUnauthenticated?: string;
}

export interface UseAuthResult {
    /** Usuario actual o null si no hay sesion (o aun no se ha resuelto). */
    user: User | null;
    /**
     * `true` cuando ya tenemos respuesta del listener (haya o no usuario).
     * Util para evitar parpadeos al renderizar mientras Firebase aun esta
     * resolviendo la sesion persistida.
     */
    authResolved: boolean;
}

/**
 * Hook compartido para el patron auth-listener + opcional redirect, que se
 * repetia en 11+ componentes con ligeras variantes.
 *
 * Casos cubiertos:
 * - Pagina publica (no auth required): `useAuth()` -> user puede ser null
 * - Pagina protegida: `useAuth({ redirectIfUnauthenticated: '/' })` ->
 *   redirige a / si no hay sesion (RootGate alli mostrara login)
 *
 * NO cubre:
 * - Logica de redirect dependiente del user (ej. MyProfileRedirect que va
 *   a `/profile/${user.username}`). Esos casos siguen usando
 *   authService.onAuthStateChanged directamente.
 * - RootGate, que elige entre dos componentes en lugar de redirigir.
 */
export function useAuth(options: UseAuthOptions = {}): UseAuthResult {
    const initial = authService.getCurrentUser();
    const [user, setUser] = useState<User | null>(initial);
    const [authResolved, setAuthResolved] = useState<boolean>(initial !== null);

    useEffect(() => {
        const unsub = authService.onAuthStateChanged((u) => {
            setUser(u);
            setAuthResolved(true);
            if (!u && options.redirectIfUnauthenticated) {
                window.location.href = options.redirectIfUnauthenticated;
            }
        });
        return unsub;
        // Las options se capturan en el closure inicial. Cambiar
        // redirectIfUnauthenticated en runtime no es un caso real.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return { user, authResolved };
}
