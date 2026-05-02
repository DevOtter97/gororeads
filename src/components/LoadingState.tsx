interface LoadingStateProps {
    message?: string;
    fullScreen?: boolean;
}

export default function LoadingState({ message = 'Cargando...', fullScreen = true }: Readonly<LoadingStateProps>) {
    return (
        <>
            <div class={`loading-state${fullScreen ? ' loading-state--fullscreen' : ''}`}>
                <span class="spinner spinner-lg"></span>
                <p>{message}</p>
            </div>
            <style>{`
                .loading-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: var(--space-4);
                    padding: var(--space-12) var(--space-4);
                    color: var(--text-secondary);
                }
                .loading-state--fullscreen {
                    height: 100vh;
                    padding: 0;
                }
                .loading-state .spinner-lg {
                    width: 3rem;
                    height: 3rem;
                    border-width: 3px;
                }
            `}</style>
        </>
    );
}
