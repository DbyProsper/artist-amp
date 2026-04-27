import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Download, Play, Music, FileText, Image as ImageIcon, Play as PlayIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export interface GeneratedItem {
  id: string;
  feature: string;
  prompt: string;
  audioUrl?: string;
  imageUrl?: string;
  lyrics?: string;
  createdAt: Date;
  metadata?: {
    genre?: string;
    bpm?: number;
    mood?: string;
    language?: string;
  };
}

interface GenerationHistoryProps {
  history: GeneratedItem[];
  onSelect: (item: GeneratedItem) => void;
  onDelete?: (id: string) => void;
  onDownload?: (item: GeneratedItem) => void;
  isLoading?: boolean;
}

const FEATURE_ICONS: Record<string, React.ReactNode> = {
  beat: <Music className="w-4 h-4" />,
  lyrics: <FileText className="w-4 h-4" />,
  song: <PlayIcon className="w-4 h-4" />,
  cover: <ImageIcon className="w-4 h-4" />,
  poster: <ImageIcon className="w-4 h-4" />,
  merch: <ImageIcon className="w-4 h-4" />,
  chat: <FileText className="w-4 h-4" />,
};

const FEATURE_LABELS: Record<string, string> = {
  beat: 'Beat',
  lyrics: 'Lyrics',
  song: 'Song',
  cover: 'Cover Art',
  poster: 'Poster',
  merch: 'Merch',
  chat: 'Chat',
};

export function GenerationHistory({
  history,
  onSelect,
  onDelete,
  onDownload,
  isLoading = false,
}: GenerationHistoryProps) {
  const formatDate = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-muted-foreground">Loading history...</div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Music className="w-8 h-8 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No generations yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Start creating to build your history</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
        Generation History ({history.length})
      </div>
      <AnimatePresence>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {history.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ delay: idx * 0.02 }}
            >
              <Card className="p-3 hover:bg-accent/50 transition-colors group cursor-pointer"
                onClick={() => onSelect(item)}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-0.5 text-primary">
                    {FEATURE_ICONS[item.feature] || <Music className="w-4 h-4" />}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold bg-primary/20 text-primary px-2 py-0.5 rounded">
                        {FEATURE_LABELS[item.feature] || item.feature}
                      </span>
                      {item.metadata?.genre && (
                        <span className="text-xs text-muted-foreground">
                          {item.metadata.genre}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-foreground line-clamp-2 mb-1">
                      {item.prompt}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {formatDate(item.createdAt)}
                      </span>
                      {item.metadata?.bpm && (
                        <span className="text-xs text-muted-foreground">
                          • {item.metadata.bpm} BPM
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex-shrink-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.audioUrl && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelect(item);
                        }}
                        className="h-7 w-7 p-0"
                        title="Play"
                      >
                        <Play className="w-3 h-3" />
                      </Button>
                    )}
                    {item.audioUrl && onDownload && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDownload(item);
                        }}
                        className="h-7 w-7 p-0"
                        title="Download"
                      >
                        <Download className="w-3 h-3" />
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(item.id);
                        }}
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </AnimatePresence>
    </div>
  );
}
