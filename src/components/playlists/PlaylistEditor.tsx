import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DragDropContext, 
  Droppable, 
  Draggable,
  DropResult 
} from '@hello-pangea/dnd';
import { 
  X, GripVertical, Play, Trash2, Plus, 
  Globe, Lock, Save, Music2, Image as ImageIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Track, Playlist, Artist } from '@/types';
import { mockTracks } from '@/data/mockData';
import { usePlayer } from '@/context/PlayerContext';
import { cn } from '@/lib/utils';

interface PlaylistEditorProps {
  playlist?: Playlist;
  creator: Artist;
  onSave: (playlist: Omit<Playlist, 'id' | 'followers'>) => void;
  onClose: () => void;
}

export function PlaylistEditor({ playlist, creator, onSave, onClose }: PlaylistEditorProps) {
  const [name, setName] = useState(playlist?.name || '');
  const [description, setDescription] = useState(playlist?.description || '');
  const [isPublic, setIsPublic] = useState(playlist?.isPublic ?? true);
  const [tracks, setTracks] = useState<Track[]>(playlist?.tracks || []);
  const [coverImage, setCoverImage] = useState(playlist?.coverImage || '');
  const [showTrackPicker, setShowTrackPicker] = useState(false);
  const { playTrack } = usePlayer();

  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;
    
    const items = Array.from(tracks);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    setTracks(items);
  }, [tracks]);

  const addTrack = (track: Track) => {
    if (!tracks.find(t => t.id === track.id)) {
      setTracks([...tracks, track]);
    }
  };

  const removeTrack = (trackId: string) => {
    setTracks(tracks.filter(t => t.id !== trackId));
  };

  const handleSave = () => {
    if (!name.trim()) return;
    
    onSave({
      name,
      description,
      isPublic,
      tracks,
      coverImage: coverImage || tracks[0]?.coverArt || '/placeholder.svg',
      creator,
    });
    onClose();
  };

  const availableTracks = mockTracks.filter(t => !tracks.find(pt => pt.id === t.id));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm"
    >
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <button onClick={onClose} className="p-2 rounded-full hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
          <h2 className="font-display font-bold text-lg">
            {playlist ? 'Edit Playlist' : 'Create Playlist'}
          </h2>
          <Button onClick={handleSave} size="sm" disabled={!name.trim()}>
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Cover & Name */}
          <div className="flex gap-4">
            <div className="w-24 h-24 rounded-xl bg-muted/50 flex items-center justify-center overflow-hidden flex-shrink-0">
              {coverImage || tracks[0]?.coverArt ? (
                <img 
                  src={coverImage || tracks[0]?.coverArt} 
                  alt="Playlist cover" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <Music2 className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 space-y-3">
              <Input
                placeholder="Playlist name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-muted/30"
              />
              <Textarea
                placeholder="Add a description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-muted/30 resize-none h-16"
              />
            </div>
          </div>

          {/* Visibility Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
            <div className="flex items-center gap-3">
              {isPublic ? (
                <Globe className="w-5 h-5 text-primary" />
              ) : (
                <Lock className="w-5 h-5 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium text-sm">{isPublic ? 'Public' : 'Private'}</p>
                <p className="text-xs text-muted-foreground">
                  {isPublic ? 'Anyone can find this playlist' : 'Only you can see this playlist'}
                </p>
              </div>
            </div>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>

          {/* Tracks */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Tracks ({tracks.length})</h3>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowTrackPicker(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Tracks
              </Button>
            </div>

            {tracks.length === 0 ? (
              <div className="py-12 text-center rounded-xl border border-dashed border-border">
                <Music2 className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No tracks yet</p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => setShowTrackPicker(true)}
                >
                  Add your first track
                </Button>
              </div>
            ) : (
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="playlist-tracks">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="space-y-1"
                    >
                      {tracks.map((track, index) => (
                        <Draggable key={track.id} draggableId={track.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={cn(
                                "flex items-center gap-3 p-2 rounded-lg transition-colors",
                                snapshot.isDragging ? "bg-muted shadow-lg" : "hover:bg-muted/50"
                              )}
                            >
                              <div
                                {...provided.dragHandleProps}
                                className="p-1 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
                              >
                                <GripVertical className="w-4 h-4" />
                              </div>
                              
                              <span className="w-6 text-sm text-muted-foreground text-center">
                                {index + 1}
                              </span>
                              
                              <div 
                                className="w-10 h-10 rounded overflow-hidden flex-shrink-0 cursor-pointer group relative"
                                onClick={() => playTrack(track)}
                              >
                                <img 
                                  src={track.coverArt} 
                                  alt={track.title}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <Play className="w-4 h-4 text-white" fill="currentColor" />
                                </div>
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{track.title}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {track.artist.name}
                                </p>
                              </div>
                              
                              <button
                                onClick={() => removeTrack(track.id)}
                                className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            )}
          </div>
        </div>
      </div>

      {/* Track Picker Modal */}
      <AnimatePresence>
        {showTrackPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-60 bg-background/95 backdrop-blur-sm"
          >
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <button 
                  onClick={() => setShowTrackPicker(false)} 
                  className="p-2 rounded-full hover:bg-muted transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <h3 className="font-semibold">Add Tracks</h3>
                <Button size="sm" onClick={() => setShowTrackPicker(false)}>
                  Done
                </Button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-1">
                  {availableTracks.map((track) => (
                    <motion.div
                      key={track.id}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => addTrack(track)}
                    >
                      <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0">
                        <img 
                          src={track.coverArt} 
                          alt={track.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{track.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {track.artist.name}
                        </p>
                      </div>
                      <Plus className="w-5 h-5 text-primary" />
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}