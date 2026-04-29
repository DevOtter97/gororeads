import {
    collection,
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
    type DocumentData,
    type QueryConstraint,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import type { IPostRepository, FeedPage } from '../../domain/interfaces/IPostRepository';
import type { Post, CreatePostDTO } from '../../domain/entities/Post';
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
    private collectionRef = collection(db, COLLECTION_NAME);

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
            ? merged[merged.length - 1].createdAt
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
}

export const postRepository = new FirestorePostRepository();
