import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Share2, Plus, Flag, ExternalLink, Radio, ListMusic, Heart, BadgeCheck, Clock } from 'lucide-react';
import { Track } from '@/types';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/FirebaseAuthContext';
import { addDoc, arrayUnion, collection, doc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { usePlayer } from '@/context/PlayerContext';
import { storeDawAudio } from '@/lib/dawTransfer';

interface PlayerSettingsModalProps {
  track: Track;
  isOpen: boolean;
  onClose: () => void;
}

export function PlayerSettingsModal({ track, isOpen, onClose }: PlayerSettingsModalProps) {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { addToQueue, startRadio, likeTrack, setSleepTimer } = usePlayer();
  const [playlists, setPlaylists] = useState<Array<{ id: string; name: string }>>([]);
  const [showPlaylists, setShowPlaylists] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);

  const openPlaylistPicker = async () => {
    if (!user) { toast.error('Sign in to add to a playlist'); navigate('/auth'); return; }
    const ownerId = profile?.id || user.uid;
    const snapshot = await getDocs(query(collection(db, 'playlists'), where('creator_id', '==', ownerId)));
    setPlaylists(snapshot.docs.map(item => ({ id: item.id, name: String(item.data().name || 'Untitled playlist') })));
    setShowPlaylists(true);
  };

  const addToPlaylist = async (playlistId?: string) => {
    if (!user) return;
    if (playlistId) await updateDoc(doc(db, 'playlists', playlistId), { tracks: arrayUnion(track.id), updated_at: serverTimestamp() });
    else await addDoc(collection(db, 'playlists'), { creator_id: profile?.id || user.uid, name: 'My Music', description: 'Tracks saved from the MusicInsta player', tracks: [track.id], is_public: false, created_at: serverTimestamp(), updated_at: serverTimestamp() });
    toast.success('Added to playlist');
    setShowPlaylists(false);
    onClose();
  };

  const openInDaw = async () => {
    const ownerId = profile?.id || user?.uid;
    if (!user || !ownerId || track.artist.id !== ownerId) { toast.error('Only the owner of this audio can export it to the DAW.'); return; }
    if (!track.audioUrl) { toast.error('This track has no audio to send to the DAW'); return; }
    setIsTransferring(true);
    try {
      const response = await fetch(track.audioUrl);
      if (!response.ok) throw new Error('The audio file could not be downloaded');
      const blob = await response.blob();
      const key = await storeDawAudio(blob, `${track.title.replace(/[\\/:*?"<>|]/g, '-')}.${blob.type.includes('mpeg') ? 'mp3' : 'wav'}`);
      onClose();
      navigate(`/studio/daw?importEnhanced=${encodeURIComponent(key)}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The track could not be sent to the DAW');
    } finally {
      setIsTransferring(false);
    }
  };

  const options = [
    {
      icon: Heart,
      label: 'Like',
      action: () => {
        if (!user) {
          toast.error('Sign in to like tracks');
          navigate('/auth');
          return;
        }
        likeTrack(track, true);
        toast.success('Added to liked music');
        onClose();
      }
    },
    {
      icon: Plus,
      label: 'Add to playlist',
      action: () => void openPlaylistPicker()
    },
    {
      icon: ListMusic,
      label: 'Add to queue',
      action: () => {
        addToQueue(track);
        toast.success('Added to queue');
        onClose();
      }
    },
    {
      icon: Radio,
      label: 'Go to radio',
      action: () => {
        startRadio(track);
        toast.success('Starting radio based on this track');
        onClose();
      }
    },
    {
      icon: Clock,
      label: 'Sleep timer',
      action: () => {
        setSleepTimer(30);
        toast.success('Playback will pause in 30 minutes');
        onClose();
      }
    },
    {
      icon: Share2,
      label: 'Share',
      action: async () => {
        try {
          await navigator.share({
            title: track.title,
            text: `Listen to ${track.title} by ${track.artist.name} on MusicInsta`,
            url: `${window.location.origin}/?track=${encodeURIComponent(track.id)}`,
          });
        } catch {
          await navigator.clipboard.writeText(`${window.location.origin}/?track=${encodeURIComponent(track.id)}`);
          toast.success('Copied to clipboard');
        }
        onClose();
      }
    },
    {
      icon: BadgeCheck,
      label: 'View artist',
      action: () => {
        navigate(`/user/${track.artist.id}`);
        onClose();
      }
    },
    ...(user && track.artist.id === (profile?.id || user.uid) ? [{
      icon: ExternalLink,
      label: isTransferring ? 'Sending to DAW...' : 'Open in DAW',
      action: () => void openInDaw()
    }] : []),
    {
      icon: Flag,
      label: 'Report',
      action: async () => {
        if (!user) { toast.error('Sign in to report this track.'); return; }
        await addDoc(collection(db, 'reports'), { type: 'track', target_id: track.id, reporter_id: user.uid, status: 'open', reason: 'Reported from player options', created_at: serverTimestamp() });
        toast.success('Thank you for reporting. Administrators have been notified.'); onClose();
      },
      danger: true
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl overflow-hidden max-h-[80vh]"
          >
            <div className="p-4 border-b border-border flex items-center gap-4">
              <img
                src={track.coverArt}
                alt={track.title}
                className="w-14 h-14 rounded-lg object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{track.title}</p>
                <p className="text-sm text-muted-foreground truncate">{track.artist.name}</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-2 max-h-[60vh] overflow-y-auto">
              {showPlaylists ? (
                <div className="space-y-1 p-2">
                  <p className="px-2 pb-2 text-sm font-semibold">Choose a playlist</p>
                  {playlists.map(item => <button key={item.id} onClick={() => void addToPlaylist(item.id)} className="w-full rounded-xl p-3 text-left hover:bg-muted">{item.name}</button>)}
                  <button onClick={() => void addToPlaylist()} className="w-full rounded-xl p-3 text-left text-primary hover:bg-muted">Create “My Music” playlist</button>
                  <button onClick={() => setShowPlaylists(false)} className="w-full rounded-xl p-3 text-left text-muted-foreground hover:bg-muted">Back</button>
                </div>
              ) : options.map((option, index) => (
                <motion.button
                  key={option.label}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={option.action}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl hover:bg-muted transition-colors ${
                    option.danger ? 'text-destructive' : ''
                  }`}
                >
                  <option.icon className="w-5 h-5" />
                  <span className="font-medium">{option.label}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
