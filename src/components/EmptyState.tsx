import type { ComponentChildren, JSX } from 'preact';

interface Props {
    /** Icono SVG opcional (ya renderizado). Idealmente 64x64 con stroke-width 1.5. */
    icon?: JSX.Element;
    title?: string;
    description?: string;
    /**
     * Contenido extra: tipicamente un boton/link CTA. Se renderiza debajo
     * del texto, dentro del mismo bloque centrado.
     */
    children?: ComponentChildren;
    /**
     * 'normal' (default) usa el padding global de .empty-state.
     * 'large' añade mas padding vertical para estados que ocupan toda la
     * pagina (404 de perfil, post no encontrado, etc.).
     */
    size?: 'normal' | 'large';
    /** Para casos donde el title tiene que ser h2 por jerarquia (poco comun). */
    titleAs?: 'h2' | 'h3';
}

/**
 * Componente compartido para empty states. Reusa los estilos globales
 * `.empty-state`, `.empty-state-icon`, `.empty-state-title`, `.empty-state-text`
 * definidos en global.css.
 */
export default function EmptyState({
    icon,
    title,
    description,
    children,
    size = 'normal',
    titleAs = 'h3',
}: Readonly<Props>) {
    const TitleTag = titleAs;
    const inlineStyle = size === 'large'
        ? 'padding: var(--space-16) var(--space-4)'
        : undefined;

    return (
        <div class="empty-state" style={inlineStyle}>
            {icon}
            {title && <TitleTag class="empty-state-title">{title}</TitleTag>}
            {description && <p class="empty-state-text">{description}</p>}
            {children}
        </div>
    );
}
