import { motion } from 'framer-motion';
import { Play, ArrowRight, Music2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { FloatingMusicNotes } from '@/components/ui/FloatingMusicNotes';
import landingHero from '@/assets/landing-hero.jpg';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background overflow-hidden relative">
      {/* Background Image with Overlay */}
      <div className="fixed inset-0 -z-10">
        <img
          src={landingHero}
          alt="Young person enjoying music"
          className="w-full h-full object-cover object-top"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/30" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-transparent to-background" />
      </div>

      {/* Floating Music Notes */}
      <FloatingMusicNotes />

      {/* Header */}
      <header className="relative z-10 py-4 px-4 safe-top">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary via-accent to-secondary flex items-center justify-center">
              <Music2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-display font-bold text-gradient">MusicInsta</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/auth')}>
            Sign In
          </Button>
        </div>
      </header>

      {/* Hero Content - positioned at bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-10 p-6 pb-12 safe-bottom">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <h1 className="text-3xl md:text-5xl font-display font-bold mb-3">
            Where <span className="text-gradient">Music</span> Meets{' '}
            <span className="text-gradient">Community</span>
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mb-6 max-w-md mx-auto">
            Discover, share, and connect through music. Join thousands of artists and fans 
            on the social platform built for music lovers.
          </p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col gap-3"
          >
            <Button
              size="lg"
              onClick={() => navigate('/')}
              className="w-full text-base py-6 rounded-xl glow-primary"
            >
              <Play className="w-5 h-5 mr-2" fill="currentColor" />
              Start Listening
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate('/auth')}
              className="w-full text-base py-6 rounded-xl"
            >
              I'm an Artist
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>

          <p className="text-xs text-muted-foreground mt-4">
            Free to use • No credit card required
          </p>
        </motion.div>
      </div>
    </div>
  );
}
