import type { HistoryEntry } from './types';

const DB_NAME = 'CropAI_DB';
const STORE_NAME = 'history_store';

function getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () => {
            request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function saveHistoryEntry(entry: HistoryEntry): Promise<void> {
    try {
        const db = await getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            tx.objectStore(STORE_NAME).put(entry);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    } catch (err) {
        console.error('Failed to save history entry to IndexedDB', err);
    }
}

export async function loadHistory(): Promise<HistoryEntry[]> {
    try {
        const db = await getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const request = tx.objectStore(STORE_NAME).getAll();
            request.onsuccess = () => {
                const entries = (request.result as HistoryEntry[]).sort(
                    (a, b) => b.timestamp - a.timestamp
                );
                resolve(entries);
            };
            request.onerror = () => reject(request.error);
        });
    } catch (err) {
        console.error('Failed to load history from IndexedDB', err);
        return [];
    }
}

export async function clearHistoryData(): Promise<void> {
    try {
        const db = await getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            tx.objectStore(STORE_NAME).clear();
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    } catch (err) {
        console.error('Failed to clear history from IndexedDB', err);
    }
}
