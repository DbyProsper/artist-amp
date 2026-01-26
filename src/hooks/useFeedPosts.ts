import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Post, Artist, Track } from '@/types';
import { mockPosts } from '@/data/mockData';

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

export function useFeedPosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      // Fetch posts from database
      const { data, error: fetchError } = await supabase
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
          created_at,
          profiles:profile_id (
            id,
            user_id,
            username,
            name,
            avatar_url,
            is_verified,
            location
          ),
          tracks:track_id (
            id,
            title,
            cover_url,
            audio_url,
            duration,
            plays,
            likes
          )
        `)
        .eq('is_story', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) {
        console.error('Error fetching posts:', fetchError);
        // Fall back to mock data
        setPosts(mockPosts);
        return;
      }

      if (data && data.length > 0) {
        // Transform database posts to Post type
        const transformedPosts: Post[] = (data as unknown as DatabasePost[]).map((post) => {
          const profile = post.profiles;
          const track = post.tracks;
          
          const artist: Artist = {
            id: profile.id,
            name: profile.name || 'Unknown',
            username: profile.username || 'unknown',
            avatar: profile.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
            coverImage: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800',
            bio: '',
            location: profile.location || '',
            genres: [],
            isVerified: profile.is_verified || false,
            followers: 0,
            following: 0,
            tracks: 0,
          };

          let postTrack: Track | undefined;
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

        // Combine with mock posts for a richer feed
        const combinedPosts = [...transformedPosts, ...mockPosts];
        // Sort by date
        combinedPosts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setPosts(combinedPosts);
      } else {
        // Use mock data if no database posts
        setPosts(mockPosts);
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to load posts');
      setPosts(mockPosts);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();

    // Subscribe to new posts
    const channel = supabase
      .channel('posts-feed')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts',
        },
        () => {
          // Refetch when new post is added
          fetchPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { posts, loading, error, refetch: fetchPosts };
}
