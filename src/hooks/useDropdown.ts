import { useState, useEffect, useRef } from 'preact/hooks';
import type { Ref } from 'preact';

export interface UseDropdownResult<T extends HTMLElement> {
    /** True si el dropdown esta abierto. */
    open: boolean;
    /** Setter directo (util para cerrarlo desde un item del menu). */
    setOpen: (v: boolean) => void;
    /** Toggle: abre si esta cerrado, cierra si esta abierto. */
    toggle: () => void;
    /** Ref que se debe asignar al wrapper que contiene trigger + dropdown. */
    wrapperRef: Ref<T>;
}

/**
 * Hook compartido para dropdowns/menus que se cierran al click fuera
 * o al pulsar Escape.
 *
 * Uso:
 * \`\`\`tsx
 * const { open, setOpen, toggle, wrapperRef } = useDropdown<HTMLDivElement>();
 *
 * return (
 *   <div ref={wrapperRef}>
 *     <button onClick={toggle}>...</button>
 *     {open && <ul>...</ul>}
 *   </div>
 * );
 * \`\`\`
 */
export function useDropdown<T extends HTMLElement = HTMLDivElement>(): UseDropdownResult<T> {
    const [open, setOpen] = useState(false);
    const wrapperRef = useRef<T>(null);

    useEffect(() => {
        if (!open) return;

        const handleClickOutside = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEsc);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEsc);
        };
    }, [open]);

    return {
        open,
        setOpen,
        toggle: () => setOpen(prev => !prev),
        wrapperRef,
    };
}
