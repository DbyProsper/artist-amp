import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings, Grid3X3, Music2, Bookmark, 
  MapPin, Link2, BadgeCheck, Play
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrackRow } from '@/components/tracks/TrackRow';
import { mockArtists, mockTracks, mockPlaylists } from '@/data/mockData';

function formatCount(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export default function ProfilePage() {
  const artist = mockArtists[0]; // Current user profile
  const [isFollowing, setIsFollowing] = useState(false);

  return (
    <div className="min-h-screen pb-36">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <h1 className="font-display font-bold text-lg">{artist.username}</h1>
          <button className="p-2 rounded-full hover:bg-muted transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Cover Image */}
      <div className="relative h-40">
        <img
          src={artist.coverImage}
          alt="Cover"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
      </div>

      {/* Profile Info */}
      <div className="px-4 -mt-16 relative z-10">
        <div className="flex items-end gap-4 mb-4">
          <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-background gradient-border">
            <img
              src={artist.avatar}
              alt={artist.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 mb-2">
            <div className="flex items-center gap-2">
              <h2 className="font-display font-bold text-xl">{artist.name}</h2>
              {artist.isVerified && (
                <BadgeCheck className="w-5 h-5 text-primary" fill="currentColor" />
              )}
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              {artist.location}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-around py-4 border-y border-border my-4">
          <div className="text-center">
            <p className="font-bold text-lg">{artist.tracks}</p>
            <p className="text-xs text-muted-foreground">Tracks</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-lg">{formatCount(artist.followers)}</p>
            <p className="text-xs text-muted-foreground">Followers</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-lg">{formatCount(artist.following)}</p>
            <p className="text-xs text-muted-foreground">Following</p>
          </div>
        </div>

        {/* Bio */}
        <p className="text-sm mb-4">{artist.bio}</p>

        {/* Genres */}
        <div className="flex flex-wrap gap-2 mb-4">
          {artist.genres.map((genre) => (
            <span
              key={genre}
              className="px-3 py-1 rounded-full bg-muted text-sm text-muted-foreground"
            >
              {genre}
            </span>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-6">
          <Button
            onClick={() => setIsFollowing(!isFollowing)}
            className={isFollowing ? 'flex-1 bg-muted hover:bg-muted/80 text-foreground' : 'flex-1'}
            variant={isFollowing ? 'secondary' : 'default'}
          >
            {isFollowing ? 'Following' : 'Follow'}
          </Button>
          <Button variant="outline" className="flex-1">
            Message
          </Button>
          <Button variant="outline" size="icon">
            <Link2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="tracks" className="px-4">
        <TabsList className="w-full bg-muted/50">
          <TabsTrigger value="tracks" className="flex-1 gap-2">
            <Music2 className="w-4 h-4" />
            Tracks
          </TabsTrigger>
          <TabsTrigger value="posts" className="flex-1 gap-2">
            <Grid3X3 className="w-4 h-4" />
            Posts
          </TabsTrigger>
          <TabsTrigger value="saved" className="flex-1 gap-2">
            <Bookmark className="w-4 h-4" />
            Saved
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="tracks" className="mt-4">
          {/* Play All Button */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-primary via-accent to-secondary mb-4"
          >
            <Play className="w-5 h-5 text-white" fill="currentColor" />
            <span className="font-semibold text-white">Play All</span>
          </motion.button>
          
          <div className="space-y-1">
            {mockTracks.filter(t => t.artist.id === artist.id || true).slice(0, 5).map((track, index) => (
              <TrackRow key={track.id} track={track} index={index + 1} showIndex />
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="posts" className="mt-4">
          <div className="grid grid-cols-3 gap-1">
            {mockTracks.map((track) => (
              <div key={track.id} className="aspect-square rounded-lg overflow-hidden relative group cursor-pointer">
                <img
                  src={track.coverArt}
                  alt={track.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Play className="w-8 h-8 text-white" fill="currentColor" />
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="saved" className="mt-4">
          <div className="space-y-4">
            {mockPlaylists.map((playlist) => (
              <motion.div
                key={playlist.id}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
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
              </motion.div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
