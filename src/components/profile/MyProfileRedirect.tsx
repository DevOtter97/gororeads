import { useEffect } from 'preact/hooks';
import { useAuth } from '../../hooks/useAuth';
import LoadingState from '../LoadingState';

/**
 * Compat: la antigua ruta /profile (que mostraba el editor) ahora va a
 * /settings. Para no romper bookmarks ni links viejos, /profile redirige al
 * perfil publico del usuario actual (/profile/[su-username]). Si no hay
 * sesion, va al login (/).
 */
export default function MyProfileRedirect() {
    const { user, authResolved } = useAuth();

    useEffect(() => {
        if (!authResolved) return;
        if (!user) {
            globalThis.location.replace('/');
        } else {
            globalThis.location.replace(`/profile/${user.username}`);
        }
    }, [user, authResolved]);

    return <LoadingState message="Redirigiendo..." />;
}
