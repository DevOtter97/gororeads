import { useState } from 'preact/hooks';
import { authService } from '../../infrastructure/firebase/FirebaseAuthService';
import UsernameSetupModal from './UsernameSetupModal';
import type { User } from '../../domain/entities/User';

interface Props {
    onSuccess?: () => void;
}

export default function RegisterForm({ onSuccess }: Props) {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');

    const [loading, setLoading] = useState(false);
    const [incompleteUser, setIncompleteUser] = useState<User | null>(null);

    const handleSocialLogin = async (method: 'google') => {
        setError('');
        setLoading(true);
        try {
            const user = await authService.loginWithGoogle();

            if (user.isProfileComplete === false) {
                setIncompleteUser(user);
                // Don't redirect yet
            } else {
                handleSuccess();
            }
        } catch (err: unknown) {
            console.error('Social Login Error:', err);
            const e = err as { code?: string; message?: string };
            if (e.code === 'auth/popup-closed-by-user') {
                setError('Registro cancelado');
            } else {
                setError('Error al registrarse con Google');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSuccess = () => {
        if (onSuccess) {
            onSuccess();
        } else {
            window.location.href = '/dashboard';
        }
    };

    const handleSubmit = async (e: Event) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        if (username.length < 6) {
            setError('El nombre de usuario debe tener al menos 6 caracteres');
            return;
        }

        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            setError('El nombre de usuario solo puede contener letras, números y guiones bajos');
            return;
        }

        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        setLoading(true);

        try {
            await authService.register({ username, email, password });
            await authService.register({ username, email, password });
            handleSuccess();
        } catch (err: unknown) {
            const firebaseError = err as { code?: string; message?: string };
            if (firebaseError.code === 'auth/email-already-in-use') {
                setError('Este email ya está registrado');
            } else if (firebaseError.code === 'auth/invalid-email') {
                setError('Email inválido');
            } else if (firebaseError.code === 'auth/weak-password') {
                setError('La contraseña es demasiado débil');
                setError('La contraseña es demasiado débil');
            } else {
                console.error('[Register] Error:', firebaseError);
                setError(`Error al crear la cuenta: ${firebaseError.message || firebaseError.code}`);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <div class="form-group">
                <label class="form-label" for="username">Usuario</label>
                <input
                    id="username"
                    type="text"
                    class="form-input"
                    placeholder="usuario123"
                    value={username}
                    onInput={(e) => setUsername((e.target as HTMLInputElement).value)}
                    required
                    minLength={6}
                    disabled={loading}
                />
            </div>

            <div class="form-group">
                <label class="form-label" for="email">Email</label>
                <input
                    id="email"
                    type="email"
                    class="form-input"
                    placeholder="tu@email.com"
                    value={email}
                    onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
                    required
                    disabled={loading}
                />
            </div>

            <div class="form-group">
                <label class="form-label" for="password">Contraseña</label>
                <input
                    id="password"
                    type="password"
                    class="form-input"
                    placeholder="••••••••"
                    value={password}
                    onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
                    required
                    minLength={6}
                    disabled={loading}
                />
            </div>

            <div class="form-group">
                <label class="form-label" for="confirmPassword">Confirmar Contraseña</label>
                <input
                    id="confirmPassword"
                    type="password"
                    class="form-input"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onInput={(e) => setConfirmPassword((e.target as HTMLInputElement).value)}
                    required
                    minLength={6}
                    disabled={loading}
                />
            </div>

            {error && <p class="form-error" style="margin-bottom: 1rem;">{error}</p>}

            <button
                type="submit"
                class="btn btn-primary btn-block btn-lg"
                disabled={loading}
            >
                {loading ? <span class="spinner"></span> : 'Crear Cuenta'}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0', width: '100%' }}>
                <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }}></div>
                <span style={{ padding: '0 12px', color: 'var(--text-secondary)', fontSize: '14px' }}>o</span>
                <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }}></div>
            </div>

            <div class="grid grid-cols-1 gap-4">
                <button
                    type="button"
                    class="flex items-center justify-center px-4 py-2 border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-secondary)] transition-colors disabled:opacity-50 w-full"
                    onClick={() => handleSocialLogin('google')}
                    disabled={loading}
                >
                    <svg style="width: 20px; height: 20px; margin-right: 8px;" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Registrarse con Google
                </button>
            </div>

            {incompleteUser && (
                <UsernameSetupModal
                    user={incompleteUser}
                    onComplete={() => {
                        setIncompleteUser(null);
                        handleSuccess();
                    }}
                />
            )}
        </form>
    );
}
