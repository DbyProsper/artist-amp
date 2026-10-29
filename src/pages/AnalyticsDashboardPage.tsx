import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, BarChart3, Heart, MessageCircle, Music2, Play, Share2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/FirebaseAuthContext';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { usePlayer } from '@/context/PlayerContext';

interface TrackStats {
  id: string;
  title: string;
  cover_url?: string;
  plays?: number;
  likes?: number;
}

interface AnalyticsEvent {
  event: 'play' | 'complete' | 'skip' | 'like' | 'unlike';
  createdAt: Date;
}

interface DailyStats {
  date: string;
  plays: number;
  likes: number;
  completions: number;
}

const tooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
};

export default function AnalyticsDashboardPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { catalog } = usePlayer();
  const [tracks, setTracks] = useState<TrackStats[]>([]);
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [followers, setFollowers] = useState(0);
  const [postStats, setPostStats] = useState({ posts: 0, comments: 0, shares: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !profile) { navigate('/auth'); return; }
    if (!profile.is_artist) { navigate('/profile'); return; }
    let active = true;
    setLoading(true);
    const load = async () => {
      try {
        const [trackSnapshot, followerSnapshot, postSnapshot, eventSnapshot] = await Promise.all([
          getDocs(query(collection(db, 'tracks'), where('profile_id', '==', profile.id))),
          getDocs(query(collection(db, 'follows'), where('following_id', '==', profile.id))),
          getDocs(query(collection(db, 'posts'), where('profile_id', '==', profile.id))),
          getDocs(query(collection(db, 'analytics_events'), where('artist_id', '==', profile.id))).catch(() => null),
        ]);
        if (!active) return;
        const nextTracks = trackSnapshot.docs.map(item => ({ id: item.id, ...item.data() } as TrackStats))
          .sort((left, right) => Number(right.plays || 0) - Number(left.plays || 0));
        const nextEvents = eventSnapshot?.docs.map(item => {
          const data = item.data();
          return { event: data.event, createdAt: data.created_at?.toDate?.() || new Date(0) } as AnalyticsEvent;
        }) || [];
        const posts = postSnapshot.docs.map(item => item.data()).filter(post => post.is_story !== true);
        setTracks(nextTracks);
        setEvents(nextEvents);
        setFollowers(followerSnapshot.size);
        setPostStats({
          posts: posts.length,
          comments: posts.reduce((sum, post) => sum + (Number(post.comments) || 0), 0),
          shares: posts.reduce((sum, post) => sum + (Number(post.shares) || 0), 0),
        });
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [navigate, profile, user]);

  const analyticsTracks = useMemo(() => {
    const merged = new Map(tracks.map(track => [track.id, track]));
    catalog.filter(track => track.artist.id === profile?.id || track.artist.id === user?.uid).forEach(track => {
      const stored = merged.get(track.id);
      merged.set(track.id, {
        id: track.id, title: track.title, cover_url: track.coverArt,
        plays: Math.max(Number(stored?.plays || 0), Number(track.plays || 0)),
        likes: Math.max(Number(stored?.likes || 0), Number(track.likes || 0)),
      });
    });
    return [...merged.values()].sort((left, right) => Number(right.plays || 0) - Number(left.plays || 0));
  }, [catalog, profile?.id, tracks, user?.uid]);
  const totalPlays = analyticsTracks.reduce((sum, track) => sum + (Number(track.plays) || 0), 0);
  const totalLikes = analyticsTracks.reduce((sum, track) => sum + (Number(track.likes) || 0), 0);
  const weekly = useMemo<DailyStats[]>(() => Array.from({ length: 7 }, (_, index) => {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - (6 - index));
    const nextDay = new Date(day); nextDay.setDate(day.getDate() + 1);
    const daily = events.filter(event => event.createdAt >= day && event.createdAt < nextDay);
    return {
      date: day.toLocaleDateString('en-ZA', { weekday: 'short' }),
      plays: daily.filter(event => event.event === 'play').length,
      likes: daily.filter(event => event.event === 'like').length - daily.filter(event => event.event === 'unlike').length,
      completions: daily.filter(event => event.event === 'complete').length,
    };
  }), [events]);
  const engagement = [
    { name: 'Posts', value: postStats.posts },
    { name: 'Comments', value: postStats.comments },
    { name: 'Shares', value: postStats.shares },
    { name: 'Completed plays', value: events.filter(event => event.event === 'complete').length },
  ];

  if (!profile?.is_artist) return null;

  return <div className="min-h-screen pb-36">
    <header className="sticky top-0 z-40 border-b border-border glass"><div className="flex h-14 items-center gap-3 px-4"><button onClick={() => navigate(-1)} className="rounded-full p-2 hover:bg-muted"><ArrowLeft className="h-5 w-5" /></button><BarChart3 className="h-5 w-5 text-primary" /><h1 className="font-display text-lg font-bold">Analytics</h1></div></header>
    <div className="space-y-6 p-4">
      {loading && <p className="text-sm text-muted-foreground">Loading verified platform analytics…</p>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total plays', value: totalPlays, Icon: Play },
          { label: 'Track likes', value: totalLikes, Icon: Heart },
          { label: 'Followers', value: followers, Icon: Users },
          { label: 'Comments', value: postStats.comments, Icon: MessageCircle },
        ].map(({ label, value, Icon }, index) => <motion.div key={label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .06 }} className="rounded-xl bg-gradient-to-br from-primary/15 to-muted/20 p-4"><Icon className="mb-2 h-5 w-5 text-primary" /><p className="text-2xl font-bold">{value.toLocaleString()}</p><p className="text-xs text-muted-foreground">{label}</p></motion.div>)}
      </div>

      <section className="rounded-xl bg-muted/30 p-4"><div className="mb-4"><h2 className="font-display font-bold">Recorded interactions — last 7 days</h2><p className="text-xs text-muted-foreground">Live plays, likes and completed listens recorded by MusicInsta. Historical totals remain in the overview above.</p></div><div className="h-56"><ResponsiveContainer width="100%" height="100%"><LineChart data={weekly}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="date" fontSize={12} /><YAxis allowDecimals={false} fontSize={12} /><Tooltip contentStyle={tooltipStyle} /><Line type="monotone" dataKey="plays" stroke="hsl(var(--primary))" strokeWidth={2} /><Line type="monotone" dataKey="likes" stroke="hsl(var(--accent))" strokeWidth={2} /><Line type="monotone" dataKey="completions" stroke="hsl(var(--secondary))" strokeWidth={2} /></LineChart></ResponsiveContainer></div></section>

      <section className="rounded-xl bg-muted/30 p-4"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-display font-bold">Audience engagement</h2><p className="text-xs text-muted-foreground">Calculated from your real posts and listening events.</p></div><Share2 className="h-5 w-5 text-primary" /></div><div className="h-48"><ResponsiveContainer width="100%" height="100%"><BarChart data={engagement}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="name" fontSize={11} /><YAxis allowDecimals={false} fontSize={12} /><Tooltip contentStyle={tooltipStyle} /><Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></section>

      <section><h2 className="mb-4 font-display font-bold">Top tracks</h2><div className="space-y-2">{analyticsTracks.slice(0, 10).map((track, index) => <div key={track.id} className="flex items-center gap-3 rounded-xl bg-muted/30 p-3"><span className="w-6 text-center font-bold text-muted-foreground">{index + 1}</span><div className="h-12 w-12 overflow-hidden rounded-lg bg-muted">{track.cover_url ? <img src={track.cover_url} alt={track.title} loading="lazy" decoding="async" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center"><Music2 className="h-5 w-5 text-muted-foreground" /></div>}</div><div className="min-w-0 flex-1"><p className="truncate font-medium">{track.title || 'Untitled track'}</p><p className="text-xs text-muted-foreground">{Number(track.plays || 0).toLocaleString()} plays · {Number(track.likes || 0).toLocaleString()} likes</p></div></div>)}{!loading && analyticsTracks.length === 0 && <div className="py-12 text-center text-muted-foreground"><Music2 className="mx-auto mb-3 h-12 w-12 opacity-50" /><p>No tracks uploaded yet</p><Button variant="outline" className="mt-4" onClick={() => navigate('/upload')}>Upload your first track</Button></div>}</div></section>
    </div>
  </div>;
}
