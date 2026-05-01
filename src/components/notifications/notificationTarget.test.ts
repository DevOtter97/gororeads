import { describe, it, expect } from 'vitest';
import { resolveNotificationTarget } from './notificationTarget';
import type { Notification } from '../../domain/interfaces/INotificationRepository';

/**
 * Tests para resolveNotificationTarget. Cubre cada tipo + el caso legacy
 * (notifs antiguas sin metadata.postId) que debe devolver null para no
 * navegar a un /post/undefined.
 */
function makeNotif(overrides: Partial<Notification>): Notification {
    return {
        id: 'n1',
        userId: 'u1',
        type: 'friend_request_received',
        title: 't',
        message: 'm',
        fromUserId: 'u2',
        fromUsername: 'someuser',
        read: false,
        createdAt: new Date(),
        ...overrides,
    } as Notification;
}

describe('resolveNotificationTarget', () => {
    it('friend_request_received -> /social?tab=requests', () => {
        const target = resolveNotificationTarget(makeNotif({ type: 'friend_request_received' }));
        expect(target).toBe('/social?tab=requests');
    });

    it('friend_request_accepted -> /profile/[fromUsername]', () => {
        const target = resolveNotificationTarget(makeNotif({
            type: 'friend_request_accepted',
            fromUsername: 'alice',
        }));
        expect(target).toBe('/profile/alice');
    });

    it('friend_request_accepted sin fromUsername cae a /social', () => {
        const target = resolveNotificationTarget(makeNotif({
            type: 'friend_request_accepted',
            fromUsername: '',
        }));
        expect(target).toBe('/social');
    });

    it('post_liked con metadata.postId -> /post/[id]', () => {
        const target = resolveNotificationTarget(makeNotif({
            type: 'post_liked',
            metadata: { postId: 'p123' },
        }));
        expect(target).toBe('/post/p123');
    });

    it('post_commented con metadata.postId -> /post/[id]', () => {
        const target = resolveNotificationTarget(makeNotif({
            type: 'post_commented',
            metadata: { postId: 'p456' },
        }));
        expect(target).toBe('/post/p456');
    });

    it('post_reposted con metadata.postId -> /post/[id]', () => {
        const target = resolveNotificationTarget(makeNotif({
            type: 'post_reposted',
            metadata: { postId: 'p789' },
        }));
        expect(target).toBe('/post/p789');
    });

    it('post_liked sin metadata (legacy) devuelve null', () => {
        const target = resolveNotificationTarget(makeNotif({
            type: 'post_liked',
            metadata: undefined,
        }));
        expect(target).toBeNull();
    });

    it('post_commented sin metadata.postId devuelve null', () => {
        const target = resolveNotificationTarget(makeNotif({
            type: 'post_commented',
            metadata: {},
        }));
        expect(target).toBeNull();
    });
});
