import type { DawEffects } from './dawEffects';

export interface StoredDawTrack {
  id: string;
  name: string;
  blob: Blob;
  audioUrl?: string;
  gain: number;
  pan: number;
  muted: boolean;
  solo: boolean;
  offset: number;
  trimStart: number;
  length: number;
  color: string;
  eqLow: number;
  eqMid: number;
  eqHigh: number;
  delay: number;
  reverb: number;
  eqEnabled?: boolean;
  delayEnabled?: boolean;
  reverbEnabled?: boolean;
  compressorEnabled?: boolean;
  compressorAmount?: number;
  pitchEnabled?: boolean;
  pitchKey?: string;
  pitchScale?: string;
  pitchAmount?: number;
  effects?: DawEffects;
}

export interface StoredDawProject {
  id: string;
  ownerId: string;
  name: string;
  masterGain: number;
  compression: number;
  masterDelay: number;
  zoom: number;
  tracks: StoredDawTrack[];
  createdAt: string;
  updatedAt: string;
}

const DB_NAME = 'musicinsta-daw-projects';
const STORE = 'projects';

function openProjectsDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore(STORE, { keyPath: 'id' });
      store.createIndex('updatedAt', 'updatedAt');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function requestValue<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveDawProject(project: StoredDawProject): Promise<void> {
  const database = await openProjectsDb();
  const transaction = database.transaction(STORE, 'readwrite');
  transaction.objectStore(STORE).put(project);
  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}

export async function getDawProject(id: string): Promise<StoredDawProject | null> {
  const database = await openProjectsDb();
  const result = await requestValue(database.transaction(STORE).objectStore(STORE).get(id));
  database.close();
  return (result as StoredDawProject | undefined) || null;
}

export async function listDawProjects(ownerId: string): Promise<StoredDawProject[]> {
  const database = await openProjectsDb();
  const projects = await requestValue(database.transaction(STORE).objectStore(STORE).getAll()) as StoredDawProject[];
  database.close();
  return projects
    .filter(project => project.ownerId === ownerId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function deleteDawProject(id: string): Promise<void> {
  const database = await openProjectsDb();
  const transaction = database.transaction(STORE, 'readwrite');
  transaction.objectStore(STORE).delete(id);
  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}
