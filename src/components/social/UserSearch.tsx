import { useState } from 'preact/hooks';
import type { User } from '../../domain/entities/User';
import { friendRepository } from '../../infrastructure/firebase/FirestoreFriendRepository';
import { authService } from '../../infrastructure/firebase/FirebaseAuthService';
import { userRepository } from '../../infrastructure/firebase/FirestoreUserRepository';

export default function UserSearch() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const handleSearch = async (e: Event) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');
        if (query.trim().length < 2) {
            setError('Ingresa al menos 2 caracteres.');
            return;
        }

        setLoading(true);
        try {
            const currentUser = authService.getCurrentUser();
            if (!currentUser) throw new Error('No autenticado');

            const users = await friendRepository.searchUsers(query, currentUser.id);
            setResults(users);
            if (users.length === 0) {
                setError('No se encontraron usuarios con ese nombre.');
            }
        } catch (err) {
            console.error(err);
            setError('Error al buscar usuarios.');
        } finally {
            setLoading(false);
        }
    };

    const handleAddFriend = async (targetUser: User) => {
        setError('');
        setSuccessMsg('');
        try {
            const currentUser = authService.getCurrentUser();
            if (!currentUser) return;

            // Get full user profile from Firestore to have the correct username
            const fullProfile = await userRepository.getUserProfile(currentUser.id);
            if (!fullProfile) {
                setError('Error: No se pudo obtener tu perfil.');
                return;
            }

            await friendRepository.sendFriendRequest(fullProfile, targetUser.id);
            setSuccessMsg(`Solicitud enviada a ${targetUser.username}`);
        } catch (err: any) {
            console.error(err);
            if (err.message.includes('Friendship status')) {
                setError('Ya tienes una solicitud pendiente o son amigos.');
            } else {
                setError('Error al enviar solicitud.');
            }
        }
    };

    return (
        <div class="card p-6">
            <h3 class="text-xl font-bold mb-4">Buscar Personas</h3>
            <form onSubmit={handleSearch} class="flex gap-3 mb-6">
                <div class="relative flex-1">
                    <input
                        type="text"
                        value={query}
                        onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
                        placeholder="Buscar por nombre de usuario..."
                        class="form-input w-full pl-10"
                    />
                    <div class="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8"></circle>
                            <path d="m21 21-4.35-4.35"></path>
                        </svg>
                    </div>
                </div>
                <button type="submit" class="btn btn-primary" disabled={loading}>
                    {loading ? (
                        <div class="spinner w-4 h-4 border-2"></div>
                    ) : (
                        'Buscar'
                    )}
                </button>
            </form>

            {error && <p class="text-red-500 mb-4">{error}</p>}
            {successMsg && <p class="text-green-500 mb-4">{successMsg}</p>}

            <div class="space-y-4">
                {results.map(user => (
                    <div key={user.id} class="flex items-center justify-between p-4 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)]">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full bg-[var(--accent-primary)] flex items-center justify-center text-white font-bold overflow-hidden">
                                {user.photoURL ? (
                                    <img src={user.photoURL} alt={user.username} class="w-full h-full object-cover" />
                                ) : (
                                    user.username.charAt(0).toUpperCase()
                                )}
                            </div>
                            <div>
                                <p class="font-medium text-[var(--text-primary)]">{user.username}</p>
                                {/* <p class="text-sm text-[var(--text-muted)]">{user.displayName}</p> */}
                            </div>
                        </div>
                        <button
                            onClick={() => handleAddFriend(user)}
                            class="btn btn-sm btn-secondary hover:text-[var(--accent-primary)] hover:border-[var(--accent-primary)]"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" class="mr-1">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="8.5" cy="7" r="4" />
                                <line x1="20" y1="8" x2="20" y2="14" />
                                <line x1="23" y1="11" x2="17" y2="11" />
                            </svg>
                            Añadir
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
