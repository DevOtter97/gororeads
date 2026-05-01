import { useState } from 'preact/hooks';
import { authService } from '../../infrastructure/firebase/FirebaseAuthService';
import UsernameChangeForm from './UsernameChangeForm';

interface Props {
    /** Email actual del usuario, mostrado como referencia (no editable inline). */
    currentEmail: string;
    /** Username actual; usado por el form de cambio de username. */
    currentUsername: string;
    /** Timestamp del ultimo cambio de username (para cooldown). */
    usernameChangedAt?: Date;
}

type EmailState = {
    submitting: boolean;
    error: string;
    /** Email al que se envió el link de verificación, si lo hay. */
    pendingEmail: string;
};

type PasswordState = {
    submitting: boolean;
    error: string;
    success: boolean;
};

/**
 * Sección "Seguridad de la cuenta" dentro de /settings.
 *
 * Dos formularios independientes, cada uno con su re-auth:
 * - Cambio de email -> verifyBeforeUpdateEmail (Firebase manda mail de
 *   confirmacion al nuevo address; el cambio solo aplica cuando el usuario
 *   pulsa el link de ese mail).
 * - Cambio de contraseña -> updatePassword directo tras re-auth.
 *
 * La uniqueness del email la enforza Firebase Auth (devuelve
 * `auth/email-already-in-use` si ya esta cogido). No hace falta check previo.
 */
