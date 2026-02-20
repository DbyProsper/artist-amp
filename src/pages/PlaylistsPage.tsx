import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, MoreHorizontal, Edit2, Trash2, Plus, ArrowLeft, 
  Shuffle, Heart, Share2, Globe, Lock, Music2, Image as ImageIcon, Save, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TrackRow } from '@/components/tracks/TrackRow';
import { Playlist, Track, Artist } from '@/types';
import { usePlayer } from '@/context/PlayerContext';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

function formatCount(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export default function PlaylistsPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newIsPublic, setNewIsPublic] = useState(true);
  const [editImage, setEditImage] = useState<string>('');
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { playTrack, setQueue } = usePlayer();

  const fetchPlaylists = async () => {
    if (!profile) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('playlists')
      .select('*')
      .eq('creator_id', profile.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPlaylists(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPlaylists();
  }, [profile?.id]);

  const handleCreate = async () => {
    if (!profile || !newName.trim()) return;
    const { data, error } = await supabase
      .from('playlists')
      .insert({
        creator_id: profile.id,
        name: newName.trim(),
        description: newDesc.trim() || null,
        is_public: newIsPublic,
      })
      .select();
    
    if (error) {
      toast.error('Failed to create playlist');
      return;
    }
    
    if (data && data.length > 0) {
      // Optimistically add the new playlist to the state immediately
      setPlaylists([data[0], ...playlists]);
      toast.success('Playlist created!');
      setShowCreate(false);
      setNewName('');
      setNewDesc('');
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('playlists').delete().eq('id', id);
    if (!error) {
      setPlaylists(playlists.filter(p => p.id !== id));
      toast.success('Playlist deleted');
    }
  };

  const handleEditPlaylist = (playlist: any) => {
    setEditingId(playlist.id);
    setNewName(playlist.name);
    setNewDesc(playlist.description || '');
    setNewIsPublic(playlist.is_public);
    setEditImage(playlist.cover_url || '');
    setEditImageFile(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditImageFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setEditImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSavePlaylist = async () => {
    if (!editingId || !newName.trim()) return;

    try {
      let coverUrl = editImage;
      
      // If a new image was uploaded, we'd need to handle storage
      // For now, we'll just save the data to the database
      const { error } = await supabase
        .from('playlists')
        .update({
          name: newName.trim(),
          description: newDesc.trim() || null,
          is_public: newIsPublic,
          cover_url: coverUrl || null,
        })
        .eq('id', editingId);

      if (error) {
        toast.error('Failed to save playlist');
        return;
      }

      // Update local state
      setPlaylists(playlists.map(p => 
        p.id === editingId 
          ? { ...p, name: newName, description: newDesc, is_public: newIsPublic, cover_url: coverUrl }
          : p
      ));

      toast.success('Playlist updated!');
      setEditingId(null);
      setNewName('');
      setNewDesc('');
      setNewIsPublic(true);
      setEditImage('');
      setEditImageFile(null);
    } catch (error) {
      toast.error('Failed to save playlist');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setNewName('');
    setNewDesc('');
    setNewIsPublic(true);
    setEditImage('');
    setEditImageFile(null);
  };

  return (
    <div className="min-h-screen pb-36">
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-muted transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-display font-bold text-xl">Playlists</h1>
          </div>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create
          </Button>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {loading ? (
          <div className="py-12 text-center text-muted-foreground">Loading...</div>
        ) : playlists.length === 0 ? (
          <div className="py-12 text-center rounded-xl border border-dashed border-border">
            <Music2 className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-3">No playlists yet</p>
            <Button variant="outline" onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create your first playlist
            </Button>
          </div>
        ) : (
          playlists.map((playlist) => (
            <motion.div
              key={playlist.id}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-muted flex items-center justify-center">
                {playlist.cover_url ? (
                  <img src={playlist.cover_url} alt={playlist.name} className="w-full h-full object-cover" />
                ) : (
                  <Music2 className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold truncate">{playlist.name}</p>
                  {!playlist.is_public && <Lock className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {playlist.description || 'No description'}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-2 rounded-full hover:bg-muted transition-colors">
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleEditPlaylist(playlist)}>
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDelete(playlist.id)} className="text-destructive focus:text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </motion.div>
          ))
        )}
      </div>

      {/* Create Playlist Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm"
          >
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <button onClick={() => setShowCreate(false)} className="p-2 rounded-full hover:bg-muted transition-colors">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="font-display font-bold text-lg">New Playlist</h2>
                <Button onClick={handleCreate} size="sm" disabled={!newName.trim()}>Create</Button>
              </div>
              <div className="p-4 space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input placeholder="Playlist name" className="h-12 bg-muted/50" value={newName} onChange={(e) => setNewName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea placeholder="Add a description..." className="bg-muted/50 resize-none" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
                  <div className="flex items-center gap-3">
                    {newIsPublic ? <Globe className="w-5 h-5 text-primary" /> : <Lock className="w-5 h-5 text-muted-foreground" />}
                    <div>
                      <p className="font-medium text-sm">{newIsPublic ? 'Public' : 'Private'}</p>
                      <p className="text-xs text-muted-foreground">{newIsPublic ? 'Anyone can find this' : 'Only you can see this'}</p>
                    </div>
                  </div>
                  <Switch checked={newIsPublic} onCheckedChange={setNewIsPublic} />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Playlist Modal */}
      <AnimatePresence>
        {editingId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm overflow-y-auto"
          >
            <div className="min-h-full flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-background">
                <button onClick={handleCancelEdit} className="p-2 rounded-full hover:bg-muted transition-colors">
                  <X className="w-5 h-5" />
                </button>
                <h2 className="font-display font-bold text-lg">Edit Playlist</h2>
                <Button onClick={handleSavePlaylist} size="sm" disabled={!newName.trim()}>
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
              </div>
              <div className="flex-1 p-4 space-y-4">
                {/* Cover Image */}
                <div>
                  <Label className="mb-2 block">Playlist Cover</Label>
                  <div 
                    className="w-full h-40 rounded-xl overflow-hidden bg-muted/30 border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors group mb-2"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {editImage ? (
                      <img src={editImage} alt="Cover preview" className="w-full h-full object-cover group-hover:opacity-80 transition-opacity" />
                    ) : (
                      <div className="text-center">
                        <ImageIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2 group-hover:text-primary transition-colors" />
                        <p className="text-sm text-muted-foreground group-hover:text-primary transition-colors">Click to upload image</p>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>

                {/* Name */}
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input placeholder="Playlist name" className="h-12 bg-muted/50" value={newName} onChange={(e) => setNewName(e.target.value)} />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea placeholder="Add a description..." className="bg-muted/50 resize-none" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
                </div>

                {/* Privacy */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
                  <div className="flex items-center gap-3">
                    {newIsPublic ? <Globe className="w-5 h-5 text-primary" /> : <Lock className="w-5 h-5 text-muted-foreground" />}
                    <div>
                      <p className="font-medium text-sm">{newIsPublic ? 'Public' : 'Private'}</p>
                      <p className="text-xs text-muted-foreground">{newIsPublic ? 'Anyone can find this' : 'Only you can see this'}</p>
                    </div>
                  </div>
                  <Switch checked={newIsPublic} onCheckedChange={setNewIsPublic} />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
