import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';

export interface Song {
  id?: string;
  userId: string;
  title: string;
  lyrics?: string;
  audioUrl?: string;
  coverUrl?: string;
  genre?: string;
  bpm?: number;
  modelUsed?: string;
  status: 'generating' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
  prompt?: string;
  duration?: number;
  fileSize?: number;
}

export class SongService {
  private static readonly COLLECTION_NAME = 'songs';

  /**
   * Save a new song to Firestore
   */
  static async saveSong(songData: Omit<Song, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), {
        ...songData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      console.log('Song saved with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error saving song:', error);
      throw error;
    }
  }

  /**
   * Update an existing song
   */
  static async updateSong(songId: string, updates: Partial<Song>): Promise<void> {
    try {
      const songRef = doc(db, this.COLLECTION_NAME, songId);
      await updateDoc(songRef, {
        ...updates,
        updatedAt: Timestamp.now(),
      });

      console.log('Song updated:', songId);
    } catch (error) {
      console.error('Error updating song:', error);
      throw error;
    }
  }

  /**
   * Get all songs for a user
   */
  static async getUserSongs(userId: string): Promise<Song[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const songs: Song[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        songs.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as Song);
      });

      return songs;
    } catch (error) {
      console.error('Error getting user songs:', error);
      throw error;
    }
  }

  /**
   * Listen to real-time updates for user songs
   */
  static subscribeToUserSongs(userId: string, callback: (songs: Song[]) => void) {
    const q = query(
      collection(db, this.COLLECTION_NAME),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (querySnapshot) => {
      const songs: Song[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        songs.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as Song);
      });
      callback(songs);
    });
  }

  /**
   * Delete a song
   */
  static async deleteSong(songId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.COLLECTION_NAME, songId));
      console.log('Song deleted:', songId);
    } catch (error) {
      console.error('Error deleting song:', error);
      throw error;
    }
  }

  /**
   * Upload file to Firebase Storage
   */
  static async uploadFile(userId: string, file: File, fileType: 'audio' | 'image'): Promise<string> {
    try {
      const timestamp = Date.now();
      const fileName = `${fileType}_${timestamp}_${file.name}`;
      const storageRef = ref(storage, `users/${userId}/${fileType}/${fileName}`);

      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      console.log('File uploaded:', downloadURL);
      return downloadURL;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  /**
   * Create a song entry for generation (before API call)
   */
  static async createSongForGeneration(
    userId: string,
    title: string,
    prompt: string,
    modelUsed: string = 'gemini'
  ): Promise<string> {
    const songData: Omit<Song, 'id' | 'createdAt' | 'updatedAt'> = {
      userId,
      title,
      prompt,
      modelUsed,
      status: 'generating',
    };

    return await this.saveSong(songData);
  }

  /**
   * Update song with generation results
   */
  static async updateSongWithResults(
    songId: string,
    results: {
      audioUrl?: string;
      coverUrl?: string;
      lyrics?: string;
      genre?: string;
      bpm?: number;
      duration?: number;
      fileSize?: number;
    }
  ): Promise<void> {
    await this.updateSong(songId, {
      ...results,
      status: 'completed',
    });
  }

  /**
   * Mark song generation as failed
   */
  static async markSongAsFailed(songId: string, error?: string): Promise<void> {
    await this.updateSong(songId, {
      status: 'failed',
    });

    if (error) {
      console.error('Song generation failed:', songId, error);
    }
  }
}