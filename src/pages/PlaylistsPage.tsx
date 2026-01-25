import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, MoreHorizontal, Edit2, Trash2, Plus, ArrowLeft, 
  Shuffle, Heart, Share2, Globe, Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PlaylistEditor } from '@/components/playlists/PlaylistEditor';
import { TrackRow } from '@/components/tracks/TrackRow';
import { mockPlaylists, currentUserArtist } from '@/data/mockData';
import { Playlist, Track } from '@/types';
import { usePlayer } from '@/context/PlayerContext';
import { useNavigate } from 'react-router-dom';

function formatCount(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export default function PlaylistsPage() {
  const navigate = useNavigate();
  const [playlists, setPlaylists] = useState<Playlist[]>(mockPlaylists);
  const [showEditor, setShowEditor] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | undefined>();
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const { playTrack, setQueue } = usePlayer();

  const myPlaylists = playlists.filter(p => p.creator.id === currentUserArtist.id);
  const savedPlaylists = playlists.filter(p => p.creator.id !== currentUserArtist.id);

  const handleSavePlaylist = (playlistData: Omit<Playlist, 'id' | 'followers'>) => {
    if (editingPlaylist) {
      setPlaylists(playlists.map(p => 
        p.id === editingPlaylist.id 
          ? { ...playlistData, id: p.id, followers: p.followers }
          : p
      ));
      if (selectedPlaylist?.id === editingPlaylist.id) {
        setSelectedPlaylist({ ...playlistData, id: editingPlaylist.id, followers: editingPlaylist.followers });
      }
    } else {
      const newPlaylist: Playlist = {
        ...playlistData,
        id: `playlist-${Date.now()}`,
        followers: 0,
      };
      setPlaylists([newPlaylist, ...playlists]);
    }
    setEditingPlaylist(undefined);
  };

  const handleEditPlaylist = (playlist: Playlist) => {
    setEditingPlaylist(playlist);
    setShowEditor(true);
  };

  const handleDeletePlaylist = (playlistId: string) => {
    setPlaylists(playlists.filter(p => p.id !== playlistId));
    if (selectedPlaylist?.id === playlistId) {
      setSelectedPlaylist(null);
    }
  };

  const handlePlayPlaylist = (playlist: Playlist, shuffle = false) => {
    if (playlist.tracks.length > 0) {
      const tracks = shuffle 
        ? [...playlist.tracks].sort(() => Math.random() - 0.5)
        : playlist.tracks;
      setQueue(tracks);
      playTrack(tracks[0]);
    }
  };

  // Playlist Detail View
  if (selectedPlaylist) {
    return (
      <div className="min-h-screen pb-36">
        {/* Header with Cover */}
        <div className="relative">
          {/* Cover Image with Gradient */}
          <div className="h-64 relative overflow-hidden">
            <img
              src={selectedPlaylist.coverImage}
              alt={selectedPlaylist.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          </div>
          
          {/* Back Button */}
          <button
            onClick={() => setSelectedPlaylist(null)}
            className="absolute top-4 left-4 p-2 rounded-full bg-background/50 backdrop-blur-sm hover:bg-background/70 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Playlist Info */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <div className="flex items-center gap-2 mb-1">
              {selectedPlaylist.isPublic ? (
                <Globe className="w-4 h-4 text-muted-foreground" />
              ) : (
                <Lock className="w-4 h-4 text-muted-foreground" />
              )}
              <span className="text-sm text-muted-foreground">
                {selectedPlaylist.isPublic ? 'Public' : 'Private'} Playlist
              </span>
            </div>
            <h1 className="font-display font-bold text-2xl mb-1">{selectedPlaylist.name}</h1>
            {selectedPlaylist.description && (
              <p className="text-sm text-muted-foreground mb-2">{selectedPlaylist.description}</p>
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{selectedPlaylist.creator.name}</span>
              <span>•</span>
              <span>{selectedPlaylist.tracks.length} tracks</span>
              <span>•</span>
              <span>{formatCount(selectedPlaylist.followers)} saves</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 p-4">
          <Button
            size="lg"
            onClick={() => handlePlayPlaylist(selectedPlaylist)}
            className="flex-1 bg-gradient-to-r from-primary to-accent"
          >
            <Play className="w-5 h-5 mr-2" fill="currentColor" />
            Play
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => handlePlayPlaylist(selectedPlaylist, true)}
          >
            <Shuffle className="w-5 h-5" />
          </Button>
          <Button size="lg" variant="outline">
            <Heart className="w-5 h-5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="lg" variant="outline">
                <MoreHorizontal className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </DropdownMenuItem>
              {selectedPlaylist.creator.id === currentUserArtist.id && (
                <>
                  <DropdownMenuItem onClick={() => handleEditPlaylist(selectedPlaylist)}>
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleDeletePlaylist(selectedPlaylist.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Track List */}
        <div className="px-4">
          {selectedPlaylist.tracks.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">No tracks in this playlist</p>
            </div>
          ) : (
            <div className="space-y-1">
              {selectedPlaylist.tracks.map((track, index) => (
                <TrackRow key={track.id} track={track} index={index + 1} showIndex />
              ))}
            </div>
          )}
        </div>

        {/* Playlist Editor */}
        <AnimatePresence>
          {showEditor && (
            <PlaylistEditor
              playlist={editingPlaylist}
              creator={currentUserArtist}
              onSave={handleSavePlaylist}
              onClose={() => {
                setShowEditor(false);
                setEditingPlaylist(undefined);
              }}
            />
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Playlist List View
  return (
    <div className="min-h-screen pb-36">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <h1 className="font-display font-bold text-xl">Playlists</h1>
          <Button 
            size="sm" 
            onClick={() => {
              setEditingPlaylist(undefined);
              setShowEditor(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create
          </Button>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* My Playlists */}
        <section>
          <h2 className="font-semibold text-lg mb-4">My Playlists</h2>
          {myPlaylists.length === 0 ? (
            <div className="py-12 text-center rounded-xl border border-dashed border-border">
              <p className="text-muted-foreground mb-3">You haven't created any playlists yet</p>
              <Button 
                variant="outline"
                onClick={() => {
                  setEditingPlaylist(undefined);
                  setShowEditor(true);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create your first playlist
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {myPlaylists.map((playlist) => (
                <PlaylistCard
                  key={playlist.id}
                  playlist={playlist}
                  isOwner
                  onClick={() => setSelectedPlaylist(playlist)}
                  onPlay={() => handlePlayPlaylist(playlist)}
                  onEdit={() => handleEditPlaylist(playlist)}
                  onDelete={() => handleDeletePlaylist(playlist.id)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Saved Playlists */}
        {savedPlaylists.length > 0 && (
          <section>
            <h2 className="font-semibold text-lg mb-4">Saved Playlists</h2>
            <div className="space-y-2">
              {savedPlaylists.map((playlist) => (
                <PlaylistCard
                  key={playlist.id}
                  playlist={playlist}
                  onClick={() => setSelectedPlaylist(playlist)}
                  onPlay={() => handlePlayPlaylist(playlist)}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Playlist Editor */}
      <AnimatePresence>
        {showEditor && (
          <PlaylistEditor
            playlist={editingPlaylist}
            creator={currentUserArtist}
            onSave={handleSavePlaylist}
            onClose={() => {
              setShowEditor(false);
              setEditingPlaylist(undefined);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

interface PlaylistCardProps {
  playlist: Playlist;
  isOwner?: boolean;
  onClick: () => void;
  onPlay: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

function PlaylistCard({ playlist, isOwner, onClick, onPlay, onEdit, onDelete }: PlaylistCardProps) {
  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
    >
      <div 
        className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 relative group cursor-pointer"
        onClick={onPlay}
      >
        <img
          src={playlist.coverImage}
          alt={playlist.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Play className="w-6 h-6 text-white" fill="currentColor" />
        </div>
      </div>
      
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onClick}>
        <div className="flex items-center gap-2">
          <p className="font-semibold truncate">{playlist.name}</p>
          {!playlist.isPublic && (
            <Lock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate">
          {playlist.tracks.length} tracks • {formatCount(playlist.followers)} saves
        </p>
        {!isOwner && (
          <p className="text-xs text-muted-foreground truncate">
            by {playlist.creator.name}
          </p>
        )}
      </div>

      {isOwner && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-2 rounded-full hover:bg-muted transition-colors">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Edit2 className="w-4 h-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={onDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </motion.div>
  );
}
