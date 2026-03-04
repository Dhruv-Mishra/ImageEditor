/**
 * Client-side vector database using IndexedDB for persistent storage.
 *
 * Stores image embeddings alongside metadata and descriptions,
 * performs cosine-similarity search against stored vectors.
 */

const VECTOR_DB_NAME = 'CropAI_VectorDB';
const VECTOR_STORE = 'vectors';
const VECTOR_DB_VERSION = 1;

/** A stored vector entry linked to a history export. */
export interface VectorEntry {
  /** Same ID as the HistoryEntry it belongs to. */
  id: string;
  /** The text that was embedded (description + metadata). */
  text: string;
  /** AI-generated image description. */
  description: string;
  /** Extracted tags for keyword fallback search. */
  tags: string[];
  /** The embedding vector (float array from nv-embedqa-e5-v5). */
  embedding: number[];
  /** Timestamp for ordering. */
  timestamp: number;
}

/** Search result with similarity score. */
export interface VectorSearchResult {
  id: string;
  description: string;
  tags: string[];
  score: number;
}

// ---- IndexedDB management ----

let cachedVectorDB: IDBDatabase | null = null;
let vectorDBUnavailable = false;

function getVectorDB(): Promise<IDBDatabase> {
  if (vectorDBUnavailable) return Promise.reject(new Error('VectorDB unavailable'));
  if (cachedVectorDB) return Promise.resolve(cachedVectorDB);

  return new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(VECTOR_DB_NAME, VECTOR_DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(VECTOR_STORE)) {
          db.createObjectStore(VECTOR_STORE, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => {
        cachedVectorDB = request.result;
        cachedVectorDB.onclose = () => { cachedVectorDB = null; };
        resolve(request.result);
      };
      request.onerror = () => {
        vectorDBUnavailable = true;
        reject(request.error);
      };
      request.onblocked = () => {
        vectorDBUnavailable = true;
        reject(new Error('VectorDB blocked'));
      };
    } catch {
      vectorDBUnavailable = true;
      reject(new Error('VectorDB not available'));
    }
  });
}

// ---- In-memory cache for search performance ----

let _cachedEntries: VectorEntry[] | null = null;
let _cacheTimestamp = 0;
const CACHE_TTL_MS = 5_000; // 5 seconds

/** Invalidate the in-memory vector cache (call after writes). */
function invalidateVectorCache() {
  _cachedEntries = null;
  _cacheTimestamp = 0;
}

// ---- CRUD operations ----

export async function saveVectorEntry(entry: VectorEntry): Promise<void> {
  try {
    const db = await getVectorDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(VECTOR_STORE, 'readwrite');
      tx.objectStore(VECTOR_STORE).put(entry);
      tx.oncomplete = () => { invalidateVectorCache(); resolve(); };
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    if (process.env.NODE_ENV === 'development') console.error('Failed to save vector entry', err);
  }
}

export async function loadVectorEntry(id: string): Promise<VectorEntry | null> {
  try {
    const db = await getVectorDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(VECTOR_STORE, 'readonly');
      const request = tx.objectStore(VECTOR_STORE).get(id);
      request.onsuccess = () => resolve((request.result as VectorEntry) ?? null);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
}

export async function loadAllVectorEntries(): Promise<VectorEntry[]> {
  // Return cached entries if fresh
  if (_cachedEntries && (Date.now() - _cacheTimestamp) < CACHE_TTL_MS) {
    return _cachedEntries;
  }
  try {
    const db = await getVectorDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(VECTOR_STORE, 'readonly');
      const request = tx.objectStore(VECTOR_STORE).getAll();
      request.onsuccess = () => {
        const entries = request.result as VectorEntry[];
        _cachedEntries = entries;
        _cacheTimestamp = Date.now();
        resolve(entries);
      };
      request.onerror = () => reject(request.error);
    });
  } catch {
    return [];
  }
}

export async function deleteVectorEntry(id: string): Promise<void> {
  try {
    const db = await getVectorDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(VECTOR_STORE, 'readwrite');
      tx.objectStore(VECTOR_STORE).delete(id);
      tx.oncomplete = () => { invalidateVectorCache(); resolve(); };
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // silently fail
  }
}

