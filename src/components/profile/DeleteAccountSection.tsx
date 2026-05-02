import { useState } from 'preact/hooks';
import { authService } from '../../infrastructure/firebase/FirebaseAuthService';

interface Props {
    /** Username actual; el usuario debe escribirlo para confirmar el borrado. */
    currentUsername: string;
}

/**
 * Seccion "Eliminar cuenta" en /settings/security. Doble verificacion:
 * 1. Escribir el username exacto (case-insensitive) — para evitar clicks
 *    accidentales en el boton.
 * 2. Contraseña actual — para re-auth, requisito de Firebase Auth para
 *    operaciones sensibles (ya lo enforza authService.deleteAccount).
 *
 * El borrado es cascade client-side (ver userRepository.cascadeDeleteUserData):
 * borra posts, lecturas, listas, notificaciones, friends/requests, username
 * reservation, user doc y por ultimo el user de Firebase Auth.
 *
 * Tras un borrado exitoso, redirigimos a /. El listener onAuthStateChanged
 * tambien emitira null, asi que la app limpia su estado sola.
 */
export default function DeleteAccountSection({ currentUsername }: Props) {
    const [confirmText, setConfirmText] = useState('');
    const [password, setPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const usernameMatches = confirmText.trim().toLowerCase() === currentUsername.toLowerCase();
    const canSubmit = usernameMatches && password.length > 0 && !submitting;

    const handleSubmit = async (e: Event) => {
        e.preventDefault();
        if (!canSubmit) return;
        setError('');
        setSubmitting(true);

        try {
            await authService.deleteAccount(password);
            // Redirigimos a / tras el borrado. El listener de auth ya emitio null.
            window.location.href = '/';
        } catch (err: unknown) {
            const code = (err as { code?: string }).code;
            const message = (err as { message?: string }).message;

            let display = 'Error al eliminar la cuenta';
            if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') display = 'Contraseña incorrecta';
            else if (code === 'auth/requires-recent-login') display = 'Por seguridad, vuelve a iniciar sesión y prueba de nuevo';
            else if (code === 'auth/too-many-requests') display = 'Demasiados intentos, prueba más tarde';
            else if (message) display = message;

            setError(display);
            setSubmitting(false);
        }
    };

    return (
        <section class="delete-account">
            <h2 class="delete-account-heading">Eliminar cuenta</h2>
            <div class="delete-account-warning">
                <p>
                    <strong>Esta acción es permanente y no se puede deshacer.</strong>
                </p>
                <p>Al eliminar tu cuenta:</p>
                <ul>
                    <li>Se borrarán todos tus posts, lecturas y listas.</li>
                    <li>Se eliminarán tus amistades y solicitudes pendientes.</li>
                    <li>Se liberará tu nombre de usuario para que otra persona pueda usarlo.</li>
                    <li>No podrás recuperar el acceso con este email.</li>
                </ul>
            </div>

            <form class="delete-account-form" onSubmit={handleSubmit}>
                <div class="form-group">
                    <label class="form-label" for="confirmUsername">
                        Para confirmar, escribe tu nombre de usuario: <code>{currentUsername}</code>
                    </label>
                    <input
                        id="confirmUsername"
                        class="form-input"
                        type="text"
                        autoComplete="off"
                        value={confirmText}
                        onInput={(e) => setConfirmText((e.target as HTMLInputElement).value)}
                        disabled={submitting}
                    />
                </div>

                <div class="form-group">
                    <label class="form-label" for="deletePassword">Contraseña actual</label>
                    <input
                        id="deletePassword"
                        class="form-input"
                        type="password"
                        autoComplete="current-password"
                        value={password}
                        onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
                        disabled={submitting}
                    />
                </div>

                {error && <p class="form-error">{error}</p>}

                <button class="btn btn-danger" type="submit" disabled={!canSubmit}>
                    {submitting ? 'Eliminando cuenta...' : 'Eliminar mi cuenta permanentemente'}
                </button>
            </form>

            <style>{`
                .delete-account {
                    max-width: 500px;
                    margin: var(--space-6) auto 0;
                    background: var(--bg-card);
                    border: 1px solid var(--status-danger);
                    border-radius: var(--border-radius-xl);
                    padding: var(--space-6);
                }
                .delete-account-heading {
                    margin: 0 0 var(--space-3);
                    font-size: 1.125rem;
                    font-weight: 600;
                    color: var(--status-danger);
                }
                .delete-account-warning {
                    margin-bottom: var(--space-5);
                    color: var(--text-secondary);
                    font-size: 0.875rem;
                }
                .delete-account-warning p {
                    margin: 0 0 var(--space-2);
                }
                .delete-account-warning ul {
                    margin: 0 0 0 var(--space-5);
                    padding: 0;
                }
                .delete-account-warning li {
                    margin-bottom: var(--space-1);
                }
                .delete-account-form {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-3);
                }
                .delete-account-form .form-group {
                    margin-bottom: 0;
                }
                .delete-account-form code {
                    background: var(--bg-secondary);
                    padding: 1px 6px;
                    border-radius: var(--border-radius-sm);
                    font-family: var(--font-mono, monospace);
                    color: var(--text-primary);
                    font-size: 0.875em;
                }
                .delete-account-form .btn {
                    align-self: flex-start;
                    margin-top: var(--space-2);
                }
            `}</style>
        </section>
    );
}
