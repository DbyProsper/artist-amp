import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ImageEditor } from './ImageEditor';
import { EditorOverlay } from '@/types/imageEditor';
import { Loader2 } from 'lucide-react';

interface ImageEditorModalProps {
  isOpen: boolean;
  baseImageUrl: string;
  onClose: () => void;
  onSaveEdits: (overlays: EditorOverlay[]) => Promise<void>;
  title?: string;
  loading?: boolean;
}

export function ImageEditorModal({
  isOpen,
  baseImageUrl,
  onClose,
  onSaveEdits,
  title = 'Edit Image',
  loading = false,
}: ImageEditorModalProps) {
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (overlays: EditorOverlay[]) => {
    setIsSaving(true);
    try {
      await onSaveEdits(overlays);
      onClose();
    } catch (error) {
      console.error('Error saving edits:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            <div className="pointer-events-auto bg-background rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto mx-4">
              {/* Header */}
              <div className="sticky top-0 bg-background border-b border-border/40 p-6 flex items-center justify-between">
                <h2 className="text-xl font-semibold">{title}</h2>
                {isSaving && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-6">
                <ImageEditor
                  baseImageUrl={baseImageUrl}
                  onSave={handleSave}
                  onCancel={onClose}
                  readonly={loading}
                />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
