import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, doc, setDoc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';

const AI_GENERATED_PLAYLIST_NAME = 'AI Generated Music';

export interface GeneratedAudioItem {
  title: string;
  audio_url: string;
  cover_url?: string;
  duration?: number;
  mode?: string;
  improved_prompt?: string;
  plan?: string;
}

/**
 * Get or create the "AI Generated Music" playlist for the current user
 */
export async function getOrCreateAIPlaylist(profileId: string) {
  try {
    // Try to find existing playlist
    const playlistsRef = collection(db, 'playlists');
    const q = query(
      playlistsRef,
      where('creator_id', '==', profileId),
      where('name', '==', AI_GENERATED_PLAYLIST_NAME)
    );
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const existingPlaylist = querySnapshot.docs[0];
      console.log('[AI Music] Using existing AI Generated Music playlist:', existingPlaylist.id);
      return { id: existingPlaylist.id, ...existingPlaylist.data() };
    }

    // Create new playlist if it doesn't exist
    console.log('[AI Music] Creating new AI Generated Music playlist...');
    const newPlaylistData = {
      creator_id: profileId,
      name: AI_GENERATED_PLAYLIST_NAME,
      description: 'Automatically generated music and beats',
      is_public: false,
      is_collaborative: false,
      created_at: new Date(),
      updated_at: new Date(),
      tracks: []
    };

    const docRef = await addDoc(collection(db, 'playlists'), newPlaylistData);
    console.log('[AI Music] Playlist created:', docRef.id);
    return { id: docRef.id, ...newPlaylistData };
  } catch (error) {
    console.error('[AI Music] Error in getOrCreateAIPlaylist:', error);
    throw error;
  }
}

/**
 * Check if a track with the same title already exists for the user
 */
export async function checkDuplicateTrack(profileId: string, title: string): Promise<boolean> {
  try {
    const tracksQuery = query(
      collection(db, 'tracks'),
      where('profile_id', '==', profileId),
      where('title', '==', title)
    );
    const querySnapshot = await getDocs(tracksQuery);
    return !querySnapshot.empty;
  } catch (error) {
    console.error('[AI Music] Error checking duplicate track:', error);
    return false;
  }
}

/**
 * Save generated audio as a track and add to AI Generated Music playlist
 */
export async function saveGeneratedAudio(profileId: string, item: GeneratedAudioItem) {
  try {
    // Validate required fields
    if (!profileId || !item.title || !item.audio_url) {
      throw new Error('Missing required fields: profileId, title, audio_url');
    }

    console.log('[AI Music] Saving generated audio:', item.title);

    // Get or create the AI Generated Music playlist
    const playlist = await getOrCreateAIPlaylist(profileId);

    // Create the track data
    const trackData: any = {
      profile_id: profileId,
      title: item.title,
      audio_url: item.audio_url,
      cover_url: item.cover_url || null,
      duration: item.duration || null,
      is_public: false,
      created_at: new Date(),
      updated_at: new Date(),
    };

    // Add metadata if provided (only non-undefined values)
    if (item.mode || item.improved_prompt || item.plan) {
      trackData.metadata = {};
      if (item.mode !== undefined) trackData.metadata.mode = item.mode;
      if (item.improved_prompt !== undefined) trackData.metadata.improved_prompt = item.improved_prompt;
      if (item.plan !== undefined) trackData.metadata.plan = item.plan;
    }

    // Add track to Firestore
    const trackRef = await addDoc(collection(db, 'tracks'), trackData);
    const track = { id: trackRef.id, ...trackData };

    console.log('[AI Music] Track created:', track.id);

    // Update the playlist to include this track
    const playlistRef = doc(db, 'playlists', playlist.id);
    await updateDoc(playlistRef, {
      tracks: arrayUnion(track.id),
      updated_at: new Date()
    });

    console.log('[AI Music] Track added to playlist');
    return { track, playlist };
  } catch (error) {
    console.error('[AI Music] Error saving generated audio:', error);
    throw error;
  }
}

export interface GeneratedLyricsItem {
  title: string;
  content: string;
  model?: string;
}

/**
 * Save generated lyrics as a track and add to AI Generated Music playlist
 */
export async function saveGeneratedLyrics(profileId: string, item: GeneratedLyricsItem) {
  try {
    // Validate required fields
    if (!profileId || !item.title || !item.content) {
      throw new Error('Missing required fields: profileId, title, content');
    }

    console.log('[AI Lyrics] Saving generated lyrics:', item.title);

    // Get or create the AI Generated Music playlist
    const playlist = await getOrCreateAIPlaylist(profileId);

    // Create the track data
    const trackData: any = {
      profile_id: profileId,
      title: item.title,
      audio_url: null, // No audio for lyrics
      cover_url: null,
      duration: null,
      is_public: false,
      created_at: new Date(),
      updated_at: new Date(),
      metadata: {
        type: 'lyrics',
        content: item.content,
        model: item.model,
      },
    };

    // Add track to Firestore
    const trackRef = await addDoc(collection(db, 'tracks'), trackData);
    const track = { id: trackRef.id, ...trackData };

    console.log('[AI Lyrics] Track created:', track.id);

    // Update the playlist to include this track
    const playlistRef = doc(db, 'playlists', playlist.id);
    await updateDoc(playlistRef, {
      tracks: arrayUnion(track.id),
      updated_at: new Date()
    });

    console.log('[AI Lyrics] Lyrics added to playlist');
    return { track, playlist };
  } catch (error) {
    console.error('[AI Lyrics] Error saving generated lyrics:', error);
    throw error;
  }
}

/**
 * Save multiple generated audio items (e.g., lyrics + beat from composition)
 */
export async function saveCompositionAudio(profileId: string, prompt: string, lyrics: string, audioUrl: string) {
  try {
    const timestamp = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    // Save beat as track
    console.log('[AI Music] Saving composition beat...');
    const beatResult = await saveGeneratedAudio(profileId, {
      title: `🎵 Beat - ${prompt.slice(0, 40)}... (${timestamp})`,
      audio_url: audioUrl,
      mode: 'composition',
      improved_prompt: prompt,
      plan: lyrics,
    });

    console.log('[AI Music] Composition saved successfully');
    return beatResult;
  } catch (error) {
    console.error('[AI Music] Error saving composition:', error);
    throw error;
  }
}
