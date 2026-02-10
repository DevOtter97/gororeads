import { useState } from 'preact/hooks';
import { createPortal } from 'preact/compat';
import { authService } from '../../infrastructure/firebase/FirebaseAuthService';
import { userRepository } from '../../infrastructure/firebase/FirestoreUserRepository';
import type { User } from '../../domain/entities/User';
import { updateProfile } from 'firebase/auth';
import { auth } from '../../config/firebase';

interface Props {
    user: User;
    onComplete: (updatedUser: User) => void;
}

export default function UsernameSetupModal({ user, onComplete }: Props) {
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: Event) => {
        e.preventDefault();
        setError('');

        const cleanUsername = username.trim();

        // Validation (same as RegisterForm)
        if (cleanUsername.length < 6) {
            setError('El nombre de usuario debe tener al menos 6 caracteres');
            return;
        }
        if (!/^[a-zA-Z0-9_-]+$/.test(cleanUsername)) {
            setError('El nombre de usuario solo puede contener letras, números, guiones y guiones bajos');
            return;
        }

        setLoading(true);

        try {
            // 1. Check availability
            const isAvailable = await userRepository.checkUsernameAvailability(cleanUsername);
            if (!isAvailable) {
                setError('El nombre de usuario ya está en uso');
                setLoading(false);
                return;
            }

            // 2. Update Firebase Auth Profile
            if (auth.currentUser) {
                await updateProfile(auth.currentUser, {
                    displayName: cleanUsername
                });
            }

            // 3. Create Firestore Records
            // We create a full user profile now
            const updatedUser: User = {
                ...user,
                username: cleanUsername,
                displayName: cleanUsername,
                isProfileComplete: true
            };

            await Promise.all([
                userRepository.createUsernameReservation(cleanUsername, user.id, user.email),
                userRepository.createUserProfile(updatedUser)
            ]);

            onComplete(updatedUser);

        } catch (err) {
            console.error('Error setting username:', err);
            setError('Error al guardar el nombre de usuario. Inténtalo de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    return createPortal(

        <div class="user-setup-modal-overlay">
            <div class="user-setup-modal-card">
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '3rem', height: '3rem', borderRadius: '50%', background: 'rgba(var(--accent-primary-rgb), 0.1)', color: 'var(--accent-primary)', marginBottom: '1rem' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                        </svg>
                    </div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>¡Casi terminamos!</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Para completar tu registro, elige un nombre de usuario único.
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div class="form-group">
                        <label class="form-label">
                            Nombre de Usuario
                        </label>
                        <input
                            type="text"
                            value={username}
                            onInput={(e) => {
                                setUsername((e.target as HTMLInputElement).value);
                                setError('');
                            }}
                            class="form-input"
                            disabled={loading}
                        />
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                            Mínimo 6 caracteres. Solo letras y números.
                        </p>
                    </div>

                    {error && (
                        <div class="form-error" style={{ marginBottom: '1rem' }}>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || !username}
                        class="btn btn-primary btn-block btn-lg"
                        style={{ marginBottom: '1rem' }}
                    >
                        {loading ? (
                            <>
                                <span class="spinner" style={{ width: '1rem', height: '1rem', borderTopColor: 'currentColor' }}></span>
                                Guardando...
                            </>
                        ) : (
                            'Completar Registro'
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => authService.logout()}
                        class="btn btn-ghost btn-block"
                    >
                        Cancelar y Cerrar Sesión
                    </button>
                </form>
            </div>
        </div>,
        document.body
    );
}
