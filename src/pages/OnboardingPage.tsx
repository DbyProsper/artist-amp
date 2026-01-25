import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronRight, ChevronLeft, Upload, Camera, 
  Music2, MapPin, Youtube, Instagram, Globe,
  Check, X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Genre {
  id: string;
  name: string;
}

const STEPS = ['Profile Type', 'Profile Info', 'Genres', 'Social Links'];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  
  const [formData, setFormData] = useState({
    isArtist: true,
    name: '',
    username: '',
    bio: '',
    location: '',
    avatarFile: null as File | null,
    avatarPreview: '',
    coverFile: null as File | null,
    coverPreview: '',
    selectedGenres: [] as string[],
    youtube: '',
    spotify: '',
    appleMusic: '',
    instagram: '',
    website: '',
  });

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    // Fetch genres
    const fetchGenres = async () => {
      const { data, error } = await supabase.from('genres').select('*').order('name');
      if (!error && data) {
        setGenres(data);
      }
    };

    fetchGenres();
  }, [user, navigate]);

  useEffect(() => {
    if (profile) {
      setFormData(prev => ({
        ...prev,
        name: profile.name || '',
        username: profile.username || '',
        bio: profile.bio || '',
        location: profile.location || '',
        avatarPreview: profile.avatar_url || '',
        coverPreview: profile.cover_url || '',
        isArtist: profile.is_artist || true,
      }));
      
      // If onboarding is already completed, redirect to home
      if (profile.onboarding_completed) {
        navigate('/');
      }
    }
  }, [profile, navigate]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({
        ...formData,
        avatarFile: file,
        avatarPreview: URL.createObjectURL(file),
      });
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({
        ...formData,
        coverFile: file,
        coverPreview: URL.createObjectURL(file),
      });
    }
  };

  const toggleGenre = (genreId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedGenres: prev.selectedGenres.includes(genreId)
        ? prev.selectedGenres.filter(id => id !== genreId)
        : [...prev.selectedGenres, genreId],
    }));
  };

  const uploadFile = async (file: File, bucket: string): Promise<string | null> => {
    if (!user) return null;
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;
    
    const { error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, { upsert: true });
    
    if (error) {
      console.error('Upload error:', error);
      return null;
    }
    
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);
    
    return publicUrl;
  };

  const handleComplete = async () => {
    if (!user || !profile) return;
    
    setLoading(true);
    
    try {
      // Upload images if provided
      let avatarUrl = profile.avatar_url;
      let coverUrl = profile.cover_url;
      
      if (formData.avatarFile) {
        const url = await uploadFile(formData.avatarFile, 'avatars');
        if (url) avatarUrl = url;
      }
      
      if (formData.coverFile) {
        const url = await uploadFile(formData.coverFile, 'covers');
        if (url) coverUrl = url;
      }
      
      // Update profile with onboarding_completed flag
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          name: formData.name,
          username: formData.username,
          bio: formData.bio,
          location: formData.location,
          avatar_url: avatarUrl,
          cover_url: coverUrl,
          is_artist: formData.isArtist,
          onboarding_completed: true,
        })
        .eq('id', profile.id);
      
      if (profileError) throw profileError;
      
      // Add genres
      if (formData.selectedGenres.length > 0) {
        // First delete existing genres
        await supabase
          .from('artist_genres')
          .delete()
          .eq('profile_id', profile.id);

        const genreInserts = formData.selectedGenres.map(genreId => ({
          profile_id: profile.id,
          genre_id: genreId,
        }));
        
        const { error: genreError } = await supabase
          .from('artist_genres')
          .insert(genreInserts);
        
        if (genreError) throw genreError;
      }
      
      // Add social links
      const socialLinks = {
        profile_id: profile.id,
        youtube: formData.youtube || null,
        spotify: formData.spotify || null,
        apple_music: formData.appleMusic || null,
        instagram: formData.instagram || null,
        website: formData.website || null,
      };
      
      const { error: socialError } = await supabase
        .from('social_links')
        .upsert(socialLinks, { onConflict: 'profile_id' });
      
      if (socialError) throw socialError;
      
      setOnboardingComplete(true);
      await refreshProfile();
      toast.success('Profile setup complete!');
      
      // Navigate after a short delay to show success state
      setTimeout(() => {
        navigate('/');
      }, 1000);
    } catch (error: any) {
      console.error('Onboarding error:', error);
      toast.error(error.message || 'Failed to complete setup');
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 0:
        return true;
      case 1:
        return formData.name.trim() !== '' && formData.username.trim() !== '';
      case 2:
        return formData.isArtist ? formData.selectedGenres.length >= 1 : true;
      case 3:
        return true;
      default:
        return true;
    }
  };

  // Show success screen
  if (onboardingComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary via-accent to-secondary flex items-center justify-center"
          >
            <Check className="w-10 h-10 text-white" />
          </motion.div>
          <h2 className="font-display font-bold text-2xl mb-2">You're all set!</h2>
          <p className="text-muted-foreground">Redirecting to your feed...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <Music2 className="w-5 h-5 text-primary" />
            <span className="font-display font-bold">Setup</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              // Mark onboarding as skipped but allow access
              if (profile) {
                supabase
                  .from('profiles')
                  .update({ onboarding_completed: true })
                  .eq('id', profile.id)
                  .then(() => {
                    refreshProfile();
                    navigate('/');
                  });
              } else {
                navigate('/');
              }
            }}
            className="text-muted-foreground"
          >
            Skip for now
          </Button>
        </div>
      </header>

      {/* Progress */}
      <div className="px-4 py-6">
        <div className="flex items-center justify-between mb-2">
          {STEPS.map((stepName, index) => (
            <div key={stepName} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  index < step
                    ? 'bg-primary text-primary-foreground'
                    : index === step
                    ? 'bg-primary/20 text-primary border-2 border-primary'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {index < step ? <Check className="w-4 h-4" /> : index + 1}
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`w-12 h-0.5 mx-1 ${
                    index < step ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground text-center">{STEPS[step]}</p>
      </div>

      {/* Step Content */}
      <div className="px-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {step === 0 && (
              <div className="space-y-6">
                <h2 className="font-display font-bold text-2xl text-center">
                  What brings you to MusicInsta?
                </h2>
                <div className="grid gap-4">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setFormData({ ...formData, isArtist: true })}
                    className={`p-6 rounded-2xl border-2 transition-all ${
                      formData.isArtist
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-muted/30 hover:border-muted-foreground'
                    }`}
                  >
                    <Music2 className={`w-12 h-12 mx-auto mb-4 ${formData.isArtist ? 'text-primary' : 'text-muted-foreground'}`} />
                    <h3 className="font-display font-bold text-lg mb-2">I'm an Artist</h3>
                    <p className="text-sm text-muted-foreground">
                      Upload music, connect with fans, and grow your audience
                    </p>
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setFormData({ ...formData, isArtist: false })}
                    className={`p-6 rounded-2xl border-2 transition-all ${
                      !formData.isArtist
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-muted/30 hover:border-muted-foreground'
                    }`}
                  >
                    <svg
                      className={`w-12 h-12 mx-auto mb-4 ${!formData.isArtist ? 'text-primary' : 'text-muted-foreground'}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                      />
                    </svg>
                    <h3 className="font-display font-bold text-lg mb-2">I'm a Fan</h3>
                    <p className="text-sm text-muted-foreground">
                      Discover music, create playlists, and connect with artists
                    </p>
                  </motion.button>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-6">
                <h2 className="font-display font-bold text-2xl text-center">
                  Tell us about yourself
                </h2>

                {/* Avatar & Cover */}
                <div className="relative">
                  {/* Cover */}
                  <div className="h-32 rounded-xl overflow-hidden bg-muted relative">
                    {formData.coverPreview ? (
                      <img
                        src={formData.coverPreview}
                        alt="Cover"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Upload className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                    <label className="absolute inset-0 cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleCoverChange}
                      />
                    </label>
                    {formData.coverPreview && (
                      <button
                        onClick={() => setFormData({ ...formData, coverFile: null, coverPreview: '' })}
                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-background/80 flex items-center justify-center"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Avatar */}
                  <div className="absolute -bottom-8 left-4">
                    <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-background bg-muted relative">
                      {formData.avatarPreview ? (
                        <img
                          src={formData.avatarPreview}
                          alt="Avatar"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Camera className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                      <label className="absolute inset-0 cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleAvatarChange}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="pt-10 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Display Name *</Label>
                    <Input
                      id="name"
                      placeholder="Your name or stage name"
                      className="h-12 bg-muted/50"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="username">Username *</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                      <Input
                        id="username"
                        placeholder="username"
                        className="pl-8 h-12 bg-muted/50"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      placeholder="Tell your story..."
                      className="min-h-[100px] bg-muted/50 resize-none"
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="location"
                        placeholder="City, Country"
                        className="pl-10 h-12 bg-muted/50"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <h2 className="font-display font-bold text-2xl text-center">
                  {formData.isArtist ? 'What genres do you create?' : 'What do you like to listen to?'}
                </h2>
                <p className="text-center text-muted-foreground">
                  {formData.isArtist
                    ? 'Select at least 1 genre (up to 5)'
                    : 'Select your favorite genres'}
                </p>

                <div className="flex flex-wrap gap-2">
                  {genres.map((genre) => (
                    <motion.button
                      key={genre.id}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => toggleGenre(genre.id)}
                      disabled={
                        formData.selectedGenres.length >= 5 &&
                        !formData.selectedGenres.includes(genre.id)
                      }
                      className={`px-4 py-2 rounded-full border transition-all ${
                        formData.selectedGenres.includes(genre.id)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted/30 border-border hover:border-muted-foreground disabled:opacity-50'
                      }`}
                    >
                      {genre.name}
                    </motion.button>
                  ))}
                </div>

                {formData.selectedGenres.length > 0 && (
                  <p className="text-sm text-muted-foreground text-center">
                    {formData.selectedGenres.length} of 5 selected
                  </p>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <h2 className="font-display font-bold text-2xl text-center">
                  Link your accounts
                </h2>
                <p className="text-center text-muted-foreground">
                  Connect your music and social platforms (optional)
                </p>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Youtube className="w-4 h-4 text-red-500" />
                      YouTube Channel
                    </Label>
                    <Input
                      placeholder="https://youtube.com/channel/..."
                      className="h-12 bg-muted/50"
                      value={formData.youtube}
                      onChange={(e) => setFormData({ ...formData, youtube: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                      </svg>
                      Spotify
                    </Label>
                    <Input
                      placeholder="https://open.spotify.com/artist/..."
                      className="h-12 bg-muted/50"
                      value={formData.spotify}
                      onChange={(e) => setFormData({ ...formData, spotify: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                      </svg>
                      Apple Music
                    </Label>
                    <Input
                      placeholder="https://music.apple.com/artist/..."
                      className="h-12 bg-muted/50"
                      value={formData.appleMusic}
                      onChange={(e) => setFormData({ ...formData, appleMusic: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Instagram className="w-4 h-4 text-pink-500" />
                      Instagram
                    </Label>
                    <Input
                      placeholder="https://instagram.com/..."
                      className="h-12 bg-muted/50"
                      value={formData.instagram}
                      onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      Website
                    </Label>
                    <Input
                      placeholder="https://yourwebsite.com"
                      className="h-12 bg-muted/50"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 p-4 glass border-t border-border safe-bottom">
        <div className="flex gap-3">
          {step > 0 && (
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              className="flex-1 h-12"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}
          <Button
            onClick={() => {
              if (step < STEPS.length - 1) {
                setStep(step + 1);
              } else {
                handleComplete();
              }
            }}
            disabled={!canProceed() || loading}
            className="flex-1 h-12 bg-gradient-to-r from-primary via-accent to-secondary"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : step === STEPS.length - 1 ? (
              'Complete Setup'
            ) : (
              <>
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
