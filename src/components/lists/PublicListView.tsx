import { useState, useEffect } from 'preact/hooks';
import type { CustomList, ListComment, ListReading } from '../../domain/entities/CustomList';
import AuthModal from '../auth/AuthModal';
import { customListRepository } from '../../infrastructure/firebase/FirestoreCustomListRepository';
import { userRepository } from '../../infrastructure/firebase/FirestoreUserRepository';
import { useAuth } from '../../hooks/useAuth';
import LoadingState from '../LoadingState';
import ListHero from './ListHero';
import ListReadingsGrid from './ListReadingsGrid';
import ListCommentSection from './ListCommentSection';

interface Props {
    slug: string;
}

export default function PublicListView({ slug }: Props) {
    // Pagina publica: viewable sin sesion. NO redirige.
    const { user, authResolved } = useAuth();
    const [list, setList] = useState<CustomList | null>(null);
    const [readings, setReadings] = useState<ListReading[]>([]);
    const [comments, setComments] = useState<ListComment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [hasLiked, setHasLiked] = useState(false);
    const [ownerName, setOwnerName] = useState<string>('');
    const [authModalMessage, setAuthModalMessage] = useState<string | null>(null);

    useEffect(() => {
        if (authResolved) {
            loadList();
        }
    }, [slug, authResolved]);

    // Re-check liked status if user logs in after the list is already loaded
    useEffect(() => {
        if (!list || !user) return;
        customListRepository.hasUserLiked(list.id, user.id).then(setHasLiked).catch(console.error);
    }, [list?.id, user?.id]);

    const loadList = async () => {
        try {
            setLoading(true);
            const listData = await customListRepository.getBySlug(slug);

            if (!listData) {
                setError('Lista no encontrada');
                return;
            }

            setList(listData);
            setReadings(listData.readings);
            setOwnerName(listData.userName); // fallback inmediato mientras cargamos el perfil

            // Carga en paralelo todo lo que depende del id de la lista
            const [commentsData, ownerProfile, liked] = await Promise.all([
                customListRepository.getComments(listData.id),
                userRepository.getUserProfile(listData.userId).catch(err => {
                    console.error('Error fetching list owner:', err);
                    return null;
                }),
                user ? customListRepository.hasUserLiked(listData.id, user.id) : Promise.resolve(false),
            ]);

            setComments(commentsData);
            if (ownerProfile && (ownerProfile.displayName || ownerProfile.username)) {
                setOwnerName(ownerProfile.displayName || ownerProfile.username);
            }
            setHasLiked(liked);
        } catch (err) {
            console.error('Error loading list:', err);
            setError(user
                ? 'Error al cargar la lista. Verifica que tienes permisos.'
                : 'Error al cargar la lista. Puede que sea privada.');
        } finally {
            setLoading(false);
        }
    };

    const handleLike = async () => {
        if (!list || !user) return;
        const liked = await customListRepository.toggleLike(list.id, user.id);
        setHasLiked(liked);
        // Math.max(0, ...) en el unlike por si el counter ya estaba en 0 por
        // estado desincronizado entre cliente y servidor.
        setList({
            ...list,
            likesCount: liked ? list.likesCount + 1 : Math.max(0, list.likesCount - 1)
        });
    };

    if (loading || !authResolved) {
        return <LoadingState message="Cargando lista..." />;
    }

    if (error) {
        return (
            <div class="error-container">
                <h2>{error}</h2>
                <a href="/" class="btn btn-primary">Volver al inicio</a>
                <style>{errorStyles}</style>
            </div>
        );
    }

    if (!list) return null;

    const isOwner = user && user.id === list.userId;
    const canView = list.visibility !== 'private' || isOwner;

    if (!canView) {
        return (
            <div class="error-container">
                <h2>Esta lista es privada</h2>
                <a href="/" class="btn btn-primary">Volver al inicio</a>
                <style>{errorStyles}</style>
            </div>
        );
    }

    return (
        <div class="public-list-container">
            <ListHero
                name={list.name}
                description={list.description}
                ownerName={ownerName}
                readingsCount={list.readings.length}
                likesCount={list.likesCount}
                hasLiked={hasLiked}
                canLike={!!user}
                onLike={handleLike}
                onRequireAuth={setAuthModalMessage}
            />

            <main class="container">
                <ListReadingsGrid readings={readings} />

                <ListCommentSection
                    listId={list.id}
                    comments={comments}
                    currentUser={user}
                    onCommentAdded={(comment) => setComments([comment, ...comments])}
                    onRequireAuth={setAuthModalMessage}
                />
            </main>

            {authModalMessage !== null && (
                <AuthModal
                    message={authModalMessage}
                    onClose={() => setAuthModalMessage(null)}
                />
            )}

            <style>{`
                .public-list-container {
                    min-height: 100vh;
                }
                ${errorStyles}
            `}</style>
        </div>
    );
}

const errorStyles = `
    .error-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
        gap: var(--space-4);
    }

    .error-container h2 {
        color: var(--text-secondary);
    }
`;
