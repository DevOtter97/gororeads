import { useEffect, useState } from 'preact/hooks';
import { userRepository } from '../../infrastructure/firebase/FirestoreUserRepository';
import { useAuth } from '../../hooks/useAuth';
import Header from '../Header';
import LoadingState from '../LoadingState';
import EmptyState from '../EmptyState';
import AccountSecurityForm from './AccountSecurityForm';
import DeleteAccountSection from './DeleteAccountSection';
import type { User } from '../../domain/entities/User';

/**
 * Pagina /settings/security: agrupa los flujos sensibles de cuenta:
 * cambio de username, email, contraseña y eliminacion de cuenta.
 *
 * Fetcheo del perfil completo (no solo el del useAuth) porque necesitamos
 * `usernameChangedAt` para el cooldown del UsernameChangeForm — el listener
 * basico de useAuth lo tiene, pero el initial render emite el FirebaseUser
 * mapeado sin pasar por Firestore.
 */
export default function SecuritySettings() {
    const { user } = useAuth({ redirectIfUnauthenticated: '/' });
    const [profile, setProfile] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        const load = async () => {
            try {
                setLoading(true);
                const p = await userRepository.getUserProfile(user.id);
                if (p) setProfile(p);
            } catch (err) {
                console.error('Error loading profile:', err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [user?.id]);

    if (loading) return <LoadingState message="Cargando..." />;

    return (
        <div class="min-h-screen">
            <Header user={profile || user} activeTab="settings" />
            <main class="container main security-main">
                <div class="page-header">
                    <a href="/settings" class="back-link">← Volver a configuración</a>
                    <h1 class="page-title">Seguridad de la cuenta</h1>
                </div>

                {profile ? (
                    <>
                        <AccountSecurityForm
                            currentEmail={profile.email}
                            currentUsername={profile.username}
                            usernameChangedAt={profile.usernameChangedAt}
                        />
                        <DeleteAccountSection currentUsername={profile.username} />
                    </>
                ) : (
                    <EmptyState description="No se pudo cargar el perfil" />
                )}
            </main>

            <style>{`
                .security-main {
                    padding-top: var(--space-6);
                    padding-bottom: var(--space-12);
                }
                .back-link {
                    display: inline-block;
                    color: var(--text-secondary);
                    text-decoration: none;
                    font-size: 0.875rem;
                    margin-bottom: var(--space-3);
                    transition: color var(--transition-fast);
                }
                .back-link:hover { color: var(--accent-primary); }
            `}</style>
        </div>
    );
}
