import type { Notification } from '../../domain/interfaces/INotificationRepository';

/**
 * Resuelve la URL destino al pulsar una notificacion.
 * Devuelve null si no hay destino (raro).
 */
export function resolveNotificationTarget(n: Notification): string | null {
    switch (n.type) {
        case 'friend_request_received':
            return '/social?tab=requests';
        case 'friend_request_accepted':
            return n.fromUsername ? `/profile/${n.fromUsername}` : '/social';
        case 'post_liked':
        case 'post_commented':
        case 'post_reposted':
            // Notificaciones antiguas (creadas antes de añadir metadata.postId) no
            // tienen el id del post; en ese caso no navegamos a ningun sitio.
            return n.metadata?.postId ? `/post/${n.metadata.postId}` : null;
        default:
            return null;
    }
}
