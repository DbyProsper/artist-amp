import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs, getDoc, doc, onSnapshot, type DocumentData, type QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Post, Artist, Track, Album } from '@/types';
import { DEFAULT_MEDIA_IMAGE } from '@/lib/media';

interface DatabasePost {
  id: string;
  profile_id: string;
  type: string;
  track_id: string | null;
  image_url: string | null;
  video_url: string | null;
  caption: string | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  is_story: boolean | null;
  created_at: string | null;
  profiles: {
    id: string;
    user_id: string;
    username: string | null;
    name: string | null;
    avatar_url: string | null;
    is_verified: boolean | null;
    location: string | null;
  };
  tracks?: {
    id: string;
    title: string;
    cover_url: string | null;
    audio_url: string | null;
    duration: number | null;
    plays: number | null;
    likes: number | null;
  } | null;
}

const profileCache = new Map<string, DocumentData | null>();
const trackCache = new Map<string, DocumentData | null>();
const albumCache = new Map<string, DocumentData | null>();
const documentRequests = new Map<string, Promise<DocumentData | null>>();
let feedPostsCache: Post[] = [];
let feedCacheReady = false;
let sharedFeedUnsubscribe: (() => void) | null = null;

const FEED_STATE_EVENT = 'musicinsta:feed-state';

async function cachedDocument(collectionName: string, id: string, cache: Map<string, DocumentData | null>) {
  if (cache.has(id)) return cache.get(id) ?? null;
  const requestKey = `${collectionName}/${id}`;
  const existing = documentRequests.get(requestKey);
  if (existing) return existing;
  const request = getDoc(doc(db, collectionName, id)).then(snapshot => {
    const value = snapshot.exists() ? snapshot.data() : null;
    cache.set(id, value);
    return value;
  }).finally(() => documentRequests.delete(requestKey));
  documentRequests.set(requestKey, request);
  return request;
}

