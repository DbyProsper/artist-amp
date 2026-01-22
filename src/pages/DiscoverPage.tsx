import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, TrendingUp, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ArtistCard } from '@/components/artists/ArtistCard';
import { TrackRow } from '@/components/tracks/TrackRow';
import { mockArtists, mockTracks, genres } from '@/data/mockData';

export default function DiscoverPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);

  const filteredArtists = mockArtists.filter((artist) => {
    const matchesSearch = artist.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGenre = !selectedGenre || artist.genres.includes(selectedGenre);
    return matchesSearch && matchesGenre;
  });

  return (
    <div className="min-h-screen pb-36">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search artists, songs, albums..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-muted border-none h-12 rounded-xl"
          />
        </div>
      </header>

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
            <ArtistCard key={artist.id} artist={artist} variant="featured" />
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
            <ArtistCard key={artist.id} artist={artist} variant="compact" />
          ))}
        </div>
      </section>
    </div>
  );
}
