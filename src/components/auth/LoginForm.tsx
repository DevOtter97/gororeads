import { useState } from 'preact/hooks';
import { authService } from '../../infrastructure/firebase/FirebaseAuthService';

interface Props {
    onSuccess?: () => void;
}

export default function LoginForm({ onSuccess }: Props) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: Event) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await authService.login({ email, password });
            if (onSuccess) {
                onSuccess();
            } else {
                window.location.href = '/dashboard';
            }
        } catch (err: unknown) {
            const firebaseError = err as { code?: string; message?: string };
            if (firebaseError.code === 'auth/user-not-found') {
                setError('No existe una cuenta con este email');
            } else if (firebaseError.code === 'auth/wrong-password') {
                setError('Contraseña incorrecta');
            } else if (firebaseError.code === 'auth/invalid-email') {
                setError('Email inválido');
            } else if (firebaseError.code === 'auth/invalid-credential') {
                setError('Credenciales inválidas');
            } else {
                setError('Error al iniciar sesión. Inténtalo de nuevo.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
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

            {error && <p class="form-error" style="margin-bottom: 1rem;">{error}</p>}

            <button
                type="submit"
                class="btn btn-primary btn-block btn-lg"
                disabled={loading}
            >
                {loading ? <span class="spinner"></span> : 'Iniciar Sesión'}
            </button>
        </form>
    );
}
