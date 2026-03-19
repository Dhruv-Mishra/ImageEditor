import type { HistoryEntry, SessionData, HeadshotSessionData } from './types';

const DB_NAME = 'CropAI_DB';
const HISTORY_STORE = 'history_store';
const SESSION_STORE = 'session_store';
const DB_VERSION = 2;

const MAX_HISTORY_ENTRIES = 20;
const MAX_SESSIONS = 5;

let cachedDB: IDBDatabase | null = null;
let dbUnavailable = false;

function getDB(): Promise<IDBDatabase> {
    if (dbUnavailable) return Promise.reject(new Error('IndexedDB unavailable'));
    if (cachedDB) return Promise.resolve(cachedDB);
    return new Promise((resolve, reject) => {
        try {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = (event) => {
                const db = request.result;
                const oldVersion = event.oldVersion;

                // Fresh install — create both stores
                if (oldVersion < 1) {
                    db.createObjectStore(HISTORY_STORE, { keyPath: 'id' });
                }
                // Upgrade from v1 → v2 — add session store
                if (oldVersion < 2) {
                    if (!db.objectStoreNames.contains(SESSION_STORE)) {
                        db.createObjectStore(SESSION_STORE, { keyPath: 'id' });
                    }
                }
            };
            request.onsuccess = () => {
                cachedDB = request.result;
                cachedDB.onclose = () => { cachedDB = null; };
                resolve(request.result);
            };
            request.onerror = () => {
                dbUnavailable = true;
                reject(request.error);
            };
            request.onblocked = () => {
                dbUnavailable = true;
                reject(new Error('IndexedDB blocked (private browsing?)'));
            };
        } catch {
            // indexedDB.open() itself can throw in some private browsing modes
            dbUnavailable = true;
            reject(new Error('IndexedDB not available'));
        }
    });
}

export async function saveHistoryEntry(entry: HistoryEntry): Promise<void> {
    try {
        const db = await getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(HISTORY_STORE, 'readwrite');
            const store = tx.objectStore(HISTORY_STORE);
            store.put(entry);

            // Evict oldest entries beyond limit
            const countReq = store.count();
            countReq.onsuccess = () => {
                if (countReq.result > MAX_HISTORY_ENTRIES) {
                    const allReq = store.getAll();
                    allReq.onsuccess = () => {
                        const entries = (allReq.result as HistoryEntry[])
                            .sort((a, b) => b.timestamp - a.timestamp);
                        for (let i = MAX_HISTORY_ENTRIES; i < entries.length; i++) {
                            store.delete(entries[i].id);
                        }
                    };
                }
            };

            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    } catch (err) {
        if (process.env.NODE_ENV === 'development') console.error('Failed to save history entry to IndexedDB', err);
    }
}

export async function loadHistory(): Promise<HistoryEntry[]> {
    try {
        const db = await getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(HISTORY_STORE, 'readonly');
            const request = tx.objectStore(HISTORY_STORE).getAll();
            request.onsuccess = () => {
                const entries = (request.result as HistoryEntry[]).sort(
                    (a, b) => b.timestamp - a.timestamp
                );
                resolve(entries);
            };
            request.onerror = () => reject(request.error);
        });
    } catch (err) {
        if (process.env.NODE_ENV === 'development') console.error('Failed to load history from IndexedDB', err);
        return [];
    }
}

export async function clearHistoryData(): Promise<void> {
    try {
        const db = await getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(HISTORY_STORE, 'readwrite');
            tx.objectStore(HISTORY_STORE).clear();
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    } catch (err) {
        if (process.env.NODE_ENV === 'development') console.error('Failed to clear history from IndexedDB', err);
    }
}

export async function deleteHistoryEntry(id: string): Promise<void> {
    try {
        const db = await getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(HISTORY_STORE, 'readwrite');
            tx.objectStore(HISTORY_STORE).delete(id);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    } catch (err) {
        if (process.env.NODE_ENV === 'development') console.error('Failed to delete history entry from IndexedDB', err);
    }
}

// ---- Session persistence ----

export async function saveSession(data: SessionData): Promise<void> {
    try {
        const db = await getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(SESSION_STORE, 'readwrite');
            const store = tx.objectStore(SESSION_STORE);
            store.put(data);

            // Evict oldest sessions beyond limit
            const countReq = store.count();
            countReq.onsuccess = () => {
                if (countReq.result > MAX_SESSIONS) {
                    const allReq = store.getAll();
                    allReq.onsuccess = () => {
                        const sessions = (allReq.result as SessionData[])
                            .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
                        for (let i = MAX_SESSIONS; i < sessions.length; i++) {
                            store.delete(sessions[i].id);
                        }
                    };
                }
            };

            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    } catch (err) {
        if (process.env.NODE_ENV === 'development') console.error('Failed to save session to IndexedDB', err);
    }
}

export async function loadSession(id: string): Promise<SessionData | null> {
    try {
        const db = await getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(SESSION_STORE, 'readonly');
            const request = tx.objectStore(SESSION_STORE).get(id);
            request.onsuccess = () => resolve((request.result as SessionData) ?? null);
            request.onerror = () => reject(request.error);
        });
    } catch (err) {
        if (process.env.NODE_ENV === 'development') console.error('Failed to load session from IndexedDB', err);
        return null;
    }
}

export async function clearSession(id: string): Promise<void> {
    try {
        const db = await getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(SESSION_STORE, 'readwrite');
            tx.objectStore(SESSION_STORE).delete(id);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    } catch (err) {
        if (process.env.NODE_ENV === 'development') console.error('Failed to clear session from IndexedDB', err);
    }
}

export async function loadAllSessions(): Promise<(SessionData | HeadshotSessionData)[]> {
    try {
        const db = await getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(SESSION_STORE, 'readonly');
            const request = tx.objectStore(SESSION_STORE).getAll();
            request.onsuccess = () => {
                const sessions = (request.result as (SessionData | HeadshotSessionData)[]).sort(
                    (a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)
                );
                resolve(sessions);
            };
            request.onerror = () => reject(request.error);
        });
    } catch (err) {
        if (process.env.NODE_ENV === 'development') console.error('Failed to load sessions from IndexedDB', err);
        return [];
    }
}

// ---- Headshot session persistence ----

export async function saveHeadshotSession(data: HeadshotSessionData): Promise<void> {
    try {
        const db = await getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(SESSION_STORE, 'readwrite');
            const store = tx.objectStore(SESSION_STORE);
            store.put(data);

            const countReq = store.count();
            countReq.onsuccess = () => {
                if (countReq.result > MAX_SESSIONS) {
                    const allReq = store.getAll();
                    allReq.onsuccess = () => {
                        const sessions = (allReq.result as Array<SessionData | HeadshotSessionData>)
                            .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
                        for (let i = MAX_SESSIONS; i < sessions.length; i++) {
                            store.delete(sessions[i].id);
                        }
                    };
                }
            };

            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    } catch (err) {
        if (process.env.NODE_ENV === 'development') console.error('Failed to save headshot session', err);
    }
}

export async function loadHeadshotSession(id: string): Promise<HeadshotSessionData | null> {
    try {
        const db = await getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(SESSION_STORE, 'readonly');
            const request = tx.objectStore(SESSION_STORE).get(id);
            request.onsuccess = () => {
                const result = request.result;
                if (result && result.type === 'headshot') {
                    resolve(result as HeadshotSessionData);
                } else {
                    resolve(null);
                }
            };
            request.onerror = () => reject(request.error);
        });
    } catch (err) {
        if (process.env.NODE_ENV === 'development') console.error('Failed to load headshot session', err);
        return null;
    }
}
