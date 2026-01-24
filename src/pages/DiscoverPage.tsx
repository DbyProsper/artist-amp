import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, TrendingUp, Sparkles, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ArtistCard } from '@/components/artists/ArtistCard';
import { TrackRow } from '@/components/tracks/TrackRow';
import { mockArtists, mockTracks, genres, mockPlaylists } from '@/data/mockData';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function DiscoverPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  const filteredArtists = mockArtists.filter((artist) => {
    const matchesSearch = artist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         artist.username.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGenre = !selectedGenre || artist.genres.includes(selectedGenre);
    return matchesSearch && matchesGenre;
  });

  const filteredTracks = mockTracks.filter((track) => {
    const matchesSearch = track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         track.artist.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const filteredPlaylists = mockPlaylists.filter((playlist) => {
    const matchesSearch = playlist.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const isSearching = searchQuery.length > 0;

  const handleArtistClick = (artistId: string) => {
    navigate(`/user/${artistId}`);
  };

  return (
    <div className="min-h-screen pb-36">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search artists, songs, playlists..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-muted border-none h-12 rounded-xl"
          />
        </div>
      </header>

      {isSearching ? (
        // Search Results with Tabs
        <div className="px-4 py-4">
          <Tabs defaultValue="all" onValueChange={setActiveTab}>
            <TabsList className="w-full bg-muted/50 mb-4">
              <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
              <TabsTrigger value="tracks" className="flex-1">Tracks</TabsTrigger>
              <TabsTrigger value="artists" className="flex-1">Artists</TabsTrigger>
              <TabsTrigger value="playlists" className="flex-1">Playlists</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-6">
              {/* Tracks */}
              {filteredTracks.length > 0 && (
                <div>
                  <h3 className="font-display font-bold text-lg mb-3">Tracks</h3>
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
                  <h3 className="font-display font-bold text-lg mb-3">Artists</h3>
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

              {/* Playlists */}
              {filteredPlaylists.length > 0 && (
                <div>
                  <h3 className="font-display font-bold text-lg mb-3">Playlists</h3>
                  <div className="space-y-2">
                    {filteredPlaylists.slice(0, 2).map((playlist) => (
                      <motion.button
                        key={playlist.id}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => navigate('/playlists')}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                      >
                        <img
                          src={playlist.coverImage}
                          alt={playlist.name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                        <div>
                          <p className="font-semibold">{playlist.name}</p>
                          <p className="text-sm text-muted-foreground">{playlist.tracks.length} tracks</p>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {filteredTracks.length === 0 && filteredArtists.length === 0 && filteredPlaylists.length === 0 && (
                <div className="py-12 text-center">
                  <Search className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No results found for "{searchQuery}"</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="tracks" className="space-y-1">
              {filteredTracks.map((track, index) => (
                <TrackRow key={track.id} track={track} index={index + 1} showIndex />
              ))}
              {filteredTracks.length === 0 && (
                <div className="py-12 text-center">
                  <p className="text-muted-foreground">No tracks found</p>
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
                <div className="py-12 text-center">
                  <p className="text-muted-foreground">No artists found</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="playlists" className="space-y-2">
              {filteredPlaylists.map((playlist) => (
                <motion.button
                  key={playlist.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate('/playlists')}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                >
                  <img
                    src={playlist.coverImage}
                    alt={playlist.name}
                    className="w-14 h-14 rounded-lg object-cover"
                  />
                  <div>
                    <p className="font-semibold">{playlist.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {playlist.tracks.length} tracks • By {playlist.creator.name}
                    </p>
                  </div>
                </motion.button>
              ))}
              {filteredPlaylists.length === 0 && (
                <div className="py-12 text-center">
                  <p className="text-muted-foreground">No playlists found</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        <>
          {/* Genres */}
          <section className="px-4 py-4">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedGenre(null)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  !selectedGenre
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                All
              </motion.button>
              {genres.slice(0, 10).map((genre) => (
                <motion.button
                  key={genre}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedGenre(genre)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedGenre === genre
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {genre}
                </motion.button>
              ))}
            </div>
          </section>

          {/* Trending Section */}
          <section className="px-4 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h2 className="font-display font-bold text-lg">Trending Now</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {filteredArtists.slice(0, 2).map((artist) => (
                <ArtistCard
                  key={artist.id}
                  artist={artist}
                  variant="featured"
                  onClick={() => handleArtistClick(artist.id)}
                />
              ))}
            </div>
          </section>

          {/* Top Tracks */}
          <section className="px-4 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-accent" />
              <h2 className="font-display font-bold text-lg">Top Tracks</h2>
            </div>
            <div className="space-y-1">
              {mockTracks.map((track, index) => (
                <TrackRow key={track.id} track={track} index={index + 1} showIndex />
              ))}
            </div>
          </section>

          {/* Artists to Follow */}
          <section className="px-4">
            <h2 className="font-display font-bold text-lg mb-4">Artists to Follow</h2>
            <div className="space-y-2">
              {filteredArtists.map((artist) => (
                <ArtistCard
                  key={artist.id}
                  artist={artist}
                  variant="compact"
                  onClick={() => handleArtistClick(artist.id)}
                />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
