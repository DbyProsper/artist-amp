import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, getDocs, getDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
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
      const postsQuery = query(
        collection(db, 'posts'),
        where('is_story', '==', false),
        orderBy('created_at', 'desc'),
        limit(50)
      );

      const postsSnapshot = await getDocs(postsQuery);

      if (postsSnapshot.empty) {
        // Fall back to mock data - sort by createdAt descending (newest first)
        const sortedMockPosts = [...mockPosts].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setPosts(sortedMockPosts);
        return;
      }

      // Transform database posts to Post type
      const transformedPosts: Post[] = [];

      for (const postDoc of postsSnapshot.docs) {
        const post = postDoc.data();

        // Fetch profile data
        let profileData = null;
        try {
          const profileDoc = await getDoc(doc(db, 'profiles', post.profile_id));
          profileData = profileDoc.exists() ? profileDoc.data() : null;
        } catch (error) {
          console.error('Error fetching profile:', error);
        }

        // Fetch track data if it exists
        let trackData = null;
        if (post.track_id) {
          try {
            const trackDoc = await getDoc(doc(db, 'tracks', post.track_id));
            trackData = trackDoc.exists() ? trackDoc.data() : null;
          } catch (error) {
            console.error('Error fetching track:', error);
          }
        }

        if (!profileData) continue;

        const artist: Artist = {
          id: profileData.id || post.profile_id,
          name: profileData.name || 'Unknown',
          username: profileData.username || 'unknown',
          avatar: profileData.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
          coverImage: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800',
          bio: '',
          location: profileData.location || '',
          genres: [],
          isVerified: profileData.is_verified || false,
          followers: 0,
          following: 0,
          tracks: 0,
        };

        let postTrack: Track | undefined;
        if (trackData) {
          postTrack = {
            id: post.track_id,
            title: trackData.title,
            artist: artist,
            coverArt: trackData.cover_url || 'https://images.unsplash.com/photo-1614149162883-504ce4d13909?w=400',
            duration: trackData.duration || 0,
            plays: trackData.plays || 0,
            likes: trackData.likes || 0,
            audioUrl: trackData.audio_url || undefined,
          };
        }

        transformedPosts.push({
          id: postDoc.id,
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
          createdAt: post.created_at?.toDate() || new Date(),
          isLiked: false,
          isSaved: false,
        });
      }

      // Combine with mock posts for a richer feed
      const combinedPosts = [...transformedPosts, ...mockPosts];
      // Sort by date
      combinedPosts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setPosts(combinedPosts);
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

    const postsQuery = query(
      collection(db, 'posts'),
      where('is_story', '==', false),
      orderBy('created_at', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(postsQuery, () => {
      fetchPosts();
    });

    return () => unsubscribe();
  }, []);

  return { posts, loading, error, refetch: fetchPosts };
}
