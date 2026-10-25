const DATABASE = 'musicinsta-post-drafts';
const STORE = 'drafts';

function openDraftDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function savePostDraft(userId: string, draft: unknown): Promise<void> {
  const database = await openDraftDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE, 'readwrite');
    transaction.objectStore(STORE).put(draft, userId);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}

export async function loadPostDraft<T>(userId: string): Promise<T | null> {
  const database = await openDraftDatabase();
  const value = await new Promise<T | null>((resolve, reject) => {
    const request = database.transaction(STORE, 'readonly').objectStore(STORE).get(userId);
    request.onsuccess = () => resolve((request.result as T | undefined) ?? null);
    request.onerror = () => reject(request.error);
  });
  database.close();
  return value;
}

export async function deletePostDraft(userId: string): Promise<void> {
  const database = await openDraftDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE, 'readwrite');
    transaction.objectStore(STORE).delete(userId);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}
