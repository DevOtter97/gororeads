import { useState, useEffect } from 'preact/hooks';
import { authService } from '../../infrastructure/firebase/FirebaseAuthService';
import LoginForm from '../auth/LoginForm';
import HomeFeed from './HomeFeed';
import LoadingState from '../LoadingState';

/**
 * Componente raiz que decide que renderizar en `/`:
 * - Auth resolviendose -> spinner full screen
 * - Auth resuelto y user existe -> HomeFeed
 * - Auth resuelto sin user -> LoginForm con chrome de auth
 */
export default function RootGate() {
    const [authResolved, setAuthResolved] = useState(false);
    const [hasUser, setHasUser] = useState(authService.getCurrentUser() !== null);

    useEffect(() => {
        const unsub = authService.onAuthStateChanged((u) => {
            setHasUser(u !== null);
            setAuthResolved(true);
        });
        return unsub;
    }, []);

    if (!authResolved) return <LoadingState message="Cargando..." />;

    if (hasUser) return <HomeFeed />;

    return (
        <div class="auth-page">
            <div class="auth-card">
                <div class="auth-header">
                    <div class="logo" style="justify-content: center; margin-bottom: 1rem;">
                        <span class="logo-icon">📚</span>
                        <span style="font-size: 1.5rem; font-weight: 700;">GoroReads</span>
                    </div>
                    <h1 class="auth-title">Bienvenido de nuevo</h1>
                    <p class="auth-subtitle">Inicia sesión para gestionar tus lecturas</p>
                </div>

                <LoginForm />

                <div class="auth-footer">
                    <p>¿No tienes cuenta? <a href="/register">Regístrate aquí</a></p>
                </div>
            </div>
        </div>
    );
}
