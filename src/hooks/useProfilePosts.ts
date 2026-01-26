import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Post, Artist, Track } from '@/types';

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
}

interface DatabaseTrack {
  id: string;
  title: string;
  cover_url: string | null;
  audio_url: string | null;
  duration: number | null;
  plays: number | null;
  likes: number | null;
}

export function useProfilePosts(profileId: string | undefined) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profileId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch profile data
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', profileId)
          .single();

        if (!profileData) {
          setLoading(false);
          return;
        }

        const artist: Artist = {
          id: profileData.id,
          name: profileData.name || 'Unknown',
          username: profileData.username || 'unknown',
          avatar: profileData.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
          coverImage: profileData.cover_url || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800',
          bio: profileData.bio || '',
          location: profileData.location || '',
          genres: [],
          isVerified: profileData.is_verified || false,
          followers: 0,
          following: 0,
          tracks: 0,
        };

        // Fetch posts
        const { data: postsData } = await supabase
          .from('posts')
          .select(`
            id,
            profile_id,
            type,
            track_id,
            image_url,
            video_url,
            caption,
            likes,
            comments,
            shares,
            is_story,
            created_at
          `)
          .eq('profile_id', profileId)
          .eq('is_story', false)
          .order('created_at', { ascending: false });

        // Fetch tracks
        const { data: tracksData } = await supabase
          .from('tracks')
          .select('*')
          .eq('profile_id', profileId)
          .order('created_at', { ascending: false });

        // Transform tracks
        if (tracksData) {
          const transformedTracks: Track[] = (tracksData as DatabaseTrack[]).map((track) => ({
            id: track.id,
            title: track.title,
            artist: artist,
            coverArt: track.cover_url || 'https://images.unsplash.com/photo-1614149162883-504ce4d13909?w=400',
            duration: track.duration || 0,
            plays: track.plays || 0,
            likes: track.likes || 0,
            audioUrl: track.audio_url || undefined,
          }));
          setTracks(transformedTracks);
        }

        // Transform posts
        if (postsData) {
          const transformedPosts: Post[] = (postsData as DatabasePost[]).map((post) => {
            let postTrack: Track | undefined;
            
            if (post.track_id && tracksData) {
              const track = (tracksData as DatabaseTrack[]).find((t) => t.id === post.track_id);
              if (track) {
                postTrack = {
                  id: track.id,
                  title: track.title,
                  artist: artist,
                  coverArt: track.cover_url || 'https://images.unsplash.com/photo-1614149162883-504ce4d13909?w=400',
                  duration: track.duration || 0,
                  plays: track.plays || 0,
                  likes: track.likes || 0,
                  audioUrl: track.audio_url || undefined,
                };
              }
            }

            return {
              id: post.id,
              artist: artist,
              type: post.type as 'audio' | 'video' | 'image',
              track: postTrack,
              imageUrl: post.image_url || undefined,
              videoUrl: post.video_url || undefined,
              caption: post.caption || '',
              likes: post.likes || 0,
              comments: post.comments || 0,
              shares: post.shares || 0,
              saves: 0,
              createdAt: new Date(post.created_at || Date.now()),
              isLiked: false,
              isSaved: false,
            };
          });
          setPosts(transformedPosts);
        }
      } catch (err) {
        console.error('Error fetching profile data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [profileId]);

  return { posts, tracks, loading };
}
