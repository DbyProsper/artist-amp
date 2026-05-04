/**
 * Image Editor Types
 * Defines all types for the image editor system
 */

export type OverlayType = 'text' | 'image' | 'emoji';
export type AnimationType = 'none' | 'fade-in' | 'slide-up' | 'bounce';

export interface TextStyle {
  fontSize: number;
  fontWeight: 'normal' | 'bold' | '500' | '600' | '700';
  color: string;
  opacity: number;
  fontFamily?: string;
}

export interface TextOverlay {
  type: 'text';
  id: string;
  content: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  style: TextStyle;
  animation?: AnimationType;
}

export interface ImageOverlay {
  type: 'image';
  id: string;
  content: string; // Base64 or URL
  x: number;
  y: number;
  scale: number;
  rotation: number;
  width: number;
  height: number;
}

export interface EmojiOverlay {
  type: 'emoji';
  id: string;
  content: string; // Emoji character
  x: number;
  y: number;
  scale: number;
  rotation: number;
  fontSize: number;
}

export type EditorOverlay = TextOverlay | ImageOverlay | EmojiOverlay;

export interface ImageEditorState {
  baseImageUrl: string;
  overlays: EditorOverlay[];
  selectedOverlayId: string | null;
  zoom: number;
  canvasWidth: number;
  canvasHeight: number;
}

export interface SaveEditedImageRequest {
  baseImageUrl: string;
  overlays: EditorOverlay[];
}

export interface SaveEditedImageResponse {
  success: boolean;
  imageUrl?: string;
  error?: string;
}
