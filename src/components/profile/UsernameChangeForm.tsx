import { useState } from 'preact/hooks';
import { authService } from '../../infrastructure/firebase/FirebaseAuthService';
import { USERNAME_CHANGE_COOLDOWN_MS } from '../../domain/entities/User';

interface Props {
    currentUsername: string;
    /** Timestamp del ultimo cambio. Undefined si nunca se cambio. */
    lastChangedAt?: Date;
}

/**
 * Form de cambio de username, dentro de /settings.
 *
 * - Validaciones cliente: ≥6 chars, [a-zA-Z0-9_]+, distinto del actual.
 * - Cooldown de 30 dias: si esta dentro del periodo, deshabilita el form y
 *   muestra fecha de proxima fecha de cambio disponible.
 * - Tras un cambio exitoso, refresca el `lastChangedAt` local para que el
 *   form se quede deshabilitado sin recargar.
 *
 * El uniqueness lo enforza el repo (lectura previa de `usernames/{newKey}`)
 * y las reglas Firestore (`allow create` falla si el doc existe). El cooldown
 * tambien esta enforzado server-side en las reglas de `users/{userId}`.
 */
export default function UsernameChangeForm({ currentUsername, lastChangedAt }: Props) {
    const [newUsername, setNewUsername] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [localLastChangedAt, setLocalLastChangedAt] = useState<Date | undefined>(lastChangedAt);

    // Calculo del cooldown
    const elapsedMs = localLastChangedAt ? Date.now() - localLastChangedAt.getTime() : Infinity;
    const remainingMs = USERNAME_CHANGE_COOLDOWN_MS - elapsedMs;
    const inCooldown = remainingMs > 0;
    const nextAvailableAt = localLastChangedAt
        ? new Date(localLastChangedAt.getTime() + USERNAME_CHANGE_COOLDOWN_MS)
        : null;

    const handleSubmit = async (e: Event) => {
        e.preventDefault();
        setError('');

        const candidate = newUsername.trim();

        if (candidate === currentUsername) {
            setError('Ese ya es tu username actual');
            return;
        }
        if (candidate.length < 6) {
            setError('El username debe tener al menos 6 caracteres');
            return;
        }
        if (!/^[a-zA-Z0-9_]+$/.test(candidate)) {
            setError('Solo letras, números y guiones bajos');
            return;
        }

        setSubmitting(true);
        try {
            const changedAt = await authService.changeUsername(candidate);
            setLocalLastChangedAt(changedAt);
            setNewUsername('');
        } catch (err: unknown) {
            const message = (err as { message?: string }).message || '';
            const code = (err as { code?: string }).code || '';

            if (message === 'username-taken') {
                setError('Ese username ya está en uso');
            } else if (message === 'cooldown-active' || code === 'permission-denied') {
                // Las reglas Firestore devuelven permission-denied si el cooldown
                // no se cumple server-side. Cubrimos los dos casos con el mismo
                // mensaje para que el user no se quede sin saber por que ha fallado.
                setError('Aún estás dentro del periodo de espera de 30 días');
            } else {
                console.error('Error changing username:', err);
                setError('Error al cambiar el username');
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form class="username-change-form" onSubmit={handleSubmit}>
            <h3 class="account-security-subtitle">Cambiar nombre de usuario</h3>
            <p class="account-security-help">
                Solo puedes cambiarlo una vez cada 30 días. Mínimo 6 caracteres,
                solo letras, números y guiones bajos.
            </p>

            <div class="form-group">
                <label class="form-label">Username actual</label>
                <input class="form-input" type="text" value={currentUsername} disabled />
            </div>

            <div class="form-group">
                <label class="form-label" for="newUsername">Username nuevo</label>
                <input
                    id="newUsername"
                    class="form-input"
                    type="text"
                    autoComplete="username"
                    value={newUsername}
                    onInput={(e) => setNewUsername((e.target as HTMLInputElement).value)}
                    disabled={inCooldown || submitting}
                    minLength={6}
                    pattern="[a-zA-Z0-9_]+"
                    required
                />
            </div>

            {error && <p class="form-error">{error}</p>}

            {inCooldown && nextAvailableAt && (
                <p class="username-change-cooldown">
                    Podrás cambiarlo de nuevo el{' '}
                    <strong>{nextAvailableAt.toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                    })}</strong>.
                </p>
            )}

            <button
                class="btn btn-primary"
                type="submit"
                disabled={inCooldown || submitting}
            >
                {submitting ? 'Cambiando...' : 'Cambiar username'}
            </button>

            <style>{`
                .username-change-form {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-3);
                }
                .username-change-form .form-group {
                    margin-bottom: 0;
                }
                .username-change-form .btn {
                    align-self: flex-start;
                    margin-top: var(--space-2);
                }
                .username-change-cooldown {
                    margin: 0;
                    color: var(--text-secondary);
                    font-size: 0.875rem;
                }
            `}</style>
        </form>
    );
}
