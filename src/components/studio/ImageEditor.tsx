import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Type,
  Image as ImageIcon,
  Smile,
  Copy,
  Trash2,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Download,
  Check,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import {
  ImageEditorState,
  EditorOverlay,
  TextOverlay,
  EmojiOverlay,
  ImageOverlay,
  TextStyle,
  AnimationType,
} from '@/types/imageEditor';

interface ImageEditorProps {
  baseImageUrl: string;
  onSave?: (overlays: EditorOverlay[]) => void;
  onCancel?: () => void;
  readonly?: boolean;
}

export function ImageEditor({
  baseImageUrl,
  onSave,
  onCancel,
  readonly = false,
}: ImageEditorProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<ImageEditorState>({
    baseImageUrl,
    overlays: [],
    selectedOverlayId: null,
    zoom: 1,
    canvasWidth: 800,
    canvasHeight: 600,
  });

  const [textInput, setTextInput] = useState('');
  const [selectedTextStyle, setSelectedTextStyle] = useState<TextStyle>({
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    opacity: 1,
    fontFamily: 'Inter',
  });

  const [emojiPickerActive, setEmojiPickerActive] = useState(false);
  const [imageUploadActive, setImageUploadActive] = useState(false);

  // Initialize canvas dimensions based on image
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setState((prev) => ({
        ...prev,
        canvasWidth: img.width,
        canvasHeight: img.height,
      }));
    };
    img.src = baseImageUrl;
  }, [baseImageUrl]);

  // Add text overlay
  const handleAddText = () => {
    if (!textInput.trim()) {
      toast.error('Enter text first');
      return;
    }

    const newText: TextOverlay = {
      type: 'text',
      id: `text-${Date.now()}`,
      content: textInput,
      x: 50,
      y: 50,
      scale: 1,
      rotation: 0,
      style: selectedTextStyle,
      animation: 'none',
    };

    setState((prev) => ({
      ...prev,
      overlays: [...prev.overlays, newText],
      selectedOverlayId: newText.id,
    }));

    setTextInput('');
    toast.success('✏️ Text added');
  };

  // Add emoji overlay
  const handleAddEmoji = (emoji: string) => {
    const newEmoji: EmojiOverlay = {
      type: 'emoji',
      id: `emoji-${Date.now()}`,
      content: emoji,
      x: 50,
      y: 50,
      scale: 1,
      rotation: 0,
      fontSize: 48,
    };

    setState((prev) => ({
      ...prev,
      overlays: [...prev.overlays, newEmoji],
      selectedOverlayId: newEmoji.id,
    }));

    setEmojiPickerActive(false);
    toast.success('😊 Emoji added');
  };

  // Handle image upload for overlay
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const newImage: ImageOverlay = {
          type: 'image',
          id: `image-${Date.now()}`,
          content: dataUrl,
          x: 50,
          y: 50,
          scale: 1,
          rotation: 0,
          width: img.width,
          height: img.height,
        };

        setState((prev) => ({
          ...prev,
          overlays: [...prev.overlays, newImage],
          selectedOverlayId: newImage.id,
        }));

        setImageUploadActive(false);
        toast.success('🖼️ Image overlay added');
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  // Update overlay position
  const handleUpdateOverlay = (
    id: string,
    updates: Partial<EditorOverlay>
  ) => {
    setState((prev) => ({
      ...prev,
      overlays: prev.overlays.map((overlay) =>
        overlay.id === id ? { ...overlay, ...updates } : overlay
      ),
    }));
  };

  // Delete overlay
  const handleDeleteOverlay = (id: string) => {
    setState((prev) => ({
      ...prev,
      overlays: prev.overlays.filter((o) => o.id !== id),
      selectedOverlayId: prev.selectedOverlayId === id ? null : prev.selectedOverlayId,
    }));
    toast.success('🗑️ Overlay deleted');
  };

  // Update text style
  const handleUpdateTextStyle = (overlay: TextOverlay, updates: Partial<TextStyle>) => {
    const updated: TextOverlay = {
      ...overlay,
      style: { ...overlay.style, ...updates },
    };
    handleUpdateOverlay(overlay.id, updated);
  };

  // Duplicate overlay
  const handleDuplicate = (id: string) => {
    const overlay = state.overlays.find((o) => o.id === id);
    if (!overlay) return;

    const duplicated = {
      ...overlay,
      id: `${overlay.type}-${Date.now()}`,
      x: overlay.x + 20,
      y: overlay.y + 20,
    };

    setState((prev) => ({
      ...prev,
      overlays: [...prev.overlays, duplicated],
      selectedOverlayId: duplicated.id,
    }));

    toast.success('📋 Overlay duplicated');
  };

  const selectedOverlay = state.overlays.find((o) => o.id === state.selectedOverlayId);

  return (
    <div ref={containerRef} className="flex flex-col gap-4 bg-background p-6 rounded-lg">
      {/* Canvas Area */}
      <div
        ref={canvasRef}
        className="relative bg-muted rounded-lg overflow-auto border border-border/40 flex items-center justify-center"
        style={{
          maxWidth: '100%',
          maxHeight: '500px',
          aspectRatio: `${state.canvasWidth} / ${state.canvasHeight}`,
        }}
      >
        {/* Base Image */}
        <img
          src={baseImageUrl}
          alt="Base"
          className="absolute inset-0 w-full h-full object-contain"
        />

        {/* Overlays Container */}
        <div
          className="absolute inset-0 cursor-move"
          style={{
            backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2220%22 height=%2220%22%3E%3Crect width=%2220%22 height=%2220%22 fill=%22%23f0f0f0%22/%3E%3Crect width=%2210%22 height=%2210%22 fill=%22transparent%22/%3E%3Crect x=%2210%22 y=%2210%22 width=%2210%22 height=%2210%22 fill=%22transparent%22/%3E%3C/svg%3E")',
            backgroundPosition: '0 0, 10px 10px',
            opacity: 0,
            pointerEvents: 'none',
          }}
        />

        {/* Rendered Overlays */}
        {state.overlays.map((overlay) => (
          <OverlayRenderer
            key={overlay.id}
            overlay={overlay}
            isSelected={state.selectedOverlayId === overlay.id}
            onSelect={() => {
              if (!readonly) setState((prev) => ({ ...prev, selectedOverlayId: overlay.id }));
            }}
            onUpdate={handleUpdateOverlay}
            canvasWidth={state.canvasWidth}
            canvasHeight={state.canvasHeight}
            readonly={readonly}
          />
        ))}
      </div>

      {!readonly && (
        <>
          {/* Control Buttons */}
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (textInput.trim()) handleAddText();
              }}
              disabled={!textInput.trim()}
              className="gap-2"
            >
              <Type className="w-4 h-4" />
              Add Text
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setEmojiPickerActive(!emojiPickerActive)}
              className="gap-2"
            >
              <Smile className="w-4 h-4" />
              Emoji
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setImageUploadActive(!imageUploadActive)}
              className="gap-2"
            >
              <ImageIcon className="w-4 h-4" />
              Image
            </Button>

            {selectedOverlay && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDuplicate(selectedOverlay.id)}
                  className="gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Duplicate
                </Button>

                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDeleteOverlay(selectedOverlay.id)}
                  className="gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </Button>
              </>
            )}

            <div className="ml-auto flex gap-2">
              <Button size="sm" variant="outline" onClick={onCancel} className="gap-2">
                <X className="w-4 h-4" />
                Cancel
              </Button>

              <Button
                size="sm"
                onClick={() => onSave?.(state.overlays)}
                className="gap-2 bg-primary"
              >
                <Check className="w-4 h-4" />
                Save
              </Button>
            </div>
          </div>

          {/* Text Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Text</label>
            <div className="flex gap-2">
              <Input
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Enter text to add"
                onKeyPress={(e) => e.key === 'Enter' && handleAddText()}
              />
            </div>
          </div>

          {/* Emoji Picker */}
          {emojiPickerActive && (
            <EmojiPickerGrid onSelectEmoji={handleAddEmoji} />
          )}

          {/* Image Upload */}
          {imageUploadActive && (
            <div className="p-4 border-2 border-dashed border-border/40 rounded-lg">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="w-full"
              />
            </div>
          )}

          {/* Text Formatting (Show when text overlay selected) */}
          {selectedOverlay?.type === 'text' && (
            <TextFormatPanel
              overlay={selectedOverlay as TextOverlay}
              onUpdateStyle={(updates) =>
                handleUpdateTextStyle(selectedOverlay as TextOverlay, updates)
              }
            />
          )}

          {/* Overlay Transform Controls (Show when overlay selected) */}
          {selectedOverlay && (
            <OverlayTransformPanel
              overlay={selectedOverlay}
              onUpdate={handleUpdateOverlay}
            />
          )}
        </>
      )}
    </div>
  );
}

