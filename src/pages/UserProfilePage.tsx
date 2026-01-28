import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, MapPin, BadgeCheck, Play, Youtube, ExternalLink, 
  MessageCircle, UserPlus, UserMinus, Link2, Grid3X3, Music2, BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrackRow } from '@/components/tracks/TrackRow';
import { YouTubeEmbed } from '@/components/artists/YouTubeEmbed';
import { SocialLinksModal } from '@/components/ui/SocialLinksModal';
import { BackButton } from '@/components/ui/BackButton';
import { useAuth } from '@/context/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import { useProfilePosts } from '@/hooks/useProfilePosts';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

function formatCount(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

interface Profile {
  id: string;
  user_id: string;
  username: string | null;
  name: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  bio: string | null;
  location: string | null;
  is_artist: boolean | null;
  is_verified: boolean | null;
}

interface SocialLinks {
  youtube?: string | null;
  apple_music?: string | null;
  spotify?: string | null;
}

export default function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user, profile: currentProfile } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({});
  const [showLinksModal, setShowLinksModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const { posts, tracks, loading: postsLoading } = useProfilePosts(userId);

  useEffect(() => {
    if (!userId) return;

    const fetchProfile = async () => {
      setLoading(true);
      
      // Fetch profile by ID
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error || !data) {
        toast.error('Profile not found');
        navigate('/');
        return;
      }

      setProfile(data);

      // Fetch followers
      const { count: followers } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId);

      // Fetch following
      const { count: following } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', userId);

      setFollowerCount(followers || 0);
      setFollowingCount(following || 0);

      // Check if current user is following
      if (currentProfile) {
        const { data: followData } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', currentProfile.id)
          .eq('following_id', userId)
          .maybeSingle();

        setIsFollowing(!!followData);
      }

      // Fetch social links
      const { data: linksData } = await supabase
        .from('social_links')
        .select('*')
        .eq('profile_id', userId)
        .maybeSingle();

      if (linksData) {
        setSocialLinks(linksData);
      }

      setLoading(false);
    };

    fetchProfile();
  }, [userId, currentProfile, navigate]);

  const handleFollow = async () => {
    if (!user || !currentProfile) {
      toast.error('Please sign in to follow');
      navigate('/auth');
      return;
    }

    if (!profile) return;

    try {
      if (isFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentProfile.id)
          .eq('following_id', profile.id);

        setFollowerCount(prev => prev - 1);
        setIsFollowing(false);
        toast.success(`Unfollowed ${profile.name}`);
      } else {
        await supabase
          .from('follows')
          .insert({
            follower_id: currentProfile.id,
            following_id: profile.id,
          });

        setFollowerCount(prev => prev + 1);
        setIsFollowing(true);
        toast.success(`Following ${profile.name}!`);

        // Create notification
        await supabase
          .from('notifications')
          .insert({
            profile_id: profile.id,
            from_profile_id: currentProfile.id,
            type: 'follow',
            message: `${currentProfile.name} started following you`,
          });
      }
    } catch (err) {
      console.error('Error following:', err);
      toast.error('Failed to update follow status');
    }
  };

  const handleMessage = () => {
    if (!user) {
      toast.error('Please sign in to send messages');
      navigate('/auth');
      return;
    }
    navigate(`/messages?to=${userId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Profile not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-36">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="flex items-center gap-3 px-4 h-14">
          <BackButton />
          <h1 className="font-display font-bold text-lg">@{profile.username || 'user'}</h1>
        </div>
      </header>

      {/* Cover Image */}
      <div className="relative h-40">
        <img
          src={profile.cover_url || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800'}
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
              src={profile.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
              alt={profile.name || 'User'}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 mb-2">
            <div className="flex items-center gap-2">
              <h2 className="font-display font-bold text-xl">{profile.name || 'User'}</h2>
              {profile.is_verified && (
                <BadgeCheck className="w-5 h-5 text-primary" fill="currentColor" />
              )}
            </div>
            {profile.location && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" />
                {profile.location}
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
        {profile.bio && <p className="text-sm mb-4">{profile.bio}</p>}

        {/* Social Links */}
        {(socialLinks.youtube || socialLinks.apple_music) && (
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
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 mb-6">
          <Button
            onClick={handleFollow}
            className={isFollowing ? 'flex-1 bg-muted hover:bg-muted/80 text-foreground' : 'flex-1'}
            variant={isFollowing ? 'secondary' : 'default'}
          >
            {isFollowing ? (
              <>
                <UserMinus className="w-4 h-4 mr-2" />
                Following
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 mr-2" />
                Follow
              </>
            )}
          </Button>
          <Button variant="outline" className="flex-1" onClick={handleMessage}>
            <MessageCircle className="w-4 h-4 mr-2" />
            Message
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
        </TabsList>
        
        <TabsContent value="posts" className="mt-4">
          {postsLoading ? (
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
            </div>
          )}
        </TabsContent>

        <TabsContent value="tracks" className="mt-4">
          {postsLoading ? (
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
            </div>
          )}
        </TabsContent>

        <TabsContent value="videos" className="mt-4">
          {socialLinks.youtube ? (
            <YouTubeEmbed 
              channelUrl={socialLinks.youtube} 
              artistName={profile.name || 'Artist'} 
            />
          ) : (
            <div className="py-12 text-center">
              <Youtube className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No YouTube channel linked</p>
            </div>
          )}
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
