import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/preact';
import LoadingState from './LoadingState';

describe('<LoadingState />', () => {
    it('renderiza el mensaje por defecto "Cargando..."', () => {
        render(<LoadingState />);
        expect(screen.getByText('Cargando...')).toBeInTheDocument();
    });

    it('renderiza un mensaje custom si se pasa', () => {
        render(<LoadingState message="Cargando lecturas..." />);
        expect(screen.getByText('Cargando lecturas...')).toBeInTheDocument();
    });

    it('aplica clase fullscreen por defecto', () => {
        const { container } = render(<LoadingState />);
        const root = container.querySelector('.loading-state');
        expect(root).toHaveClass('loading-state--fullscreen');
    });

    it('NO aplica clase fullscreen cuando fullScreen=false', () => {
        const { container } = render(<LoadingState fullScreen={false} />);
        const root = container.querySelector('.loading-state');
        expect(root).not.toHaveClass('loading-state--fullscreen');
    });

    it('renderiza el spinner', () => {
        const { container } = render(<LoadingState />);
        expect(container.querySelector('.spinner.spinner-lg')).toBeInTheDocument();
    });
});
