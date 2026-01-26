import { useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, Image, Music2, Video, X, Upload, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type UploadType = 'audio' | 'video' | 'image' | 'story';

export default function UploadPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [uploadType, setUploadType] = useState<UploadType | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    caption: '',
    addToStory: false,
    file: null as File | null,
    filePreview: '',
    coverFile: null as File | null,
    coverPreview: '',
  });

  // Check if user is an artist
  const isArtist = profile?.is_artist ?? false;

  if (!user || !profile) {
    return (
      <div className="min-h-screen pb-36 flex items-center justify-center">
        <div className="text-center p-8">
          <Upload className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="font-display font-bold text-xl mb-2">Create a Post</h2>
          <p className="text-muted-foreground mb-6">Sign in to start uploading</p>
          <Button onClick={() => navigate('/auth')}>Sign In</Button>
        </div>
      </div>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({
        ...formData,
        file,
        filePreview: URL.createObjectURL(file),
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

  const uploadFile = async (file: File, bucket: string): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;
    
    const { error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file);
    
    if (error) {
      console.error('Upload error:', error);
      return null;
    }
    
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);
    
    return publicUrl;
  };

  const handleSubmit = async () => {
    if (!formData.file || !uploadType) {
      toast.error('Please select a file to upload');
      return;
    }

    if (uploadType === 'audio' && !formData.title.trim()) {
      toast.error('Please enter a title for your track');
      return;
    }

    setLoading(true);

    try {
      let fileUrl: string | null = null;
      let coverUrl: string | null = null;

      // Upload main file
      if (uploadType === 'audio') {
        fileUrl = await uploadFile(formData.file, 'audio');
      } else {
        fileUrl = await uploadFile(formData.file, 'covers'); // Using covers for images/videos
      }

      if (!fileUrl) throw new Error('Failed to upload file');

      // Upload cover if audio
      if (uploadType === 'audio' && formData.coverFile) {
        coverUrl = await uploadFile(formData.coverFile, 'covers');
      }

      // Create track if audio
      if (uploadType === 'audio') {
        const { data: track, error: trackError } = await supabase
          .from('tracks')
          .insert({
            profile_id: profile.id,
            title: formData.title,
            audio_url: fileUrl,
            cover_url: coverUrl,
          })
          .select()
          .single();

        if (trackError) throw trackError;

        // Create post for the track
        const { error: postError } = await supabase
          .from('posts')
          .insert({
            profile_id: profile.id,
            type: 'audio',
            track_id: track.id,
            caption: formData.caption,
            is_story: formData.addToStory,
            expires_at: formData.addToStory ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null,
          });

        if (postError) throw postError;
      } else if (uploadType === 'story') {
        // Create story
        const { error } = await supabase
          .from('posts')
          .insert({
            profile_id: profile.id,
            type: 'image',
            image_url: fileUrl,
            caption: formData.caption,
            is_story: true,
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          });

        if (error) throw error;
      } else {
        // Create regular post (image or video)
        const { error } = await supabase
          .from('posts')
          .insert({
            profile_id: profile.id,
            type: uploadType,
            image_url: uploadType === 'image' ? fileUrl : null,
            video_url: uploadType === 'video' ? fileUrl : null,
            caption: formData.caption,
            is_story: formData.addToStory,
            expires_at: formData.addToStory ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null,
          });

        if (error) throw error;
      }

      toast.success(uploadType === 'story' ? 'Story published!' : 'Post published!');
      navigate('/');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to publish');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setUploadType(null);
    setFormData({
      title: '',
      caption: '',
      addToStory: false,
      file: null,
      filePreview: '',
      coverFile: null,
      coverPreview: '',
    });
  };

  // Upload options based on user type
  const uploadOptions = [
    ...(isArtist ? [{ type: 'audio' as UploadType, icon: Music2, label: 'Audio', color: 'text-primary' }] : []),
    { type: 'video' as UploadType, icon: Video, label: 'Video', color: 'text-accent' },
    { type: 'image' as UploadType, icon: Image, label: 'Image', color: 'text-secondary' },
    { type: 'story' as UploadType, icon: Camera, label: 'Story', color: 'text-muted-foreground' },
  ];

  return (
    <div className="min-h-screen pb-36">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            onClick={uploadType ? resetForm : () => navigate(-1)}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <h1 className="font-display font-bold text-lg">
            {uploadType ? `New ${uploadType === 'story' ? 'Story' : 'Post'}` : 'Create'}
          </h1>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={loading || !uploadType || !formData.file}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Post'}
          </Button>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {!uploadType ? (
          // Upload type selection
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-2 border-dashed border-muted rounded-2xl p-8 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary via-accent to-secondary mx-auto mb-4 flex items-center justify-center">
              <Upload className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-display font-bold text-lg mb-2">What would you like to share?</h3>
            <p className="text-sm text-muted-foreground mb-6">
              {isArtist 
                ? 'Share your music, videos, or photos with your fans'
                : 'Share videos, photos, or stories with the community'}
            </p>
            
            <div className="flex justify-center gap-4 flex-wrap">
              {uploadOptions.map((option) => (
                <motion.button
                  key={option.type}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setUploadType(option.type)}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
                >
                  <option.icon className={`w-6 h-6 ${option.color}`} />
                  <span className="text-xs">{option.label}</span>
                </motion.button>
              ))}
            </div>

            {/* Show message for non-artists about audio */}
            {!isArtist && (
              <div className="mt-6 p-4 rounded-xl bg-muted/50 text-left">
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Audio Upload</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Audio uploads are available for verified artists only. 
                  <button 
                    onClick={() => navigate('/settings')}
                    className="text-primary hover:underline ml-1"
                  >
                    Apply for artist status
                  </button>
                </p>
              </div>
            )}
          </motion.div>
        ) : (
          // Upload form
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* File upload */}
            <div className="border-2 border-dashed border-muted rounded-2xl p-6 text-center">
              {formData.filePreview ? (
                <div className="relative">
                  {uploadType === 'audio' ? (
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-muted">
                      <Music2 className="w-12 h-12 text-primary" />
                      <div className="text-left">
                        <p className="font-medium">{formData.file?.name}</p>
                        <p className="text-sm text-muted-foreground">Audio file selected</p>
                      </div>
                    </div>
                  ) : uploadType === 'video' ? (
                    <video
                      src={formData.filePreview}
                      className="w-full aspect-video object-cover rounded-xl"
                      controls
                    />
                  ) : (
                    <img
                      src={formData.filePreview}
                      alt="Preview"
                      className="w-full aspect-square object-cover rounded-xl"
                    />
                  )}
                  <button
                    onClick={() => setFormData({ ...formData, file: null, filePreview: '' })}
                    className="absolute top-2 right-2 p-1 rounded-full bg-background/80"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer block">
                  <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                  <p className="font-medium">Tap to upload</p>
                  <p className="text-sm text-muted-foreground">
                    {uploadType === 'audio' ? 'MP3, WAV, FLAC' : uploadType === 'video' ? 'MP4, MOV, WebM' : 'JPG, PNG, GIF'}
                  </p>
                  <input
                    type="file"
                    accept={uploadType === 'audio' ? 'audio/*' : uploadType === 'video' ? 'video/*' : 'image/*'}
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              )}
            </div>

            {/* Audio specific fields */}
            {uploadType === 'audio' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="title">Track Title *</Label>
                  <Input
                    id="title"
                    placeholder="Enter track title"
                    className="h-12 bg-muted/50"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Cover Art</Label>
                  <div className="border-2 border-dashed border-muted rounded-xl p-4">
                    {formData.coverPreview ? (
                      <div className="relative w-32 mx-auto">
                        <img
                          src={formData.coverPreview}
                          alt="Cover"
                          className="w-32 h-32 object-cover rounded-lg"
                        />
                        <button
                          onClick={() => setFormData({ ...formData, coverFile: null, coverPreview: '' })}
                          className="absolute -top-2 -right-2 p-1 rounded-full bg-background border"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center cursor-pointer">
                        <Image className="w-8 h-8 text-muted-foreground mb-1" />
                        <span className="text-sm text-muted-foreground">Add cover art</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleCoverChange}
                        />
                      </label>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Caption */}
            <div className="space-y-2">
              <Label htmlFor="caption">Caption</Label>
              <Textarea
                id="caption"
                placeholder="Write a caption for your post... Use #hashtags to reach more people"
                className="min-h-[100px] bg-muted/50 border-none resize-none"
                value={formData.caption}
                onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Tip: Add hashtags like #music #newrelease to increase visibility
              </p>
            </div>

            {/* Add to Story toggle */}
            {uploadType !== 'story' && (
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
                <div>
                  <p className="font-medium text-sm">Also add to Story</p>
                  <p className="text-xs text-muted-foreground">Share for 24 hours</p>
                </div>
                <Switch
                  checked={formData.addToStory}
                  onCheckedChange={(checked) => setFormData({ ...formData, addToStory: checked })}
                />
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
