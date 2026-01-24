import { useState } from 'react';
import { motion } from 'framer-motion';
import { Library, ListMusic, Heart, Clock, Plus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { TrackRow } from '@/components/tracks/TrackRow';
import { mockTracks, mockPlaylists } from '@/data/mockData';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';

function formatCount(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export default function LibraryPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [likedTracks] = useState(mockTracks.slice(0, 5));
  const [recentlyPlayed] = useState(mockTracks.slice(2, 8));

  if (!user) {
    return (
      <div className="min-h-screen pb-36 flex items-center justify-center">
        <div className="text-center p-8">
          <Library className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="font-display font-bold text-xl mb-2">Your Library</h2>
          <p className="text-muted-foreground mb-6">Sign in to access your library</p>
          <Button onClick={() => navigate('/auth')}>Sign In</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-36">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <Library className="w-5 h-5 text-primary" />
            <h1 className="font-display font-bold text-lg">Your Library</h1>
          </div>
          <Button size="sm" variant="ghost" onClick={() => navigate('/playlists')}>
            <Plus className="w-4 h-4 mr-1" />
            Create
          </Button>
        </div>
      </header>

      <Tabs defaultValue="playlists" className="px-4 pt-4">
        <TabsList className="w-full bg-muted/50">
          <TabsTrigger value="playlists" className="flex-1 gap-2">
            <ListMusic className="w-4 h-4" />
            Playlists
          </TabsTrigger>
          <TabsTrigger value="liked" className="flex-1 gap-2">
            <Heart className="w-4 h-4" />
            Liked
          </TabsTrigger>
          <TabsTrigger value="recent" className="flex-1 gap-2">
            <Clock className="w-4 h-4" />
            Recent
          </TabsTrigger>
        </TabsList>

        <TabsContent value="playlists" className="mt-4 space-y-3">
          {mockPlaylists.map((playlist) => (
            <motion.button
              key={playlist.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/playlists')}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors text-left"
            >
              <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0">
                <img
                  src={playlist.coverImage}
                  alt={playlist.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{playlist.name}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {playlist.tracks.length} tracks • {formatCount(playlist.followers)} saves
                </p>
              </div>
            </motion.button>
          ))}
          
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/playlists')}
            className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-muted hover:border-primary/50 transition-colors text-muted-foreground hover:text-primary"
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">Create New Playlist</span>
          </motion.button>
        </TabsContent>

        <TabsContent value="liked" className="mt-4 space-y-1">
          {likedTracks.length > 0 ? (
            likedTracks.map((track, index) => (
              <TrackRow key={track.id} track={track} index={index + 1} showIndex />
            ))
          ) : (
            <div className="py-12 text-center">
              <Heart className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No liked songs yet</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="recent" className="mt-4 space-y-1">
          {recentlyPlayed.length > 0 ? (
            recentlyPlayed.map((track, index) => (
              <TrackRow key={track.id} track={track} index={index + 1} showIndex />
            ))
          ) : (
            <div className="py-12 text-center">
              <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No recently played tracks</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