// ==================== SUBCOMPONENTS ====================

interface OverlayRendererProps {
  overlay: EditorOverlay;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (id: string, updates: Partial<EditorOverlay>) => void;
  canvasWidth: number;
  canvasHeight: number;
  readonly?: boolean;
}

function OverlayRenderer({
  overlay,
  isSelected,
  onSelect,
  onUpdate,
  canvasWidth,
  canvasHeight,
  readonly,
}: OverlayRendererProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (readonly) return;
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - overlay.x,
      y: e.clientY - overlay.y,
    });
    onSelect();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || readonly) return;
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    onUpdate(overlay.id, { x: Math.max(0, newX), y: Math.max(0, newY) });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const getContent = () => {
    switch (overlay.type) {
      case 'text':
        const textOverlay = overlay as TextOverlay;
        return (
          <div
            style={{
              fontSize: `${textOverlay.style.fontSize}px`,
              fontWeight: textOverlay.style.fontWeight,
              color: textOverlay.style.color,
              opacity: textOverlay.style.opacity,
              fontFamily: textOverlay.style.fontFamily || 'Inter',
              transform: `scale(${textOverlay.scale}) rotate(${textOverlay.rotation}deg)`,
              whiteSpace: 'nowrap',
              textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
            }}
          >
            {textOverlay.content}
          </div>
        );

      case 'emoji':
        const emojiOverlay = overlay as EmojiOverlay;
        return (
          <div
            style={{
              fontSize: `${emojiOverlay.fontSize}px`,
              transform: `scale(${emojiOverlay.scale}) rotate(${emojiOverlay.rotation}deg)`,
            }}
          >
            {emojiOverlay.content}
          </div>
        );

      case 'image':
        const imageOverlay = overlay as ImageOverlay;
        return (
          <img
            src={imageOverlay.content}
            alt="Overlay"
            style={{
              width: `${imageOverlay.width * imageOverlay.scale}px`,
              height: `${imageOverlay.height * imageOverlay.scale}px`,
              objectFit: 'cover',
              transform: `rotate(${imageOverlay.rotation}deg)`,
              borderRadius: '4px',
            }}
          />
        );
    }
  };

  return (
    <motion.div
      className={`absolute cursor-move transition-all ${
        isSelected ? 'ring-2 ring-primary' : ''
      }`}
      style={{
        left: `${(overlay.x / canvasWidth) * 100}%`,
        top: `${(overlay.y / canvasHeight) * 100}%`,
        transform: 'translate(-50%, -50%)',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div
        className={`p-2 rounded-lg ${isSelected ? 'bg-primary/10' : ''}`}
        onClick={onSelect}
      >
        {getContent()}
      </div>
    </motion.div>
  );
}

interface TextFormatPanelProps {
  overlay: TextOverlay;
  onUpdateStyle: (updates: Partial<TextStyle>) => void;
}

function TextFormatPanel({ overlay, onUpdateStyle }: TextFormatPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 border border-border/40 rounded-lg space-y-4 bg-muted/30"
    >
      <h4 className="font-semibold text-sm">Text Formatting</h4>

      {/* Font Size */}
      <div>
        <label className="text-xs font-medium">Font Size: {overlay.style.fontSize}px</label>
        <Slider
          value={[overlay.style.fontSize]}
          min={8}
          max={120}
          step={1}
          onValueChange={(v) => onUpdateStyle({ fontSize: v[0] })}
          className="w-full mt-2"
        />
      </div>

      {/* Font Weight */}
      <div>
        <label className="text-xs font-medium">Weight</label>
        <div className="flex gap-2 mt-2">
          {(['normal', 'bold', '500', '600', '700'] as const).map((weight) => (
            <Button
              key={weight}
              size="sm"
              variant={overlay.style.fontWeight === weight ? 'default' : 'outline'}
              onClick={() => onUpdateStyle({ fontWeight: weight })}
              className="text-xs"
            >
              {weight}
            </Button>
          ))}
        </div>
      </div>

      {/* Color */}
      <div>
        <label className="text-xs font-medium">Color</label>
        <div className="flex gap-2 mt-2 items-center">
          <input
            type="color"
            value={overlay.style.color}
            onChange={(e) => onUpdateStyle({ color: e.target.value })}
            className="w-12 h-10 rounded cursor-pointer"
          />
          <span className="text-xs">{overlay.style.color}</span>
        </div>
      </div>

      {/* Opacity */}
      <div>
        <label className="text-xs font-medium">Opacity: {Math.round(overlay.style.opacity * 100)}%</label>
        <Slider
          value={[overlay.style.opacity]}
          min={0}
          max={1}
          step={0.05}
          onValueChange={(v) => onUpdateStyle({ opacity: v[0] })}
          className="w-full mt-2"
        />
      </div>
    </motion.div>
  );
}

