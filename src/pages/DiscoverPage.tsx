import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, TrendingUp, Sparkles, Filter, Heart, Users, 
  Radio, ArrowRight
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ArtistCard } from '@/components/artists/ArtistCard';
import { TrackRow } from '@/components/tracks/TrackRow';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { DISCOVER_GENRES, canonicalGenre, genreMatches } from '@/lib/genres';
import { useAuth } from '@/context/FirebaseAuthContext';
import { addDoc, collection, deleteDoc, getDocs, query, serverTimestamp, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';

type SortOption = 'trending' | 'newest' | 'popular';

export default function DiscoverPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile } = useAuth();
  const { catalog, listeningHistory, preferredGenres, currentTrack, catalogLoading } = usePlayer();
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') || '');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('for-you');
  const [sortBy, setSortBy] = useState<SortOption>('trending');
  const { posts } = useFeedPosts();
  const [followerCounts, setFollowerCounts] = useState<Record<string, number>>({});
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const liveTracks = posts.filter(post => post.track?.audioUrl).map(post => post.track!).filter((track, index, list) => list.findIndex(item => item.id === track.id) === index);
  const liveArtists = posts.map(post => post.artist).filter((artist, index, list) => list.findIndex(item => item.id === artist.id) === index);
  const catalogTracks = catalog.length ? catalog : liveTracks;
  const isOfficialAccount = (artist: { id: string; username: string }) => artist.id === 'musicinsta-official' || artist.id === 'musicinsta' || artist.username.toLowerCase() === 'musicinsta';
  const catalogArtists = [...catalogTracks.map(track => track.artist), ...liveArtists]
    .filter((artist, index, list) => !isOfficialAccount(artist) && list.findIndex(item => item.id === artist.id) === index)
    .map(artist => ({ ...artist, followers: followerCounts[artist.id] ?? artist.followers }));
  const genres = [...new Set([...DISCOVER_GENRES, ...catalogTracks.flatMap(track => [track.genre, ...track.artist.genres]).filter(Boolean).map(value => canonicalGenre(String(value)))])];
  const liveTrackIds = new Set(liveTracks.map(track => track.id));
  const personalizedTracks = useMemo(() => rankCatalog(catalogTracks, listeningHistory, currentTrack, preferredGenres).map(item => item.track), [catalogTracks, listeningHistory, currentTrack, preferredGenres]);

  useEffect(() => {
    getDocs(collection(db, 'follows')).then(snapshot => {
      const counts: Record<string, number> = {};
      const own = new Set<string>();
      snapshot.docs.forEach(item => {
        const data = item.data();
        const target = String(data.following_id || '');
        counts[target] = (counts[target] || 0) + 1;
        const belongsToCurrentUser = Boolean(user?.uid && (
          data.auth_user_id === user.uid || data.follower_id === user.uid || data.follower_id === profile?.id
        ));
        if (belongsToCurrentUser) own.add(target);
      });
      setFollowerCounts(counts); setFollowingIds(own);
    }).catch(() => undefined);
  }, [profile?.id, user?.uid]);

  const toggleFollow = async (artistId: string) => {
    if (!user || !profile) { toast.info('Sign in to follow artists.'); navigate('/auth'); return; }
    try {
      const candidates = await getDocs(query(collection(db, 'follows'), where('following_id', '==', artistId)));
      const existing = candidates.docs.filter(item => {
        const data = item.data();
        return data.auth_user_id === user.uid || data.follower_id === user.uid || data.follower_id === profile.id;
      });
      if (existing.length) {
        await Promise.all(existing.map(item => deleteDoc(item.ref)));
        setFollowingIds(current => { const next = new Set(current); next.delete(artistId); return next; });
        setFollowerCounts(current => ({ ...current, [artistId]: Math.max(0, (current[artistId] || 1) - 1) }));
      } else {
        await addDoc(collection(db, 'follows'), { follower_id: profile.id, auth_user_id: user.uid, following_id: artistId, created_at: serverTimestamp() });
        setFollowingIds(current => new Set(current).add(artistId));
        setFollowerCounts(current => ({ ...current, [artistId]: (current[artistId] || 0) + 1 }));
      }
    } catch { toast.error('Could not update this follow.'); }
  };

  const filteredArtists = catalogArtists.filter((artist) => {
    const artistNeedle = searchQuery.toLowerCase().replace(/^[@#]/, '');
    const matchesSearch = artist.name.toLowerCase().includes(artistNeedle) ||
                         artist.username.toLowerCase().includes(artistNeedle);
    const matchesGenre = !selectedGenre || artist.genres.some(genre => genreMatches(genre, selectedGenre));
    return matchesSearch && matchesGenre;
  });

  const filteredTracks = catalogTracks.filter((track) => {
    const needle = searchQuery.toLowerCase().replace(/^#/, '');
    const searchable = [track.title, track.artist.name, track.genre, track.mood, ...(track.tags || [])].filter(Boolean).join(' ').toLowerCase();
    const matchesSearch = searchable.includes(needle);
    // Track filters are deliberately strict. An artist's profile genre must not
    // cause all of their songs to appear under that genre.
    const matchesGenre = !selectedGenre || genreMatches(track.genre, selectedGenre);
    return matchesSearch && matchesGenre;
  });
  const filteredTrackIds = new Set(filteredTracks.map(track => track.id));
  const rankedFilteredTracks = personalizedTracks.filter(track => filteredTrackIds.has(track.id));
  const rankedFilteredIds = new Set(rankedFilteredTracks.map(track => track.id));
  const personalizedGenreTracks = [...rankedFilteredTracks, ...filteredTracks.filter(track => !rankedFilteredIds.has(track.id))];
  const fallbackTracks = selectedGenre ? personalizedTracks.filter(track => !genreMatches(track.genre, selectedGenre)).slice(0, 6) : [];
  const visibleArtists = selectedGenre ? filteredArtists : catalogArtists;
  const followedArtists = visibleArtists.filter(artist => followingIds.has(artist.id));
  const suggestedArtists = visibleArtists.filter(artist => artist.id !== profile?.id && !followingIds.has(artist.id));

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
                     {personalizedGenreTracks.slice(0, 8).map((track, index) => (
                       <TrackRow key={track.id} track={track} index={index + 1} showIndex queue={personalizedGenreTracks} />
                    ))}
                    {catalogLoading && <p className="py-4 text-sm text-muted-foreground">Loading your recommendations...</p>}
                    {!catalogLoading && personalizedGenreTracks.length === 0 && !selectedGenre && <p className="py-4 text-sm text-muted-foreground">No playable music has been added to the cloud catalogue yet.</p>}
                    {!catalogLoading && selectedGenre && personalizedGenreTracks.length === 0 && <div className="rounded-xl border border-border bg-muted/30 p-4"><p className="font-medium">No {selectedGenre} music is available yet.</p><p className="mt-1 text-sm text-muted-foreground">Here are other recommendations based on your listening and preferred genres.</p><div className="mt-3 space-y-1">{fallbackTracks.map((track, index) => <TrackRow key={track.id} track={track} index={index + 1} showIndex queue={fallbackTracks} />)}</div></div>}
                  </div>
                </section>

                {/* From artists you follow */}
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-accent" />
                      <h2 className="font-display font-bold text-lg">From artists you follow</h2>
                    </div>
                  </div>
                  <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                    {followedArtists.slice(0, 4).map((artist) => (
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
                    {followedArtists.length === 0 && <p className="py-4 text-sm text-muted-foreground">Music from artists you follow will appear here.</p>}
                  </div>
                </section>

                {/* Artists you might like */}
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-secondary" />
                      <h2 className="font-display font-bold text-lg">Artists you might like</h2>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {suggestedArtists.slice(0, 3).map((artist) => (
                      <ArtistCard
                        key={artist.id}
                        artist={artist}
                        variant="compact"
                        onClick={() => handleArtistClick(artist.id)}
                        showFollow={Boolean(user)}
                        isFollowing={followingIds.has(artist.id)}
                        onFollow={() => void toggleFollow(artist.id)}
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
                    {selectedGenre && filteredTracks.length === 0 && <div className="rounded-xl border border-border bg-muted/30 p-4"><p className="font-medium">Nothing is trending in {selectedGenre} yet.</p><p className="mt-1 text-sm text-muted-foreground">Try these personalized recommendations instead.</p><div className="mt-3 space-y-1">{fallbackTracks.map((track, index) => <TrackRow key={track.id} track={track} index={index + 1} showIndex queue={fallbackTracks} />)}</div></div>}
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
                    {visibleArtists.slice(0, 4).map((artist) => (
                      <ArtistCard
                        key={artist.id}
                        artist={artist}
                        variant="featured"
                        onClick={() => handleArtistClick(artist.id)}
                        showFollow={Boolean(user)}
                        isFollowing={followingIds.has(artist.id)}
                        onFollow={() => void toggleFollow(artist.id)}
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
              {DISCOVER_GENRES.map((genre) => (
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
