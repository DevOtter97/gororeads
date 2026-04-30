import { useState } from 'preact/hooks';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';

interface Props {
    /** Tab inicial. Default 'login'. */
    initialTab?: 'login' | 'register';
    /** Mensaje opcional encima del form (ej. "Inicia sesion para comentar"). */
    message?: string;
    onClose: () => void;
    /** Se llama tras login/registro exitoso. El modal ya cierra automaticamente. */
    onSuccess?: () => void;
}

/**
 * Modal con tabs Login / Registrarse. Reutiliza LoginForm y RegisterForm
 * pasandoles `onSuccess` para que NO redirijan a `/` y en su lugar cierren
 * el modal. Asi el usuario se queda en la pagina donde lo abrio.
 */
export default function AuthModal({ initialTab = 'login', message, onClose, onSuccess }: Props) {
    const [tab, setTab] = useState<'login' | 'register'>(initialTab);

    const handleSuccess = () => {
        onSuccess?.();
        onClose();
    };

    return (
        <div class="modal-overlay" onClick={onClose}>
            <div class="modal auth-modal" onClick={(e) => e.stopPropagation()}>
                <div class="auth-modal-header">
                    <div class="auth-modal-tabs" role="tablist">
                        <button
                            class={`auth-modal-tab ${tab === 'login' ? 'active' : ''}`}
                            onClick={() => setTab('login')}
                            role="tab"
                            aria-selected={tab === 'login'}
                        >
                            Iniciar sesión
                        </button>
                        <button
                            class={`auth-modal-tab ${tab === 'register' ? 'active' : ''}`}
                            onClick={() => setTab('register')}
                            role="tab"
                            aria-selected={tab === 'register'}
                        >
                            Crear cuenta
                        </button>
                    </div>
                    <button class="modal-close" onClick={onClose} aria-label="Cerrar">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                <div class="auth-modal-body">
                    {message && <p class="auth-modal-message">{message}</p>}
                    {tab === 'login' ? (
                        <LoginForm onSuccess={handleSuccess} />
                    ) : (
                        <RegisterForm onSuccess={handleSuccess} />
                    )}
                </div>
            </div>

            <style>{`
                .auth-modal {
                    max-width: 460px;
                    max-height: 90vh;
                    overflow-y: auto;
                }

                .auth-modal-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: var(--space-2);
                    padding: var(--space-2) var(--space-2) 0 var(--space-2);
                }

                .auth-modal-tabs {
                    display: flex;
                    flex: 1;
                    gap: var(--space-1);
                }

                .auth-modal-tab {
                    flex: 1;
                    padding: var(--space-3);
                    color: var(--text-secondary);
                    font-weight: 600;
                    font-size: 0.9375rem;
                    border-bottom: 2px solid transparent;
                    transition: all var(--transition-fast);
                }
                .auth-modal-tab:hover { color: var(--text-primary); }
                .auth-modal-tab.active {
                    color: var(--accent-primary);
                    border-bottom-color: var(--accent-primary);
                }

                .auth-modal-body {
                    padding: var(--space-5) var(--space-6) var(--space-6);
                }

                .auth-modal-message {
                    margin: 0 0 var(--space-4);
                    color: var(--text-secondary);
                    font-size: 0.9375rem;
                    text-align: center;
                }
            `}</style>
        </div>
    );
}
