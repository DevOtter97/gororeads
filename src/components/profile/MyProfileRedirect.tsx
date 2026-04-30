import { useEffect } from 'preact/hooks';
import { authService } from '../../infrastructure/firebase/FirebaseAuthService';
import LoadingState from '../LoadingState';

/**
 * Compat: la antigua ruta /profile (que mostraba el editor) ahora va a
 * /settings. Para no romper bookmarks ni links viejos, /profile redirige al
 * perfil publico del usuario actual (/profile/[su-username]). Si no hay
 * sesion, va al login (/).
 */
export default function MyProfileRedirect() {
    useEffect(() => {
        const unsub = authService.onAuthStateChanged((u) => {
            if (!u) {
                window.location.replace('/');
            } else {
                window.location.replace(`/profile/${u.username}`);
            }
        });
        return unsub;
    }, []);

    return <LoadingState message="Redirigiendo..." />;
}