interface OverlayTransformPanelProps {
  overlay: EditorOverlay;
  onUpdate: (id: string, updates: Partial<EditorOverlay>) => void;
}

function OverlayTransformPanel({ overlay, onUpdate }: OverlayTransformPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 border border-border/40 rounded-lg space-y-4 bg-muted/30"
    >
      <h4 className="font-semibold text-sm">Transform</h4>

      {/* Scale */}
      <div>
        <label className="text-xs font-medium">Scale: {Math.round(overlay.scale * 100)}%</label>
        <Slider
          value={[overlay.scale]}
          min={0.1}
          max={3}
          step={0.1}
          onValueChange={(v) => onUpdate(overlay.id, { scale: v[0] })}
          className="w-full mt-2"
        />
      </div>

      {/* Rotation */}
      <div>
        <label className="text-xs font-medium">Rotation: {overlay.rotation}°</label>
        <Slider
          value={[overlay.rotation]}
          min={0}
          max={360}
          step={1}
          onValueChange={(v) => onUpdate(overlay.id, { rotation: v[0] })}
          className="w-full mt-2"
        />
      </div>
    </motion.div>
  );
}

function EmojiPickerGrid({ onSelectEmoji }: { onSelectEmoji: (emoji: string) => void }) {
  const emojis = [
    '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂',
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '⭐',
    '🎉', '🎊', '🎈', '🎁', '🏆', '👑', '💎', '🔥',
    '✨', '⚡', '💫', '🌟', '⚙️', '🎵', '🎶', '🎤',
    '🎧', '🎸', '🥁', '🎹', '🎺', '🎷', '📱', '💻',
  ];

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      className="grid grid-cols-8 gap-2 p-4 bg-muted/30 rounded-lg border border-border/40"
    >
      {emojis.map((emoji) => (
        <button
          key={emoji}
          onClick={() => onSelectEmoji(emoji)}
          className="text-2xl hover:scale-125 transition-transform p-2 rounded hover:bg-background"
        >
          {emoji}
        </button>
      ))}
    </motion.div>
  );
}
