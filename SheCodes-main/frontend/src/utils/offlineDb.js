const DB_NAME = "neuroaid-offline";
const DB_VERSION = 1;
const CACHE = "cache";
const QUEUE = "sync_queue";

function openDb() {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("indexedDB is not available"));
  }
  return new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(CACHE)) db.createObjectStore(CACHE, { keyPath: "key" });
        if (!db.objectStoreNames.contains(QUEUE)) db.createObjectStore(QUEUE, { keyPath: "id" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("indexedDB open error"));
    } catch (e) {
      reject(e);
    }
  });
}

async function transaction(storeName, mode, operation) {
  if (typeof indexedDB === "undefined") return undefined;
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        let value;
        try { value = operation(store); } catch (error) { reject(error); return; }
        tx.oncomplete = () => { db.close(); resolve(value); };
        tx.onerror = () => { db.close(); reject(tx.error); };
      } catch (err) {
        try { db.close(); } catch {}
        reject(err);
      }
    });
  } catch {
    return undefined;
  }
}

export const cacheKey = (userId, name) => `${userId || "guest"}:${name}`;

export async function setCached(key, value) {
  await transaction(CACHE, "readwrite", store => store.put({ key, value, updatedAt: new Date().toISOString() }));
  return value;
}

export async function getCached(key, fallback = null) {
  try {
    const db = await openDb();
    return new Promise((resolve) => {
      try {
        const req = db.transaction(CACHE, "readonly").objectStore(CACHE).get(key);
        req.onsuccess = () => { db.close(); resolve(req.result?.value ?? fallback); };
        req.onerror = () => { db.close(); resolve(fallback); };
      } catch {
        try { db.close(); } catch {}
        resolve(fallback);
      }
    });
  } catch {
    return fallback;
  }
}

export async function enqueue(action) {
  const item = {
    id: action.id || crypto.randomUUID(),
    type: action.type,
    payload: action.payload,
    createdAt: new Date().toISOString(),
    retries: 0,
    nextRetryAt: 0,
  };
  await transaction(QUEUE, "readwrite", store => store.put(item));
  return item;
}

export async function queuedActions() {
  try {
    const db = await openDb();
    return new Promise((resolve) => {
      try {
        const req = db.transaction(QUEUE, "readonly").objectStore(QUEUE).getAll();
        req.onsuccess = () => { db.close(); resolve(req.result || []); };
        req.onerror = () => { db.close(); resolve([]); };
      } catch {
        try { db.close(); } catch {}
        resolve([]);
      }
    });
  } catch {
    return [];
  }
}

export async function removeQueued(ids) {
  await transaction(QUEUE, "readwrite", store => ids.forEach(id => store.delete(id)));
}

export async function deferQueued(id) {
  const items = await queuedActions();
  const item = items.find(candidate => candidate.id === id);
  if (!item) return;
  item.retries += 1;
  item.nextRetryAt = Date.now() + Math.min(5 * 60_000, 1000 * (2 ** item.retries));
  await transaction(QUEUE, "readwrite", store => store.put(item));
}
