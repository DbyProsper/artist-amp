import { Download, Copy } from 'lucide-react';
import { motion } from 'framer-motion';

interface ImageDisplayProps {
  imageUrl: string;
  title?: string;
  description?: string;
  onDownload?: () => void;
  onCopy?: () => void;
}

export function ImageDisplay({
  imageUrl,
  title,
  description,
  onDownload,
  onCopy,
}: ImageDisplayProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 bg-primary/5 rounded-lg border border-primary/20 space-y-3"
    >
      {(title || description) && (
        <div>
          {title && <h3 className="font-semibold text-sm">{title}</h3>}
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      )}

      <div className="relative group overflow-hidden rounded-lg">
        <img
          src={imageUrl}
          alt="Generated content"
          className="w-full h-auto object-contain max-h-96 bg-background"
        />
        
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
          {onDownload && (
            <button
              onClick={onDownload}
              className="p-2 bg-primary/90 rounded-lg text-white hover:bg-primary transition-colors"
              title="Download"
            >
              <Download className="w-5 h-5" />
            </button>
          )}
          {onCopy && (
            <button
              onClick={onCopy}
              className="p-2 bg-primary/90 rounded-lg text-white hover:bg-primary transition-colors"
              title="Copy URL"
            >
              <Copy className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
        <span className="truncate">{imageUrl}</span>
      </div>
    </motion.div>
  );
}
