import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Play, Copy, RefreshCw, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ResultDisplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  audioUrl?: string;
  imageUrl?: string;
  lyrics?: string;
  prompt?: string;
  onReuse?: (prompt: string) => void;
  onPlay?: (audioUrl: string) => void;
  onEditImage?: (imageUrl: string) => void;
  title?: string;
}

export function ResultDisplayModal({
  isOpen,
  onClose,
  audioUrl,
  imageUrl,
  lyrics,
  prompt = '',
  onReuse,
  onPlay,
  onEditImage,
  title = 'Generated Content',
}: ResultDisplayModalProps) {
  if (!isOpen) return null;

  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      toast.success('Downloaded successfully');
    } catch (error) {
      toast.error('Download failed');
    }
  };

  const handleCopyLyrics = () => {
    if (lyrics) {
      navigator.clipboard.writeText(lyrics);
      toast.success('Lyrics copied to clipboard');
    }
  };

  const handleReuse = () => {
    if (onReuse) {
      onReuse(prompt);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Blur Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal - Single Page Layout */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-4 z-50 flex flex-col rounded-2xl bg-background border border-border/40 shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex-shrink-0 p-6 border-b border-border/40 flex items-center justify-between bg-muted/30">
              <h2 className="text-xl font-bold truncate">{title}</h2>
              <Button
                size="sm"
                variant="ghost"
                onClick={onClose}
                className="h-8 w-8 p-0 flex-shrink-0 ml-4"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Content - All on One Page */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Audio Section */}
              {audioUrl && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                    🎵 Audio
                  </h3>
                  <div className="bg-muted rounded-lg p-6 flex items-center justify-center">
                    <audio
                      controls
                      src={audioUrl}
                      className="w-full"
                      crossOrigin="anonymous"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => onPlay?.(audioUrl)}
                      className="gap-2 flex-1"
                    >
                      <Play className="w-4 h-4" />
                      Play in Player
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleDownload(audioUrl, 'audio.mp3')}
                      className="gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </Button>
                  </div>
                </div>
              )}

              {/* Image Section */}
              {imageUrl && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                    🎨 Cover Art
                  </h3>
                  <div className="bg-muted rounded-lg p-4 flex items-center justify-center">
                    <img
                      src={imageUrl}
                      alt="Generated content"
                      className="max-w-full max-h-80 rounded-lg object-cover"
                    />
                  </div>
                  <div className="flex gap-2">
                    {onEditImage && (
                      <Button
                        onClick={() => onEditImage(imageUrl)}
                        className="gap-2 flex-1"
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit Image
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => handleDownload(imageUrl, 'cover.png')}
                      className="gap-2 flex-1"
                    >
                      <Download className="w-4 h-4" />
                      Download Cover
                    </Button>
                  </div>
                </div>
              )}

              {/* Lyrics Section */}
              {lyrics && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                    📝 Lyrics
                  </h3>
                  <div className="bg-muted rounded-lg p-6 max-h-64 overflow-y-auto">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed font-mono">{lyrics}</p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleCopyLyrics}
                    className="gap-2 w-full"
                  >
                    <Copy className="w-4 h-4" />
                    Copy Lyrics
                  </Button>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="flex-shrink-0 p-6 border-t border-border/40 bg-muted/30 flex gap-3 flex-wrap">
              {prompt && onReuse && (
                <Button
                  variant="outline"
                  onClick={handleReuse}
                  className="gap-2 flex-1 min-w-max"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reuse Prompt
                </Button>
              )}
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1 min-w-max"
              >
                Close
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
