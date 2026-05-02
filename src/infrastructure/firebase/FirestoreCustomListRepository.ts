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
    runTransaction,
    writeBatch,
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
    private readonly collectionRef = collection(db, COLLECTION_NAME);

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

    async update(existing: CustomList, data: UpdateCustomListDTO): Promise<CustomList> {
        const docRef = doc(db, COLLECTION_NAME, existing.id);
        const now = Timestamp.now();

        const updateData: Record<string, unknown> = { updatedAt: now };
        if (data.name !== undefined) updateData.name = data.name;
        if (data.userName !== undefined) updateData.userName = data.userName;
        if (data.description !== undefined) updateData.description = data.description ?? null;
        if (data.visibility !== undefined) updateData.visibility = data.visibility;
        if (data.coverImage !== undefined) updateData.coverImage = data.coverImage ?? null;
        if (data.readings !== undefined) updateData.readings = data.readings;

        await updateDoc(docRef, updateData);

        return {
            ...existing,
            ...data,
            description: data.description !== undefined ? (data.description ?? undefined) : existing.description,
            coverImage: data.coverImage !== undefined ? (data.coverImage ?? undefined) : existing.coverImage,
            updatedAt: now.toDate(),
        };
    }

    async delete(id: string): Promise<void> {
        const docRef = doc(db, COLLECTION_NAME, id);
        await deleteDoc(docRef);
    }

    /**
     * Borra TODAS las listas del usuario en batches de 500. Usado por el
     * cascade de eliminacion de cuenta. Subcollections (likes, comments)
     * quedan huerfanas, igual que en delete() individual.
     */
    async deleteAllByUserId(userId: string): Promise<void> {
        const q = query(this.collectionRef, where('userId', '==', userId));
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

    async getById(id: string): Promise<CustomList | null> {
        const docRef = doc(db, COLLECTION_NAME, id);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            return null;
        }

        return toCustomList(id, docSnap.data());
    }

    async getBySlug(slug: string): Promise<CustomList | null> {
        // Las reglas permiten leer si la lista es publica/link, o si el usuario auth es el owner.
        // Lanzamos ambas queries en paralelo y nos quedamos con la primera con resultado.
        const publicQuery = query(
            this.collectionRef,
            where('slug', '==', slug),
            where('visibility', 'in', ['public', 'link'])
        );

        const auth = getAuth();
        const ownerQuery = auth.currentUser
            ? query(
                this.collectionRef,
                where('slug', '==', slug),
                where('userId', '==', auth.currentUser.uid)
            )
            : null;

        const [publicSnapshot, ownerSnapshot] = await Promise.all([
            getDocs(publicQuery),
            ownerQuery ? getDocs(ownerQuery) : Promise.resolve(null),
        ]);

        const match = (!publicSnapshot.empty && publicSnapshot.docs[0])
            || (ownerSnapshot && !ownerSnapshot.empty && ownerSnapshot.docs[0]);

        return match ? toCustomList(match.id, match.data()) : null;
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

    async getPublicListsByUserId(userId: string): Promise<CustomList[]> {
        // Solo listas verdaderamente publicas. Las listas con visibilidad 'link' son
        // privadas para todos excepto para quien tiene el enlace, asi que no deben
        // listarse en el perfil publico de otro usuario.
        const q = query(
            this.collectionRef,
            where('userId', '==', userId),
            where('visibility', '==', 'public')
        );
        const snapshot = await getDocs(q);
        const lists = snapshot.docs.map(doc => toCustomList(doc.id, doc.data()));
        lists.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
        return lists;
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
        // Transaction: lee like + lista, computa el nuevo count clampeando a 0
        // (asi nunca queda negativo aunque el counter haya quedado desfasado).
        return runTransaction(db, async (tx) => {
            const likeSnap = await tx.get(likeRef);
            const listSnap = await tx.get(listRef);
            if (!listSnap.exists()) throw new Error('List not found');
            const currentCount = (listSnap.data().likesCount as number) ?? 0;
            if (likeSnap.exists()) {
                tx.delete(likeRef);
                tx.update(listRef, { likesCount: Math.max(0, currentCount - 1) });
                return false;
            }
            tx.set(likeRef, { createdAt: Timestamp.now() });
            tx.update(listRef, { likesCount: currentCount + 1 });
            return true;
        });
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
