import { useState, useEffect } from 'react';
import { ArrowLeft, Camera, Upload, X, MapPin, Save, Youtube, Music2, Globe, Instagram } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SocialLinksData {
  youtube: string;
  spotify: string;
  apple_music: string;
  instagram: string;
  facebook: string;
  website: string;
}

export default function EditProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    bio: '',
    location: '',
    avatarFile: null as File | null,
    avatarPreview: '',
    coverFile: null as File | null,
    coverPreview: '',
  });
  const [socialLinks, setSocialLinks] = useState<SocialLinksData>({
    youtube: '',
    spotify: '',
    apple_music: '',
    instagram: '',
    facebook: '',
    website: '',
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        username: profile.username || '',
        bio: profile.bio || '',
        location: profile.location || '',
        avatarFile: null,
        avatarPreview: profile.avatar_url || '',
        coverFile: null,
        coverPreview: profile.cover_url || '',
      });

      // Fetch social links
      supabase
        .from('social_links')
        .select('*')
        .eq('profile_id', profile.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setSocialLinks({
              youtube: data.youtube || '',
              spotify: data.spotify || '',
              apple_music: data.apple_music || '',
              instagram: data.instagram || '',
              facebook: data.facebook || '',
              website: data.website || '',
            });
          }
        });
    }
  }, [profile]);

  if (!user) {
    navigate('/auth');
    return null;
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, avatarFile: file, avatarPreview: URL.createObjectURL(file) });
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, coverFile: file, coverPreview: URL.createObjectURL(file) });
    }
  };

  const uploadFile = async (file: File, bucket: string): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage.from(bucket).upload(fileName, file, { upsert: true });
    if (error) { console.error('Upload error:', error); return null; }
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return publicUrl;
  };

  const handleSave = async () => {
    if (!profile) return;
    setLoading(true);
    try {
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

      const { error } = await supabase
        .from('profiles')
        .update({
          name: formData.name,
          username: formData.username,
          bio: formData.bio,
          location: formData.location,
          avatar_url: avatarUrl,
          cover_url: coverUrl,
        })
        .eq('id', profile.id);
      if (error) throw error;

      // Save social links - upsert
      const hasAnyLink = Object.values(socialLinks).some(v => v.trim());
      if (hasAnyLink) {
        const { error: linksError } = await supabase
          .from('social_links')
          .upsert({
            profile_id: profile.id,
            youtube: socialLinks.youtube || null,
            spotify: socialLinks.spotify || null,
            apple_music: socialLinks.apple_music || null,
            instagram: socialLinks.instagram || null,
            facebook: socialLinks.facebook || null,
            website: socialLinks.website || null,
          }, { onConflict: 'profile_id' });
        if (linksError) console.error('Social links error:', linksError);
      }

      await refreshProfile();
      toast.success('Profile updated successfully!');
      navigate('/profile');
    } catch (error: any) {
      console.error('Update error:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-36">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-muted transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-display font-bold text-lg">Edit Profile</h1>
          </div>
          <Button onClick={handleSave} disabled={loading} size="sm">
            <Save className="w-4 h-4 mr-1" />
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Cover & Avatar */}
        <div className="relative">
          <div className="h-32 rounded-xl overflow-hidden bg-muted relative">
            {formData.coverPreview ? (
              <img src={formData.coverPreview} alt="Cover" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Upload className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
            <label className="absolute inset-0 cursor-pointer flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
              <div className="w-10 h-10 rounded-full bg-background/80 flex items-center justify-center">
                <Camera className="w-5 h-5" />
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
            </label>
            {formData.coverPreview && (
              <button onClick={() => setFormData({ ...formData, coverFile: null, coverPreview: '' })} className="absolute top-2 right-2 w-6 h-6 rounded-full bg-background/80 flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="absolute -bottom-8 left-4">
            <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-background bg-muted relative">
              {formData.avatarPreview ? (
                <img src={formData.avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Camera className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
              <label className="absolute inset-0 cursor-pointer flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
                <Camera className="w-5 h-5 text-white" />
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </label>
            </div>
          </div>
        </div>

        {/* Profile Form */}
        <div className="pt-10 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Display Name</Label>
            <Input id="name" placeholder="Your name or stage name" className="h-12 bg-muted/50" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
              <Input id="username" placeholder="username" className="pl-8 h-12 bg-muted/50" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" placeholder="Tell your story..." className="min-h-[100px] bg-muted/50 resize-none" value={formData.bio} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input id="location" placeholder="City, Country" className="pl-10 h-12 bg-muted/50" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} />
            </div>
          </div>
        </div>

        {/* Social Links Section */}
        <div className="space-y-4">
          <h3 className="font-display font-bold text-lg">Social Links</h3>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="flex items-center gap-2"><Youtube className="w-4 h-4 text-red-500" /> YouTube</Label>
              <Input placeholder="https://youtube.com/..." className="h-11 bg-muted/50" value={socialLinks.youtube} onChange={(e) => setSocialLinks({ ...socialLinks, youtube: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="flex items-center gap-2"><Music2 className="w-4 h-4 text-green-500" /> Spotify</Label>
              <Input placeholder="https://open.spotify.com/..." className="h-11 bg-muted/50" value={socialLinks.spotify} onChange={(e) => setSocialLinks({ ...socialLinks, spotify: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="flex items-center gap-2"><Music2 className="w-4 h-4 text-pink-500" /> Apple Music</Label>
              <Input placeholder="https://music.apple.com/..." className="h-11 bg-muted/50" value={socialLinks.apple_music} onChange={(e) => setSocialLinks({ ...socialLinks, apple_music: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="flex items-center gap-2"><Instagram className="w-4 h-4 text-purple-500" /> Instagram</Label>
              <Input placeholder="https://instagram.com/..." className="h-11 bg-muted/50" value={socialLinks.instagram} onChange={(e) => setSocialLinks({ ...socialLinks, instagram: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="flex items-center gap-2"><Globe className="w-4 h-4 text-blue-500" /> Website</Label>
              <Input placeholder="https://yourwebsite.com" className="h-11 bg-muted/50" value={socialLinks.website} onChange={(e) => setSocialLinks({ ...socialLinks, website: e.target.value })} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