export function useFeedPosts() {
  const [posts, setPosts] = useState<Post[]>(() => feedPostsCache);
  const [loading, setLoading] = useState(() => !feedCacheReady);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = async (showLoading = true, suppliedDocs?: QueryDocumentSnapshot<DocumentData>[]) => {
    if (showLoading) setLoading(true);
    try {
      // Fetch posts from database
      const postsQuery = query(
        collection(db, 'posts'),
        orderBy('created_at', 'desc'),
        limit(50)
      );

      const postDocs = suppliedDocs ?? (await getDocs(postsQuery)).docs;

      if (!postDocs.length) {
        feedPostsCache = [];
        feedCacheReady = true;
        setPosts([]);
        window.dispatchEvent(new CustomEvent(FEED_STATE_EVENT, { detail: [] }));
        return;
      }

      // Resolve independent references in parallel. This avoids the previous
      // profile -> track -> album request waterfall for every post.
      const rawPosts = postDocs.map(item => item.data());
      await Promise.all([
        ...new Set(rawPosts.map(post => String(post.profile_id || '')).filter(Boolean))
      ].map(id => cachedDocument('profiles', id, profileCache)));
      await Promise.all([
        ...new Set(rawPosts.map(post => String(post.track_id || '')).filter(Boolean))
      ].map(id => cachedDocument('tracks', id, trackCache)));
      const albumIds = [...new Set(rawPosts.map(post => String(post.album_id || '')).filter(Boolean))];
      await Promise.all(albumIds.map(id => cachedDocument('albums', id, albumCache)));
      const albumTrackIds = albumIds.flatMap(id => {
        const data = albumCache.get(id);
        return Array.isArray(data?.track_ids) ? data.track_ids.map(String) : [];
      });
      await Promise.all([...new Set(albumTrackIds)].map(id => cachedDocument('tracks', id, trackCache)));

      // Transform database posts to Post type
      const transformedPosts: Post[] = [];

      for (const postDoc of postDocs) {
        const post = postDoc.data();
        if (post.is_story === true) continue;

        // Fetch profile data
        let profileData = null;
        try {
          profileData = await cachedDocument('profiles', post.profile_id, profileCache);
        } catch (error) {
          console.error('Error fetching profile:', error);
        }

        // Fetch track data if it exists
        let trackData = null;
        if (post.track_id) {
          try {
            trackData = await cachedDocument('tracks', post.track_id, trackCache);
          } catch (error) {
            console.error('Error fetching track:', error);
          }
        }

        let album: Album | undefined;
        if (post.album_id) {
          try {
            const albumData = await cachedDocument('albums', post.album_id, albumCache);
            if (albumData) {
              const albumTracks = (await Promise.all(((albumData.track_ids || []) as string[]).map(async (trackId: string) => {
                const value = await cachedDocument('tracks', trackId, trackCache);
                if (!value) return null;
                return {
                  id: trackId, title: value.title || 'Untitled track', artist: undefined,
                  coverArt: value.cover_url || albumData.cover_url || DEFAULT_MEDIA_IMAGE,
                  duration: Number(value.duration) || 0, plays: Number(value.plays) || 0, likes: Number(value.likes) || 0,
                  audioUrl: value.audio_url || undefined, lyrics: value.lyrics || undefined, genre: value.genre || albumData.genre || undefined,
                  albumId: post.album_id, trackNumber: Number(value.track_number) || undefined,
                };
              }))).filter(Boolean) as Array<Omit<Track, 'artist'> & { artist?: Artist }>;
              album = { id: post.album_id, title: albumData.title || 'Untitled release', type: albumData.release_type === 'ep' ? 'ep' : 'album', artist: undefined as unknown as Artist, coverArt: albumData.cover_url || DEFAULT_MEDIA_IMAGE, genre: albumData.genre || undefined, description: albumData.description || undefined, tracks: albumTracks as Track[], releaseDate: albumData.created_at?.toDate?.() };
            }
          } catch (error) { console.error('Error fetching album:', error); }
        }

        if (!profileData) continue;

        const artist: Artist = {
          id: profileData.id || post.profile_id,
          name: profileData.name || 'Unknown',
          username: profileData.username || 'unknown',
          avatar: profileData.avatar_url || DEFAULT_MEDIA_IMAGE,
          coverImage: profileData.cover_url || DEFAULT_MEDIA_IMAGE,
          bio: '',
          location: profileData.location || '',
          genres: Array.isArray(profileData.genres) ? profileData.genres : [],
          isVerified: profileData.is_verified || false,
          followers: 0,
          following: 0,
          tracks: 0,
        };

        if (album) { album.artist = artist; album.tracks = album.tracks.map(track => ({ ...track, artist })); }

        let postTrack: Track | undefined;
        if (trackData) {
          postTrack = {
            id: post.track_id,
            title: trackData.title || 'Untitled track',
            artist: artist,
            coverArt: trackData.cover_url || post.image_url || DEFAULT_MEDIA_IMAGE,
            duration: trackData.duration || 0,
            plays: Number(trackData.plays) || 0,
            likes: trackData.likes || 0,
            audioUrl: trackData.audio_url || undefined,
            lyrics: trackData.lyrics || trackData.metadata?.lyrics || undefined,
            timestampedLyrics: trackData.timestamped_lyrics || trackData.metadata?.timestamped_lyrics || undefined,
            lyricStartTime: Number(trackData.lyric_start_time || trackData.metadata?.lyric_start_time) || undefined,
            credits: trackData.credits || trackData.metadata?.credits || undefined,
            genre: trackData.genre || trackData.metadata?.genre || undefined,
            mood: trackData.mood || trackData.metadata?.mood || undefined,
            bpm: Number(trackData.bpm || trackData.metadata?.bpm) || undefined,
            energy: Number.isFinite(Number(trackData.energy || trackData.metadata?.energy)) ? Number(trackData.energy || trackData.metadata?.energy) : undefined,
            loudness: Number.isFinite(Number(trackData.loudness || trackData.metadata?.loudness)) ? Number(trackData.loudness || trackData.metadata?.loudness) : undefined,
            tags: Array.isArray(trackData.tags) ? trackData.tags : [],
            source: trackData.metadata?.mode ? 'generated' : 'firestore',
            isPublic: trackData.is_public !== false,
            createdAt: trackData.created_at?.toDate?.() || (trackData.created_at ? new Date(trackData.created_at) : undefined),
          };
        }

        transformedPosts.push({
          id: postDoc.id,
          artist: artist,
          type: post.type as 'audio' | 'video' | 'image' | 'album',
          track: postTrack,
          album,
          imageUrl: post.image_url || undefined,
          videoUrl: post.video_url || undefined,
          caption: post.caption || '',
          likes: post.likes || 0,
          comments: post.comments || 0,
          shares: post.shares || 0,
          saves: 0,
          createdAt: post.created_at?.toDate?.() || (post.created_at ? new Date(post.created_at) : new Date(0)),
          isLiked: false,
          isSaved: false,
          isNewRelease: post.is_new_release === true || Boolean(trackData?.is_new_release),
          isNewPost: post.is_new_post === true,
          credits: post.credits || trackData?.credits || trackData?.metadata?.credits || undefined,
          visualFilter: post.visual_filter || undefined,
          attachedMusic: post.attached_music || undefined,
          ctaLabel: post.cta_label || undefined,
          ctaTarget: post.cta_target || undefined,
          hideLikes: post.hide_likes === true,
          hidePlayCount: post.hide_play_count === true,
        });
      }

      transformedPosts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      feedPostsCache = transformedPosts;
      feedCacheReady = true;
      setPosts(transformedPosts);
      window.dispatchEvent(new CustomEvent(FEED_STATE_EVENT, { detail: transformedPosts }));
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to load posts');
      if (!feedCacheReady) setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const syncCachedPosts = (event: Event) => {
      setPosts((event as CustomEvent<Post[]>).detail);
      setLoading(false);
    };
    window.addEventListener(FEED_STATE_EVENT, syncCachedPosts);
    if (feedCacheReady) { setPosts(feedPostsCache); setLoading(false); }
    if (!sharedFeedUnsubscribe) {
      const postsQuery = query(collection(db, 'posts'), orderBy('created_at', 'desc'), limit(50));
      sharedFeedUnsubscribe = onSnapshot(postsQuery, snapshot => void fetchPosts(false, snapshot.docs), () => {
        setError('Failed to listen for new posts');
        setLoading(false);
      });
    }
    const refresh = () => void fetchPosts(false);
    window.addEventListener('musicinsta:feed-refresh', refresh);
    return () => {
      window.removeEventListener(FEED_STATE_EVENT, syncCachedPosts);
      window.removeEventListener('musicinsta:feed-refresh', refresh);
    };
  }, []);

  return { posts, loading, error, refetch: fetchPosts };
}
