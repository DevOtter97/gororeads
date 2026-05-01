import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/preact';
import UserAvatar from './UserAvatar';

describe('<UserAvatar />', () => {
    it('renderiza la inicial en mayuscula cuando no hay photoUrl', () => {
        render(<UserAvatar username="alice" />);
        expect(screen.getByText('A')).toBeInTheDocument();
    });

    it('renderiza img cuando hay photoUrl, no la inicial', () => {
        const { container } = render(<UserAvatar username="alice" photoUrl="https://example.com/a.jpg" />);
        const img = container.querySelector('img');
        expect(img).toBeInTheDocument();
        expect(img?.getAttribute('src')).toBe('https://example.com/a.jpg');
        expect(img?.getAttribute('alt')).toBe('alice');
        // La inicial NO debe estar
        expect(container.querySelector('.user-avatar-initial')).toBeNull();
    });

    it('aplica el size por defecto (48px) inline', () => {
        const { container } = render(<UserAvatar username="bob" />);
        const root = container.querySelector('.user-avatar');
        expect(root?.getAttribute('style')).toMatch(/width: 48px/);
        expect(root?.getAttribute('style')).toMatch(/height: 48px/);
    });

    it('aplica un size custom', () => {
        const { container } = render(<UserAvatar username="bob" size={96} />);
        const root = container.querySelector('.user-avatar');
        expect(root?.getAttribute('style')).toMatch(/width: 96px/);
        expect(root?.getAttribute('style')).toMatch(/height: 96px/);
    });

    it('mayusculiza la primera letra aunque el username empiece minuscula', () => {
        render(<UserAvatar username="zelda" />);
        expect(screen.getByText('Z')).toBeInTheDocument();
    });
});
