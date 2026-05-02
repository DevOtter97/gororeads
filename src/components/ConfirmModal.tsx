import { useEffect } from 'preact/hooks';

interface Props {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    /** 'danger' tinta el boton confirm de rojo (acciones destructivas). */
    variant?: 'default' | 'danger';
    /** Si true, deshabilita botones y muestra loadingLabel en confirm. */
    loading?: boolean;
    loadingLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
}

/**
 * Modal de confirmacion compartido para acciones (mayormente destructivas).
 * Reusa los estilos globales `.modal-overlay` / `.modal`.
 *
 * Cerrar el modal:
 * - Click en el overlay (si !loading)
 * - Tecla Escape (si !loading)
 * - Boton Cancelar
 *
 * No incluye close icon `X` para mantener la UI simple — la accion del modal
 * es binaria (confirmar o cancelar).
 */
export default function ConfirmModal({
    title,
    message,
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    variant = 'danger',
    loading = false,
    loadingLabel = 'Procesando...',
    onConfirm,
    onCancel,
}: Readonly<Props>) {
    // Cerrar con Escape
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !loading) onCancel();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [loading, onCancel]);

    const confirmClass = variant === 'danger' ? 'btn btn-danger' : 'btn btn-primary';

    return (
        <div
            class="modal-overlay"
            role="button"
            tabIndex={-1}
            aria-label="Cerrar dialogo"
            onClick={() => !loading && onCancel()}
            onKeyDown={(e) => { if (e.key === 'Escape' && !loading) onCancel(); }}
        >
            <div
                class="modal confirm-modal"
                role="dialog"
                aria-modal="true"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
            >
                <div class="confirm-modal-body">
                    <h3 class="confirm-modal-title">{title}</h3>
                    <p class="confirm-modal-text">{message}</p>
                </div>
                <div class="confirm-modal-actions">
                    <button class="btn btn-ghost" onClick={onCancel} disabled={loading}>
                        {cancelLabel}
                    </button>
                    <button class={confirmClass} onClick={onConfirm} disabled={loading}>
                        {loading ? loadingLabel : confirmLabel}
                    </button>
                </div>
            </div>
            <style>{`
                .confirm-modal {
                    max-width: 420px;
                }
                .confirm-modal-body {
                    padding: var(--space-6) var(--space-6) var(--space-4);
                }
                .confirm-modal-title {
                    margin: 0 0 var(--space-2);
                    font-size: 1.125rem;
                    font-weight: 600;
                    color: var(--text-primary);
                }
                .confirm-modal-text {
                    margin: 0;
                    color: var(--text-secondary);
                    font-size: 0.9375rem;
                    line-height: 1.5;
                }
                .confirm-modal-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: var(--space-2);
                    padding: var(--space-4) var(--space-6);
                    border-top: 1px solid var(--border-color);
                }
            `}</style>
        </div>
    );
}