export async function clearAllVectorEntries(): Promise<void> {
  try {
    const db = await getVectorDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(VECTOR_STORE, 'readwrite');
      tx.objectStore(VECTOR_STORE).clear();
      tx.oncomplete = () => { invalidateVectorCache(); resolve(); };
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // silently fail
  }
}

// ---- Vector math ----

/** Cosine similarity between two vectors. Returns value in [-1, 1]. */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;

  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }

  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

// ---- Search ----

/**
 * Search stored vectors by cosine similarity against a query embedding.
 * Returns results sorted by descending similarity, filtered by a minimum threshold.
 */
export async function searchByEmbedding(
  queryEmbedding: number[],
  topK: number = 10,
  minScore: number = 0.3,
): Promise<VectorSearchResult[]> {
  const entries = await loadAllVectorEntries();
  if (entries.length === 0) return [];

  const scored: VectorSearchResult[] = entries
    .map((entry) => ({
      id: entry.id,
      description: entry.description,
      tags: entry.tags,
      score: cosineSimilarity(queryEmbedding, entry.embedding),
    }))
    .filter((r) => r.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return scored;
}

/**
 * Keyword-based tag search (fallback when embedding is unavailable).
 */
export async function searchByTags(query: string): Promise<VectorSearchResult[]> {
  const entries = await loadAllVectorEntries();
  if (entries.length === 0) return [];

  const queryLower = query.toLowerCase().trim();
  const queryWords = queryLower.split(/\s+/);

  return entries
    .map((entry) => {
      const tagsLower = entry.tags.map((t) => t.toLowerCase());
      const descLower = entry.description.toLowerCase();

      // Score: count matching words in tags + description
      let matchCount = 0;
      for (const word of queryWords) {
        if (tagsLower.some((tag) => tag.includes(word))) matchCount += 2;
        if (descLower.includes(word)) matchCount += 1;
      }

      return {
        id: entry.id,
        description: entry.description,
        tags: entry.tags,
        score: matchCount / (queryWords.length * 3), // Normalize to 0-1
      };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
}

// ---- Tag extraction ----

/**
 * Extract searchable tags from an image description.
 * Simple NLP: extracts nouns, adjectives, and key phrases.
 */
export function extractTags(description: string): string[] {
  const text = description.toLowerCase();

  // Common stop words to filter out
  const stopWords = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
    'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
    'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
    'between', 'out', 'off', 'over', 'under', 'again', 'further', 'then',
    'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'both',
    'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor',
    'not', 'only', 'same', 'so', 'than', 'too', 'very', 'just', 'because',
    'but', 'and', 'or', 'if', 'while', 'about', 'up', 'its', 'it', 'this',
    'that', 'these', 'those', 'he', 'she', 'they', 'them', 'his', 'her',
    'their', 'what', 'which', 'who', 'whom', 'whose', 'i', 'me', 'my',
    'we', 'our', 'you', 'your', 'also', 'like', 'appears', 'seem', 'seems',
    'likely', 'possibly', 'perhaps', 'image', 'photo', 'picture', 'shows',
    'showing', 'depicted', 'features', 'appears',
  ]);

  // Split into words, clean, filter
  const words = text
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));

  // Deduplicate while preserving order
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const word of words) {
    if (!seen.has(word)) {
      seen.add(word);
      tags.push(word);
    }
  }

  return tags.slice(0, 30); // Cap at 30 tags
}

// ---- Embedding text composition ----

/**
 * Compose the text that will be embedded: description + structured metadata.
 */
export function composeEmbeddingText(
  description: string,
  metadata: {
    cropType?: string;
    aspectRatio?: string;
    dimensions?: { width: number; height: number };
    timestamp?: number;
  },
): string {
  const parts = [description];

  if (metadata.cropType) {
    parts.push(`Crop type: ${metadata.cropType}`);
  }
  if (metadata.aspectRatio) {
    parts.push(`Aspect ratio: ${metadata.aspectRatio}`);
  }
  if (metadata.dimensions) {
    parts.push(`Resolution: ${metadata.dimensions.width}x${metadata.dimensions.height}`);
  }
  if (metadata.timestamp) {
    const date = new Date(metadata.timestamp);
    parts.push(`Date: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`);
  }

  return parts.join('. ');
}