export default function AccountSecurityForm({ currentEmail, currentUsername, usernameChangedAt }: Props) {
    // ─────────────────────────────── Email change ───────────────────────────────
    const [newEmail, setNewEmail] = useState('');
    const [emailPassword, setEmailPassword] = useState('');
    const [emailState, setEmailState] = useState<EmailState>({
        submitting: false,
        error: '',
        pendingEmail: '',
    });

    const handleEmailSubmit = async (e: Event) => {
        e.preventDefault();
        setEmailState({ submitting: true, error: '', pendingEmail: '' });

        try {
            const trimmed = newEmail.trim();

            if (!trimmed) {
                throw new Error('Introduce un email nuevo');
            }
            if (trimmed === currentEmail) {
                throw new Error('Ese ya es tu email actual');
            }

            await authService.reauthenticate(emailPassword);
            await authService.requestEmailChange(trimmed);

            setEmailState({ submitting: false, error: '', pendingEmail: trimmed });
            setNewEmail('');
            setEmailPassword('');
        } catch (err: unknown) {
            const code = (err as { code?: string }).code;
            const message = (err as { message?: string }).message;

            let display = 'Error al cambiar el email';
            if (code === 'auth/email-already-in-use') display = 'Ese email ya está en uso por otra cuenta';
            else if (code === 'auth/invalid-email') display = 'Email no válido';
            else if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') display = 'Contraseña actual incorrecta';
            else if (code === 'auth/too-many-requests') display = 'Demasiados intentos, prueba más tarde';
            else if (message) display = message;

            setEmailState({ submitting: false, error: display, pendingEmail: '' });
        }
    };

    // ─────────────────────────── Password change ────────────────────────────
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordState, setPasswordState] = useState<PasswordState>({
        submitting: false,
        error: '',
        success: false,
    });

    const handlePasswordSubmit = async (e: Event) => {
        e.preventDefault();
        setPasswordState({ submitting: true, error: '', success: false });

        try {
            if (newPassword.length < 6) {
                throw new Error('La contraseña debe tener al menos 6 caracteres');
            }
            if (newPassword !== confirmPassword) {
                throw new Error('Las contraseñas nuevas no coinciden');
            }
            if (newPassword === currentPassword) {
                throw new Error('La nueva contraseña debe ser distinta de la actual');
            }

            await authService.reauthenticate(currentPassword);
            await authService.changePassword(newPassword);

            setPasswordState({ submitting: false, error: '', success: true });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: unknown) {
            const code = (err as { code?: string }).code;
            const message = (err as { message?: string }).message;

            let display = 'Error al cambiar la contraseña';
            if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') display = 'Contraseña actual incorrecta';
            else if (code === 'auth/weak-password') display = 'La nueva contraseña es demasiado débil';
            else if (code === 'auth/too-many-requests') display = 'Demasiados intentos, prueba más tarde';
            else if (message) display = message;

            setPasswordState({ submitting: false, error: display, success: false });
        }
    };

    return (
        <section class="account-security">
            <h2 class="account-security-heading">Seguridad de la cuenta</h2>

            {/* ────────────────── Cambio de username ────────────────── */}
            <UsernameChangeForm
                currentUsername={currentUsername}
                lastChangedAt={usernameChangedAt}
            />

            <hr class="account-security-divider" />

            {/* ────────────────── Cambio de email ────────────────── */}
            <form class="account-security-form" onSubmit={handleEmailSubmit}>
                <h3 class="account-security-subtitle">Cambiar email</h3>
                <p class="account-security-help">
                    Te enviaremos un email a la nueva dirección. El cambio solo se aplicará
                    cuando confirmes desde ese email.
                </p>

                <div class="form-group">
                    <label class="form-label">Email actual</label>
                    <input class="form-input" type="email" value={currentEmail} disabled />
                </div>

                <div class="form-group">
                    <label class="form-label" for="newEmail">Email nuevo</label>
                    <input
                        id="newEmail"
                        class="form-input"
                        type="email"
                        autoComplete="email"
                        value={newEmail}
                        onInput={(e) => setNewEmail((e.target as HTMLInputElement).value)}
                        required
                    />
                </div>

                <div class="form-group">
                    <label class="form-label" for="emailPassword">Contraseña actual</label>
                    <input
                        id="emailPassword"
                        class="form-input"
                        type="password"
                        autoComplete="current-password"
                        value={emailPassword}
                        onInput={(e) => setEmailPassword((e.target as HTMLInputElement).value)}
                        required
                    />
                </div>

                {emailState.error && <p class="form-error">{emailState.error}</p>}
                {emailState.pendingEmail && (
                    <p class="form-success">
                        Te hemos enviado un email a <strong>{emailState.pendingEmail}</strong>. Confírmalo
                        desde ahí para completar el cambio.
                    </p>
                )}

                <button class="btn btn-primary" type="submit" disabled={emailState.submitting}>
                    {emailState.submitting ? 'Enviando...' : 'Enviar email de confirmación'}
                </button>
            </form>

            <hr class="account-security-divider" />

            {/* ────────────────── Cambio de contraseña ────────────────── */}
            <form class="account-security-form" onSubmit={handlePasswordSubmit}>
                <h3 class="account-security-subtitle">Cambiar contraseña</h3>

                <div class="form-group">
                    <label class="form-label" for="currentPassword">Contraseña actual</label>
                    <input
                        id="currentPassword"
                        class="form-input"
                        type="password"
                        autoComplete="current-password"
                        value={currentPassword}
                        onInput={(e) => setCurrentPassword((e.target as HTMLInputElement).value)}
                        required
                    />
                </div>

                <div class="form-group">
                    <label class="form-label" for="newPassword">Contraseña nueva</label>
                    <input
                        id="newPassword"
                        class="form-input"
                        type="password"
                        autoComplete="new-password"
                        value={newPassword}
                        onInput={(e) => setNewPassword((e.target as HTMLInputElement).value)}
                        required
                        minLength={6}
                    />
                </div>

                <div class="form-group">
                    <label class="form-label" for="confirmPassword">Confirmar contraseña nueva</label>
                    <input
                        id="confirmPassword"
                        class="form-input"
                        type="password"
                        autoComplete="new-password"
                        value={confirmPassword}
                        onInput={(e) => setConfirmPassword((e.target as HTMLInputElement).value)}
                        required
                        minLength={6}
                    />
                </div>

                {passwordState.error && <p class="form-error">{passwordState.error}</p>}
                {passwordState.success && <p class="form-success">Contraseña actualizada correctamente.</p>}

                <button class="btn btn-primary" type="submit" disabled={passwordState.submitting}>
                    {passwordState.submitting ? 'Cambiando...' : 'Cambiar contraseña'}
                </button>
            </form>

            <style>{`
                .account-security {
                    max-width: 500px;
                    margin: var(--space-6) auto 0;
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: var(--border-radius-xl);
                    padding: var(--space-6);
                }
                .account-security-heading {
                    margin: 0 0 var(--space-5);
                    font-size: 1.125rem;
                    font-weight: 600;
                    color: var(--text-primary);
                }
                .account-security-subtitle {
                    margin: 0 0 var(--space-2);
                    font-size: 0.9375rem;
                    font-weight: 600;
                    color: var(--text-primary);
                }
                .account-security-help {
                    margin: 0 0 var(--space-4);
                    color: var(--text-secondary);
                    font-size: 0.8125rem;
                    line-height: 1.4;
                }
                .account-security-form {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-3);
                }
                .account-security-form .form-group {
                    margin-bottom: 0;
                }
                .account-security-form .btn {
                    align-self: flex-start;
                    margin-top: var(--space-2);
                }
                .account-security-divider {
                    margin: var(--space-6) 0;
                    border: none;
                    border-top: 1px solid var(--border-color);
                }
                .form-success {
                    color: var(--status-reading);
                    font-size: 0.875rem;
                    margin: 0;
                }
            `}</style>
        </section>
    );
}
