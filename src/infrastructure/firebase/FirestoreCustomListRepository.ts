import {
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    getDoc,
    getDocs,
    query,
    where,
    orderBy,
    Timestamp,
    arrayUnion,
    arrayRemove,
    increment,
    setDoc,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { getAuth } from 'firebase/auth';
import type { ICustomListRepository } from '../../domain/interfaces/ICustomListRepository';
import type { CustomList, CreateCustomListDTO, UpdateCustomListDTO, ListComment, CreateCommentDTO, ListReading } from '../../domain/entities/CustomList';

const COLLECTION_NAME = 'customLists';

function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        + '-' + Date.now().toString(36);
}

function toCustomList(id: string, data: Record<string, unknown>): CustomList {
    const paramReadings = data.readings as (ListReading | string)[] || [];
    const readings: ListReading[] = paramReadings.map(r => {
        if (typeof r === 'string') {
            return {
                id: r,
                title: 'Lectura no actualizada',
                category: 'other',
                status: 'to-read',
                imageUrl: undefined // Will show placeholder
            } as ListReading;
        }
        return r;
    });

    return {
        id,
        userId: data.userId as string,
        userName: data.userName as string,
        name: data.name as string,
        description: data.description as string | undefined,
        slug: data.slug as string,
        coverImage: data.coverImage as string | undefined,
        readings,
        visibility: data.visibility as CustomList['visibility'],
        likesCount: (data.likesCount as number) || 0,
        createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
        updatedAt: (data.updatedAt as Timestamp)?.toDate() || new Date(),
    };
}

function toComment(id: string, data: Record<string, unknown>): ListComment {
    return {
        id,
        listId: data.listId as string,
        userId: data.userId as string,
        userName: data.userName as string,
        content: data.content as string,
        createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
    };
}

export class FirestoreCustomListRepository implements ICustomListRepository {
    private collectionRef = collection(db, COLLECTION_NAME);

    async create(userId: string, userName: string, data: CreateCustomListDTO): Promise<CustomList> {
        const now = Timestamp.now();
        const slug = generateSlug(data.name);

        const docData = {
            userId,
            userName,
            name: data.name,
            description: data.description ?? null,
            slug,
            coverImage: data.coverImage ?? null,
            readings: data.readings || [],
            visibility: data.visibility,
            likesCount: 0,
            createdAt: now,
            updatedAt: now,
        };

        const docRef = await addDoc(this.collectionRef, docData);
        return toCustomList(docRef.id, docData);
    }

    async update(id: string, data: UpdateCustomListDTO): Promise<CustomList> {
        const docRef = doc(db, COLLECTION_NAME, id);

        const updateData: Record<string, unknown> = {
            updatedAt: Timestamp.now(),
        };

        if (data.name !== undefined) updateData.name = data.name;
        if (data.userName !== undefined) updateData.userName = data.userName;
        if (data.description !== undefined) updateData.description = data.description ?? null;
        if (data.visibility !== undefined) updateData.visibility = data.visibility;
        if (data.coverImage !== undefined) updateData.coverImage = data.coverImage ?? null;
        if (data.readings !== undefined) updateData.readings = data.readings;

        await updateDoc(docRef, updateData);

        const updatedDoc = await getDoc(docRef);
        if (!updatedDoc.exists()) {
            throw new Error('List not found');
        }

        return toCustomList(id, updatedDoc.data());
    }

    async delete(id: string): Promise<void> {
        const docRef = doc(db, COLLECTION_NAME, id);
        await deleteDoc(docRef);
    }

    async getById(id: string): Promise<CustomList | null> {
        const docRef = doc(db, COLLECTION_NAME, id);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            return null;
        }

        return toCustomList(id, docSnap.data());
    }

    async getBySlug(slug: string): Promise<CustomList | null> {
        // We need to query in a way that satisfies security rules.
        // Rule: allow read: if visibility != 'private' || (auth != null && userId == auth.uid)

        // 1. Try public/link access
        const publicQuery = query(
            this.collectionRef,
            where('slug', '==', slug),
            where('visibility', 'in', ['public', 'link'])
        );

        const publicSnapshot = await getDocs(publicQuery);
        if (!publicSnapshot.empty) {
            const doc = publicSnapshot.docs[0];
            return toCustomList(doc.id, doc.data());
        }

        // 2. If authenticated, try owner access (for private lists)
        const auth = getAuth();
        if (auth.currentUser) {
            const ownerQuery = query(
                this.collectionRef,
                where('slug', '==', slug),
                where('userId', '==', auth.currentUser.uid)
            );

            const ownerSnapshot = await getDocs(ownerQuery);
            if (!ownerSnapshot.empty) {
                const doc = ownerSnapshot.docs[0];
                return toCustomList(doc.id, doc.data());
            }
        }

        return null;
    }

    async getByUserId(userId: string): Promise<CustomList[]> {
        const q = query(
            this.collectionRef,
            where('userId', '==', userId),
            orderBy('updatedAt', 'desc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => toCustomList(doc.id, doc.data()));
    }

    async getPublicLists(): Promise<CustomList[]> {
        const q = query(
            this.collectionRef,
            where('visibility', '==', 'public'),
            orderBy('likesCount', 'desc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => toCustomList(doc.id, doc.data()));
    }

    async addReading(listId: string, reading: ListReading): Promise<void> {
        const docRef = doc(db, COLLECTION_NAME, listId);
        await updateDoc(docRef, {
            readings: arrayUnion(reading),
            updatedAt: Timestamp.now(),
        });
    }

    async removeReading(listId: string, reading: ListReading): Promise<void> {
        const docRef = doc(db, COLLECTION_NAME, listId);
        await updateDoc(docRef, {
            readings: arrayRemove(reading),
            updatedAt: Timestamp.now(),
        });
    }

    async toggleLike(listId: string, userId: string): Promise<boolean> {
        const likeRef = doc(db, COLLECTION_NAME, listId, 'likes', userId);
        const listRef = doc(db, COLLECTION_NAME, listId);
        const likeDoc = await getDoc(likeRef);

        if (likeDoc.exists()) {
            await deleteDoc(likeRef);
            await updateDoc(listRef, { likesCount: increment(-1) });
            return false;
        } else {
            await setDoc(likeRef, { createdAt: Timestamp.now() });
            await updateDoc(listRef, { likesCount: increment(1) });
            return true;
        }
    }

    async hasUserLiked(listId: string, userId: string): Promise<boolean> {
        const likeRef = doc(db, COLLECTION_NAME, listId, 'likes', userId);
        const likeDoc = await getDoc(likeRef);
        return likeDoc.exists();
    }

    async addComment(listId: string, userId: string, userName: string, data: CreateCommentDTO): Promise<ListComment> {
        const commentsRef = collection(db, COLLECTION_NAME, listId, 'comments');
        const now = Timestamp.now();

        const commentData = {
            listId,
            userId,
            userName,
            content: data.content,
            createdAt: now,
        };

        const docRef = await addDoc(commentsRef, commentData);
        return toComment(docRef.id, commentData);
    }

    async getComments(listId: string): Promise<ListComment[]> {
        const commentsRef = collection(db, COLLECTION_NAME, listId, 'comments');
        const q = query(commentsRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => toComment(doc.id, doc.data()));
    }

    async deleteComment(listId: string, commentId: string): Promise<void> {
        const commentRef = doc(db, COLLECTION_NAME, listId, 'comments', commentId);
        await deleteDoc(commentRef);
    }
}

export const customListRepository = new FirestoreCustomListRepository();
