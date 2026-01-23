-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create genres table
CREATE TABLE public.genres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  username TEXT UNIQUE,
  name TEXT,
  bio TEXT,
  avatar_url TEXT,
  cover_url TEXT,
  location TEXT,
  is_artist BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create artist_genres junction table
CREATE TABLE public.artist_genres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  genre_id UUID REFERENCES public.genres(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(profile_id, genre_id)
);

-- Create social_links table
CREATE TABLE public.social_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  youtube TEXT,
  spotify TEXT,
  apple_music TEXT,
  instagram TEXT,
  facebook TEXT,
  website TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artist_genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Helper function to check if current user is admin or moderator
CREATE OR REPLACE FUNCTION public.is_admin_or_moderator()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'moderator')
  )
$$;

-- Profiles RLS Policies
CREATE POLICY "Profiles are viewable by everyone"
ON public.profiles FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Genres RLS Policies (public read, admin write)
CREATE POLICY "Genres are viewable by everyone"
ON public.genres FOR SELECT
USING (true);

CREATE POLICY "Admins can manage genres"
ON public.genres FOR ALL
TO authenticated
USING (public.is_admin_or_moderator());

-- Artist Genres RLS Policies
CREATE POLICY "Artist genres are viewable by everyone"
ON public.artist_genres FOR SELECT
USING (true);

CREATE POLICY "Users can manage their own artist genres"
ON public.artist_genres FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = profile_id AND user_id = auth.uid()
));

CREATE POLICY "Users can update their own artist genres"
ON public.artist_genres FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = profile_id AND user_id = auth.uid()
));

CREATE POLICY "Users can delete their own artist genres"
ON public.artist_genres FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = profile_id AND user_id = auth.uid()
));

-- Social Links RLS Policies
CREATE POLICY "Social links are viewable by everyone"
ON public.social_links FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own social links"
ON public.social_links FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = profile_id AND user_id = auth.uid()
));

CREATE POLICY "Users can update their own social links"
ON public.social_links FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = profile_id AND user_id = auth.uid()
));

CREATE POLICY "Users can delete their own social links"
ON public.social_links FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = profile_id AND user_id = auth.uid()
));

-- User Roles RLS Policies (only admins can manage)
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_admin_or_moderator());

CREATE POLICY "Admins can manage user roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.is_admin_or_moderator());

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

-- Trigger to auto-create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_social_links_updated_at
  BEFORE UPDATE ON public.social_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default genres
INSERT INTO public.genres (name) VALUES
  ('Pop'), ('Hip-Hop'), ('R&B'), ('Electronic'), ('Rock'), ('Indie'),
  ('Jazz'), ('Classical'), ('Country'), ('Reggae'), ('Latin'), ('K-Pop'),
  ('Ambient'), ('House'), ('Techno'), ('Metal'), ('Folk'), ('Soul'),
  ('Afrobeats'), ('Gospel'), ('Blues'), ('Dancehall'), ('Trap'), ('Lo-Fi');

-- Create storage bucket for avatars and covers
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('covers', 'covers', true);

-- Storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for covers
CREATE POLICY "Cover images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'covers');

CREATE POLICY "Users can upload their own cover"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'covers' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own cover"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'covers' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own cover"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'covers' AND auth.uid()::text = (storage.foldername(name))[1]);