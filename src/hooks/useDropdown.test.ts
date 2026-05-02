import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/preact';
import { useDropdown } from './useDropdown';

/**
 * Tests para useDropdown.
 *
 * Cubre:
 * - Estado inicial cerrado
 * - toggle() abre/cierra
 * - setOpen(false) cierra
 * - Click fuera del wrapper cierra
 * - Click dentro del wrapper NO cierra
 * - Tecla Escape cierra
 */
describe('useDropdown', () => {
    it('arranca cerrado', () => {
        const { result } = renderHook(() => useDropdown<HTMLDivElement>());
        expect(result.current.open).toBe(false);
    });

    it('toggle() abre y cierra', () => {
        const { result } = renderHook(() => useDropdown<HTMLDivElement>());

        act(() => result.current.toggle());
        expect(result.current.open).toBe(true);

        act(() => result.current.toggle());
        expect(result.current.open).toBe(false);
    });

    it('setOpen(false) cierra cuando esta abierto', () => {
        const { result } = renderHook(() => useDropdown<HTMLDivElement>());
        act(() => result.current.setOpen(true));
        expect(result.current.open).toBe(true);

        act(() => result.current.setOpen(false));
        expect(result.current.open).toBe(false);
    });

    it('click fuera del wrapper cierra el dropdown', () => {
        // Montamos un wrapper en el DOM al que asociar el ref
        const wrapper = document.createElement('div');
        document.body.appendChild(wrapper);
        const outside = document.createElement('div');
        document.body.appendChild(outside);

        const { result } = renderHook(() => useDropdown<HTMLDivElement>());

        // Asociamos el ref manualmente al wrapper para simular como lo usaria un componente
        (result.current.wrapperRef as { current: HTMLElement | null }).current = wrapper;

        act(() => result.current.setOpen(true));
        expect(result.current.open).toBe(true);

        act(() => {
            outside.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        });
        expect(result.current.open).toBe(false);

        wrapper.remove();
        outside.remove();
    });

    it('click dentro del wrapper NO cierra el dropdown', () => {
        const wrapper = document.createElement('div');
        const inside = document.createElement('button');
        wrapper.appendChild(inside);
        document.body.appendChild(wrapper);

        const { result } = renderHook(() => useDropdown<HTMLDivElement>());
        (result.current.wrapperRef as { current: HTMLElement | null }).current = wrapper;

        act(() => result.current.setOpen(true));
        expect(result.current.open).toBe(true);

        act(() => {
            inside.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        });
        expect(result.current.open).toBe(true);

        wrapper.remove();
    });

    it('Escape cierra el dropdown abierto', () => {
        const { result } = renderHook(() => useDropdown<HTMLDivElement>());
        act(() => result.current.setOpen(true));
        expect(result.current.open).toBe(true);

        act(() => {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        });
        expect(result.current.open).toBe(false);
    });

    it('otras teclas NO cierran el dropdown', () => {
        const { result } = renderHook(() => useDropdown<HTMLDivElement>());
        act(() => result.current.setOpen(true));

        act(() => {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
        });
        expect(result.current.open).toBe(true);
    });
});
