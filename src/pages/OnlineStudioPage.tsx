import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Wand2,
  Music,
  Sliders,
  BarChart3,
  Lock,
  Star,
  Zap,
  Sparkles,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export default function OnlineStudioPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [selectedTab, setSelectedTab] = useState('lyrics');

  if (!user) {
    return (
      <div className="min-h-screen pb-36">
        <header className="sticky top-0 z-40 glass border-b border-border">
          <div className="flex items-center gap-4 px-4 h-14">
            <button
              onClick={() => navigate('/profile')}
              className="p-2 rounded-full hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-display font-bold text-lg">Online Studio</h1>
          </div>
        </header>

        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
          <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-6">
            <Music className="w-12 h-12 text-muted-foreground" />
          </div>
          <h2 className="font-display font-bold text-xl mb-2">Welcome to Online Studio</h2>
          <p className="text-muted-foreground mb-6 max-w-sm">
            Sign in to access AI-powered music production tools and analytics.
          </p>
          <Button onClick={() => navigate('/auth')} size="lg">
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  // Only allow artists to access this page
  if (!profile?.is_artist) {
    return (
      <div className="min-h-screen pb-36">
        <header className="sticky top-0 z-40 glass border-b border-border">
          <div className="flex items-center gap-4 px-4 h-14">
            <button
              onClick={() => navigate('/profile')}
              className="p-2 rounded-full hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-display font-bold text-lg">Online Studio</h1>
          </div>
        </header>

        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
          <Lock className="w-12 h-12 text-muted-foreground mb-4" />
          <h2 className="font-display font-bold text-xl mb-2">Artist Only Feature</h2>
          <p className="text-muted-foreground mb-6 max-w-sm">
            Online Studio is available for artists only. Please upgrade your account to access these
            AI-powered music production tools.
          </p>
          <Button onClick={() => navigate('/settings/edit-profile')} size="lg">
            Upgrade to Artist
          </Button>
        </div>
      </div>
    );
  }

  const PricingTier = ({ name, icon: Icon, features, isFree = false }) => (
    <motion.div
      whileHover={{ y: -5 }}
      className={`p-6 rounded-xl border transition-all ${
        isFree
          ? 'border-primary/50 bg-primary/5'
          : 'border-border hover:border-primary/50 bg-muted/30'
      }`}
    >
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-5 h-5 text-primary" />
        <h3 className="font-display font-bold">{name}</h3>
        {isFree && <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">Current</span>}
      </div>
      <div className="space-y-2">
        {features.map((feature, idx) => (
          <div key={idx} className="flex items-start gap-2 text-sm">
            <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <span className="text-muted-foreground">{feature}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen pb-36">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="flex items-center gap-4 px-4 h-14">
          <button
            onClick={() => navigate('/profile')}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="font-display font-bold text-lg">Online Studio</h1>
            <p className="text-xs text-muted-foreground">AI-Powered Music Production</p>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-4 py-8 bg-gradient-to-b from-primary/10 to-transparent">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="font-display font-bold text-2xl">Welcome back, {profile?.name || 'Artist'}!</h2>
            <p className="text-muted-foreground text-sm">Your AI-powered music studio awaits</p>
          </div>
        </div>
      </section>

      {/* Main Tabs */}
      <Tabs defaultValue="lyrics" className="w-full" onValueChange={setSelectedTab}>
        <div className="sticky top-14 z-30 bg-background/95 backdrop-blur-sm border-b border-border px-4">
          <TabsList className="w-full justify-start overflow-x-auto bg-transparent rounded-none border-b-0">
            <TabsTrigger value="lyrics" className="gap-2">
              <Wand2 className="w-4 h-4" />
              Lyrics
            </TabsTrigger>
            <TabsTrigger value="beats" className="gap-2">
              <Music className="w-4 h-4" />
              Beats
            </TabsTrigger>
            <TabsTrigger value="composition" className="gap-2">
              <Sparkles className="w-4 h-4" />
              Composition
            </TabsTrigger>
            <TabsTrigger value="mixing" className="gap-2">
              <Sliders className="w-4 h-4" />
              Mixing
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Lyrics Generator Tab */}
        <TabsContent value="lyrics" className="px-4 py-6">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="w-5 h-5 text-primary" />
                  AI Lyrics Generator
                </CardTitle>
                <CardDescription>
                  Generate creative, unique lyrics powered by advanced AI technology
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg border border-border">
                  <p className="text-sm font-medium mb-3">Generate lyrics by describing your idea:</p>
                  <textarea
                    placeholder="e.g., A love song about summer romance, upbeat pop style..."
                    className="w-full p-3 rounded-lg bg-background border border-border text-sm resize-none"
                    rows={4}
                  />
                  <Button className="mt-4 w-full" size="lg">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Lyrics
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    className="p-3 rounded-lg bg-muted/50 border border-border hover:border-primary/50 transition-colors text-sm font-medium"
                  >
                    <Sparkles className="w-4 h-4 mb-2" />
                    Love Song
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    className="p-3 rounded-lg bg-muted/50 border border-border hover:border-primary/50 transition-colors text-sm font-medium"
                  >
                    <Sparkles className="w-4 h-4 mb-2" />
                    Hip Hop
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    className="p-3 rounded-lg bg-muted/50 border border-border hover:border-primary/50 transition-colors text-sm font-medium"
                  >
                    <Sparkles className="w-4 h-4 mb-2" />
                    Rap Battle
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    className="p-3 rounded-lg bg-muted/50 border border-border hover:border-primary/50 transition-colors text-sm font-medium"
                  >
                    <Sparkles className="w-4 h-4 mb-2" />
                    Rock Song
                  </motion.button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Beat Production Tab */}
        <TabsContent value="beats" className="px-4 py-6">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Music className="w-5 h-5 text-primary" />
                  Beat Production
                </CardTitle>
                <CardDescription>
                  Create original, royalty-free beats with AI-powered music generation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg border border-border">
                  <p className="text-sm font-medium mb-3">Describe the beat you want:</p>
                  <textarea
                    placeholder="e.g., 120 BPM hip-hop beat with heavy bass and trap hi-hats..."
                    className="w-full p-3 rounded-lg bg-background border border-border text-sm resize-none"
                    rows={4}
                  />
                  <Button className="mt-4 w-full" size="lg">
                    <Music className="w-4 h-4 mr-2" />
                    Generate Beat
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {['Hip Hop', 'Pop', 'Electronic', 'R&B', 'Reggae', 'Rock'].map((genre) => (
                    <motion.button
                      key={genre}
                      whileTap={{ scale: 0.95 }}
                      className="p-3 rounded-lg bg-muted/50 border border-border hover:border-primary/50 transition-colors text-sm font-medium"
                    >
                      <Music className="w-4 h-4 mb-2" />
                      {genre}
                    </motion.button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Full Song Composition Tab */}
        <TabsContent value="composition" className="px-4 py-6">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Full Song Composition
                </CardTitle>
                <CardDescription>
                  Generate complete song compositions with lyrics, melody, and instrumentation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg border border-border">
                  <p className="text-sm font-medium mb-3">Describe your song concept:</p>
                  <textarea
                    placeholder="e.g., An emotional ballad about overcoming challenges, indie folk style..."
                    className="w-full p-3 rounded-lg bg-background border border-border text-sm resize-none"
                    rows={4}
                  />
                  <Button className="mt-4 w-full" size="lg">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Create Full Composition
                  </Button>
                </div>

                <div className="space-y-2 text-sm">
                  <p className="font-medium">Your composition will include:</p>
                  <ul className="space-y-1">
                    {[
                      'Verse, Chorus & Bridge structure',
                      'AI-generated lyrics',
                      'Melody composition',
                      'Instrumentation arrangement',
                      'Production suggestions',
                    ].map((item, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-muted-foreground">
                        <Check className="w-4 h-4 text-primary" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Mixing & Mastering Tab */}
        <TabsContent value="mixing" className="px-4 py-6">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-primary" />
                  Mixing & Mastering
                </CardTitle>
                <CardDescription>
                  Professional AI-powered mixing and mastering services
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Pricing Tiers */}
                <div>
                  <h3 className="font-display font-bold mb-4">Choose Your Plan</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <PricingTier
                      name="Free"
                      icon={Zap}
                      isFree={true}
                      features={[
                        'Basic EQ & compression',
                        '2 tracks per month',
                        'Standard mastering',
                        'MP3 export',
                      ]}
                    />
                    <PricingTier
                      name="Pro"
                      icon={Star}
                      features={[
                        'Advanced mixing tools',
                        'Unlimited tracks',
                        'Professional mastering',
                        'WAV export',
                        'Stem export',
                        'Priority support',
                      ]}
                    />
                    <PricingTier
                      name="Premium"
                      icon={Sparkles}
                      features={[
                        'Full mixing studio suite',
                        'Unlimited tracks',
                        'Mastering + Distribution',
                        'All formats (WAV, FLAC, etc)',
                        'Stem export + Acapellas',
                        '24/7 priority support',
                        'Royalty insights',
                      ]}
                    />
                  </div>
                </div>

                <Button className="w-full" size="lg">
                  <Sliders className="w-4 h-4 mr-2" />
                  Upload Track for Mixing
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="px-4 py-6">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  AI Performance Analytics
                </CardTitle>
                <CardDescription>
                  Deep insights into listener behavior, engagement patterns, and revenue trends
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Analytics Overview */}
                <div className="grid grid-cols-2 gap-3">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="p-4 rounded-lg bg-primary/10 border border-primary/20"
                  >
                    <p className="text-sm text-muted-foreground mb-1">Total Plays</p>
                    <p className="text-2xl font-bold">0</p>
                    <p className="text-xs text-primary mt-2">Share your tracks to get started</p>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="p-4 rounded-lg bg-accent/10 border border-accent/20"
                  >
                    <p className="text-sm text-muted-foreground mb-1">Engagement Rate</p>
                    <p className="text-2xl font-bold">0%</p>
                    <p className="text-xs text-accent mt-2">Likes, comments & shares</p>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="p-4 rounded-lg bg-green-500/10 border border-green-500/20"
                  >
                    <p className="text-sm text-muted-foreground mb-1">Revenue</p>
                    <p className="text-2xl font-bold">$0</p>
                    <p className="text-xs text-green-500 mt-2">From streams & tips</p>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20"
                  >
                    <p className="text-sm text-muted-foreground mb-1">Audience Growth</p>
                    <p className="text-2xl font-bold">0%</p>
                    <p className="text-xs text-blue-500 mt-2">Monthly followers</p>
                  </motion.div>
                </div>

                {/* Analytics Features */}
                <div className="space-y-3">
                  <p className="font-medium">AI Insights Include:</p>
                  <ul className="space-y-2">
                    {[
                      'Listener demographics & location analysis',
                      'Engagement pattern detection',
                      'Optimal posting times & days',
                      'Genre & mood trend analysis',
                      'Revenue predictions',
                      'Audience preference insights',
                      'Competitor benchmarking',
                      'Growth recommendations',
                    ].map((insight, idx) => (
                      <motion.li
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="flex items-center gap-2 text-sm text-muted-foreground"
                      >
                        <BarChart3 className="w-4 h-4 text-primary flex-shrink-0" />
                        {insight}
                      </motion.li>
                    ))}
                  </ul>
                </div>

                <Button className="w-full" size="lg" variant="outline">
                  View Detailed Analytics Dashboard
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Footer CTA */}
      <section className="px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          className="p-6 rounded-xl bg-gradient-to-r from-primary/20 via-accent/20 to-secondary/20 border border-primary/20 text-center"
        >
          <h3 className="font-display font-bold text-lg mb-2">Ready to Create?</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Start producing professional music with AI assistance today
          </p>
          <Button size="lg" className="w-full">
            <Sparkles className="w-4 h-4 mr-2" />
            Get Started Now
          </Button>
        </motion.div>
      </section>
    </div>
  );
}
