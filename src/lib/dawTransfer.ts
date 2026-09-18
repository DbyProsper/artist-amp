const DB_NAME = 'musicinsta-audio-transfer';
const STORE = 'audio';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function storeDawAudio(blob: Blob, name: string): Promise<string> {
  const key = crypto.randomUUID();
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readwrite');
    transaction.objectStore(STORE).put({ blob, name }, key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
  return key;
}

export async function takeDawAudio(key: string): Promise<{ blob: Blob; name: string } | null> {
  const db = await openDb();
  const result = await new Promise<{ blob: Blob; name: string } | undefined>((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readwrite');
    const store = transaction.objectStore(STORE);
    const request = store.get(key);
    request.onsuccess = () => { const value = request.result; store.delete(key); resolve(value); };
    request.onerror = () => reject(request.error);
  });
  db.close();
  return result || null;
}
