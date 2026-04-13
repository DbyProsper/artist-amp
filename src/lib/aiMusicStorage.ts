import { supabase } from '@/integrations/supabase/client';

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
    const { data: existingPlaylist, error: fetchError } = await supabase
      .from('playlists')
      .select('id')
      .eq('creator_id', profileId)
      .eq('name', AI_GENERATED_PLAYLIST_NAME)
      .single();

    if (existingPlaylist) {
      console.log('[AI Music] Using existing AI Generated Music playlist:', existingPlaylist.id);
      return existingPlaylist;
    }

    // Create new playlist if it doesn't exist
    console.log('[AI Music] Creating new AI Generated Music playlist...');
    const { data: newPlaylist, error: createError } = await supabase
      .from('playlists')
      .insert({
        creator_id: profileId,
        name: AI_GENERATED_PLAYLIST_NAME,
        description: 'Automatically generated music and beats',
        is_public: false,
        is_collaborative: false,
      })
      .select()
      .single();

    if (createError) {
      console.error('[AI Music] Failed to create playlist:', createError);
      throw createError;
    }

    console.log('[AI Music] Playlist created:', newPlaylist.id);
    return newPlaylist;
  } catch (error) {
    console.error('[AI Music] Error in getOrCreateAIPlaylist:', error);
    throw error;
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

    // Insert the track
    const trackData: any = {
        profile_id: profileId,
        title: item.title,
        audio_url: item.audio_url,
        cover_url: item.cover_url || null,
        duration: item.duration || null,
        is_public: false,
    };

    // Add metadata if provided
    if (item.mode || item.improved_prompt || item.plan) {
        trackData.metadata = {
            mode: item.mode,
            improved_prompt: item.improved_prompt,
            plan: item.plan,
        };
    }

    const { data: track, error: trackError } = await supabase
        .from('tracks')
        .insert(trackData)
        .select('id')
        .single();

    if (trackError) {
      console.error('[AI Music] Failed to create track:', trackError);
      throw trackError;
    }

    console.log('[AI Music] Track created:', track.id);

    // Get the highest position in the playlist
    const { data: existingTracks, error: positionError } = await supabase
      .from('playlist_tracks')
      .select('position')
      .eq('playlist_id', playlist.id)
      .order('position', { ascending: false })
      .limit(1);

    if (positionError && positionError.code !== 'PGRST116') {
      // PGRST116 is "no rows" error, which is fine
      console.error('[AI Music] Error fetching playlist position:', positionError);
    }

    const nextPosition = (existingTracks && existingTracks.length > 0)
      ? (existingTracks[0].position || 0) + 1
      : 0;

    // Add the track to the playlist
    const { error: playlistTrackError } = await supabase
      .from('playlist_tracks')
      .insert({
        playlist_id: playlist.id,
        track_id: track.id,
        position: nextPosition,
        added_by: profileId,
      });

    if (playlistTrackError) {
      console.error('[AI Music] Failed to add track to playlist:', playlistTrackError);
      throw playlistTrackError;
    }

    console.log('[AI Music] Track added to playlist at position:', nextPosition);
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

    // Insert the track (using tracks table for consistency, with audio_url null)
    const trackData: any = {
        profile_id: profileId,
        title: item.title,
        audio_url: null, // No audio for lyrics
        cover_url: null,
        duration: null,
        is_public: false,
        metadata: {
            type: 'lyrics',
            content: item.content,
            model: item.model,
        },
    };

    const { data: track, error: trackError } = await supabase
        .from('tracks')
        .insert(trackData)
        .select('id')
        .single();

    if (trackError) {
      console.error('[AI Lyrics] Failed to create track:', trackError);
      throw trackError;
    }

    console.log('[AI Lyrics] Track created:', track.id);

    // Get the highest position in the playlist
    const { data: existingTracks, error: positionError } = await supabase
      .from('playlist_tracks')
      .select('position')
      .eq('playlist_id', playlist.id)
      .order('position', { ascending: false })
      .limit(1);

    if (positionError && positionError.code !== 'PGRST116') {
      // PGRST116 is "no rows" error, which is fine
      console.error('[AI Lyrics] Error fetching playlist position:', positionError);
    }

    const nextPosition = (existingTracks && existingTracks.length > 0)
      ? (existingTracks[0].position || 0) + 1
      : 0;

    // Add the track to the playlist
    const { error: playlistTrackError } = await supabase
      .from('playlist_tracks')
      .insert({
        playlist_id: playlist.id,
        track_id: track.id,
        position: nextPosition,
        added_by: profileId,
      });

    if (playlistTrackError) {
      console.error('[AI Lyrics] Failed to add track to playlist:', playlistTrackError);
      throw playlistTrackError;
    }

    console.log('[AI Lyrics] Lyrics added to playlist at position:', nextPosition);
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
