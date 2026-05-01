import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/preact';
import EmptyState from './EmptyState';

describe('<EmptyState />', () => {
    it('renderiza title como h3 por defecto', () => {
        render(<EmptyState title="No hay nada" />);
        const heading = screen.getByRole('heading', { name: 'No hay nada' });
        expect(heading).toBeInTheDocument();
        expect(heading.tagName).toBe('H3');
    });

    it('renderiza title como h2 cuando titleAs="h2"', () => {
        render(<EmptyState title="404" titleAs="h2" />);
        expect(screen.getByRole('heading', { name: '404' }).tagName).toBe('H2');
    });

    it('renderiza description cuando se pasa', () => {
        render(<EmptyState title="t" description="Una descripcion" />);
        expect(screen.getByText('Una descripcion')).toBeInTheDocument();
    });

    it('NO renderiza title ni description cuando no se pasan', () => {
        const { container } = render(<EmptyState />);
        expect(container.querySelector('.empty-state-title')).toBeNull();
        expect(container.querySelector('.empty-state-text')).toBeNull();
    });

    it('renderiza children como CTA', () => {
        render(
            <EmptyState title="t">
                <button>Acción</button>
            </EmptyState>
        );
        expect(screen.getByRole('button', { name: 'Acción' })).toBeInTheDocument();
    });

    it('aplica padding extra inline cuando size="large"', () => {
        const { container } = render(<EmptyState title="t" size="large" />);
        const root = container.querySelector('.empty-state');
        expect(root?.getAttribute('style')).toMatch(/padding: var\(--space-16\)/);
    });

    it('NO aplica style inline cuando size es default', () => {
        const { container } = render(<EmptyState title="t" />);
        const root = container.querySelector('.empty-state');
        expect(root?.getAttribute('style')).toBeFalsy();
    });
});
