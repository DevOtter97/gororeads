import { db } from '../../config/firebase';
import {
    collection,
    query,
    where,
    orderBy,
    limit as firestoreLimit,
    getDocs,
    addDoc,
    updateDoc,
    doc,
    serverTimestamp,
    onSnapshot,
    writeBatch
} from 'firebase/firestore';
import type { INotificationRepository, Notification } from '../../domain/interfaces/INotificationRepository';

export class FirestoreNotificationRepository implements INotificationRepository {

    async createNotification(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<void> {
        const notificationsRef = collection(db, 'notifications');
        const data: Record<string, any> = { createdAt: serverTimestamp() };
        for (const [key, value] of Object.entries(notification)) {
            if (value !== undefined) {
                data[key] = value;
            }
        }
        await addDoc(notificationsRef, data);
    }

    async getNotifications(userId: string, limitCount: number = 20): Promise<Notification[]> {
        const notificationsRef = collection(db, 'notifications');
        const q = query(
            notificationsRef,
            where('userId', '==', userId),
            orderBy('createdAt', 'desc'),
            firestoreLimit(limitCount)
        );

        try {
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    userId: data.userId,
                    type: data.type,
                    title: data.title,
                    message: data.message,
                    fromUserId: data.fromUserId,
                    fromUsername: data.fromUsername,
                    fromUserPhotoUrl: data.fromUserPhotoUrl,
                    metadata: data.metadata,
                    read: data.read,
                    createdAt: data.createdAt?.toDate() || new Date()
                };
            });
        } catch (error: any) {
            console.error('Error fetching notifications:', error);
            if (error?.code === 'failed-precondition') {
                console.error('Likely missing Firestore index. Check the link in the error message above.');
            }
            throw error;
        }
    }

    async getUnreadCount(userId: string): Promise<number> {
        const notificationsRef = collection(db, 'notifications');
        const q = query(
            notificationsRef,
            where('userId', '==', userId),
            where('read', '==', false)
        );

        const snapshot = await getDocs(q);
        return snapshot.size;
    }

    async markAsRead(notificationId: string): Promise<void> {
        const notificationRef = doc(db, 'notifications', notificationId);
        await updateDoc(notificationRef, { read: true });
    }

    async markAllAsRead(userId: string): Promise<void> {
        const notificationsRef = collection(db, 'notifications');
        const q = query(
            notificationsRef,
            where('userId', '==', userId),
            where('read', '==', false)
        );

        const snapshot = await getDocs(q);
        if (snapshot.empty) return;

        const batch = writeBatch(db);
        snapshot.docs.forEach(doc => {
            batch.update(doc.ref, { read: true });
        });
        await batch.commit();
    }

    /**
     * Borra TODAS las notificaciones recibidas por el usuario (`userId == X`)
     * en batches de 500. Usado por el cascade de eliminacion de cuenta. Las
     * notificaciones que el usuario haya GENERADO en bandejas ajenas (campo
     * fromUserId) NO se borran porque las reglas no lo permiten — quedan
     * huerfanas con el username viejo.
     */
    async deleteAllByUserId(userId: string): Promise<void> {
        const notificationsRef = collection(db, 'notifications');
        const q = query(notificationsRef, where('userId', '==', userId));
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

    onUnreadCountChanged(userId: string, callback: (count: number) => void): () => void {
        const notificationsRef = collection(db, 'notifications');
        const q = query(
            notificationsRef,
            where('userId', '==', userId),
            where('read', '==', false)
        );

        return onSnapshot(q, (snapshot) => {
            callback(snapshot.size);
        });
    }
}

export const notificationRepository = new FirestoreNotificationRepository();
