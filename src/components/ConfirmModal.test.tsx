import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import ConfirmModal from './ConfirmModal';

describe('<ConfirmModal />', () => {
    function setup(overrides: Partial<Parameters<typeof ConfirmModal>[0]> = {}) {
        const onConfirm = vi.fn();
        const onCancel = vi.fn();
        const utils = render(
            <ConfirmModal
                title="Eliminar item"
                message="Esta acción no se puede deshacer"
                onConfirm={onConfirm}
                onCancel={onCancel}
                {...overrides}
            />
        );
        return { onConfirm, onCancel, ...utils };
    }

    it('renderiza title y message', () => {
        setup();
        expect(screen.getByText('Eliminar item')).toBeInTheDocument();
        expect(screen.getByText('Esta acción no se puede deshacer')).toBeInTheDocument();
    });

    it('usa labels por defecto Confirmar / Cancelar', () => {
        setup();
        expect(screen.getByRole('button', { name: 'Confirmar' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
    });

    it('respeta confirmLabel y cancelLabel custom', () => {
        setup({ confirmLabel: 'Eliminar', cancelLabel: 'Volver' });
        expect(screen.getByRole('button', { name: 'Eliminar' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Volver' })).toBeInTheDocument();
    });

    it('llama onConfirm al pulsar el boton de confirm', () => {
        const { onConfirm } = setup();
        fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
        expect(onConfirm).toHaveBeenCalledOnce();
    });

    it('llama onCancel al pulsar Cancelar', () => {
        const { onCancel } = setup();
        fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
        expect(onCancel).toHaveBeenCalledOnce();
    });

    it('Escape llama onCancel', () => {
        const { onCancel } = setup();
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(onCancel).toHaveBeenCalledOnce();
    });

    it('click en el overlay llama onCancel', () => {
        const { onCancel, container } = setup();
        const overlay = container.querySelector('.modal-overlay')!;
        fireEvent.click(overlay);
        expect(onCancel).toHaveBeenCalledOnce();
    });

    it('click en el modal NO llama onCancel (stopPropagation)', () => {
        const { onCancel, container } = setup();
        const modal = container.querySelector('.modal')!;
        fireEvent.click(modal);
        expect(onCancel).not.toHaveBeenCalled();
    });

    it('cuando loading=true, deshabilita ambos botones y muestra loadingLabel', () => {
        setup({ loading: true, loadingLabel: 'Eliminando...' });
        expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
        const confirmBtn = screen.getByRole('button', { name: 'Eliminando...' });
        expect(confirmBtn).toBeDisabled();
    });

    it('cuando loading=true, Escape NO llama onCancel', () => {
        const { onCancel } = setup({ loading: true });
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(onCancel).not.toHaveBeenCalled();
    });

    it('cuando loading=true, click en overlay NO llama onCancel', () => {
        const { onCancel, container } = setup({ loading: true });
        const overlay = container.querySelector('.modal-overlay')!;
        fireEvent.click(overlay);
        expect(onCancel).not.toHaveBeenCalled();
    });

    it('variant="default" pinta confirm con btn-primary, no btn-danger', () => {
        setup({ variant: 'default' });
        const confirmBtn = screen.getByRole('button', { name: 'Confirmar' });
        expect(confirmBtn).toHaveClass('btn-primary');
        expect(confirmBtn).not.toHaveClass('btn-danger');
    });

    it('variant="danger" (default) pinta confirm con btn-danger', () => {
        setup();
        const confirmBtn = screen.getByRole('button', { name: 'Confirmar' });
        expect(confirmBtn).toHaveClass('btn-danger');
    });
});
