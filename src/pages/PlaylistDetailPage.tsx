import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Play, Plus, Search, MoreHorizontal, Clock, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/context/FirebaseAuthContext';
import { collection, query, where, getDocs, doc, getDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';

interface Playlist {
  id: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  creator_id: string;
  is_public: boolean;
  created_at: Date;
  updated_at: Date;
}

interface Track {
  id: string;
  title: string;
  artist: string;
  cover_url: string | null;
  audio_url: string | null;
  duration: number | null;
  plays: number | null;
  likes: number | null;
  user_id: string;
  created_at: Date;
}

interface PlaylistTrack {
  id: string;
  playlist_id: string;
  track_id: string;
  added_at: Date;
  track: Track;
}

export default function PlaylistDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [tracks, setTracks] = useState<PlaylistTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [availableTracks, setAvailableTracks] = useState<Track[]>([]);
  const [showAddTracks, setShowAddTracks] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    if (id) {
      fetchPlaylist();
      fetchTracks();
    }
  }, [id]);

  const fetchPlaylist = async () => {
    if (!id) return;

    try {
      const playlistDoc = await getDoc(doc(db, 'playlists', id));
      if (playlistDoc.exists()) {
        const data = playlistDoc.data();
        setPlaylist({
          id: playlistDoc.id,
          ...data,
          created_at: data.created_at?.toDate() || new Date(),
          updated_at: data.updated_at?.toDate() || new Date(),
        } as Playlist);
      }
    } catch (error) {
      console.error('Error fetching playlist:', error);
      toast.error('Failed to load playlist');
    }
  };

  const fetchTracks = async () => {
    if (!id) return;

    try {
      // Fetch playlist tracks
      const tracksQuery = query(
        collection(db, 'playlist_tracks'),
        where('playlist_id', '==', id)
      );
      const tracksSnapshot = await getDocs(tracksQuery);

      const trackPromises = tracksSnapshot.docs.map(async (trackDoc) => {
        const trackData = trackDoc.data();
        const trackDocRef = await getDoc(doc(db, 'tracks', trackData.track_id));

        if (trackDocRef.exists()) {
          const track = trackDocRef.data();
          return {
            id: trackDoc.id,
            playlist_id: trackData.playlist_id,
            track_id: trackData.track_id,
            added_at: trackData.added_at?.toDate() || new Date(),
            track: {
              id: trackDocRef.id,
              title: track.title,
              artist: track.artist || 'Unknown Artist',
              cover_url: track.cover_url,
              audio_url: track.audio_url,
              duration: track.duration,
              plays: track.plays,
              likes: track.likes,
              user_id: track.user_id,
              created_at: track.created_at?.toDate() || new Date(),
            } as Track,
          } as PlaylistTrack;
        }
        return null;
      });

      const resolvedTracks = (await Promise.all(trackPromises)).filter(Boolean) as PlaylistTrack[];
      setTracks(resolvedTracks.sort((a, b) => b.added_at.getTime() - a.added_at.getTime()));
    } catch (error) {
      console.error('Error fetching tracks:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchTracks = async (query: string) => {
    if (!query.trim()) {
      setAvailableTracks([]);
      return;
    }

    setSearchLoading(true);
    try {
      const tracksQuery = query(
        collection(db, 'tracks'),
        where('title', '>=', query),
        where('title', '<=', query + '\uf8ff'),
        limit(20)
      );

      const tracksSnapshot = await getDocs(tracksQuery);
      const tracksData = tracksSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          created_at: doc.data().created_at?.toDate() || new Date(),
        } as Track))
        .filter(track => !tracks.some(pt => pt.track_id === track.id)); // Exclude already added tracks

      setAvailableTracks(tracksData);
    } catch (error) {
      console.error('Error searching tracks:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const addTrackToPlaylist = async (trackId: string) => {
    if (!id) return;

    try {
      await addDoc(collection(db, 'playlist_tracks'), {
        playlist_id: id,
        track_id: trackId,
        added_at: new Date(),
      });

      toast.success('Track added to playlist');
      fetchTracks(); // Refresh tracks
      setShowAddTracks(false);
      setSearchQuery('');
      setAvailableTracks([]);
    } catch (error) {
      console.error('Error adding track:', error);
      toast.error('Failed to add track');
    }
  };

  const removeTrackFromPlaylist = async (playlistTrackId: string) => {
    try {
      await deleteDoc(doc(db, 'playlist_tracks', playlistTrackId));
      toast.success('Track removed from playlist');
      fetchTracks(); // Refresh tracks
    } catch (error) {
      console.error('Error removing track:', error);
      toast.error('Failed to remove track');
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Playlist not found</h1>
          <Button onClick={() => navigate('/playlists')}>Back to Playlists</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-4 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/playlists')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-4 flex-1">
            <img
              src={playlist.cover_url || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=100&h=100&fit=crop'}
              alt={playlist.name}
              className="w-16 h-16 rounded-lg object-cover"
            />
            <div>
              <h1 className="text-xl font-bold">{playlist.name}</h1>
              <p className="text-sm text-muted-foreground">
                {tracks.length} {tracks.length === 1 ? 'track' : 'tracks'}
                {playlist.description && ` • ${playlist.description}`}
              </p>
            </div>
          </div>
          {playlist.creator_id === user?.uid && (
            <Button onClick={() => setShowAddTracks(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Tracks
            </Button>
          )}
        </div>
      </div>

      {/* Tracks List */}
      <div className="p-4">
        {tracks.length === 0 ? (
          <div className="text-center py-12">
            <Music className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No tracks yet</h3>
            <p className="text-muted-foreground mb-4">
              {playlist.creator_id === user?.uid
                ? 'Add some tracks to get started'
                : 'This playlist is empty'
              }
            </p>
            {playlist.creator_id === user?.uid && (
              <Button onClick={() => setShowAddTracks(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Tracks
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {tracks.map((playlistTrack, index) => (
              <motion.div
                key={playlistTrack.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded bg-muted text-sm font-medium">
                  {index + 1}
                </div>
                <img
                  src={playlistTrack.track.cover_url || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=50&h=50&fit=crop'}
                  alt={playlistTrack.track.title}
                  className="w-12 h-12 rounded object-cover"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate">{playlistTrack.track.title}</h4>
                  <p className="text-sm text-muted-foreground truncate">{playlistTrack.track.artist}</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  {formatDuration(playlistTrack.track.duration)}
                </div>
                <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <Play className="w-4 h-4" />
                </Button>
                {playlist.creator_id === user?.uid && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeTrackFromPlaylist(playlistTrack.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Add Tracks Modal */}
      {showAddTracks && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm">
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <Button variant="ghost" size="icon" onClick={() => setShowAddTracks(false)}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h2 className="font-display font-bold text-lg">Add Tracks</h2>
              <div />
            </div>
            <div className="p-4 flex-1 overflow-y-auto">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search for tracks..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    searchTracks(e.target.value);
                  }}
                  className="pl-10"
                />
              </div>

              {searchLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : availableTracks.length > 0 ? (
                <div className="space-y-2">
                  {availableTracks.map((track) => (
                    <Card key={track.id} className="p-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={track.cover_url || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=50&h=50&fit=crop'}
                          alt={track.title}
                          className="w-12 h-12 rounded object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{track.title}</h4>
                          <p className="text-sm text-muted-foreground truncate">{track.artist}</p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => addTrackToPlaylist(track.id)}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : searchQuery ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No tracks found</p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Search for tracks to add to this playlist</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}