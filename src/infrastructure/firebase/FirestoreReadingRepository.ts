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
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import type { IReadingRepository, ReadingFilters } from '../../domain/interfaces/IReadingRepository';
import type { Reading, CreateReadingDTO, UpdateReadingDTO } from '../../domain/entities/Reading';

const COLLECTION_NAME = 'readings';

function toReading(id: string, data: Record<string, unknown>): Reading {
    return {
        id,
        userId: data.userId as string,
        title: data.title as string,
        imageUrl: data.imageUrl as string | undefined,
        category: data.category as Reading['category'],
        status: data.status as Reading['status'],
        measureUnit: (data.measureUnit as Reading['measureUnit']) || 'chapters',
        tags: (data.tags as string[]) || [],
        currentChapter: data.currentChapter as number | undefined,
        totalChapters: data.totalChapters as number | undefined,
        notes: data.notes as string | undefined,
        referenceUrl: data.referenceUrl as string | undefined,
        isFavorite: (data.isFavorite as boolean) ?? false,
        startedAt: (data.startedAt as Timestamp)?.toDate() || undefined,
        finishedAt: (data.finishedAt as Timestamp)?.toDate() || undefined,
        createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
        updatedAt: (data.updatedAt as Timestamp)?.toDate() || new Date(),
    };
}

export class FirestoreReadingRepository implements IReadingRepository {
    private collectionRef = collection(db, COLLECTION_NAME);

    async create(userId: string, data: CreateReadingDTO): Promise<Reading> {
        const now = Timestamp.now();
        const docData = {
            userId,
            title: data.title,
            category: data.category,
            status: data.status,
            measureUnit: data.measureUnit,
            tags: data.tags || [],
            imageUrl: data.imageUrl ?? null,
            currentChapter: data.currentChapter ?? null,
            totalChapters: data.totalChapters ?? null,
            notes: data.notes ?? null,
            referenceUrl: data.referenceUrl ?? null,
            isFavorite: data.isFavorite ?? false,
            startedAt: data.startedAt ? Timestamp.fromDate(data.startedAt) : null,
            finishedAt: data.finishedAt ? Timestamp.fromDate(data.finishedAt) : null,
            createdAt: now,
            updatedAt: now,
        };

        const docRef = await addDoc(this.collectionRef, docData);
        return toReading(docRef.id, { ...docData, createdAt: now, updatedAt: now });
    }

    async update(id: string, data: UpdateReadingDTO): Promise<Reading> {
        const docRef = doc(db, COLLECTION_NAME, id);

        // Convert undefined to null for Firestore
        const updateData: Record<string, unknown> = {
            updatedAt: Timestamp.now(),
        };

        if (data.title !== undefined) updateData.title = data.title;
        if (data.category !== undefined) updateData.category = data.category;
        if (data.status !== undefined) updateData.status = data.status;
        if (data.measureUnit !== undefined) updateData.measureUnit = data.measureUnit;
        if (data.tags !== undefined) updateData.tags = data.tags;

        if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl ?? null;
        if (data.currentChapter !== undefined) updateData.currentChapter = data.currentChapter ?? null;
        if (data.totalChapters !== undefined) updateData.totalChapters = data.totalChapters ?? null;
        if (data.notes !== undefined) updateData.notes = data.notes ?? null;
        if (data.referenceUrl !== undefined) updateData.referenceUrl = data.referenceUrl ?? null;
        if (data.isFavorite !== undefined) updateData.isFavorite = data.isFavorite;

        if (data.startedAt !== undefined) {
            updateData.startedAt = data.startedAt ? Timestamp.fromDate(data.startedAt) : null;
        }

        if (data.finishedAt !== undefined) {
            updateData.finishedAt = data.finishedAt ? Timestamp.fromDate(data.finishedAt) : null;
        }

        await updateDoc(docRef, updateData);

        const updatedDoc = await getDoc(docRef);
        if (!updatedDoc.exists()) {
            throw new Error('Reading not found');
        }

        return toReading(id, updatedDoc.data());
    }

    async delete(id: string): Promise<void> {
        const docRef = doc(db, COLLECTION_NAME, id);
        await deleteDoc(docRef);
    }

    async getById(id: string): Promise<Reading | null> {
        const docRef = doc(db, COLLECTION_NAME, id);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            return null;
        }

        return toReading(id, docSnap.data());
    }

    async getByUserId(userId: string, filters?: ReadingFilters): Promise<Reading[]> {
        console.log('[Firestore] Starting getByUserId for user:', userId);
        console.time('[Firestore] Total getByUserId');

        console.time('[Firestore] Building query');
        let q = query(
            this.collectionRef,
            where('userId', '==', userId)
        );

        if (filters?.status) {
            q = query(
                this.collectionRef,
                where('userId', '==', userId),
                where('status', '==', filters.status)
            );
        }
        console.timeEnd('[Firestore] Building query');

        console.time('[Firestore] getDocs execution');
        const querySnapshot = await getDocs(q);
        console.timeEnd('[Firestore] getDocs execution');
        console.log('[Firestore] Documents retrieved:', querySnapshot.docs.length);

        console.time('[Firestore] Processing results');
        let readings = querySnapshot.docs.map((doc) => toReading(doc.id, doc.data()));

        // Client-side sorting to avoid composite index requirement
        readings.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

        // Client-side filtering for complex filters
        if (filters?.category) {
            readings = readings.filter((r) => r.category === filters.category);
        }

        if (filters?.tags && filters.tags.length > 0) {
            readings = readings.filter((r) =>
                filters.tags!.some((tag) => r.tags.includes(tag))
            );
        }

        if (filters?.searchQuery) {
            const search = filters.searchQuery.toLowerCase();
            readings = readings.filter((r) =>
                r.title.toLowerCase().includes(search)
            );
        }
        console.timeEnd('[Firestore] Processing results');

        console.timeEnd('[Firestore] Total getByUserId');
        return readings;
    }

    async getUserTags(userId: string): Promise<string[]> {
        const readings = await this.getByUserId(userId);
        const tagsSet = new Set<string>();

        readings.forEach((reading) => {
            reading.tags.forEach((tag) => tagsSet.add(tag));
        });

        return Array.from(tagsSet).sort();
    }
}

// Singleton instance
export const readingRepository = new FirestoreReadingRepository();
