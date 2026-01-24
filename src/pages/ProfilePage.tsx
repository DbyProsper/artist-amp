import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings, Grid3X3, Music2, Bookmark, ListMusic,
  MapPin, Link2, BadgeCheck, Play, Youtube, ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrackRow } from '@/components/tracks/TrackRow';
import { YouTubeEmbed } from '@/components/artists/YouTubeEmbed';
import { mockTracks, mockPlaylists, mockArtists } from '@/data/mockData';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

function formatCount(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

// Email for Dby Prosper account
const DBY_PROSPER_EMAIL = 'mthabisisebata113@gmail.com';

export default function ProfilePage() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [isFollowing, setIsFollowing] = useState(false);

  // Check if signed in user is Dby Prosper
  const isDbyProsper = user?.email === DBY_PROSPER_EMAIL;
  
  // Get artist data - only show Dby Prosper if logged in as that account
  const dbyProsper = mockArtists[0];
  
  // If no user is signed in or not Dby Prosper, show empty profile state
  if (!user) {
    return (
      <div className="min-h-screen pb-36">
        <header className="sticky top-0 z-40 glass border-b border-border">
          <div className="flex items-center justify-between px-4 h-14">
            <h1 className="font-display font-bold text-lg">Profile</h1>
            <button
              onClick={() => navigate('/settings')}
              className="p-2 rounded-full hover:bg-muted transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
          <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-6">
            <Music2 className="w-12 h-12 text-muted-foreground" />
          </div>
          <h2 className="font-display font-bold text-xl mb-2">Welcome to MusicInsta</h2>
          <p className="text-muted-foreground mb-6 max-w-sm">
            Sign in to view your profile, upload music, and connect with other artists and fans.
          </p>
          <Button onClick={() => navigate('/auth')} size="lg">
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  // Use profile data if available, otherwise use Dby Prosper for that specific account
  const displayProfile = isDbyProsper ? {
    name: profile?.name || dbyProsper.name,
    username: profile?.username || dbyProsper.username,
    avatar: profile?.avatar_url || dbyProsper.avatar,
    coverImage: profile?.cover_url || dbyProsper.coverImage,
    bio: profile?.bio || dbyProsper.bio,
    location: profile?.location || dbyProsper.location,
    isVerified: profile?.is_verified || dbyProsper.isVerified,
    isArtist: profile?.is_artist ?? true,
    genres: dbyProsper.genres,
    followers: dbyProsper.followers,
    following: dbyProsper.following,
    tracks: dbyProsper.tracks,
    socialLinks: dbyProsper.socialLinks,
  } : {
    name: profile?.name || 'User',
    username: profile?.username || 'user',
    avatar: profile?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    coverImage: profile?.cover_url || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800',
    bio: profile?.bio || 'Music lover',
    location: profile?.location || 'Earth',
    isVerified: profile?.is_verified || false,
    isArtist: profile?.is_artist || false,
    genres: [] as string[],
    followers: 0,
    following: 0,
    tracks: 0,
    socialLinks: undefined,
  };

  const artistTracks = isDbyProsper ? mockTracks.filter(t => t.artist.id === dbyProsper.id) : [];

  const handleFollow = () => {
    setIsFollowing(!isFollowing);
    toast.success(isFollowing ? 'Unfollowed' : 'Following!');
  };

  return (
    <div className="min-h-screen pb-36">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <h1 className="font-display font-bold text-lg">@{displayProfile.username}</h1>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => signOut()}
              className="p-2 rounded-full hover:bg-muted transition-colors text-sm text-muted-foreground"
            >
              Sign Out
            </button>
            <button
              onClick={() => navigate('/settings')}
              className="p-2 rounded-full hover:bg-muted transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Cover Image */}
      <div className="relative h-40">
        <img
          src={displayProfile.coverImage}
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
              src={displayProfile.avatar}
              alt={displayProfile.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 mb-2">
            <div className="flex items-center gap-2">
              <h2 className="font-display font-bold text-xl">{displayProfile.name}</h2>
              {displayProfile.isVerified && (
                <BadgeCheck className="w-5 h-5 text-primary" fill="currentColor" />
              )}
            </div>
            {displayProfile.location && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" />
                {displayProfile.location}
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-around py-4 border-y border-border my-4">
          <div className="text-center">
            <p className="font-bold text-lg">{displayProfile.tracks}</p>
            <p className="text-xs text-muted-foreground">Tracks</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-lg">{formatCount(displayProfile.followers)}</p>
            <p className="text-xs text-muted-foreground">Followers</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-lg">{formatCount(displayProfile.following)}</p>
            <p className="text-xs text-muted-foreground">Following</p>
          </div>
        </div>

        {/* Bio */}
        <p className="text-sm mb-4">{displayProfile.bio}</p>

        {/* Genres */}
        {displayProfile.genres.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {displayProfile.genres.map((genre) => (
              <span
                key={genre}
                className="px-3 py-1 rounded-full bg-muted text-sm text-muted-foreground"
              >
                {genre}
              </span>
            ))}
          </div>
        )}

        {/* Social Links */}
        {displayProfile.socialLinks && (
          <div className="flex flex-wrap gap-2 mb-4">
            {displayProfile.socialLinks.youtube && (
              <a
                href={displayProfile.socialLinks.youtube}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
              >
                <Youtube className="w-4 h-4" />
                <span className="text-sm font-medium">YouTube</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {displayProfile.socialLinks.appleMusic && (
              <a
                href={displayProfile.socialLinks.appleMusic}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-pink-500/10 text-pink-500 hover:bg-pink-500/20 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                <span className="text-sm font-medium">Apple Music</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 mb-6">
          <Button
            onClick={() => navigate('/settings/edit-profile')}
            variant="outline"
            className="flex-1"
          >
            Edit Profile
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => navigate('/playlists')}
          >
            <ListMusic className="w-4 h-4 mr-2" />
            Playlists
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
          <TabsTrigger value="videos" className="flex-1 gap-2">
            <Youtube className="w-4 h-4" />
            Videos
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
          {artistTracks.length > 0 ? (
            <>
              <motion.button
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-primary via-accent to-secondary mb-4"
              >
                <Play className="w-5 h-5 text-white" fill="currentColor" />
                <span className="font-semibold text-white">Play All</span>
              </motion.button>
              
              <div className="space-y-1">
                {artistTracks.map((track, index) => (
                  <TrackRow key={track.id} track={track} index={index + 1} showIndex />
                ))}
              </div>
            </>
          ) : (
            <div className="py-12 text-center">
              <Music2 className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No tracks yet</p>
              {displayProfile.isArtist && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => navigate('/upload')}
                >
                  Upload your first track
                </Button>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="videos" className="mt-4">
          {displayProfile.socialLinks?.youtube ? (
            <YouTubeEmbed 
              channelUrl={displayProfile.socialLinks.youtube} 
              artistName={displayProfile.name} 
            />
          ) : (
            <div className="py-12 text-center">
              <Youtube className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No YouTube channel linked</p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="posts" className="mt-4">
          {artistTracks.length > 0 ? (
            <div className="grid grid-cols-3 gap-1">
              {artistTracks.map((track) => (
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
          ) : (
            <div className="py-12 text-center">
              <Grid3X3 className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No posts yet</p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="saved" className="mt-4">
          <div className="space-y-4">
            {mockPlaylists.slice(0, 2).map((playlist) => (
              <motion.button
                key={playlist.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/playlists')}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors text-left"
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
              </motion.button>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
