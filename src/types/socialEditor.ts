export type SocialAspectRatio = 'original' | '1:1' | '4:5' | '9:16' | '16:9';

export interface SocialAdjustments {
  adjust: number;
  lux: number;
  brightness: number;
  contrast: number;
  structure: number;
  warmth: number;
  saturation: number;
  color: number;
  fade: number;
  highlights: number;
  shadows: number;
  vignette: number;
  tiltShift: number;
  sharpen: number;
}

export interface SocialOverlay {
  id: string;
  type: 'text' | 'sticker';
  content: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  color?: string;
}

export interface AttachedPlatformMusic {
  trackId: string;
  title: string;
  artist: string;
  audioUrl: string;
  coverArt?: string;
  duration?: number;
  clipStart?: number;
  clipEnd?: number;
}

export interface SocialEditState {
  aspectRatio: SocialAspectRatio;
  adjustments: SocialAdjustments;
  overlays: SocialOverlay[];
  drawingDataUrl?: string;
  attachedMusic?: AttachedPlatformMusic;
}

export const DEFAULT_SOCIAL_ADJUSTMENTS: SocialAdjustments = {
  adjust: 0,
  lux: 0,
  brightness: 0,
  contrast: 0,
  structure: 0,
  warmth: 0,
  saturation: 0,
  color: 0,
  fade: 0,
  highlights: 0,
  shadows: 0,
  vignette: 0,
  tiltShift: 0,
  sharpen: 0,
};

export const EMPTY_SOCIAL_EDIT_STATE: SocialEditState = {
  aspectRatio: 'original',
  adjustments: DEFAULT_SOCIAL_ADJUSTMENTS,
  overlays: [],
};

export function socialFilter(adjustments?: Partial<SocialAdjustments> | null): string {
  const values = { ...DEFAULT_SOCIAL_ADJUSTMENTS, ...(adjustments || {}) };
  const brightness = 100 + values.brightness + values.lux * 0.35 + values.shadows * 0.12;
  const contrast = 100 + values.contrast + values.structure * 0.45 + values.highlights * 0.12 + values.sharpen * 0.3;
  const saturation = 100 + values.saturation + values.adjust * 0.2 + values.sharpen * 0.08;
  const sepia = Math.max(0, values.warmth) * 0.35;
  const hue = values.color + Math.min(0, values.warmth) * 0.35;
  const opacity = 100 - Math.max(0, values.fade) * 0.25;
  return `brightness(${Math.max(20, brightness)}%) contrast(${Math.max(20, contrast)}%) saturate(${Math.max(0, saturation)}%) sepia(${sepia}%) hue-rotate(${hue}deg) opacity(${Math.max(45, opacity)}%)`;
}

export function aspectRatioValue(value: SocialAspectRatio): string | undefined {
  if (value === 'original') return undefined;
  return value.replace(':', ' / ');
}
