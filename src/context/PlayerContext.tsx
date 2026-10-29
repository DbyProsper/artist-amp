import React, { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Track } from '@/types';
import { useAuth } from '@/context/FirebaseAuthContext';
import { buildPersonalizedQueue, shuffleUpcoming, type ListeningHistoryEntry } from '@/services/recommendationEngine';
import { loadListeningHistory, loadMusicCatalog, recordListeningInteraction, syncLikedTrack } from '@/services/musicCatalogService';
import { doc, getDoc, increment, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface PlayerContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  queue: Track[];
  catalog: Track[];
  listeningHistory: ListeningHistoryEntry[];
  preferredGenres: string[];
  catalogLoading: boolean;
  playbackError: string | null;
  isExpanded: boolean;
  isMiniPlayerVisible: boolean;
  progress: number;
  currentTime: number;
  duration: number;
  volume: number;
  isShuffled: boolean;
  repeatMode: 'off' | 'all' | 'one';
  showLyrics: boolean;
  playTrack: (track: Track, queueSource?: Track[]) => void;
  pauseTrack: () => void;
  resumeTrack: () => void;
  nextTrack: () => void;
  previousTrack: () => void;
  setExpanded: (expanded: boolean) => void;
  setProgress: (progress: number) => void;
  setVolume: (volume: number) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  toggleLyrics: () => void;
  addToQueue: (track: Track) => void;
  setQueue: (tracks: Track[]) => void;
  startRadio: (track?: Track) => void;
  likeTrack: (track: Track, liked: boolean) => void;
  setSleepTimer: (minutes: number | null) => void;
  closeMiniPlayer: () => void;
  openMiniPlayer: () => void;
  openInMainPlayer: (track: Track, queueSource?: Track[]) => void;
  refreshCatalog: () => Promise<void>;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [queue, setQueueState] = useState<Track[]>([]);
  const [catalog, setCatalog] = useState<Track[]>([]);
  const [listeningHistory, setListeningHistory] = useState<ListeningHistoryEntry[]>([]);
  const [preferredGenres, setPreferredGenres] = useState<string[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMiniPlayerVisible, setIsMiniPlayerVisible] = useState(true);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const [showLyrics, setShowLyrics] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentTrackRef = useRef<Track | null>(null);
  const queueRef = useRef<Track[]>([]);
  const catalogRef = useRef<Track[]>([]);
  const historyRef = useRef<ListeningHistoryEntry[]>([]);
  const repeatRef = useRef(repeatMode);
  const userIdRef = useRef<string | null>(null);
  const sleepTimerRef = useRef<number | null>(null);
  const previousUserIdRef = useRef<string | null>(user?.uid ?? null);

  useEffect(() => { currentTrackRef.current = currentTrack; }, [currentTrack]);
  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { catalogRef.current = catalog; }, [catalog]);
  useEffect(() => { historyRef.current = listeningHistory; }, [listeningHistory]);
  useEffect(() => { repeatRef.current = repeatMode; }, [repeatMode]);
  useEffect(() => { userIdRef.current = user?.uid ?? null; }, [user?.uid]);

  useEffect(() => {
    const previous = previousUserIdRef.current;
    if (previous && !user?.uid) {
      const audio = audioRef.current;
      if (audio) { audio.pause(); audio.removeAttribute('src'); audio.load(); }
      currentTrackRef.current = null; queueRef.current = [];
      setCurrentTrack(null); setQueueState([]); setIsPlaying(false); setIsExpanded(false); setIsMiniPlayerVisible(false);
      setProgress(0); setCurrentTime(0); setDuration(0); setPlaybackError(null); setShowLyrics(false);
    }
    previousUserIdRef.current = user?.uid ?? null;
  }, [user?.uid]);

  const setQueue = useCallback((tracks: Track[]) => {
    const playable = tracks.filter((track, index, items) => Boolean(track.audioUrl) && items.findIndex(item => item.id === track.id) === index);
    queueRef.current = playable;
    setQueueState(playable);
  }, []);

  const refreshCatalog = useCallback(async () => {
    setCatalogLoading(true);
    try {
      const userId = user?.uid;
      const [nextCatalog, nextHistory, preferences, profileSnapshot] = await Promise.all([
        loadMusicCatalog(userId),
        userId ? loadListeningHistory(userId) : Promise.resolve([]),
        userId ? getDoc(doc(db, 'user_preferences', userId)).catch(() => null) : Promise.resolve(null),
        userId ? getDoc(doc(db, 'profiles', userId)).catch(() => null) : Promise.resolve(null),
      ]);
      const preferred = preferences?.exists() && Array.isArray(preferences.data().favorite_genres)
        ? preferences.data().favorite_genres.map(String)
        : profileSnapshot?.exists() && Array.isArray(profileSnapshot.data().genres) ? profileSnapshot.data().genres.map(String) : [];
      catalogRef.current = nextCatalog;
      historyRef.current = nextHistory;
      setCatalog(nextCatalog);
      setListeningHistory(nextHistory);
      setPreferredGenres(preferred);
    } finally {
      setCatalogLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    void refreshCatalog();
  }, [refreshCatalog, setQueue, user?.uid]);

  const updateHistory = useCallback((track: Track, event: 'play' | 'complete' | 'skip' | 'like' | 'unlike', position = 0) => {
    const userId = userIdRef.current;
    if (!userId) return;
    const next = recordListeningInteraction(userId, track, event, position);
    historyRef.current = next;
    setListeningHistory(next);
  }, []);

  const chooseQueue = useCallback((track: Track, queueSource?: Track[]) => {
    const candidates = [...(queueSource ?? []), ...catalogRef.current, ...queueRef.current];
    return buildPersonalizedQueue(track, candidates, historyRef.current, 100, preferredGenres);
  }, [preferredGenres]);

  const selectTrack = useCallback((track: Track, nextQueue?: Track[], countPlay = true) => {
    if (!track.audioUrl) {
      setPlaybackError('This track does not have playable audio.');
      return;
    }
    if (nextQueue?.length) setQueue(nextQueue);
    setPlaybackError(null);
    currentTrackRef.current = track;
    setCurrentTrack(track);
    setProgress(0);
    setCurrentTime(0);
    setDuration(track.duration || 0);
    setIsMiniPlayerVisible(true);
    setIsPlaying(true);
    // Start from the original tap/click call stack. Mobile browsers can reject
    // playback when it is deferred until a later React effect.
    const audio = audioRef.current ?? new Audio();
    audioRef.current = audio;
    if (audio.src !== track.audioUrl) {
      audio.src = track.audioUrl;
      audio.load();
    }
    void audio.play().catch(() => {
      setIsPlaying(false);
      setPlaybackError('Tap play to start this track.');
    });
    if (countPlay) {
      updateHistory(track, 'play');
      const isGeneratedSong = track.id.startsWith('song-');
      const collectionName = isGeneratedSong ? 'songs' : 'tracks';
      const documentId = isGeneratedSong ? track.id.slice('song-'.length) : track.id;
      void updateDoc(doc(db, collectionName, documentId), { plays: increment(1) }).catch(() => undefined);
      setCatalog(current => current.map(item => item.id === track.id ? { ...item, plays: item.plays + 1 } : item));
    }
  }, [setQueue, updateHistory]);

  const playTrack = useCallback((track: Track, queueSource?: Track[]) => {
    selectTrack(track, chooseQueue(track, queueSource));
  }, [chooseQueue, selectTrack]);

  const advance = useCallback((reason: 'ended' | 'skip') => {
    const active = currentTrackRef.current;
    if (!active) return;
    const audio = audioRef.current;
    if (reason === 'skip' && audio && audio.duration > 0 && audio.currentTime / audio.duration < 0.7) updateHistory(active, 'skip', audio.currentTime);
    if (reason === 'ended') updateHistory(active, 'complete', audio?.duration || 0);
    const activeQueue = queueRef.current;
    const index = activeQueue.findIndex(track => track.id === active.id);
    if (index >= 0 && index + 1 < activeQueue.length) {
      selectTrack(activeQueue[index + 1], undefined, true);
      return;
    }
    if (repeatRef.current === 'all' && activeQueue.length) {
      selectTrack(activeQueue[0], undefined, true);
      return;
    }
    setIsPlaying(false);
  }, [selectTrack, updateHistory]);

  useEffect(() => {
    if (!audioRef.current) audioRef.current = new Audio();
    const audio = audioRef.current;
    audio.preload = 'metadata';
    audio.volume = volume / 100;
    audio.onloadedmetadata = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : currentTrack?.duration || 0);
    audio.ontimeupdate = () => {
      const time = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
      setCurrentTime(time);
      if (Number.isFinite(audio.duration) && audio.duration > 0) setProgress((time / audio.duration) * 100);
    };
    audio.onended = () => {
      if (repeatRef.current === 'one') {
        audio.currentTime = 0;
        void audio.play();
      } else advance('ended');
    };
    audio.onerror = () => {
      setPlaybackError('This audio could not be loaded. Choose another recommended track.');
      setIsPlaying(false);
    };
    return () => {
      audio.onloadedmetadata = null;
      audio.ontimeupdate = null;
      audio.onended = null;
      audio.onerror = null;
    };
  }, [advance, currentTrack?.duration, volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack?.audioUrl) return;
    if (audio.src !== currentTrack.audioUrl) {
      audio.src = currentTrack.audioUrl;
      audio.load();
    }
    if (isPlaying) {
      void audio.play().catch(() => {
        setIsPlaying(false);
        setPlaybackError('Playback was blocked or the audio file is unavailable. Tap play to try again.');
      });
    } else audio.pause();
  }, [currentTrack?.audioUrl, isPlaying]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume / 100;
  }, [volume]);

  const pauseTrack = useCallback(() => setIsPlaying(false), []);
  const resumeTrack = useCallback(() => {
    if (!currentTrackRef.current?.audioUrl) return;
    setPlaybackError(null);
    setIsPlaying(true);
  }, []);
  const nextTrack = useCallback(() => advance('skip'), [advance]);

  const previousTrack = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      setProgress(0);
      setCurrentTime(0);
      return;
    }
    const active = currentTrackRef.current;
    const activeQueue = queueRef.current;
    if (!active || !activeQueue.length) return;
    const index = activeQueue.findIndex(track => track.id === active.id);
    if (index > 0) selectTrack(activeQueue[index - 1], undefined);
    else if (audio) audio.currentTime = 0;
  }, [selectTrack]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    if (!currentTrack) {
      navigator.mediaSession.metadata = null;
      return;
    }
    const artwork = currentTrack.coverArt
      ? new URL(currentTrack.coverArt, window.location.origin).toString()
      : new URL('/musicinsta-default-cover.webp', window.location.origin).toString();
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.artist.name,
      album: currentTrack.genre || 'MusicInsta',
      artwork: [{ src: artwork }],
    });
  }, [currentTrack]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.setActionHandler('play', resumeTrack);
    navigator.mediaSession.setActionHandler('pause', pauseTrack);
    navigator.mediaSession.setActionHandler('nexttrack', nextTrack);
    navigator.mediaSession.setActionHandler('previoustrack', previousTrack);
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    return () => {
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('nexttrack', null);
      navigator.mediaSession.setActionHandler('previoustrack', null);
    };
  }, [isPlaying, nextTrack, pauseTrack, previousTrack, resumeTrack]);

  const handleSetProgress = useCallback((nextProgress: number) => {
    const safeProgress = Math.max(0, Math.min(100, nextProgress));
    setProgress(safeProgress);
    const audio = audioRef.current;
    if (audio && Number.isFinite(audio.duration) && audio.duration > 0) {
      audio.currentTime = (safeProgress / 100) * audio.duration;
      setCurrentTime(audio.currentTime);
    }
  }, []);

  const toggleShuffle = useCallback(() => {
    setIsShuffled(current => {
      const active = currentTrackRef.current;
      if (!active) return !current;
      if (!current) setQueue(shuffleUpcoming(queueRef.current, active.id));
      else setQueue(buildPersonalizedQueue(active, catalogRef.current, historyRef.current));
      return !current;
    });
  }, [setQueue]);

  const toggleRepeat = useCallback(() => {
    const modes: Array<'off' | 'all' | 'one'> = ['off', 'all', 'one'];
    setRepeatMode(current => modes[(modes.indexOf(current) + 1) % modes.length]);
  }, []);

  const addToQueue = useCallback((track: Track) => {
    if (!track.audioUrl) return;
    setQueue([...queueRef.current.filter(item => item.id !== track.id), track]);
  }, [setQueue]);

  const startRadio = useCallback((track = currentTrackRef.current ?? undefined) => {
    if (!track) return;
    selectTrack(track, buildPersonalizedQueue(track, catalogRef.current, historyRef.current));
  }, [selectTrack]);

  const likeTrack = useCallback((track: Track, liked: boolean) => {
    const wasLiked = Boolean(historyRef.current.find(entry => entry.trackId === track.id)?.liked);
    if (wasLiked === liked) {
      if (user?.uid) void syncLikedTrack(user.uid, profile?.id || user.uid, track, liked).catch(() => undefined);
      return;
    }
    updateHistory(track, liked ? 'like' : 'unlike');
    setCatalog(current => current.map(item => item.id === track.id ? { ...item, likes: Math.max(0, item.likes + (liked ? 1 : -1)) } : item));
    if (user?.uid) void syncLikedTrack(user.uid, profile?.id || user.uid, track, liked).catch(() => undefined);
  }, [profile?.id, updateHistory, user?.uid]);

  const setSleepTimer = useCallback((minutes: number | null) => {
    if (sleepTimerRef.current) window.clearTimeout(sleepTimerRef.current);
    sleepTimerRef.current = minutes ? window.setTimeout(() => setIsPlaying(false), minutes * 60_000) : null;
  }, []);

  const openInMainPlayer = useCallback((track: Track, queueSource?: Track[]) => {
    playTrack(track, queueSource);
    setIsExpanded(true);
  }, [playTrack]);

  useEffect(() => () => {
    if (sleepTimerRef.current) window.clearTimeout(sleepTimerRef.current);
    audioRef.current?.pause();
  }, []);

  return (
    <PlayerContext.Provider value={{
      currentTrack, isPlaying, queue, catalog, listeningHistory, preferredGenres, catalogLoading, playbackError,
      isExpanded, isMiniPlayerVisible, progress, currentTime, duration, volume, isShuffled, repeatMode, showLyrics,
      playTrack, pauseTrack, resumeTrack, nextTrack, previousTrack, setExpanded: setIsExpanded,
      setProgress: handleSetProgress, setVolume, toggleShuffle, toggleRepeat,
      toggleLyrics: () => setShowLyrics(current => !current), addToQueue, setQueue, startRadio, likeTrack, setSleepTimer,
      closeMiniPlayer: () => setIsMiniPlayerVisible(false), openMiniPlayer: () => setIsMiniPlayerVisible(true),
      openInMainPlayer, refreshCatalog,
    }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) throw new Error('usePlayer must be used within a PlayerProvider');
  return context;
}
