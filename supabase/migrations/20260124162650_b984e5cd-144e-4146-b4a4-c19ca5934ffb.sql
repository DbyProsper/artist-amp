-- Create tracks table for uploaded music
CREATE TABLE public.tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  cover_url TEXT,
  audio_url TEXT,
  duration INTEGER DEFAULT 0,
  plays INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create playlists table
CREATE TABLE public.playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  is_public BOOLEAN DEFAULT true,
  is_collaborative BOOLEAN DEFAULT false,
  followers INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create playlist_tracks junction table
CREATE TABLE public.playlist_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  track_id UUID NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  added_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(playlist_id, track_id)
);

-- Create playlist_collaborators table
CREATE TABLE public.playlist_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(playlist_id, profile_id)
);

-- Create liked_tracks table
CREATE TABLE public.liked_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  track_id UUID NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(profile_id, track_id)
);

-- Create recently_played table
CREATE TABLE public.recently_played (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  track_id UUID NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  played_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create follows table
CREATE TABLE public.follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create track_comments table
CREATE TABLE public.track_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  timestamp_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create posts table
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('audio', 'video', 'image', 'story')),
  track_id UUID REFERENCES public.tracks(id) ON DELETE SET NULL,
  image_url TEXT,
  video_url TEXT,
  caption TEXT,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  is_story BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create post_likes table
CREATE TABLE public.post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(post_id, profile_id)
);

-- Create story_views table
CREATE TABLE public.story_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(post_id, viewer_id)
);

-- Create verification_requests table
CREATE TABLE public.verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user_preferences table
CREATE TABLE public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  push_notifications BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT true,
  favorite_genres TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liked_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recently_played ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.track_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Tracks RLS Policies
CREATE POLICY "Public tracks are viewable by everyone" ON public.tracks FOR SELECT USING (is_public = true);
CREATE POLICY "Users can view their own tracks" ON public.tracks FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = tracks.profile_id AND profiles.user_id = auth.uid()));
CREATE POLICY "Users can insert their own tracks" ON public.tracks FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = profile_id AND profiles.user_id = auth.uid()));
CREATE POLICY "Users can update their own tracks" ON public.tracks FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = tracks.profile_id AND profiles.user_id = auth.uid()));
CREATE POLICY "Users can delete their own tracks" ON public.tracks FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = tracks.profile_id AND profiles.user_id = auth.uid()));

-- Playlists RLS Policies
CREATE POLICY "Public playlists are viewable by everyone" ON public.playlists FOR SELECT USING (is_public = true);
CREATE POLICY "Users can view their own playlists" ON public.playlists FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = playlists.creator_id AND profiles.user_id = auth.uid()));
CREATE POLICY "Users can insert playlists" ON public.playlists FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = creator_id AND profiles.user_id = auth.uid()));
CREATE POLICY "Users can update their own playlists" ON public.playlists FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = playlists.creator_id AND profiles.user_id = auth.uid()));
CREATE POLICY "Users can delete their own playlists" ON public.playlists FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = playlists.creator_id AND profiles.user_id = auth.uid()));

-- Playlist tracks RLS
CREATE POLICY "Playlist tracks are viewable by everyone" ON public.playlist_tracks FOR SELECT USING (true);
CREATE POLICY "Owners and collaborators can add tracks" ON public.playlist_tracks FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM playlists p JOIN profiles pr ON p.creator_id = pr.id WHERE p.id = playlist_id AND pr.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM playlist_collaborators pc JOIN profiles pr ON pc.profile_id = pr.id WHERE pc.playlist_id = playlist_id AND pr.user_id = auth.uid())
);
CREATE POLICY "Owners can update playlist tracks" ON public.playlist_tracks FOR UPDATE USING (EXISTS (SELECT 1 FROM playlists p JOIN profiles pr ON p.creator_id = pr.id WHERE p.id = playlist_tracks.playlist_id AND pr.user_id = auth.uid()));
CREATE POLICY "Owners can delete playlist tracks" ON public.playlist_tracks FOR DELETE USING (EXISTS (SELECT 1 FROM playlists p JOIN profiles pr ON p.creator_id = pr.id WHERE p.id = playlist_tracks.playlist_id AND pr.user_id = auth.uid()));

-- Playlist collaborators RLS
CREATE POLICY "Collaborators are viewable by everyone" ON public.playlist_collaborators FOR SELECT USING (true);
CREATE POLICY "Owners can add collaborators" ON public.playlist_collaborators FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM playlists p JOIN profiles pr ON p.creator_id = pr.id WHERE p.id = playlist_id AND pr.user_id = auth.uid()));
CREATE POLICY "Owners can remove collaborators" ON public.playlist_collaborators FOR DELETE USING (EXISTS (SELECT 1 FROM playlists p JOIN profiles pr ON p.creator_id = pr.id WHERE p.id = playlist_collaborators.playlist_id AND pr.user_id = auth.uid()));

