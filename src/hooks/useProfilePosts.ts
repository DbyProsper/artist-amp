import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
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
        const profileDoc = await getDoc(doc(db, 'profiles', profileId));
        if (!profileDoc.exists()) {
          setLoading(false);
          return;
        }

        const profileData = profileDoc.data();
        const artist: Artist = {
          id: profileData.id || profileId,
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
        const postsQuery = query(
          collection(db, 'posts'),
          where('profile_id', '==', profileId),
          where('is_story', '==', false),
          orderBy('created_at', 'desc')
        );
        const postsSnapshot = await getDocs(postsQuery);
        const postsData = postsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Fetch tracks
        const tracksQuery = query(
          collection(db, 'tracks'),
          where('profile_id', '==', profileId),
          orderBy('created_at', 'desc')
        );
        const tracksSnapshot = await getDocs(tracksQuery);
        const tracksData = tracksSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Transform tracks
        if (tracksData) {
          const transformedTracks: Track[] = tracksData.map((track) => ({
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
          const transformedPosts: Post[] = postsData.map((post) => {
            let postTrack: Track | undefined;

            if (post.track_id && tracksData) {
              const track = tracksData.find((t) => t.id === post.track_id);
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
              createdAt: post.created_at ? new Date(post.created_at.seconds * 1000) : new Date(),
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
