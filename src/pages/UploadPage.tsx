import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Camera, Disc3, Image, Music2, Video, X, Upload, Loader2, Sparkles, Edit2, Save, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { EmojiPicker } from '@/components/chat/EmojiPicker';
import { useAuth } from '@/context/FirebaseAuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { arrayUnion, collection, addDoc, doc, getDoc, getDocs, increment, limit, orderBy, query, setDoc, updateDoc } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { toast } from 'sonner';
import { ImageEditorModal } from '@/components/studio/ImageEditorModal';
import { exportEditedImage } from '@/services/imageEditorService';
import { EditorOverlay } from '@/types/imageEditor';
import { publishUploadProgress } from '@/lib/uploadProgress';
import { takeDawAudio } from '@/lib/dawTransfer';
import { generateImage } from '@/lib/api';
import { DEFAULT_MEDIA_IMAGE, readMediaDuration } from '@/lib/media';
import { deletePostDraft, loadPostDraft, savePostDraft } from '@/lib/postDrafts';
import { MUSIC_GENRES } from '@/lib/genres';

type UploadType = 'audio' | 'video' | 'image' | 'story';

export default function UploadPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const studioGenerated = searchParams.get('studioGenerated') === '1';
  const existingTrackId = searchParams.get('existingTrack');
  const [uploadType, setUploadType] = useState<UploadType | null>(null);
  const [loading, setLoading] = useState(false);
  const [coverGenerating, setCoverGenerating] = useState(false);
  const [generatedCoverUrl, setGeneratedCoverUrl] = useState('');
  const [draftAvailable, setDraftAvailable] = useState(false);
  const [knownHashtags, setKnownHashtags] = useState<Array<{ tag: string; count: number }>>([]);
  const [mentionProfiles, setMentionProfiles] = useState<Array<{ id: string; username: string; name: string }>>([]);
  const [mediaDuration, setMediaDuration] = useState(0);
  const [storyClipStart, setStoryClipStart] = useState(0);
  const [storyClipEnd, setStoryClipEnd] = useState(30);
  const captionRef = useRef<HTMLTextAreaElement>(null);
  const storyVideoRef = useRef<HTMLVideoElement>(null);
  const [formData, setFormData] = useState({
    title: '',
    caption: '',
    lyrics: '',
    addToStory: false,
    file: null as File | null,
    filePreview: '',
    coverFile: null as File | null,
    coverPreview: '',
    releaseType: 'single',
    featuredArtists: '',
    writers: '',
    composers: '',
    producers: '',
    engineers: '',
    label: '',
    genre: '',
    visualFilter: 'none',
    attachedMusic: '',
  });

  // Image editor state
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [editingImageType, setEditingImageType] = useState<'main' | 'cover'>('main');

  useEffect(() => {
    const key = searchParams.get('fromDaw');
    if (!key) return;
    void takeDawAudio(key).then(result => {
      if (!result) return;
      const mime = result.blob.type || (result.name.match(/\.(png|jpe?g|webp)$/i) ? 'image/png' : 'audio/wav');
      const file = new File([result.blob], result.name, { type: mime });
      const type: UploadType = mime.startsWith('image/') ? 'image' : 'audio';
      setUploadType(type);
      const inheritedCover = searchParams.get('cover') || '';
      if (inheritedCover) setGeneratedCoverUrl(inheritedCover);
      void readMediaDuration(file).then(setMediaDuration);
      setFormData(current => ({ ...current, file, filePreview: URL.createObjectURL(file), coverPreview: inheritedCover || current.coverPreview, title: searchParams.get('title') || result.name.replace(/\.[^.]+$/, ''), caption: searchParams.get('caption') || current.caption, lyrics: searchParams.get('lyrics') || current.lyrics, genre: searchParams.get('genre') || current.genre, composers: studioGenerated ? 'MusicInsta AI' : current.composers, producers: studioGenerated ? 'MusicInsta AI' : current.producers, engineers: studioGenerated ? 'MusicInsta AI' : current.engineers, label: studioGenerated ? 'MusicInsta AI' : current.label }));
    });
  }, [searchParams, studioGenerated]);

  useEffect(() => {
    if (!existingTrackId || !profile) return;
    void getDoc(doc(db, 'tracks', existingTrackId)).then(snapshot => {
      if (!snapshot.exists()) { toast.error('That track could not be found.'); return; }
      const track = snapshot.data();
      if (track.profile_id !== profile.id) { toast.error('You can only post tracks from your own profile.'); return; }
      const cover = track.cover_url || DEFAULT_MEDIA_IMAGE;
      setUploadType('audio'); setMediaDuration(Number(track.duration) || 0); setGeneratedCoverUrl(cover);
      setFormData(current => ({ ...current, title: track.title || 'Untitled track', caption: current.caption || `${track.title || 'New music'} by ${profile.name || 'MusicInsta artist'}`, lyrics: track.lyrics || '', genre: track.genre || 'other', filePreview: track.audio_url || '', coverPreview: cover, composers: track.credits?.composers?.join(', ') || '', producers: track.credits?.producers?.join(', ') || '', engineers: track.credits?.engineers?.join(', ') || '', label: track.credits?.label || '' }));
    });
  }, [existingTrackId, profile]);

  useEffect(() => { if (user) void loadPostDraft(user.uid).then(draft => setDraftAvailable(Boolean(draft))); }, [user]);

  useEffect(() => {
    void Promise.all([
      getDocs(query(collection(db, 'hashtags'), orderBy('count', 'desc'), limit(30))).catch(() => null),
      getDocs(query(collection(db, 'profiles'), limit(100))).catch(() => null),
      getDocs(query(collection(db, 'posts'), orderBy('created_at', 'desc'), limit(100))).catch(() => null),
    ]).then(([hashtags, profiles, posts]) => {
      const counts = new Map<string, number>();
      posts?.docs.forEach(item => {
        const data = item.data();
        const tags = Array.isArray(data.hashtags) ? data.hashtags : (String(data.caption || '').match(/#[\p{L}\p{N}_-]+/gu) || []).map((value: string) => value.slice(1).toLowerCase());
        new Set(tags.map(String)).forEach(tag => counts.set(tag.toLowerCase(), (counts.get(tag.toLowerCase()) || 0) + 1));
      });
      hashtags?.docs.forEach(item => { const tag = String(item.data().tag || item.id).toLowerCase(); counts.set(tag, Math.max(counts.get(tag) || 0, Number(item.data().count) || 0)); });
      setKnownHashtags([...counts.entries()].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count));
      if (profiles) setMentionProfiles(profiles.docs.map(item => ({ id: item.id, username: String(item.data().username || ''), name: String(item.data().name || 'MusicInsta user') })).filter(item => item.username));
    });
  }, []);

  const captionToken = formData.caption.match(/(^|\s)([#@][\w-]*)$/)?.[2] || '';
  const captionSuggestions = captionToken.startsWith('#')
    ? knownHashtags.filter(item => item.tag.toLowerCase().includes(captionToken.slice(1).toLowerCase())).slice(0, 6).map(item => ({ value: `#${item.tag}`, label: `#${item.tag}`, detail: `${item.count} posts` }))
    : captionToken.startsWith('@') ? mentionProfiles.filter(item => item.username.toLowerCase().includes(captionToken.slice(1).toLowerCase())).slice(0, 6).map(item => ({ value: `@${item.username}`, label: `@${item.username}`, detail: item.name })) : [];

  const applyCaptionSuggestion = (value: string) => setFormData(current => ({ ...current, caption: current.caption.replace(/[#@][\w-]*$/, `${value} `) }));

  const saveDraft = async () => {
    if (!user || !uploadType) { toast.error('Choose a post type before saving a draft.'); return; }
    await savePostDraft(user.uid, { uploadType, formData: { ...formData, filePreview: '', coverPreview: '' }, mediaDuration, storyClipStart, storyClipEnd, generatedCoverUrl, savedAt: Date.now() });
    setDraftAvailable(true); toast.success('Draft saved on this device.');
  };

  const restoreDraft = async () => {
    if (!user) return;
    const draft = await loadPostDraft<{ uploadType: UploadType; formData: typeof formData; mediaDuration: number; storyClipStart: number; storyClipEnd: number; generatedCoverUrl: string }>(user.uid);
    if (!draft) return;
    const restored = draft.formData;
    setUploadType(draft.uploadType); setMediaDuration(draft.mediaDuration || 0); setStoryClipStart(draft.storyClipStart || 0); setStoryClipEnd(draft.storyClipEnd || 30); setGeneratedCoverUrl(draft.generatedCoverUrl || '');
    setFormData({ ...restored, filePreview: restored.file ? URL.createObjectURL(restored.file) : '', coverPreview: restored.coverFile ? URL.createObjectURL(restored.coverFile) : draft.generatedCoverUrl || '' });
    toast.success('Draft restored.');
  };

  if (!user) {
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    let duration = 0;
    if (file.type.startsWith('audio/')) duration = await readMediaDuration(file);
    if (file.type.startsWith('video/')) {
      const url = URL.createObjectURL(file);
      try {
        duration = await new Promise<number>((resolve, reject) => {
          const video = document.createElement('video');
          video.preload = 'metadata'; video.src = url;
          video.onloadedmetadata = () => resolve(video.duration);
          video.onerror = () => reject(new Error('This video could not be read.'));
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'This video could not be read.');
        e.target.value = '';
        return;
      } finally { URL.revokeObjectURL(url); }
      if (uploadType === 'story' && duration < 5) {
        toast.error('Story video clips must be at least 5 seconds long.');
        e.target.value = '';
        return;
      }
      setStoryClipStart(0);
      setStoryClipEnd(Math.min(30, duration));
    }
    setMediaDuration(duration);
    setFormData({ ...formData, file, filePreview: URL.createObjectURL(file) });
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setGeneratedCoverUrl(''); setFormData({ ...formData, coverFile: file, coverPreview: URL.createObjectURL(file) }); }
  };

  const generateCoverArt = async () => {
    if (!formData.title.trim() || !formData.genre) { toast.error('Add a track title and genre before generating cover art.'); return; }
    setCoverGenerating(true);
    try {
      const result = await generateImage(`Create professional release-ready album cover art for ${formData.title}. Genre: ${formData.genre}. ${formData.caption || 'Use an iconic focal image, cinematic lighting, and a memorable visual concept.'}`, { image_type: 'cover', genre: formData.genre, text: formData.title });
      const url = result.image_url || result.cover_url;
      if (!url) throw new Error('No cover image was returned.');
      setGeneratedCoverUrl(url); setFormData(current => ({ ...current, coverFile: null, coverPreview: url })); toast.success('Cover art generated.');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Cover art could not be generated.'); }
    finally { setCoverGenerating(false); }
  };

  const handleEmojiSelect = (emoji: string) => {
    setFormData({ ...formData, caption: formData.caption + emoji });
  };

  const handleStoryClipChange = (values: number[]) => {
    let [nextStart, nextEnd] = values;
    if (nextEnd - nextStart > 30) {
      if (Math.abs(nextStart - storyClipStart) >= Math.abs(nextEnd - storyClipEnd)) nextEnd = nextStart + 30;
      else nextStart = nextEnd - 30;
    }
    nextStart = Math.max(0, Math.min(nextStart, mediaDuration - 5));
    nextEnd = Math.min(mediaDuration, Math.max(nextStart + 5, nextEnd));
    setStoryClipStart(Number(nextStart.toFixed(1)));
    setStoryClipEnd(Number(nextEnd.toFixed(1)));
    if (storyVideoRef.current) storyVideoRef.current.currentTime = nextStart;
  };

  const uploadFile = async (file: File, path: string): Promise<string | null> => {
    try {
      const fileRef = ref(storage, path);
      const task = uploadBytesResumable(fileRef, file);
      await new Promise<void>((resolve, reject) => task.on('state_changed', snapshot => {
        publishUploadProgress({ active: true, progress: Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 90), label: `Uploading ${file.name}` });
      }, reject, resolve));
      const downloadURL = await getDownloadURL(fileRef);
      return downloadURL;
    } catch (error) {
      console.error('Upload error:', error);
      return null;
    }
  };

  const createVideoThumbnail = async (file: File, startAt = 0): Promise<File | null> => {
    const url = URL.createObjectURL(file);
    try {
      const video = document.createElement('video');
      video.muted = true; video.preload = 'metadata'; video.src = url;
      await new Promise<void>((resolve, reject) => { video.onloadedmetadata = () => resolve(); video.onerror = () => reject(new Error('Video preview failed')); });
      video.currentTime = Math.min(video.duration, Math.max(0, startAt + Math.min(1, video.duration / 3)));
      await new Promise<void>((resolve, reject) => { video.onseeked = () => resolve(); video.onerror = () => reject(new Error('Video seek failed')); });
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 720; canvas.height = video.videoHeight || 720;
      canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', .86));
      return blob ? new File([blob], `video-thumbnail-${Date.now()}.jpg`, { type: 'image/jpeg' }) : null;
    } catch { return null; }
    finally { URL.revokeObjectURL(url); }
  };

  const handleSubmit = async () => {
    if ((!formData.file && !existingTrackId) || !uploadType) { toast.error('Please select a file to upload'); return; }
    if (uploadType === 'audio' && !formData.title.trim()) { toast.error('Please enter a title'); return; }
    if (uploadType === 'audio' && !formData.genre) { toast.error('Please select a genre'); return; }
    if ((uploadType === 'story' || formData.addToStory) && formData.file?.type.startsWith('video/') && storyClipEnd - storyClipStart < 5) { toast.error('Select a story clip between 5 and 30 seconds.'); return; }

    setLoading(true);
    publishUploadProgress({ active: true, progress: 1, label: 'Preparing your post' });
    navigate('/');
    try {
      let fileUrl: string | null = null;
      let coverUrl: string | null = null;
      let createdTrackId: string | null = existingTrackId;

      const creatorId = profile?.id || user.uid;
      const hashtags = [...new Set((formData.caption.match(/#[\p{L}\p{N}_-]+/gu) || []).map(value => value.slice(1).toLowerCase()))];
      const mentionUsernames = [...new Set((formData.caption.match(/@[\w.-]+/g) || []).map(value => value.slice(1).toLowerCase()))];
      const mentionedProfileIds = mentionProfiles.filter(item => mentionUsernames.includes(item.username.toLowerCase())).map(item => item.id);
      const splitCredits = (value: string) => value.split(',').map(item => item.trim()).filter(Boolean);
      const artistName = profile?.name || user.displayName || 'Unknown artist';
      const credits = studioGenerated ? {
        primaryArtist: artistName, promptBy: artistName, featuredArtists: splitCredits(formData.featuredArtists),
        writers: [], composers: ['MusicInsta AI'], producers: ['MusicInsta AI'], engineers: ['MusicInsta AI'],
        label: 'MusicInsta AI', releaseType: formData.releaseType, generatedBy: 'MusicInsta AI Studio', locked: true,
      } : {
        primaryArtist: artistName,
        featuredArtists: splitCredits(formData.featuredArtists), writers: splitCredits(formData.writers),
        composers: splitCredits(formData.composers), producers: splitCredits(formData.producers),
        engineers: splitCredits(formData.engineers), label: formData.label.trim() || null,
        releaseType: formData.releaseType,
      };

      if (uploadType === 'audio' && existingTrackId) {
        const existing = await getDoc(doc(db, 'tracks', existingTrackId));
        fileUrl = existing.exists() ? existing.data().audio_url || null : null;
      } else if (uploadType === 'audio' && formData.file) {
        const fileExt = formData.file.name.split('.').pop();
        const fileName = `audio/${user.uid}/${Date.now()}.${fileExt}`;
        fileUrl = await uploadFile(formData.file, fileName);
      } else if (formData.file) {
        const fileExt = formData.file.name.split('.').pop();
        const fileName = `uploads/${user.uid}/${Date.now()}.${fileExt}`;
        fileUrl = await uploadFile(formData.file, fileName);
      }
      if (!fileUrl) throw new Error('Failed to upload file');

      if (uploadType === 'audio' && formData.coverFile) {
        const fileExt = formData.coverFile.name.split('.').pop();
        const fileName = `covers/${user.uid}/${Date.now()}.${fileExt}`;
        coverUrl = await uploadFile(formData.coverFile, fileName);
      }
      if (uploadType === 'audio' && !coverUrl && generatedCoverUrl) coverUrl = generatedCoverUrl;
      if (uploadType === 'audio' && !coverUrl) coverUrl = DEFAULT_MEDIA_IMAGE;
      if (formData.file && (uploadType === 'video' || (uploadType === 'story' && formData.file.type.startsWith('video/')))) {
        const thumbnail = await createVideoThumbnail(formData.file, uploadType === 'story' || formData.addToStory ? storyClipStart : 0);
        if (thumbnail) coverUrl = await uploadFile(thumbnail, `uploads/${user.uid}/thumbnails/${Date.now()}.jpg`);
      }

      if (uploadType === 'audio' && existingTrackId) {
        await updateDoc(doc(db, 'tracks', existingTrackId), { ...(coverUrl && coverUrl !== DEFAULT_MEDIA_IMAGE ? { cover_url: coverUrl } : {}), ...(hashtags.length ? { tags: arrayUnion(...hashtags) } : {}), updated_at: new Date() });
        await addDoc(collection(db, 'posts'), { profile_id: creatorId, type: 'audio', track_id: existingTrackId, image_url: coverUrl, caption: formData.caption, hashtags, mentions: mentionedProfileIds, is_story: false, expires_at: null, created_at: new Date(), is_new_release: false, is_new_post: true });
      } else if (uploadType === 'audio') {
        // Create track document
        const trackData = {
          profile_id: creatorId,
          title: formData.title,
          genre: formData.genre,
          lyrics: formData.lyrics || null,
          audio_url: fileUrl,
          cover_url: coverUrl,
          duration: mediaDuration || null,
          created_at: new Date(),
          updated_at: new Date(),
          credits,
          is_new_release: true,
          is_new_post: true,
          studio_generated: studioGenerated,
          tags: hashtags,
        };
        const trackRef = await addDoc(collection(db, 'tracks'), trackData);
        createdTrackId = trackRef.id;

        // Create post document
        const postData = {
          profile_id: creatorId,
          type: 'audio',
          track_id: trackRef.id,
          caption: formData.caption,
          is_story: false,
          expires_at: null,
          created_at: new Date(),
          credits,
          is_new_release: true,
          hashtags, mentions: mentionedProfileIds,
        };
        await addDoc(collection(db, 'posts'), postData);
      } else if (uploadType === 'story') {
        const isVideoStory = formData.file.type.startsWith('video/');
        const postData = {
          profile_id: creatorId,
          type: isVideoStory ? 'video' : 'image',
          image_url: isVideoStory ? coverUrl : fileUrl,
          video_url: isVideoStory ? fileUrl : null,
          story_start_time: isVideoStory ? storyClipStart : null,
          story_end_time: isVideoStory ? storyClipEnd : null,
          caption: formData.caption,
          is_story: true,
          expires_at: new Date(Date.now() + 24*60*60*1000),
          created_at: new Date(),
          hashtags, mentions: mentionedProfileIds,
        };
        await addDoc(collection(db, 'posts'), postData);
      } else {
        const postData = {
          profile_id: creatorId,
          type: uploadType,
          image_url: uploadType === 'image' ? fileUrl : uploadType === 'video' ? coverUrl : null,
          video_url: uploadType === 'video' ? fileUrl : null,
          caption: formData.caption,
          is_story: false,
          expires_at: null,
          created_at: new Date(),
          visual_filter: formData.visualFilter,
          attached_music: formData.attachedMusic.trim() || null,
          credits: uploadType === 'video' ? credits : null,
          is_new_release: false,
          is_new_post: true,
          hashtags, mentions: mentionedProfileIds,
        };
        await addDoc(collection(db, 'posts'), postData);
      }

      await Promise.all(hashtags.map(tag => setDoc(doc(db, 'hashtags', tag), { tag, count: increment(1), updated_at: new Date() }, { merge: true })));
      await Promise.all(mentionedProfileIds.filter(id => id !== creatorId).map(id => addDoc(collection(db, 'notifications'), { profile_id: id, from_profile_id: creatorId, type: 'mention', message: `${profile?.name || 'Someone'} mentioned you in a post`, read: false, created_at: new Date() })));

      if (formData.addToStory && uploadType !== 'story') {
        await addDoc(collection(db, 'posts'), {
          profile_id: creatorId,
          type: uploadType,
          track_id: createdTrackId,
          image_url: uploadType === 'audio' ? coverUrl : uploadType === 'image' ? fileUrl : uploadType === 'video' ? coverUrl : null,
          video_url: uploadType === 'video' ? fileUrl : null,
          story_start_time: uploadType === 'video' ? storyClipStart : null,
          story_end_time: uploadType === 'video' ? storyClipEnd : null,
          caption: formData.caption,
          genre: formData.genre,
          is_story: true,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
          created_at: new Date(),
        });
      }

      toast.success(uploadType === 'story' ? 'Story published!' : 'Post published!');
      window.dispatchEvent(new Event('musicinsta:feed-refresh'));
      await deletePostDraft(user.uid); setDraftAvailable(false);
      publishUploadProgress({ active: false, progress: 100, label: uploadType === 'story' ? 'Story published' : 'Post published' });
    } catch (error: unknown) {
      console.error('Upload error:', error);
      const message = error instanceof Error ? error.message : 'Failed to publish';
      toast.error(message);
      publishUploadProgress({ active: false, progress: 0, label: 'Upload failed', error: message });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setUploadType(null);
    setMediaDuration(0);
    setStoryClipStart(0);
    setStoryClipEnd(30);
    setGeneratedCoverUrl('');
    setFormData({ title: '', caption: '', lyrics: '', addToStory: false, file: null, filePreview: '', coverFile: null, coverPreview: '', releaseType: 'single', featuredArtists: '', writers: '', composers: '', producers: '', engineers: '', label: '', genre: '', visualFilter: 'none', attachedMusic: '' });
  };

  /**
   * Handle image editor save for main or cover image
   */
  const handleImageEditorSave = async (overlays: EditorOverlay[]) => {
    const imageUrl = editingImageType === 'main' ? formData.filePreview : formData.coverPreview;
    
    if (!imageUrl) {
      toast.error('No image to edit');
      return;
    }

    try {
      const editedFile = await exportEditedImage(imageUrl, overlays);
      if (!editedFile) throw new Error('Failed to render edited image');
      const previewUrl = URL.createObjectURL(editedFile);
      if (editingImageType === 'main') {
        setFormData({ ...formData, file: editedFile, filePreview: previewUrl });
      } else {
        setFormData({ ...formData, coverFile: editedFile, coverPreview: previewUrl });
      }
      toast.success('🎨 Image edited!');
      setShowImageEditor(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error editing image';
      toast.error(message);
      console.error('[Upload] Image edit error:', error);
    }
  };

  const uploadOptions = [
    { type: 'audio' as UploadType, icon: Music2, label: 'Audio', color: 'text-primary' },
    { type: 'video' as UploadType, icon: Video, label: 'Video', color: 'text-accent' },
    { type: 'image' as UploadType, icon: Image, label: 'Image', color: 'text-secondary' },
    { type: 'story' as UploadType, icon: Camera, label: 'Story', color: 'text-muted-foreground' },
  ];

  return (
    <div className="min-h-screen pb-36">
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={uploadType ? resetForm : () => navigate(-1)} className="p-2 rounded-full hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
          <h1 className="font-display font-bold text-lg">{uploadType ? `New ${uploadType === 'story' ? 'Story' : 'Post'}` : 'Create'}</h1>
          <div className="flex items-center gap-2">{uploadType && <Button size="sm" variant="outline" onClick={() => void saveDraft()} disabled={loading}><Save className="mr-1 h-4 w-4" />Draft</Button>}<Button size="sm" onClick={handleSubmit} disabled={loading || !uploadType || (!formData.file && !existingTrackId)}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Post'}
          </Button></div>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {!uploadType ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="border-2 border-dashed border-muted rounded-2xl p-8 text-center">
            {draftAvailable && <Button type="button" variant="outline" className="mb-5" onClick={() => void restoreDraft()}><FolderOpen className="mr-2 h-4 w-4" />Continue saved draft</Button>}
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary via-accent to-secondary mx-auto mb-4 flex items-center justify-center">
              <Upload className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-display font-bold text-lg mb-2">What would you like to share?</h3>
            <p className="text-sm text-muted-foreground mb-6">Share your music, videos, photos, or stories</p>
            <div className="flex justify-center gap-4 flex-wrap">
              {uploadOptions.map((option) => (
                <motion.button key={option.type} whileTap={{ scale: 0.95 }} onClick={() => setUploadType(option.type)} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted hover:bg-muted/80 transition-colors">
                  <option.icon className={`w-6 h-6 ${option.color}`} />
                  <span className="text-xs">{option.label}</span>
                </motion.button>
              ))}
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => navigate('/upload/album')} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted hover:bg-muted/80 transition-colors"><Disc3 className="h-6 w-6 text-primary" /><span className="text-xs">Album / EP</span></motion.button>
            </div>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* File upload */}
            <div className="border-2 border-dashed border-muted rounded-2xl p-6 text-center">
              {formData.filePreview ? (
                <div className="relative">
                  {uploadType === 'audio' ? (
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-muted">
                      <Music2 className="w-12 h-12 text-primary" />
                      <div className="text-left">
                        <p className="font-medium">{formData.file?.name || formData.title}</p>
                        <p className="text-sm text-muted-foreground">{existingTrackId ? 'Existing profile track selected' : 'Audio file selected'}</p>
                      </div>
                    </div>
                  ) : uploadType === 'video' || (uploadType === 'story' && formData.file?.type.startsWith('video/')) ? (
                    <>
                      <video ref={storyVideoRef} src={formData.filePreview} style={{ filter: formData.visualFilter }} className="mx-auto max-h-[70vh] w-full rounded-xl bg-black object-contain" controls onTimeUpdate={event => { if ((uploadType === 'story' || formData.addToStory) && event.currentTarget.currentTime >= storyClipEnd) { event.currentTarget.pause(); event.currentTarget.currentTime = storyClipStart; } }} />
                      {formData.file?.type.startsWith('image/') && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingImageType('main');
                            setShowImageEditor(true);
                          }}
                          className="absolute top-2 right-12 gap-2"
                        >
                          <Edit2 className="w-4 h-4" />
                          Edit
                        </Button>
                      )}
                    </>
                  ) : (
                    <>
                      <img src={formData.filePreview} alt="Preview" style={{ filter: formData.visualFilter }} className="mx-auto max-h-[70vh] w-full rounded-xl bg-black object-contain" />
                      {(uploadType === 'image' || uploadType === 'story') && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingImageType('main');
                            setShowImageEditor(true);
                          }}
                          className="absolute top-2 right-12 gap-2"
                        >
                          <Edit2 className="w-4 h-4" />
                          Edit
                        </Button>
                      )}
                    </>
                  )}
                  <button onClick={() => { setFormData({ ...formData, file: null, filePreview: '', addToStory: false }); setMediaDuration(0); setStoryClipStart(0); setStoryClipEnd(30); }} className="absolute top-2 right-2 p-1 rounded-full bg-background/80">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer block">
                  <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                  <p className="font-medium">Tap to upload</p>
                  <p className="text-sm text-muted-foreground">
                    {uploadType === 'audio' ? 'MP3, WAV, FLAC' : uploadType === 'video' ? 'MP4, MOV, WebM' : uploadType === 'story' ? 'JPG, PNG, GIF, MP4, MOV, WebM · select a 5–30 second video clip' : 'JPG, PNG, GIF'}
                  </p>
                  <input type="file" accept={uploadType === 'audio' ? 'audio/*' : uploadType === 'video' ? 'video/*' : uploadType === 'story' ? 'image/*,video/*' : 'image/*'} className="hidden" onChange={event => void handleFileChange(event)} />
                </label>
              )}
            </div>

            {formData.file?.type.startsWith('video/') && (uploadType === 'story' || formData.addToStory) && mediaDuration >= 5 && (
              <div className="space-y-4 rounded-2xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-semibold">Choose the story clip</p><p className="text-xs text-muted-foreground">Move either handle to select 5–30 seconds from anywhere in the video.</p></div><span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">{(storyClipEnd - storyClipStart).toFixed(1)}s</span></div>
                <Slider min={0} max={mediaDuration} step={0.1} minStepsBetween={50} value={[storyClipStart, storyClipEnd]} onValueChange={handleStoryClipChange} />
                <div className="flex justify-between text-xs text-muted-foreground"><span>Starts at {storyClipStart.toFixed(1)}s</span><span>Ends at {storyClipEnd.toFixed(1)}s</span><span>Video {mediaDuration.toFixed(1)}s</span></div>
                <Button type="button" size="sm" variant="outline" onClick={() => { if (!storyVideoRef.current) return; storyVideoRef.current.currentTime = storyClipStart; void storyVideoRef.current.play(); }}>Preview selected clip</Button>
              </div>
            )}

            {uploadType === 'audio' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="title">Track Title *</Label>
                  <Input id="title" placeholder="Enter track title" className="h-12 bg-muted/50" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lyrics">Lyrics (Optional)</Label>
                  <Textarea
                    id="lyrics"
                    placeholder="Enter song lyrics..."
                    className="min-h-[120px] bg-muted/50 border-none resize-none"
                    value={formData.lyrics}
                    onChange={(e) => setFormData({ ...formData, lyrics: e.target.value })}
                  />
                </div>
                <div className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-2">
                  <div className="space-y-2"><Label>Genre *</Label><select required className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={formData.genre} onChange={e => setFormData({ ...formData, genre: e.target.value })}><option value="">Select genre</option>{MUSIC_GENRES.map(genre => <option key={genre} value={genre}>{genre}</option>)}</select></div>
                  <div className="space-y-2"><Label>Release type</Label><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={formData.releaseType} onChange={e => setFormData({ ...formData, releaseType: e.target.value })}><option value="single">Single</option><option value="ep">EP</option><option value="album">Album</option><option value="mixtape">Mixtape</option><option value="demo">Demo</option></select></div>
                  <div className="space-y-2"><Label>Featured artists</Label><Input placeholder="Artist A, Artist B" value={formData.featuredArtists} onChange={e => setFormData({ ...formData, featuredArtists: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Writers</Label><Input placeholder="Comma-separated names" value={formData.writers} onChange={e => setFormData({ ...formData, writers: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Composers</Label><Input disabled={studioGenerated} placeholder="Comma-separated names" value={formData.composers} onChange={e => setFormData({ ...formData, composers: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Producers</Label><Input disabled={studioGenerated} placeholder="Comma-separated names" value={formData.producers} onChange={e => setFormData({ ...formData, producers: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Engineers</Label><Input disabled={studioGenerated} placeholder="Comma-separated names" value={formData.engineers} onChange={e => setFormData({ ...formData, engineers: e.target.value })} /></div>
                  <div className="space-y-2 sm:col-span-2"><Label>Label</Label><Input disabled={studioGenerated} placeholder="Independent or label name" value={formData.label} onChange={e => setFormData({ ...formData, label: e.target.value })} />{studioGenerated && <p className="text-xs text-muted-foreground">Studio production credits are verified and locked. You are credited for the prompt.</p>}</div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2"><Label>Cover Art</Label><Button type="button" size="sm" variant="outline" disabled={coverGenerating || !formData.title.trim() || !formData.genre} onClick={() => void generateCoverArt()}>{coverGenerating ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-2 h-3.5 w-3.5" />}Generate cover</Button></div>
                  <div className="border-2 border-dashed border-muted rounded-xl p-4">
                    {formData.coverPreview ? (
                      <div className="relative w-32 mx-auto">
                        <img src={formData.coverPreview} alt="Cover" className="w-32 h-32 object-cover rounded-lg" />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingImageType('cover');
                            setShowImageEditor(true);
                          }}
                          className="absolute -bottom-8 left-0 right-0 mx-auto gap-2 w-full"
                        >
                          <Edit2 className="w-3 h-3" />
                          Edit
                        </Button>
                        <button onClick={() => { setGeneratedCoverUrl(''); setFormData({ ...formData, coverFile: null, coverPreview: '' }); }} className="absolute -top-2 -right-2 p-1 rounded-full bg-background border">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center cursor-pointer">
                        <Image className="w-8 h-8 text-muted-foreground mb-1" />
                        <span className="text-sm text-muted-foreground">Add cover art</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
                      </label>
                    )}
                  </div>
                </div>
              </>
            )}

            {(uploadType === 'image' || uploadType === 'video' || uploadType === 'story') && (
              <div className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-2">
                <div className="space-y-2"><Label>Visual effect</Label><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={formData.visualFilter} onChange={e => setFormData({ ...formData, visualFilter: e.target.value })}><option value="none">Original</option><option value="contrast(1.15) saturate(1.2)">Vivid</option><option value="grayscale(1) contrast(1.1)">Mono</option><option value="sepia(.4) saturate(1.1)">Warm film</option><option value="hue-rotate(35deg) saturate(1.3)">Neon shift</option></select></div>
                <div className="space-y-2"><Label>Music overlay</Label><Input placeholder="Track title or audio URL" value={formData.attachedMusic} onChange={e => setFormData({ ...formData, attachedMusic: e.target.value })} /></div>
              </div>
            )}

            {/* Caption with emoji picker */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="caption">Caption</Label>
                <EmojiPicker onEmojiSelect={handleEmojiSelect} />
              </div>
              <Textarea
                ref={captionRef}
                id="caption"
                placeholder="Write a caption... Use @username to tag and #hashtags"
                className="min-h-[100px] bg-muted/50 border-none resize-none"
                value={formData.caption}
                onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
              />
              {captionSuggestions.length > 0 && <div className="overflow-hidden rounded-xl border border-border bg-card shadow-lg">{captionSuggestions.map(item => <button key={item.value} type="button" onClick={() => applyCaptionSuggestion(item.value)} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted"><strong>{item.label}</strong><span className="text-xs text-muted-foreground">{item.detail}</span></button>)}</div>}
              <p className="text-xs text-muted-foreground">
                Tip: Use @username to tag users and #hashtags to increase visibility
              </p>
            </div>

            {uploadType !== 'story' && (
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
                <div>
                  <p className="font-medium text-sm">Also add to Story</p>
                  <p className="text-xs text-muted-foreground">Share for 24 hours</p>
                </div>
                <Switch checked={formData.addToStory} onCheckedChange={(checked) => { if (checked && formData.file?.type.startsWith('video/') && mediaDuration < 5) { toast.error('Story video clips must be at least 5 seconds long.'); return; } setFormData({ ...formData, addToStory: checked }); }} />
              </div>
            )}
          </motion.div>
        )}
      </div>

      <ImageEditorModal
        isOpen={showImageEditor}
        baseImageUrl={editingImageType === 'cover' ? formData.coverPreview || '' : formData.filePreview || ''}
        onClose={() => setShowImageEditor(false)}
        onSaveEdits={handleImageEditorSave}
        title={editingImageType === 'cover' ? 'Edit Cover Art' : 'Edit Image'}
      />
    </div>
  );
}
