import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Play, Heart, Users, TrendingUp, 
  Calendar, MapPin, Clock, Music2, BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

interface TrackStats {
  id: string;
  title: string;
  plays: number;
  likes: number;
  cover_url: string | null;
}

interface DailyStats {
  date: string;
  plays: number;
  likes: number;
}

export default function AnalyticsDashboardPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [tracks, setTracks] = useState<TrackStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPlays, setTotalPlays] = useState(0);
  const [totalLikes, setTotalLikes] = useState(0);
  const [followerCount, setFollowerCount] = useState(0);

  useEffect(() => {
    if (!user || !profile) {
      navigate('/auth');
      return;
    }

    if (!profile.is_artist) {
      navigate('/profile');
      return;
    }

    fetchAnalytics();
  }, [user, profile, navigate]);

  const fetchAnalytics = async () => {
    if (!profile) return;
    
    setLoading(true);
    try {
      // Fetch tracks with stats
      const { data: tracksData, error } = await supabase
        .from('tracks')
        .select('id, title, plays, likes, cover_url')
        .eq('profile_id', profile.id)
        .order('plays', { ascending: false });

      if (!error && tracksData) {
        setTracks(tracksData);
        setTotalPlays(tracksData.reduce((acc, t) => acc + (t.plays || 0), 0));
        setTotalLikes(tracksData.reduce((acc, t) => acc + (t.likes || 0), 0));
      }

      // Fetch follower count
      const { count } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', profile.id);

      setFollowerCount(count || 0);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  // Generate mock daily data for charts
  const last7Days: DailyStats[] = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return {
      date: date.toLocaleDateString('en-US', { weekday: 'short' }),
      plays: Math.floor(Math.random() * 500) + 100,
      likes: Math.floor(Math.random() * 50) + 10,
    };
  });

  // Mock demographics data
  const demographics = [
    { name: 'South Africa', value: 45, color: 'hsl(var(--primary))' },
    { name: 'USA', value: 20, color: 'hsl(var(--secondary))' },
    { name: 'UK', value: 15, color: 'hsl(var(--accent))' },
    { name: 'Nigeria', value: 12, color: 'hsl(var(--muted-foreground))' },
    { name: 'Other', value: 8, color: 'hsl(var(--border))' },
  ];

  const ageGroups = [
    { age: '13-17', value: 10 },
    { age: '18-24', value: 35 },
    { age: '25-34', value: 30 },
    { age: '35-44', value: 15 },
    { age: '45+', value: 10 },
  ];

  if (!profile?.is_artist) return null;

  return (
    <div className="min-h-screen pb-36">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="flex items-center gap-3 px-4 h-14">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <BarChart3 className="w-5 h-5 text-primary" />
          <h1 className="font-display font-bold text-lg">Analytics</h1>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-3 gap-3">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5"
          >
            <Play className="w-6 h-6 text-primary mb-2" />
            <p className="text-2xl font-bold">{totalPlays.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total Plays</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5"
          >
            <Heart className="w-6 h-6 text-accent mb-2" />
            <p className="text-2xl font-bold">{totalLikes.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total Likes</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-4 rounded-xl bg-gradient-to-br from-secondary/20 to-secondary/5"
          >
            <Users className="w-6 h-6 text-secondary mb-2" />
            <p className="text-2xl font-bold">{followerCount.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Followers</p>
          </motion.div>
        </div>

        {/* Performance Chart */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-4 rounded-xl bg-muted/30"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold">Weekly Performance</h2>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-primary" />
                Plays
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-accent" />
                Likes
              </span>
            </div>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={last7Days}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Line type="monotone" dataKey="plays" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="likes" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Demographics */}
        <Tabs defaultValue="location" className="space-y-4">
          <TabsList className="w-full bg-muted/50">
            <TabsTrigger value="location" className="flex-1 gap-1">
              <MapPin className="w-4 h-4" />
              Location
            </TabsTrigger>
            <TabsTrigger value="age" className="flex-1 gap-1">
              <Users className="w-4 h-4" />
              Age
            </TabsTrigger>
          </TabsList>

          <TabsContent value="location">
            <div className="p-4 rounded-xl bg-muted/30">
              <h3 className="font-display font-bold mb-4">Listener Locations</h3>
              <div className="flex items-center gap-6">
                <div className="w-32 h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={demographics}
                        cx="50%"
                        cy="50%"
                        innerRadius={25}
                        outerRadius={45}
                        dataKey="value"
                      >
                        {demographics.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2">
                  {demographics.map((item) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                        {item.name}
                      </span>
                      <span className="text-muted-foreground">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="age">
            <div className="p-4 rounded-xl bg-muted/30">
              <h3 className="font-display font-bold mb-4">Age Distribution</h3>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ageGroups}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="age" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Top Tracks */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="font-display font-bold mb-4">Top Tracks</h2>
          <div className="space-y-2">
            {tracks.slice(0, 5).map((track, index) => (
              <div key={track.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                <span className="w-6 text-center text-muted-foreground font-bold">{index + 1}</span>
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted">
                  {track.cover_url ? (
                    <img src={track.cover_url} alt={track.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music2 className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{track.title}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Play className="w-3 h-3" />
                      {(track.plays || 0).toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3" />
                      {(track.likes || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {tracks.length === 0 && (
              <div className="py-12 text-center text-muted-foreground">
                <Music2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No tracks uploaded yet</p>
                <Button variant="outline" className="mt-4" onClick={() => navigate('/upload')}>
                  Upload your first track
                </Button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
