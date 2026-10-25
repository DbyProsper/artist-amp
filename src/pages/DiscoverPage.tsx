import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, TrendingUp, Sparkles, Filter, Heart, Users, 
  Music2, Radio, ChevronDown, ArrowRight
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ArtistCard } from '@/components/artists/ArtistCard';
import { TrackRow } from '@/components/tracks/TrackRow';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useFeedPosts } from '@/hooks/useFeedPosts';
import { usePlayer } from '@/context/PlayerContext';
import { rankCatalog } from '@/services/recommendationEngine';
import type { Track } from '@/types';

type SortOption = 'trending' | 'newest' | 'popular';

export default function DiscoverPage() {
  const navigate = useNavigate();
  const { catalog, listeningHistory, preferredGenres, currentTrack, catalogLoading } = usePlayer();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('for-you');
  const [sortBy, setSortBy] = useState<SortOption>('trending');
  const { posts } = useFeedPosts();
  const liveTracks = posts.filter(post => post.track?.audioUrl).map(post => post.track!).filter((track, index, list) => list.findIndex(item => item.id === track.id) === index);
  const liveArtists = posts.map(post => post.artist).filter((artist, index, list) => list.findIndex(item => item.id === artist.id) === index);
  const catalogTracks = catalog.length ? catalog : liveTracks;
  const catalogArtists = [...catalogTracks.map(track => track.artist), ...liveArtists].filter((artist, index, list) => list.findIndex(item => item.id === artist.id) === index);
  const genres = [...new Set(catalogTracks.flatMap(track => [track.genre, ...track.artist.genres]).filter(Boolean) as string[])].sort();
  const liveTrackIds = new Set(liveTracks.map(track => track.id));
  const personalizedTracks = useMemo(() => rankCatalog(catalogTracks, listeningHistory, currentTrack, preferredGenres).map(item => item.track), [catalogTracks, listeningHistory, currentTrack, preferredGenres]);

  const filteredArtists = catalogArtists.filter((artist) => {
    const matchesSearch = artist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         artist.username.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGenre = !selectedGenre || artist.genres.includes(selectedGenre);
    return matchesSearch && matchesGenre;
  });

  const filteredTracks = catalogTracks.filter((track) => {
    const matchesSearch = track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         track.artist.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGenre = !selectedGenre || track.genre?.toLowerCase() === selectedGenre.toLowerCase() || track.artist.genres.some(genre => genre.toLowerCase() === selectedGenre.toLowerCase());
    return matchesSearch && matchesGenre;
  });

  const sortTracks = (tracks: Track[]) => {
    switch (sortBy) {
      case 'trending':
        return [...tracks].sort((a, b) => (Number(liveTrackIds.has(b.id)) - Number(liveTrackIds.has(a.id))) || b.plays - a.plays);
      case 'newest':
        return [...tracks].sort((a, b) => Number(liveTrackIds.has(b.id)) - Number(liveTrackIds.has(a.id)));
      case 'popular':
        return [...tracks].sort((a, b) => (Number(liveTrackIds.has(b.id)) - Number(liveTrackIds.has(a.id))) || b.likes - a.likes);
      default:
        return tracks;
    }
  };

  const isSearching = searchQuery.length > 0;

  const handleArtistClick = (artistId: string) => {
    navigate(`/user/${artistId}`);
  };

  const sortLabel = {
    trending: 'Trending',
    newest: 'Newest',
    popular: 'Most Popular',
  };

  return (
    <div className="min-h-screen pb-36">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search real artists and songs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-muted border-none h-12 rounded-xl"
            />
          </div>
          
          {/* Filter Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-3 rounded-xl bg-muted hover:bg-muted/80 transition-colors">
                <Filter className="w-5 h-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium">Sort By</div>
              <DropdownMenuItem onClick={() => setSortBy('trending')}>
                <TrendingUp className="w-4 h-4 mr-2" />
                Trending
                {sortBy === 'trending' && <span className="ml-auto text-primary">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('newest')}>
                <Sparkles className="w-4 h-4 mr-2" />
                Newest
                {sortBy === 'newest' && <span className="ml-auto text-primary">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('popular')}>
                <Heart className="w-4 h-4 mr-2" />
                Most Popular
                {sortBy === 'popular' && <span className="ml-auto text-primary">✓</span>}
              </DropdownMenuItem>
              <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium mt-2">Genre</div>
              <DropdownMenuItem onClick={() => setSelectedGenre(null)}>
                All Genres
                {!selectedGenre && <span className="ml-auto text-primary">✓</span>}
              </DropdownMenuItem>
              {genres.slice(0, 8).map(genre => (
                <DropdownMenuItem key={genre} onClick={() => setSelectedGenre(genre)}>
                  {genre}
                  {selectedGenre === genre && <span className="ml-auto text-primary">✓</span>}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Current filter display */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Sort: {sortLabel[sortBy]}</span>
          {selectedGenre && (
            <>
              <span>•</span>
              <span className="text-primary">{selectedGenre}</span>
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      {isSearching ? (
        // Search Results
        <div className="px-4 py-4">
          <Tabs defaultValue="all" onValueChange={setActiveTab}>
            <TabsList className="w-full bg-muted/50 mb-4">
              <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
              <TabsTrigger value="tracks" className="flex-1">Tracks</TabsTrigger>
              <TabsTrigger value="artists" className="flex-1">Artists</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-6">
              {filteredTracks.length > 0 && (
                <div>
                  <h3 className="font-display font-bold text-lg mb-3">Tracks</h3>
                  <div className="space-y-1">
                    {sortTracks(filteredTracks).slice(0, 3).map((track, index) => (
                      <TrackRow key={track.id} track={track} index={index + 1} showIndex queue={sortTracks(filteredTracks)} />
                    ))}
                  </div>
                </div>
              )}

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
            </TabsContent>

            <TabsContent value="tracks" className="space-y-1">
              {sortTracks(filteredTracks).map((track, index) => (
                <TrackRow key={track.id} track={track} index={index + 1} showIndex queue={sortTracks(filteredTracks)} />
              ))}
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
            </TabsContent>

          </Tabs>
        </div>
      ) : (
        <>
          {/* Hero Section */}
          <section className="px-4 py-6 bg-gradient-to-b from-primary/10 to-transparent">
            <div className="flex items-center gap-3 mb-2">
              <Radio className="w-6 h-6 text-primary" />
              <h1 className="font-display font-bold text-2xl">Discover</h1>
            </div>
            <p className="text-muted-foreground">Your personalized music feed</p>
          </section>

          {/* Tabs: For You / Trending */}
          <div className="px-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full bg-muted/30 mb-4">
                <TabsTrigger value="for-you" className="flex-1">For You</TabsTrigger>
                <TabsTrigger value="trending" className="flex-1">Trending</TabsTrigger>
              </TabsList>

              <TabsContent value="for-you" className="space-y-6">
                {/* Based on your taste */}
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <Heart className="w-5 h-5 text-primary" />
                    <h2 className="font-display font-bold text-lg">Based on your taste</h2>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Automatically ranked from MusicInsta's cloud music catalogue using your plays, likes, completed listens and skips.
                  </p>
                  <div className="space-y-1">
                     {personalizedTracks.filter(track => filteredTracks.some(item => item.id === track.id)).slice(0, 8).map((track, index) => (
                       <TrackRow key={track.id} track={track} index={index + 1} showIndex queue={personalizedTracks} />
                    ))}
                    {catalogLoading && <p className="py-4 text-sm text-muted-foreground">Loading your recommendations...</p>}
                    {!catalogLoading && personalizedTracks.length === 0 && <p className="py-4 text-sm text-muted-foreground">No playable music has been added to the cloud catalogue yet.</p>}
                  </div>
                </section>

                {/* From artists you follow */}
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-accent" />
                      <h2 className="font-display font-bold text-lg">From artists you follow</h2>
                    </div>
                    <button className="text-sm text-primary hover:underline flex items-center gap-1">
                      See all <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                    {catalogArtists.slice(0, 4).map((artist) => (
                      <motion.div
                        key={artist.id}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleArtistClick(artist.id)}
                        className="flex-shrink-0 w-32"
                      >
                        <div className="w-32 h-32 rounded-xl overflow-hidden mb-2">
                          <img
                            src={artist.avatar}
                            alt={artist.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <p className="font-medium text-sm truncate">{artist.name}</p>
                        <p className="text-xs text-muted-foreground">{artist.genres[0]}</p>
                      </motion.div>
                    ))}
                  </div>
                </section>

                {/* Artists you might like */}
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-secondary" />
                      <h2 className="font-display font-bold text-lg">Artists you might like</h2>
                    </div>
                    <button className="text-sm text-primary hover:underline flex items-center gap-1">
                      See all <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {catalogArtists.slice(2, 5).map((artist) => (
                      <ArtistCard
                        key={artist.id}
                        artist={artist}
                        variant="compact"
                        onClick={() => handleArtistClick(artist.id)}
                      />
                    ))}
                  </div>
                </section>

              </TabsContent>

              <TabsContent value="trending" className="space-y-6">
                {/* Trending Now */}
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-primary" />
                      <h2 className="font-display font-bold text-lg">Trending Now</h2>
                    </div>
                    <button className="text-sm text-primary hover:underline flex items-center gap-1">
                      See all <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    What everyone's listening to
                  </p>
                  <div className="space-y-1">
                    {sortTracks(filteredTracks).slice(0, 5).map((track, index) => (
                      <TrackRow key={track.id} track={track} index={index + 1} showIndex queue={sortTracks(filteredTracks)} />
                    ))}
                  </div>
                </section>

                {/* Trending Artists */}
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-accent" />
                      <h2 className="font-display font-bold text-lg">Trending Artists</h2>
                    </div>
                    <button className="text-sm text-primary hover:underline flex items-center gap-1">
                      See all <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {catalogArtists.slice(0, 4).map((artist) => (
                      <ArtistCard
                        key={artist.id}
                        artist={artist}
                        variant="featured"
                        onClick={() => handleArtistClick(artist.id)}
                      />
                    ))}
                  </div>
                </section>

              </TabsContent>
            </Tabs>
          </div>

          {/* Genre Chips */}
          <section className="px-4 py-4 mt-4">
            <h3 className="font-semibold mb-3">Browse by Genre</h3>
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
              {genres.slice(0, 12).map((genre) => (
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
        </>
      )}
    </div>
  );
}
