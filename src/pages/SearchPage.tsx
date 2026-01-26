import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, TrendingUp, Music2, Users, ListMusic, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ArtistCard } from '@/components/artists/ArtistCard';
import { TrackRow } from '@/components/tracks/TrackRow';
import { mockArtists, mockTracks, mockPlaylists, genres } from '@/data/mockData';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  user_id: string;
  username: string | null;
  name: string | null;
  avatar_url: string | null;
  is_artist: boolean | null;
  is_verified: boolean | null;
}

export default function SearchPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // Search profiles from database
  useEffect(() => {
    const searchProfiles = async () => {
      if (searchQuery.length < 2) {
        setProfiles([]);
        return;
      }
      
      setLoadingProfiles(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, user_id, username, name, avatar_url, is_artist, is_verified')
          .or(`username.ilike.%${searchQuery}%,name.ilike.%${searchQuery}%`)
          .limit(10);
        
        if (!error && data) {
          setProfiles(data);
        }
      } catch (err) {
        console.error('Error searching profiles:', err);
      } finally {
        setLoadingProfiles(false);
      }
    };

    const debounce = setTimeout(searchProfiles, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  // Save search to recent
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

  const filteredArtists = mockArtists.filter((artist) => {
    return artist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           artist.username.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredTracks = mockTracks.filter((track) => {
    return track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
           track.artist.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredPlaylists = mockPlaylists.filter((playlist) => {
    return playlist.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const isSearching = searchQuery.length > 0;

  const handleArtistClick = (artistId: string) => {
    saveSearch(searchQuery);
    navigate(`/user/${artistId}`);
  };

  const handleProfileClick = (profileId: string) => {
    saveSearch(searchQuery);
    navigate(`/user/${profileId}`);
  };

  return (
    <div className="min-h-screen pb-36">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search artists, songs, users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 bg-muted border-none h-12 rounded-xl"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted-foreground/20"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      {isSearching ? (
        // Search Results
        <div className="px-4 py-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full bg-muted/50 mb-4">
              <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
              <TabsTrigger value="users" className="flex-1">Users</TabsTrigger>
              <TabsTrigger value="tracks" className="flex-1">Tracks</TabsTrigger>
              <TabsTrigger value="artists" className="flex-1">Artists</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-6">
              {/* Database Profiles */}
              {profiles.length > 0 && (
                <div>
                  <h3 className="font-display font-bold text-lg mb-3 flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Users
                  </h3>
                  <div className="space-y-2">
                    {profiles.slice(0, 3).map((profile) => (
                      <motion.button
                        key={profile.id}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleProfileClick(profile.id)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                      >
                        <img
                          src={profile.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                          alt={profile.name || 'User'}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        <div>
                          <p className="font-semibold">{profile.name || 'User'}</p>
                          <p className="text-sm text-muted-foreground">
                            @{profile.username || 'user'} {profile.is_artist && '• Artist'}
                          </p>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tracks */}
              {filteredTracks.length > 0 && (
                <div>
                  <h3 className="font-display font-bold text-lg mb-3 flex items-center gap-2">
                    <Music2 className="w-5 h-5 text-accent" />
                    Tracks
                  </h3>
                  <div className="space-y-1">
                    {filteredTracks.slice(0, 3).map((track, index) => (
                      <TrackRow key={track.id} track={track} index={index + 1} showIndex />
                    ))}
                  </div>
                </div>
              )}

              {/* Artists */}
              {filteredArtists.length > 0 && (
                <div>
                  <h3 className="font-display font-bold text-lg mb-3 flex items-center gap-2">
                    <Users className="w-5 h-5 text-secondary" />
                    Artists
                  </h3>
                  <div className="space-y-2">
                    {filteredArtists.slice(0, 3).map((artist) => (
                      <ArtistCard
                        key={artist.id}
                        artist={artist}
                        variant="compact"
                        onClick={() => handleArtistClick(artist.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* No results */}
              {profiles.length === 0 && filteredTracks.length === 0 && filteredArtists.length === 0 && (
                <div className="py-12 text-center">
                  <Search className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No results found for "{searchQuery}"</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="users" className="space-y-2">
              {loadingProfiles && (
                <div className="py-8 text-center text-muted-foreground">Searching...</div>
              )}
              {profiles.map((profile) => (
                <motion.button
                  key={profile.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleProfileClick(profile.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                >
                  <img
                    src={profile.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                    alt={profile.name || 'User'}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <p className="font-semibold">{profile.name || 'User'}</p>
                    <p className="text-sm text-muted-foreground">
                      @{profile.username || 'user'} {profile.is_artist && '• Artist'}
                    </p>
                  </div>
                </motion.button>
              ))}
              {!loadingProfiles && profiles.length === 0 && searchQuery.length >= 2 && (
                <div className="py-8 text-center text-muted-foreground">
                  No users found
                </div>
              )}
            </TabsContent>

            <TabsContent value="tracks" className="space-y-1">
              {filteredTracks.map((track, index) => (
                <TrackRow key={track.id} track={track} index={index + 1} showIndex />
              ))}
              {filteredTracks.length === 0 && (
                <div className="py-8 text-center text-muted-foreground">
                  No tracks found
                </div>
              )}
            </TabsContent>

            <TabsContent value="artists" className="space-y-2">
              {filteredArtists.map((artist) => (
                <ArtistCard
                  key={artist.id}
                  artist={artist}
                  variant="compact"
                  onClick={() => handleArtistClick(artist.id)}
                />
              ))}
              {filteredArtists.length === 0 && (
                <div className="py-8 text-center text-muted-foreground">
                  No artists found
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        // Browse content when not searching
        <div className="px-4 py-4 space-y-6">
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display font-bold text-lg">Recent Searches</h2>
                <button 
                  onClick={clearRecentSearches}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((search, index) => (
                  <button
                    key={index}
                    onClick={() => setSearchQuery(search)}
                    className="px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 text-sm"
                  >
                    {search}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Trending */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h2 className="font-display font-bold text-lg">Trending Now</h2>
            </div>
            <div className="space-y-1">
              {mockTracks.slice(0, 5).map((track, index) => (
                <TrackRow key={track.id} track={track} index={index + 1} showIndex />
              ))}
            </div>
          </section>

          {/* Browse Genres */}
          <section>
            <h2 className="font-display font-bold text-lg mb-3">Browse Genres</h2>
            <div className="grid grid-cols-2 gap-2">
              {genres.slice(0, 8).map((genre) => (
                <motion.button
                  key={genre}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate(`/discover?genre=${genre}`)}
                  className="p-4 rounded-xl bg-gradient-to-br from-primary/20 to-accent/10 text-left"
                >
                  <Music2 className="w-5 h-5 text-primary mb-1" />
                  <p className="font-medium">{genre}</p>
                </motion.button>
              ))}
            </div>
          </section>

          {/* Popular Artists */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-5 h-5 text-accent" />
              <h2 className="font-display font-bold text-lg">Popular Artists</h2>
            </div>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
              {mockArtists.slice(0, 5).map((artist) => (
                <motion.div
                  key={artist.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleArtistClick(artist.id)}
                  className="flex-shrink-0 w-24 text-center cursor-pointer"
                >
                  <img
                    src={artist.avatar}
                    alt={artist.name}
                    className="w-24 h-24 rounded-full object-cover mb-2"
                  />
                  <p className="font-medium text-sm truncate">{artist.name}</p>
                </motion.div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