-- Liked tracks RLS
CREATE POLICY "Users can view their own liked tracks" ON public.liked_tracks FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = liked_tracks.profile_id AND profiles.user_id = auth.uid()));
CREATE POLICY "Users can like tracks" ON public.liked_tracks FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = profile_id AND profiles.user_id = auth.uid()));
CREATE POLICY "Users can unlike tracks" ON public.liked_tracks FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = liked_tracks.profile_id AND profiles.user_id = auth.uid()));

-- Recently played RLS
CREATE POLICY "Users can view their recently played" ON public.recently_played FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = recently_played.profile_id AND profiles.user_id = auth.uid()));
CREATE POLICY "Users can add to recently played" ON public.recently_played FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = profile_id AND profiles.user_id = auth.uid()));

-- Follows RLS
CREATE POLICY "Follows are viewable by everyone" ON public.follows FOR SELECT USING (true);
CREATE POLICY "Users can follow" ON public.follows FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = follower_id AND profiles.user_id = auth.uid()));
CREATE POLICY "Users can unfollow" ON public.follows FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = follows.follower_id AND profiles.user_id = auth.uid()));

-- Messages RLS
CREATE POLICY "Users can view their messages" ON public.messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = messages.sender_id AND profiles.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = messages.receiver_id AND profiles.user_id = auth.uid())
);
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = sender_id AND profiles.user_id = auth.uid()));
CREATE POLICY "Users can update their received messages" ON public.messages FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = messages.receiver_id AND profiles.user_id = auth.uid()));

-- Track comments RLS
CREATE POLICY "Track comments are viewable by everyone" ON public.track_comments FOR SELECT USING (true);
CREATE POLICY "Users can add comments" ON public.track_comments FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = profile_id AND profiles.user_id = auth.uid()));
CREATE POLICY "Users can delete their own comments" ON public.track_comments FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = track_comments.profile_id AND profiles.user_id = auth.uid()));

-- Posts RLS
CREATE POLICY "Public posts are viewable by everyone" ON public.posts FOR SELECT USING (is_story = false OR (is_story = true AND expires_at > now()));
CREATE POLICY "Users can view their own posts" ON public.posts FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = posts.profile_id AND profiles.user_id = auth.uid()));
CREATE POLICY "Users can create posts" ON public.posts FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = profile_id AND profiles.user_id = auth.uid()));
CREATE POLICY "Users can update their own posts" ON public.posts FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = posts.profile_id AND profiles.user_id = auth.uid()));
CREATE POLICY "Users can delete their own posts" ON public.posts FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = posts.profile_id AND profiles.user_id = auth.uid()));

-- Post likes RLS
CREATE POLICY "Post likes are viewable" ON public.post_likes FOR SELECT USING (true);
CREATE POLICY "Users can like posts" ON public.post_likes FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = profile_id AND profiles.user_id = auth.uid()));
CREATE POLICY "Users can unlike posts" ON public.post_likes FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = post_likes.profile_id AND profiles.user_id = auth.uid()));

-- Story views RLS
CREATE POLICY "Story views are viewable by post owner" ON public.story_views FOR SELECT USING (EXISTS (SELECT 1 FROM posts p JOIN profiles pr ON p.profile_id = pr.id WHERE p.id = story_views.post_id AND pr.user_id = auth.uid()));
CREATE POLICY "Users can mark stories as viewed" ON public.story_views FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = viewer_id AND profiles.user_id = auth.uid()));

-- Verification requests RLS
CREATE POLICY "Users can view their own verification requests" ON public.verification_requests FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = verification_requests.profile_id AND profiles.user_id = auth.uid()));
CREATE POLICY "Users can create verification requests" ON public.verification_requests FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = profile_id AND profiles.user_id = auth.uid()));
CREATE POLICY "Admins can manage verification requests" ON public.verification_requests FOR ALL USING (is_admin_or_moderator());

-- User preferences RLS
CREATE POLICY "Users can view their own preferences" ON public.user_preferences FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = user_preferences.profile_id AND profiles.user_id = auth.uid()));
CREATE POLICY "Users can create their preferences" ON public.user_preferences FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = profile_id AND profiles.user_id = auth.uid()));
CREATE POLICY "Users can update their preferences" ON public.user_preferences FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = user_preferences.profile_id AND profiles.user_id = auth.uid()));

-- Add triggers for updated_at
CREATE TRIGGER update_tracks_updated_at BEFORE UPDATE ON public.tracks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_playlists_updated_at BEFORE UPDATE ON public.playlists FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_verification_requests_updated_at BEFORE UPDATE ON public.verification_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON public.user_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create storage bucket for audio files
INSERT INTO storage.buckets (id, name, public) VALUES ('audio', 'audio', true) ON CONFLICT (id) DO NOTHING;

-- Storage policies for audio
CREATE POLICY "Audio files are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'audio');
CREATE POLICY "Users can upload audio" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'audio' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update their audio" ON storage.objects FOR UPDATE USING (bucket_id = 'audio' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their audio" ON storage.objects FOR DELETE USING (bucket_id = 'audio' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;