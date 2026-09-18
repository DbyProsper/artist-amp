import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { motion } from 'framer-motion';
import { 
  Heart, MessageCircle, Share2, Bookmark, 
  Play, Pause, MoreHorizontal, BadgeCheck, ListPlus, X
} from 'lucide-react';
import { Post } from '@/types';
import { usePlayer } from '@/context/PlayerContext';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { PostOptionsModal } from '@/components/modals/PostOptionsModal';
import { toast } from 'sonner';
import { addDoc, arrayUnion, collection, deleteDoc, doc, getDoc, getDocs, increment, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/FirebaseAuthContext';
import { PostCommentsModal } from '@/components/feed/PostCommentsModal';

interface FeedPostProps {
  post: Post;
}

function formatCount(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export function FeedPost({ post }: FeedPostProps) {
  const [isLiked, setIsLiked] = useState(post.isLiked);
  const [isSaved, setIsSaved] = useState(post.isSaved);
  const [likes, setLikes] = useState(post.likes);
  const [showOptions, setShowOptions] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(post.comments);
  const [showLikeBurst, setShowLikeBurst] = useState(false);
  const [showPlaylistPicker, setShowPlaylistPicker] = useState(false);
  const [playlists, setPlaylists] = useState<Array<{ id: string; name: string }>>([]);
  const [videoSpeed, setVideoSpeed] = useState(1);
  const [playCount, setPlayCount] = useState(post.track?.plays || 0);
  const [showNewBadge, setShowNewBadge] = useState(() => Boolean((post.isNewPost || post.isNewRelease) && !sessionStorage.getItem(`musicinsta_seen_post_${post.id}`)));
  const lastTapRef = useRef(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playCountedRef = useRef(false);
  const { currentTrack, isPlaying, playTrack, pauseTrack, resumeTrack } = usePlayer();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const isCurrentTrack = post.track && currentTrack?.id === post.track.id;

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getDoc(doc(db, 'post_likes', `${post.id}_${user.uid}`)),
      getDoc(doc(db, 'saved_posts', `${user.uid}_${post.id}`)),
    ]).then(([like, save]) => {
      setIsLiked(like.exists());
      setIsSaved(save.exists());
    }).catch(() => undefined);
  }, [post.id, user]);

  useEffect(() => () => {
    if (showNewBadge) sessionStorage.setItem(`musicinsta_seen_post_${post.id}`, '1');
  }, [post.id, showNewBadge]);

  useEffect(() => {
    if (post.type !== 'video' || !post.videoUrl || !videoRef.current || typeof IntersectionObserver === 'undefined') return;
    const video = videoRef.current;
    let isFocused = false;
    const playFocusedVideo = () => {
      if (!isFocused || document.visibilityState !== 'visible') return;
      window.dispatchEvent(new CustomEvent('musicinsta:feed-video-focus', { detail: post.id }));
      void video.play().catch(() => undefined);
    };
    const pauseForAnotherVideo = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== post.id) video.pause();
    };
    const visibilityChanged = () => document.visibilityState === 'visible' ? playFocusedVideo() : video.pause();
    const observer = new IntersectionObserver(([entry]) => {
      isFocused = entry.isIntersecting && entry.intersectionRatio >= .65;
      if (isFocused) playFocusedVideo();
      else video.pause();
    }, { threshold: [0, .35, .65, .85, 1], rootMargin: '-10% 0px -10% 0px' });
    observer.observe(video);
    window.addEventListener('musicinsta:feed-video-focus', pauseForAnotherVideo);
    document.addEventListener('visibilitychange', visibilityChanged);
    return () => {
      observer.disconnect(); video.pause();
      window.removeEventListener('musicinsta:feed-video-focus', pauseForAnotherVideo);
      document.removeEventListener('visibilitychange', visibilityChanged);
    };
  }, [post.id, post.type, post.videoUrl]);

  const openPlaylistPicker = async () => {
    if (!user || !profile || !post.track) { toast.error(post.track ? 'Sign in to add tracks to a playlist.' : 'Only music posts can be added to playlists.'); return; }
    const snapshot = await getDocs(query(collection(db, 'playlists'), where('creator_id', '==', profile.id)));
    setPlaylists(snapshot.docs.map(item => ({ id: item.id, name: item.data().name || 'Untitled playlist' })));
    setShowPlaylistPicker(true);
  };

  const addToPlaylist = async (playlistId: string) => {
    if (!post.track) return;
    await updateDoc(doc(db, 'playlists', playlistId), { tracks: arrayUnion(post.track.id), updated_at: serverTimestamp() });
    await addDoc(collection(db, 'playlist_tracks'), { playlist_id: playlistId, track_id: post.track.id, added_at: serverTimestamp() });
    setShowPlaylistPicker(false); toast.success('Added to playlist.');
  };

  const handleLike = async (forceLike = false) => {
    if (!user) { toast.error('Sign in to like posts.'); return; }
    const nextLiked = forceLike || !isLiked;
    if (nextLiked === isLiked) return;
    setIsLiked(nextLiked);
    setLikes(current => Math.max(0, current + (nextLiked ? 1 : -1)));
    const likeRef = doc(db, 'post_likes', `${post.id}_${user.uid}`);
    try {
      if (nextLiked) {
        await setDoc(likeRef, { post_id: post.id, user_id: user.uid, created_at: serverTimestamp() });
        if (post.artist.id !== user.uid) await addDoc(collection(db, 'notifications'), {
          profile_id: post.artist.id, from_profile_id: user.uid, post_id: post.id,
          type: 'like', message: 'liked your post', read: false, created_at: serverTimestamp(),
        });
      } else await deleteDoc(likeRef);
      await updateDoc(doc(db, 'posts', post.id), { likes: increment(nextLiked ? 1 : -1) }).catch(() => undefined);
    } catch {
      setIsLiked(!nextLiked);
      setLikes(current => Math.max(0, current + (nextLiked ? -1 : 1)));
      toast.error('Your like could not be saved.');
    }
  };

  const likeFromMedia = () => {
    setShowLikeBurst(true);
    window.setTimeout(() => setShowLikeBurst(false), 700);
    void handleLike(true);
  };

  const handleMediaPointerUp = (event: PointerEvent) => {
    if (event.pointerType === 'mouse') return;
    const now = Date.now();
    if (now - lastTapRef.current < 320) likeFromMedia();
    lastTapRef.current = now;
  };

  const handlePlay = () => {
    if (!post.track) return;
    if (!playCountedRef.current) {
      playCountedRef.current = true; setPlayCount(current => current + 1);
      void updateDoc(doc(db, 'tracks', post.track.id), { plays: increment(1) }).catch(() => undefined);
    }
    if (isCurrentTrack) {
      if (isPlaying) pauseTrack();
      else resumeTrack();
    } else {
      playTrack(post.track);
    }
  };

  const handleProfileClick = () => {
    navigate(`/user/${post.artist.id}`);
  };

  const handleShare = async () => {
    const shareData = { title: post.track?.title || `${post.artist.name} on MusicInsta`, text: post.caption || `Listen to ${post.artist.name} on MusicInsta`, url: `${window.location.origin}/?post=${post.id}` };
    try {
      if (navigator.share) await navigator.share(shareData);
      else { await navigator.clipboard.writeText(shareData.url); toast.success('Link copied. Paste it into WhatsApp, Instagram, Facebook, X, or any messaging app.'); }
    } catch (error) { if ((error as DOMException)?.name !== 'AbortError') toast.error('This post could not be shared.'); }
  };

  const handleSave = async () => {
    if (!user) { toast.error('Sign in to save posts.'); return; }
    const nextSaved = !isSaved;
    setIsSaved(nextSaved);
    const savedRef = doc(db, 'saved_posts', `${user.uid}_${post.id}`);
    try {
      if (nextSaved) {
        const snapshot = JSON.parse(JSON.stringify({ ...post, createdAt: post.createdAt.toISOString(), isSaved: true }));
        await setDoc(savedRef, { user_id: user.uid, post_id: post.id, post_snapshot: snapshot, created_at: serverTimestamp() });
        if (post.track && post.artist.id !== user.uid) await addDoc(collection(db, 'notifications'), { profile_id: post.artist.id, from_profile_id: profile?.id || user.uid, post_id: post.id, track_id: post.track.id, type: 'music', message: `saved “${post.track.title}” to their favorites`, read: false, created_at: serverTimestamp() });
      } else await deleteDoc(savedRef);
      toast.success(nextSaved ? 'Saved to your profile collection.' : 'Removed from saved.');
    } catch {
      setIsSaved(!nextSaved);
      toast.error('The saved collection could not be updated.');
    }
  };

  const handleComment = () => {
    setShowComments(true);
  };

  // Determine the display image for the post
  const getPostImage = () => {
    if (post.type === 'image' && post.imageUrl) return post.imageUrl;
    if (post.type === 'video' && post.videoUrl) return post.videoUrl;
    if (post.type === 'audio' && post.track?.coverArt) return post.track.coverArt;
    // Fallback for image posts without imageUrl
    if (post.imageUrl) return post.imageUrl;
    if (post.track?.coverArt) return post.track.coverArt;
    // Use placeholder for posts without images
    return '/placeholder.svg';
  };

  const postImage = getPostImage();

  return (
    <>
      <motion.article
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[630px] mx-auto border-x border-b border-border bg-background"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4">
          <button
            onClick={handleProfileClick}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <div className="w-10 h-10 rounded-full overflow-hidden gradient-border">
              <img
                src={post.artist.avatar}
                alt={post.artist.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="font-semibold text-sm">{post.artist.name}</span>
                {post.artist.isVerified && (
                  <BadgeCheck className="w-4 h-4 text-primary" fill="currentColor" />
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(post.createdAt, { addSuffix: true })}
              </span>
              {showNewBadge && <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">{post.type === 'audio' ? 'New music' : 'New post'}</span>}
            </div>
          </button>
          <button
            onClick={() => setShowOptions(true)}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>

        {/* Content - show image for ALL post types */}
        {postImage && (
          <div
            className={cn('relative overflow-hidden bg-black group', post.type === 'image' ? '' : 'aspect-[4/5] sm:aspect-square')}
            onDoubleClick={post.type === 'video' ? undefined : likeFromMedia}
            onPointerUp={post.type === 'video' ? undefined : handleMediaPointerUp}
          >
            {post.type === 'video' && post.videoUrl ? (
              <><video ref={videoRef} src={post.videoUrl} poster={post.imageUrl} style={{ filter: post.visualFilter }} muted controls loop playsInline preload="metadata" onPlay={() => { if (playCountedRef.current) return; playCountedRef.current = true; void updateDoc(doc(db, 'posts', post.id), { plays: increment(1) }).catch(() => undefined); }} className="h-full w-full object-contain" /><label className="absolute right-3 top-3 z-30 rounded-lg bg-black/70 px-2 py-1 text-xs text-white">Speed <select value={videoSpeed} onChange={event => { const speed = Number(event.target.value); setVideoSpeed(speed); if (videoRef.current) videoRef.current.playbackRate = speed; }} className="bg-transparent"><option value={0.5}>0.5×</option><option value={1}>1×</option><option value={1.5}>1.5×</option><option value={2}>2×</option></select></label></>
            ) : (
              <img src={postImage} alt={post.track?.title || post.caption || 'Post'} style={{ filter: post.visualFilter }} className={cn('w-full object-contain', post.type === 'image' ? 'h-auto max-h-[82vh]' : 'h-full')} />
            )}
            
            {/* Overlay */}
            {post.type !== 'video' && <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />}
            
            {/* Play button for audio posts */}
            {post.type === 'audio' && post.track && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handlePlay}
                className={cn(
                  "absolute inset-0 flex items-center justify-center",
                  "opacity-0 group-hover:opacity-100 transition-opacity"
                )}
              >
                <div className={cn(
                  "w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center",
                  isCurrentTrack && isPlaying && "animate-pulse"
                )}>
                  {isCurrentTrack && isPlaying ? (
                    <Pause className="w-7 h-7 text-primary-foreground" fill="currentColor" />
                  ) : (
                    <Play className="w-7 h-7 text-primary-foreground ml-1" fill="currentColor" />
                  )}
                </div>
              </motion.button>
            )}
            
            {/* Track info overlay */}
            {post.track && (
              <div className={cn('pointer-events-none absolute left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4', post.type === 'video' ? 'bottom-10' : 'bottom-0')}>
                <p className="font-bold text-white">{post.track.title}</p>
                <p className="text-sm text-white/70">{formatCount(playCount)} plays</p>
              </div>
            )}
            
            {/* Currently playing indicator */}
            {isCurrentTrack && isPlaying && (
              <div className="absolute top-4 right-4">
                <div className="flex gap-1">
                  {[...Array(3)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="w-1 bg-primary rounded-full"
                      animate={{ height: [8, 16, 8] }}
                      transition={{
                        repeat: Infinity,
                        duration: 0.5,
                        delay: i * 0.1,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
            {showLikeBurst && <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1.2, opacity: 1 }} exit={{ opacity: 0 }} className="pointer-events-none absolute inset-0 z-20 grid place-items-center"><Heart className="h-24 w-24 fill-white text-white drop-shadow-2xl" /></motion.div>}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <motion.button
              whileTap={{ scale: 0.8 }}
              onClick={() => void handleLike()}
              className="flex items-center gap-1"
            >
              <Heart
                className={cn(
                  "w-6 h-6 transition-colors",
                  isLiked ? "text-red-500 fill-red-500" : "text-foreground"
                )}
              />
            </motion.button>
            <button onClick={handleComment} className="flex items-center gap-1">
              <MessageCircle className="w-6 h-6" />
            </button>
            <button onClick={handleShare} className="flex items-center gap-1">
              <Share2 className="w-6 h-6" />
            </button>
            {post.track && <button title="Add to playlist" onClick={() => void openPlaylistPicker()} className="flex items-center gap-1"><ListPlus className="h-6 w-6" /></button>}
          </div>
          <motion.button
            whileTap={{ scale: 0.8 }}
            onClick={handleSave}
          >
            <Bookmark
              className={cn(
                "w-6 h-6 transition-colors",
                isSaved ? "text-primary fill-primary" : "text-foreground"
              )}
            />
          </motion.button>
        </div>

        {/* Likes & Caption */}
        <div className="px-4 pb-4 space-y-2">
          <p className="font-semibold text-sm">{formatCount(likes)} likes</p>
          <p className="text-sm">
            <button
              onClick={handleProfileClick}
              className="font-semibold hover:underline"
            >
              {post.artist.username}
            </button>{' '}
            <span className="text-muted-foreground">{post.caption}</span>
          </p>
          {post.credits && (
            <details className="rounded-lg bg-muted/40 px-3 py-2 text-xs">
              <summary className="cursor-pointer font-semibold">Credits</summary>
              <div className="mt-2 space-y-1 text-muted-foreground">
                {post.credits.primaryArtist && <p>Artist: {post.credits.primaryArtist}</p>}
                {post.credits.featuredArtists?.length ? <p>Featuring: {post.credits.featuredArtists.join(', ')}</p> : null}
                {post.credits.writers?.length ? <p>Written by: {post.credits.writers.join(', ')}</p> : null}
                {post.credits.composers?.length ? <p>Composed by: {post.credits.composers.join(', ')}</p> : null}
                {post.credits.producers?.length ? <p>Produced by: {post.credits.producers.join(', ')}</p> : null}
              </div>
            </details>
          )}
          {post.attachedMusic && <p className="flex items-center gap-2 text-xs text-muted-foreground">♫ {post.attachedMusic}</p>}
          {post.comments > 0 && (
            <button
              onClick={handleComment}
              className="text-sm text-muted-foreground"
            >
              View all {formatCount(commentCount)} comments
            </button>
          )}
        </div>
      </motion.article>

      <PostOptionsModal
        isOpen={showOptions}
        onClose={() => setShowOptions(false)}
        postId={post.id}
        isOwner={Boolean(user && (post.artist.id === user.uid || post.artist.id === profile?.id))}
      />
      <PostCommentsModal postId={post.id} ownerId={post.artist.id} open={showComments} onClose={() => setShowComments(false)} onAdded={() => {
        setCommentCount(count => count + 1);
        updateDoc(doc(db, 'posts', post.id), { comments: increment(1) }).catch(() => undefined);
      }} />
      {showPlaylistPicker && <div className="fixed inset-0 z-[110] grid place-items-center bg-black/70 p-4" onClick={() => setShowPlaylistPicker(false)}><div className="w-full max-w-sm rounded-2xl border border-border bg-card p-4" onClick={event => event.stopPropagation()}><div className="mb-3 flex items-center justify-between"><h3 className="font-bold">Add to playlist</h3><button onClick={() => setShowPlaylistPicker(false)}><X className="h-4 w-4" /></button></div><div className="space-y-2">{playlists.map(playlist => <button key={playlist.id} onClick={() => void addToPlaylist(playlist.id)} className="w-full rounded-xl bg-muted p-3 text-left text-sm font-medium hover:bg-muted/70">{playlist.name}</button>)}{!playlists.length && <button onClick={() => navigate('/library')} className="w-full rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">Create a playlist in your library first</button>}</div></div></div>}
    </>
  );
}
