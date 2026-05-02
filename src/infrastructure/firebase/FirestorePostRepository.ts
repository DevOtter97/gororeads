import {
    collection,
    collectionGroup,
    addDoc,
    deleteDoc,
    getDoc,
    getDocs,
    doc,
    query,
    where,
    orderBy,
    limit as fsLimit,
    Timestamp,
    runTransaction,
    increment,
    writeBatch,
    type DocumentData,
    type QueryConstraint,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import type { IPostRepository, FeedPage } from '../../domain/interfaces/IPostRepository';
import type { Post, CreatePostDTO, PostComment } from '../../domain/entities/Post';
import type { User } from '../../domain/entities/User';

const COLLECTION_NAME = 'posts';
const FRIENDS_IN_LIMIT = 30; // Firestore: where 'in' admite max 30 valores

function toPost(id: string, data: DocumentData): Post {
    return {
        id,
        authorId: data.authorId,
        authorUsername: data.authorUsername,
        authorPhotoURL: data.authorPhotoURL ?? undefined,
        type: data.type,
        text: data.text ?? undefined,
        imageUrl: data.imageUrl ?? undefined,
        readingRef: data.readingRef ?? undefined,
        listRef: data.listRef ?? undefined,
        repostOf: data.repostOf
            ? {
                ...data.repostOf,
                createdAt: (data.repostOf.createdAt as Timestamp)?.toDate?.() ?? new Date(),
            }
            : undefined,
        likesCount: data.likesCount ?? 0,
        commentsCount: data.commentsCount ?? 0,
        repostsCount: data.repostsCount ?? 0,
        createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
    };
}

export class FirestorePostRepository implements IPostRepository {
    private readonly collectionRef = collection(db, COLLECTION_NAME);

    async create(author: User, data: CreatePostDTO): Promise<Post> {
        const now = Timestamp.now();
        const docData: Record<string, unknown> = {
            authorId: author.id,
            authorUsername: author.username,
            authorPhotoURL: author.photoURL ?? null,
            type: data.type,
            text: data.text ?? null,
            imageUrl: data.imageUrl ?? null,
            readingRef: data.readingRef ?? null,
            listRef: data.listRef ?? null,
            repostOf: data.repostOf
                ? { ...data.repostOf, createdAt: Timestamp.fromDate(data.repostOf.createdAt) }
                : null,
            likesCount: 0,
            commentsCount: 0,
            repostsCount: 0,
            createdAt: now,
        };
        const ref = await addDoc(this.collectionRef, docData);
        return toPost(ref.id, { ...docData, createdAt: now });
    }

    async getFeedForUser(friendIds: string[], pageSize: number, cursor?: Date): Promise<FeedPage> {
        if (friendIds.length === 0) {
            return { posts: [], nextCursor: null };
        }

        // Firestore limita `where in` a 30. Chunkeamos y mergeamos en cliente.
        const chunks: string[][] = [];
        for (let i = 0; i < friendIds.length; i += FRIENDS_IN_LIMIT) {
            chunks.push(friendIds.slice(i, i + FRIENDS_IN_LIMIT));
        }

        // Cada chunk: traemos pageSize posts (suficiente para tener al menos pageSize tras merge).
        const cursorTs = cursor ? Timestamp.fromDate(cursor) : null;
        const snapshots = await Promise.all(chunks.map(chunk => {
            const constraints: QueryConstraint[] = [
                where('authorId', 'in', chunk),
                orderBy('createdAt', 'desc'),
            ];
            if (cursorTs) constraints.push(where('createdAt', '<', cursorTs));
            constraints.push(fsLimit(pageSize));
            return getDocs(query(this.collectionRef, ...constraints));
        }));

        const merged: Post[] = snapshots
            .flatMap(snap => snap.docs.map(d => toPost(d.id, d.data())))
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .slice(0, pageSize);

        const nextCursor = merged.length === pageSize
            ? merged.at(-1)!.createdAt
            : null;

        return { posts: merged, nextCursor };
    }

    async getById(id: string): Promise<Post | null> {
        const snap = await getDoc(doc(db, COLLECTION_NAME, id));
        return snap.exists() ? toPost(snap.id, snap.data()) : null;
    }

    async delete(id: string): Promise<void> {
        await deleteDoc(doc(db, COLLECTION_NAME, id));
    }

    /**
     * Borra TODOS los posts del usuario en batches de 500 (limite Firestore).
     * Usado por el cascade de eliminacion de cuenta.
     *
     * Limitacion conocida: las subcollections (likes, comments, reposts) de
     * cada post quedan huerfanas, igual que en delete() individual. Eliminar
     * en cascada esas subcols requeriria Cloud Functions (out of scope).
     */
    async deleteAllByAuthor(authorId: string): Promise<void> {
        const q = query(collection(db, COLLECTION_NAME), where('authorId', '==', authorId));
        const snap = await getDocs(q);
        const CHUNK = 500;
        for (let i = 0; i < snap.docs.length; i += CHUNK) {
            const batch = writeBatch(db);
            for (const docSnap of snap.docs.slice(i, i + CHUNK)) {
                batch.delete(docSnap.ref);
            }
            await batch.commit();
        }
    }

    // ---------- Likes ----------

    async toggleLike(postId: string, userId: string): Promise<boolean> {
        const postRef = doc(db, COLLECTION_NAME, postId);
        const likeRef = doc(db, COLLECTION_NAME, postId, 'likes', userId);

        return runTransaction(db, async (tx) => {
            const likeSnap = await tx.get(likeRef);
            const postSnap = await tx.get(postRef);
            if (!postSnap.exists()) throw new Error('Post not found');
            const currentCount = (postSnap.data().likesCount as number) ?? 0;
            if (likeSnap.exists()) {
                tx.delete(likeRef);
                // Clampeamos a 0 para que el counter nunca sea negativo.
                tx.update(postRef, { likesCount: Math.max(0, currentCount - 1) });
                return false;
            }
            tx.set(likeRef, { createdAt: Timestamp.now() });
            tx.update(postRef, { likesCount: currentCount + 1 });
            return true;
        });
    }

    async hasUserLiked(postId: string, userId: string): Promise<boolean> {
        const snap = await getDoc(doc(db, COLLECTION_NAME, postId, 'likes', userId));
        return snap.exists();
    }

    async getLikedPostIds(postIds: string[], userId: string): Promise<Set<string>> {
        if (postIds.length === 0) return new Set();
        const checks = await Promise.all(
            postIds.map(id => getDoc(doc(db, COLLECTION_NAME, id, 'likes', userId))),
        );
        const liked = new Set<string>();
        checks.forEach((snap, i) => {
            if (snap.exists()) liked.add(postIds[i]);
        });
        return liked;
    }

    // ---------- Comments ----------

    async addComment(postId: string, author: User, text: string, parentId?: string): Promise<PostComment> {
        const postRef = doc(db, COLLECTION_NAME, postId);
        const commentsRef = collection(db, COLLECTION_NAME, postId, 'comments');
        const now = Timestamp.now();

        // Necesitamos denormalizar postAuthorId en el comment para que la regla
        // del collection group (perfil del usuario, tab "Comentarios") pueda
        // filtrar visibilidad sin get() — Firestore no admite get() en rules
        // que afecten a queries.
        const postSnap = await getDoc(postRef);
        const postAuthorId = postSnap.exists() ? (postSnap.data().authorId as string) : null;

        const commentData = {
            userId: author.id,
            username: author.username,
            photoURL: author.photoURL ?? null,
            text,
            parentId: parentId ?? null,
            postAuthorId,
            createdAt: now,
        };

        // No usamos transaction porque addDoc no soporta refs auto-id en transactions.
        // El contador puede quedar desfasado si falla el update pero es aceptable.
        const ref = await addDoc(commentsRef, commentData);
        await runTransaction(db, async (tx) => {
            tx.update(postRef, { commentsCount: increment(1) });
        });

        return {
            id: ref.id,
            userId: author.id,
            username: author.username,
            photoURL: author.photoURL,
            text,
            parentId: parentId,
            createdAt: now.toDate(),
        };
    }

    async getComments(postId: string): Promise<PostComment[]> {
        const commentsRef = collection(db, COLLECTION_NAME, postId, 'comments');
        const q = query(commentsRef, orderBy('createdAt', 'asc'));
        const snap = await getDocs(q);
        return snap.docs.map(d => {
            const data = d.data();
            return {
                id: d.id,
                userId: data.userId,
                username: data.username,
                photoURL: data.photoURL ?? undefined,
                text: data.text,
                parentId: data.parentId ?? undefined,
                createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
            };
        });
    }

    async getCommentsByUser(userId: string, limit = 50): Promise<PostComment[]> {
        // Collection group sobre `comments`. Las reglas Firestore filtran
        // automaticamente los que el viewer no puede ver (no es autor del post
        // padre ni amigo del autor). Cada doc.ref.parent.parent.id es el postId.
        const q = query(
            collectionGroup(db, 'comments'),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc'),
            fsLimit(limit),
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => {
            const data = d.data();
            return {
                id: d.id,
                userId: data.userId,
                username: data.username,
                photoURL: data.photoURL ?? undefined,
                text: data.text,
                parentId: data.parentId ?? undefined,
                postId: d.ref.parent.parent?.id,
                createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
            };
        });
    }

    async deleteComment(postId: string, commentId: string): Promise<void> {
        const postRef = doc(db, COLLECTION_NAME, postId);
        const commentRef = doc(db, COLLECTION_NAME, postId, 'comments', commentId);
        await runTransaction(db, async (tx) => {
            const snap = await tx.get(commentRef);
            if (!snap.exists()) return;
            const postSnap = await tx.get(postRef);
            const currentCount = postSnap.exists() ? ((postSnap.data().commentsCount as number) ?? 0) : 0;
            tx.delete(commentRef);
            tx.update(postRef, { commentsCount: Math.max(0, currentCount - 1) });
        });
    }

    // ---------- Reposts ----------

    async repost(originalPost: Post, author: User): Promise<Post> {
        // 1) Crear el post repost con snapshot del original
        const now = Timestamp.now();
        const repostData = {
            authorId: author.id,
            authorUsername: author.username,
            authorPhotoURL: author.photoURL ?? null,
            type: 'repost' as const,
            text: null,
            imageUrl: null,
            readingRef: null,
            listRef: null,
            repostOf: {
                postId: originalPost.id,
                authorId: originalPost.authorId,
                authorUsername: originalPost.authorUsername,
                authorPhotoURL: originalPost.authorPhotoURL ?? null,
                type: originalPost.type,
                text: originalPost.text ?? null,
                imageUrl: originalPost.imageUrl ?? null,
                readingRef: originalPost.readingRef ?? null,
                listRef: originalPost.listRef ?? null,
                createdAt: Timestamp.fromDate(originalPost.createdAt),
            },
            likesCount: 0,
            commentsCount: 0,
            repostsCount: 0,
            createdAt: now,
        };
        const repostRef = await addDoc(this.collectionRef, repostData);

        // 2) Marker en el original + increment counter (transaction)
        const markerRef = doc(db, COLLECTION_NAME, originalPost.id, 'reposts', author.id);
        const originalRef = doc(db, COLLECTION_NAME, originalPost.id);
        await runTransaction(db, async (tx) => {
            tx.set(markerRef, { repostPostId: repostRef.id, createdAt: now });
            tx.update(originalRef, { repostsCount: increment(1) });
        });

        return toPost(repostRef.id, { ...repostData, createdAt: now });
    }

    async unrepost(originalPostId: string, userId: string): Promise<void> {
        const markerRef = doc(db, COLLECTION_NAME, originalPostId, 'reposts', userId);
        const originalRef = doc(db, COLLECTION_NAME, originalPostId);

        // Obtenemos el repostPostId del marker antes de borrarlo
        const markerSnap = await getDoc(markerRef);
        if (!markerSnap.exists()) return;
        const repostPostId = markerSnap.data().repostPostId as string | undefined;

        await runTransaction(db, async (tx) => {
            const originalSnap = await tx.get(originalRef);
            const currentCount = originalSnap.exists() ? ((originalSnap.data().repostsCount as number) ?? 0) : 0;
            tx.delete(markerRef);
            tx.update(originalRef, { repostsCount: Math.max(0, currentCount - 1) });
        });

        // El post repost se borra fuera de la transaction (no critico si falla;
        // el marker ya esta limpio).
        if (repostPostId) {
            await deleteDoc(doc(db, COLLECTION_NAME, repostPostId)).catch(err => {
                console.error('Error deleting repost post (marker already cleaned):', err);
            });
        }
    }

    async hasUserReposted(originalPostId: string, userId: string): Promise<boolean> {
        const snap = await getDoc(doc(db, COLLECTION_NAME, originalPostId, 'reposts', userId));
        return snap.exists();
    }

    async getRepostedPostIds(originalPostIds: string[], userId: string): Promise<Set<string>> {
        if (originalPostIds.length === 0) return new Set();
        const checks = await Promise.all(
            originalPostIds.map(id => getDoc(doc(db, COLLECTION_NAME, id, 'reposts', userId))),
        );
        const reposted = new Set<string>();
        checks.forEach((snap, i) => {
            if (snap.exists()) reposted.add(originalPostIds[i]);
        });
        return reposted;
    }
}

export const postRepository = new FirestorePostRepository();
