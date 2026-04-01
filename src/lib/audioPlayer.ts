// Audio player utility for managing audio playback
export type AudioPlayerState = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

export interface AudioPlayer {
  element: HTMLAudioElement | null;
  play: () => Promise<void>;
  pause: () => void;
  stop: () => void;
  setLoop: (loop: boolean) => void;
  setVolume: (volume: number) => void;
  dispose: () => void;
}

let currentAudioPlayer: AudioPlayer | null = null;

export function createAudioPlayer(audioUrl: string): AudioPlayer {
  // Stop and dispose of any existing player
  if (currentAudioPlayer) {
    currentAudioPlayer.dispose();
  }

  const audio = new Audio();
  audio.crossOrigin = 'anonymous';
  audio.src = audioUrl;

  const player: AudioPlayer = {
    element: audio,

    async play() {
      try {
        await audio.play();
        console.log('[AudioPlayer] Playing:', audioUrl);
      } catch (err) {
        console.error('[AudioPlayer] Play failed:', err);
        throw new Error('Failed to play audio');
      }
    },

    pause() {
      audio.pause();
      console.log('[AudioPlayer] Paused');
    },

    stop() {
      audio.pause();
      audio.currentTime = 0;
      console.log('[AudioPlayer] Stopped');
    },

    setLoop(loop: boolean) {
      audio.loop = loop;
    },

    setVolume(volume: number) {
      audio.volume = Math.max(0, Math.min(1, volume));
    },

    dispose() {
      audio.pause();
      audio.src = '';
      player.element = null;
      console.log('[AudioPlayer] Disposed');
    },
  };

  currentAudioPlayer = player;
  return player;
}

export function getCurrentAudioPlayer(): AudioPlayer | null {
  return currentAudioPlayer;
}

export function disposeCurrentAudioPlayer(): void {
  if (currentAudioPlayer) {
    currentAudioPlayer.dispose();
    currentAudioPlayer = null;
  }
}
