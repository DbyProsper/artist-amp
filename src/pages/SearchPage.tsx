import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, TrendingUp, Music2, Users, ListMusic, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { TrackRow } from '@/components/tracks/TrackRow';
import { genres } from '@/data/mockData';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Track, Artist } from '@/types';

interface Profile {
  id: string;
  user_id: string;
  username: string | null;
  name: string | null;
  avatar_url: string | null;
  is_artist: boolean | null;
  is_verified: boolean | null;
}

interface DbPlaylist {
  id: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  is_public: boolean | null;
  creator_id: string;
}

export default function SearchPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [dbTracks, setDbTracks] = useState<Track[]>([]);
  const [dbPlaylists, setDbPlaylists] = useState<DbPlaylist[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) setRecentSearches(JSON.parse(saved));
  }, []);

  // Search from database
  useEffect(() => {
    const searchAll = async () => {
      if (searchQuery.length < 2) {
        setProfiles([]);
        setDbTracks([]);
        setDbPlaylists([]);
        return;
      }
      setLoadingProfiles(true);
      try {
        // Search profiles
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, user_id, username, name, avatar_url, is_artist, is_verified')
          .or(`username.ilike.%${searchQuery}%,name.ilike.%${searchQuery}%`)
          .limit(10);
        if (profilesData) setProfiles(profilesData);

        // Search tracks
        const { data: tracksData } = await supabase
          .from('tracks')
          .select('id, title, cover_url, audio_url, duration, plays, likes, profile_id, profiles:profile_id(id, name, username, avatar_url, is_verified)')
          .ilike('title', `%${searchQuery}%`)
          .eq('is_public', true)
          .limit(10);

        if (tracksData) {
          const transformed: Track[] = tracksData.map((t: any) => ({
            id: t.id,
            title: t.title,
            coverArt: t.cover_url || 'https://images.unsplash.com/photo-1614149162883-504ce4d13909?w=400',
            duration: t.duration || 0,
            plays: t.plays || 0,
            likes: t.likes || 0,
            audioUrl: t.audio_url || undefined,
            artist: {
              id: t.profiles?.id || t.profile_id,
              name: t.profiles?.name || 'Unknown',
              username: t.profiles?.username || 'unknown',
              avatar: t.profiles?.avatar_url || '',
              coverImage: '',
              bio: '',
              location: '',
              genres: [],
              isVerified: t.profiles?.is_verified || false,
              followers: 0,
              following: 0,
              tracks: 0,
            } as Artist,
          }));
          setDbTracks(transformed);
        }

        // Search playlists
        const { data: playlistsData } = await supabase
          .from('playlists')
          .select('id, name, description, cover_url, is_public, creator_id')
          .ilike('name', `%${searchQuery}%`)
          .eq('is_public', true)
          .limit(10);
        if (playlistsData) setDbPlaylists(playlistsData);
      } catch (err) {
        console.error('Error searching:', err);
      } finally {
        setLoadingProfiles(false);
      }
    };

    const debounce = setTimeout(searchAll, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const saveSearch = (query: string) => {
    if (!query.trim()) return;
    const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  const handleProfileClick = (profileId: string) => {
    saveSearch(searchQuery);
    navigate(`/user/${profileId}`);
  };

  const isSearching = searchQuery.length > 0;

  return (
    <div className="min-h-screen pb-36">
      <header className="sticky top-0 z-40 glass border-b border-border p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search users, tracks, playlists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 bg-muted border-none h-12 rounded-xl"
              autoFocus
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted-foreground/20">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      </header>

      {isSearching ? (
        <div className="px-4 py-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full bg-muted/50 mb-4">
              <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
              <TabsTrigger value="users" className="flex-1">Users</TabsTrigger>
              <TabsTrigger value="tracks" className="flex-1">Tracks</TabsTrigger>
              <TabsTrigger value="playlists" className="flex-1">Playlists</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-6">
              {profiles.length > 0 && (
                <div>
                  <h3 className="font-display font-bold text-lg mb-3 flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" /> Users
                  </h3>
                  <div className="space-y-2">
                    {profiles.slice(0, 3).map((p) => (
                      <ProfileRow key={p.id} profile={p} onClick={() => handleProfileClick(p.id)} />
                    ))}
                  </div>
                </div>
              )}

              {dbTracks.length > 0 && (
                <div>
                  <h3 className="font-display font-bold text-lg mb-3 flex items-center gap-2">
                    <Music2 className="w-5 h-5 text-accent" /> Tracks
                  </h3>
                  <div className="space-y-1">
                    {dbTracks.slice(0, 3).map((track, i) => (
                      <TrackRow key={track.id} track={track} index={i + 1} showIndex />
                    ))}
                  </div>
                </div>
              )}

              {dbPlaylists.length > 0 && (
                <div>
                  <h3 className="font-display font-bold text-lg mb-3 flex items-center gap-2">
                    <ListMusic className="w-5 h-5 text-secondary" /> Playlists
                  </h3>
                  <div className="space-y-2">
                    {dbPlaylists.slice(0, 3).map((pl) => (
                      <div key={pl.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                          {pl.cover_url ? <img src={pl.cover_url} className="w-full h-full object-cover" /> : <ListMusic className="w-5 h-5 text-muted-foreground" />}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{pl.name}</p>
                          <p className="text-xs text-muted-foreground">{pl.description || 'Playlist'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {profiles.length === 0 && dbTracks.length === 0 && dbPlaylists.length === 0 && !loadingProfiles && (
                <div className="py-12 text-center">
                  <Search className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No results found for "{searchQuery}"</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="users" className="space-y-2">
              {loadingProfiles && <div className="py-8 text-center text-muted-foreground">Searching...</div>}
              {profiles.map((p) => (
                <ProfileRow key={p.id} profile={p} onClick={() => handleProfileClick(p.id)} />
              ))}
              {!loadingProfiles && profiles.length === 0 && searchQuery.length >= 2 && (
                <div className="py-8 text-center text-muted-foreground">No users found</div>
              )}
            </TabsContent>

            <TabsContent value="tracks" className="space-y-1">
              {dbTracks.map((track, i) => (
                <TrackRow key={track.id} track={track} index={i + 1} showIndex />
              ))}
              {dbTracks.length === 0 && !loadingProfiles && (
                <div className="py-8 text-center text-muted-foreground">No tracks found</div>
              )}
            </TabsContent>

            <TabsContent value="playlists" className="space-y-2">
              {dbPlaylists.map((pl) => (
                <div key={pl.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                    {pl.cover_url ? <img src={pl.cover_url} className="w-full h-full object-cover" /> : <ListMusic className="w-5 h-5 text-muted-foreground" />}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{pl.name}</p>
                    <p className="text-xs text-muted-foreground">{pl.description || 'Playlist'}</p>
                  </div>
                </div>
              ))}
              {dbPlaylists.length === 0 && !loadingProfiles && (
                <div className="py-8 text-center text-muted-foreground">No playlists found</div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        <div className="px-4 py-4 space-y-6">
          {recentSearches.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display font-bold text-lg">Recent Searches</h2>
                <button onClick={clearRecentSearches} className="text-sm text-muted-foreground hover:text-foreground">Clear</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((search, i) => (
                  <button key={i} onClick={() => setSearchQuery(search)} className="px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 text-sm">{search}</button>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="font-display font-bold text-lg mb-3">Browse Genres</h2>
            <div className="grid grid-cols-2 gap-2">
              {genres.slice(0, 8).map((genre) => (
                <motion.button key={genre} whileTap={{ scale: 0.95 }} onClick={() => navigate(`/discover?genre=${genre}`)} className="p-4 rounded-xl bg-gradient-to-br from-primary/20 to-accent/10 text-left">
                  <Music2 className="w-5 h-5 text-primary mb-1" />
                  <p className="font-medium">{genre}</p>
                </motion.button>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function ProfileRow({ profile, onClick }: { profile: { id: string; name: string | null; username: string | null; avatar_url: string | null; is_artist: boolean | null }; onClick: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors text-left"
    >
      <img
        src={profile.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
        alt={profile.name || 'User'}
        className="w-12 h-12 rounded-full object-cover"
      />
      <div>
        <p className="font-semibold">{profile.name || 'User'}</p>
        <p className="text-sm text-muted-foreground">@{profile.username || 'user'} {profile.is_artist && '• Artist'}</p>
      </div>
    </motion.button>
  );
}
