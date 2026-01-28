import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings, Grid3X3, Music2, Bookmark, ListMusic,
  MapPin, Link2, BadgeCheck, Play, Youtube, ExternalLink, BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrackRow } from '@/components/tracks/TrackRow';
import { FeedPost } from '@/components/feed/FeedPost';
import { YouTubeEmbed } from '@/components/artists/YouTubeEmbed';
import { SocialLinksModal } from '@/components/ui/SocialLinksModal';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useProfilePosts } from '@/hooks/useProfilePosts';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

function formatCount(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

interface SocialLinks {
  youtube?: string | null;
  apple_music?: string | null;
  spotify?: string | null;
}

export default function ProfilePage() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({});
  const [showLinksModal, setShowLinksModal] = useState(false);
  
  const { posts, tracks, loading } = useProfilePosts(profile?.id);

  useEffect(() => {
    if (!profile) return;

    const fetchCounts = async () => {
      // Fetch followers
      const { count: followers } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', profile.id);

      // Fetch following
      const { count: following } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', profile.id);

      setFollowerCount(followers || 0);
      setFollowingCount(following || 0);
    };

    const fetchSocialLinks = async () => {
      const { data } = await supabase
        .from('social_links')
        .select('*')
        .eq('profile_id', profile.id)
        .maybeSingle();

      if (data) {
        setSocialLinks(data);
      }
    };

    fetchCounts();
    fetchSocialLinks();
  }, [profile]);

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

  const displayProfile = {
    name: profile?.name || 'User',
    username: profile?.username || 'user',
    avatar: profile?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    coverImage: profile?.cover_url || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800',
    bio: profile?.bio || '',
    location: profile?.location || '',
    isVerified: profile?.is_verified || false,
    isArtist: profile?.is_artist || false,
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
            <p className="font-bold text-lg">{tracks.length}</p>
            <p className="text-xs text-muted-foreground">Tracks</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-lg">{formatCount(followerCount)}</p>
            <p className="text-xs text-muted-foreground">Followers</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-lg">{formatCount(followingCount)}</p>
            <p className="text-xs text-muted-foreground">Following</p>
          </div>
        </div>

        {/* Bio */}
        {displayProfile.bio && <p className="text-sm mb-4">{displayProfile.bio}</p>}

        {/* Social Links */}
        {(socialLinks.youtube || socialLinks.apple_music || socialLinks.spotify) && (
          <div className="flex flex-wrap gap-2 mb-4">
            {socialLinks.youtube && (
              <a
                href={socialLinks.youtube}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
              >
                <Youtube className="w-4 h-4" />
                <span className="text-sm font-medium">YouTube</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {socialLinks.apple_music && (
              <a
                href={socialLinks.apple_music}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-pink-500/10 text-pink-500 hover:bg-pink-500/20 transition-colors"
              >
                <Music2 className="w-4 h-4" />
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
          {displayProfile.isArtist && (
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => navigate('/analytics')}
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </Button>
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/playlists')}
          >
            <ListMusic className="w-4 h-4" />
          </Button>
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => setShowLinksModal(true)}
          >
            <Link2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="posts" className="px-4">
        <TabsList className="w-full bg-muted/50">
          <TabsTrigger value="posts" className="flex-1 gap-2">
            <Grid3X3 className="w-4 h-4" />
            Posts
          </TabsTrigger>
          <TabsTrigger value="tracks" className="flex-1 gap-2">
            <Music2 className="w-4 h-4" />
            Tracks
          </TabsTrigger>
          <TabsTrigger value="videos" className="flex-1 gap-2">
            <Youtube className="w-4 h-4" />
            Videos
          </TabsTrigger>
          <TabsTrigger value="saved" className="flex-1 gap-2">
            <Bookmark className="w-4 h-4" />
            Saved
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="posts" className="mt-4">
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">Loading...</div>
          ) : posts.length > 0 ? (
            <div className="grid grid-cols-3 gap-1">
              {posts.map((post) => (
                <div key={post.id} className="aspect-square rounded-lg overflow-hidden relative group cursor-pointer">
                  <img
                    src={post.imageUrl || post.track?.coverArt || 'https://images.unsplash.com/photo-1614149162883-504ce4d13909?w=400'}
                    alt={post.caption || 'Post'}
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
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => navigate('/upload')}
              >
                Create your first post
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="tracks" className="mt-4">
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">Loading...</div>
          ) : tracks.length > 0 ? (
            <>
              <motion.button
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-primary via-accent to-secondary mb-4"
              >
                <Play className="w-5 h-5 text-white" fill="currentColor" />
                <span className="font-semibold text-white">Play All</span>
              </motion.button>
              
              <div className="space-y-1">
                {tracks.map((track, index) => (
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
          {socialLinks.youtube ? (
            <YouTubeEmbed 
              channelUrl={socialLinks.youtube} 
              artistName={displayProfile.name} 
            />
          ) : (
            <div className="py-12 text-center">
              <Youtube className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No YouTube channel linked</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => navigate('/settings/edit-profile')}
              >
                Add YouTube link
              </Button>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="saved" className="mt-4">
          <div className="py-12 text-center">
            <Bookmark className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No saved items yet</p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Social Links Modal */}
      {profile && (
        <SocialLinksModal
          isOpen={showLinksModal}
          onClose={() => setShowLinksModal(false)}
          profileId={profile.id}
        />
      )}
    </div>
  );
}
