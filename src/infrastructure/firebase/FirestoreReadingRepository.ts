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
    Timestamp,
    writeBatch,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import type { IReadingRepository, ReadingFilters } from '../../domain/interfaces/IReadingRepository';
import type { Reading, CreateReadingDTO, UpdateReadingDTO } from '../../domain/entities/Reading';

const COLLECTION_NAME = 'readings';

/**
 * Construye el payload de update para Firestore aplicando solo los campos
 * que vienen definidos en el DTO. Los campos opcionales que vienen como
 * `null`/`undefined` quedan como `null` en Firestore (Firestore no acepta
 * `undefined`). Los timestamps se convierten a Timestamp.
 */
function buildUpdatePayload(data: UpdateReadingDTO, now: Timestamp): Record<string, unknown> {
    const out: Record<string, unknown> = { updatedAt: now };

    const directFields: (keyof UpdateReadingDTO)[] = ['title', 'category', 'status', 'measureUnit', 'tags', 'isFavorite'];
    for (const k of directFields) {
        if (data[k] !== undefined) out[k] = data[k];
    }

    const nullableFields: (keyof UpdateReadingDTO)[] = ['imageUrl', 'currentChapter', 'totalChapters', 'notes', 'referenceUrl'];
    for (const k of nullableFields) {
        if (data[k] !== undefined) out[k] = data[k] ?? null;
    }

    if (data.startedAt !== undefined) {
        out.startedAt = data.startedAt ? Timestamp.fromDate(data.startedAt) : null;
    }
    if (data.finishedAt !== undefined) {
        out.finishedAt = data.finishedAt ? Timestamp.fromDate(data.finishedAt) : null;
    }

    return out;
}

/**
 * Mergea el DTO de update con la entidad existente para devolver el estado
 * post-update sin volver a leer Firestore. Para los campos opcionales,
 * `null` en el DTO significa "limpiar" (devuelve undefined en la entidad).
 */
function mergeReading(existing: Reading, data: UpdateReadingDTO, now: Timestamp): Reading {
    const pickOptional = <K extends keyof UpdateReadingDTO>(key: K): UpdateReadingDTO[K] | undefined => {
        if (data[key] === undefined) return existing[key as keyof Reading] as UpdateReadingDTO[K] | undefined;
        return (data[key] ?? undefined) as UpdateReadingDTO[K] | undefined;
    };

    return {
        ...existing,
        ...data,
        imageUrl: pickOptional('imageUrl') as string | undefined,
        currentChapter: pickOptional('currentChapter') as number | undefined,
        totalChapters: pickOptional('totalChapters') as number | undefined,
        notes: pickOptional('notes') as string | undefined,
        referenceUrl: pickOptional('referenceUrl') as string | undefined,
        startedAt: pickOptional('startedAt') as Date | undefined,
        finishedAt: pickOptional('finishedAt') as Date | undefined,
        updatedAt: now.toDate(),
    };
}

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
    private readonly collectionRef = collection(db, COLLECTION_NAME);

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

    async update(existing: Reading, data: UpdateReadingDTO): Promise<Reading> {
        const docRef = doc(db, COLLECTION_NAME, existing.id);
        const now = Timestamp.now();

        const updateData = buildUpdatePayload(data, now);
        await updateDoc(docRef, updateData);

        return mergeReading(existing, data, now);
    }

    async delete(id: string): Promise<void> {
        const docRef = doc(db, COLLECTION_NAME, id);
        await deleteDoc(docRef);
    }

    /**
     * Borra TODAS las lecturas del usuario en batches de 500. Usado por el
     * cascade de eliminacion de cuenta.
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

    async getById(id: string): Promise<Reading | null> {
        const docRef = doc(db, COLLECTION_NAME, id);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            return null;
        }

        return toReading(id, docSnap.data());
    }

    async getByUserId(userId: string, filters?: ReadingFilters): Promise<Reading[]> {
        const constraints = [where('userId', '==', userId)];
        if (filters?.status) constraints.push(where('status', '==', filters.status));
        const q = query(this.collectionRef, ...constraints);

        const querySnapshot = await getDocs(q);
        let readings = querySnapshot.docs.map((doc) => toReading(doc.id, doc.data()));

        // Sort y filtros complejos en cliente para evitar indices compuestos.
        readings.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

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
            readings = readings.filter((r) => r.title.toLowerCase().includes(search));
        }

        return readings;
    }

    async getUserTags(userId: string): Promise<string[]> {
        const readings = await this.getByUserId(userId);
        const tagsSet = new Set<string>();

        readings.forEach((reading) => {
            reading.tags.forEach((tag) => tagsSet.add(tag));
        });

        return Array.from(tagsSet).sort((a, b) => a.localeCompare(b));
    }
}

// Singleton instance
export const readingRepository = new FirestoreReadingRepository();
