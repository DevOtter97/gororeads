import { useState, useEffect } from 'preact/hooks';
import type { Friend } from '../../domain/interfaces/IFriendRepository';
import { friendRepository } from '../../infrastructure/firebase/FirestoreFriendRepository';
import { authService } from '../../infrastructure/firebase/FirebaseAuthService';

export default function FriendList() {
    const [friends, setFriends] = useState<Friend[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadFriends();
    }, []);

    const loadFriends = async () => {
        const user = authService.getCurrentUser();
        if (!user) return;
        try {
            const data = await friendRepository.getFriends(user.id);
            setFriends(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div class="loading-container">
                <div class="spinner"></div>
                <p>Cargando amigos...</p>
            </div>
        );
    }

    if (friends.length === 0) {
        return (
            <div class="empty-state">
                <svg class="empty-state-icon" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                <h3 class="empty-state-title">No tienes amigos agregados</h3>
                <p class="empty-state-text">¡Ve a la pestaña "Buscar Personas" para encontrar gente y empezar a socializar!</p>
            </div>
        );
    }

    return (
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {friends.map(friend => (
                <div key={friend.userId} class="card p-4 flex items-center gap-3 hover:border-[var(--accent-primary)] transition-colors cursor-pointer">
                    <div class="w-12 h-12 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-primary)] font-bold text-lg overflow-hidden border border-[var(--border-color)]">
                        {friend.photoUrl ? (
                            <img src={friend.photoUrl} alt={friend.username} class="w-full h-full object-cover" />
                        ) : (
                            friend.username.charAt(0).toUpperCase()
                        )}
                    </div>
                    <div>
                        <p class="font-bold text-[var(--text-primary)]">{friend.username}</p>
                        <p class="text-xs text-[var(--text-muted)]">Amigos desde {friend.addedAt.toLocaleDateString()}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}
