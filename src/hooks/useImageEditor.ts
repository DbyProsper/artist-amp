import { useState, useCallback } from 'react';
import { EditorOverlay, ImageEditorState } from '@/types/imageEditor';

export interface UseImageEditorProps {
  baseImageUrl: string;
}

export function useImageEditor({ baseImageUrl }: UseImageEditorProps) {
  const [state, setState] = useState<ImageEditorState>({
    baseImageUrl,
    overlays: [],
    selectedOverlayId: null,
    zoom: 1,
    canvasWidth: 800,
    canvasHeight: 600,
  });

  const addOverlay = useCallback((overlay: EditorOverlay) => {
    setState((prev) => ({
      ...prev,
      overlays: [...prev.overlays, overlay],
      selectedOverlayId: overlay.id,
    }));
  }, []);

  const updateOverlay = useCallback((id: string, updates: Partial<EditorOverlay>) => {
    setState((prev) => ({
      ...prev,
      overlays: prev.overlays.map((overlay) =>
        overlay.id === id ? { ...overlay, ...updates } : overlay
      ),
    }));
  }, []);

  const deleteOverlay = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      overlays: prev.overlays.filter((o) => o.id !== id),
      selectedOverlayId: prev.selectedOverlayId === id ? null : prev.selectedOverlayId,
    }));
  }, []);

  const selectOverlay = useCallback((id: string | null) => {
    setState((prev) => ({
      ...prev,
      selectedOverlayId: id,
    }));
  }, []);

  const clearOverlays = useCallback(() => {
    setState((prev) => ({
      ...prev,
      overlays: [],
      selectedOverlayId: null,
    }));
  }, []);

  const setZoom = useCallback((zoom: number) => {
    setState((prev) => ({
      ...prev,
      zoom: Math.max(0.1, Math.min(3, zoom)),
    }));
  }, []);

  const resetEditor = useCallback(() => {
    setState({
      baseImageUrl,
      overlays: [],
      selectedOverlayId: null,
      zoom: 1,
      canvasWidth: 800,
      canvasHeight: 600,
    });
  }, [baseImageUrl]);

  return {
    state,
    addOverlay,
    updateOverlay,
    deleteOverlay,
    selectOverlay,
    clearOverlays,
    setZoom,
    resetEditor,
  };
}
