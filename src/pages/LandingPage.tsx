import { motion } from 'framer-motion';
import { Play, ArrowRight, Music2, Users, Radio, Headphones, Heart, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { FloatingMusicNotes } from '@/components/ui/FloatingMusicNotes';
import landingHero from '@/assets/landing-hero.jpg';

const features = [
  {
    icon: Music2,
    title: 'Upload & Share',
    description: 'Share your music with fans worldwide. Upload tracks, create posts, and build your audience.',
  },
  {
    icon: Users,
    title: 'Connect with Artists',
    description: 'Follow your favorite artists, discover new talent, and collaborate on music projects.',
  },
  {
    icon: Radio,
    title: 'Personalized Discovery',
    description: 'Get music recommendations tailored to your taste. The more you listen, the better it gets.',
  },
  {
    icon: Heart,
    title: 'Engage & Interact',
    description: 'Like, comment, and share music. Build meaningful connections in the music community.',
  },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background overflow-x-hidden relative">
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

      {/* Hero Content */}
      <div className="relative z-10 px-6 pt-16 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto"
        >
          <h1 className="text-4xl md:text-6xl font-display font-bold mb-4">
            Where <span className="text-gradient">Music</span> Meets{' '}
            <span className="text-gradient">Community</span>
          </h1>
          <p className="text-base md:text-lg text-muted-foreground mb-8 max-w-md mx-auto">
            Discover, share, and connect through music. Join thousands of artists and fans 
            on the social platform built for music lovers.
          </p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col gap-3 max-w-sm mx-auto"
          >
            <Button
              size="lg"
              onClick={() => navigate('/search')}
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

      {/* Features Section */}
      <section className="relative z-10 px-6 py-16 bg-gradient-to-b from-transparent via-background/95 to-background">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-2xl md:text-3xl font-display font-bold mb-3">
            Everything You Need for <span className="text-gradient">Music</span>
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Whether you're an artist or a fan, MusicInsta has the tools you need to enjoy music like never before.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="p-6 rounded-2xl bg-muted/30 backdrop-blur-sm border border-border"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-display font-bold text-lg mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative z-10 px-6 py-16 bg-background">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-3 gap-6 max-w-2xl mx-auto text-center"
        >
          <div>
            <p className="text-3xl md:text-4xl font-display font-bold text-gradient">10K+</p>
            <p className="text-sm text-muted-foreground mt-1">Artists</p>
          </div>
          <div>
            <p className="text-3xl md:text-4xl font-display font-bold text-gradient">50K+</p>
            <p className="text-sm text-muted-foreground mt-1">Tracks</p>
          </div>
          <div>
            <p className="text-3xl md:text-4xl font-display font-bold text-gradient">100K+</p>
            <p className="text-sm text-muted-foreground mt-1">Fans</p>
          </div>
        </motion.div>
      </section>

      {/* How It Works */}
      <section className="relative z-10 px-6 py-16 bg-gradient-to-b from-background to-muted/20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-2xl md:text-3xl font-display font-bold mb-3">
            How It <span className="text-gradient">Works</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {[
            { step: '1', title: 'Create Account', desc: 'Sign up for free and set up your profile in minutes.' },
            { step: '2', title: 'Explore Music', desc: 'Discover new artists and tracks tailored to your taste.' },
            { step: '3', title: 'Connect & Share', desc: 'Follow artists, share tracks, and join the community.' },
          ].map((item, index) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
              className="text-center"
            >
              <div className="w-12 h-12 rounded-full bg-primary/20 text-primary font-display font-bold text-xl flex items-center justify-center mx-auto mb-4">
                {item.step}
              </div>
              <h3 className="font-display font-bold text-lg mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 px-6 py-20 bg-gradient-to-b from-muted/20 to-background">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-md mx-auto"
        >
          <Headphones className="w-16 h-16 text-primary mx-auto mb-6" />
          <h2 className="text-2xl md:text-3xl font-display font-bold mb-3">
            Ready to Start?
          </h2>
          <p className="text-muted-foreground mb-8">
            Join MusicInsta today and be part of the next generation of music discovery.
          </p>
          <div className="flex flex-col gap-3">
            <Button
              size="lg"
              onClick={() => navigate('/auth')}
              className="w-full text-base py-6 rounded-xl glow-primary"
            >
              Get Started Free
            </Button>
            <Button
              size="lg"
              variant="ghost"
              onClick={() => navigate('/search')}
              className="w-full text-base py-6 rounded-xl"
            >
              Browse Music First
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-8 bg-background border-t border-border">
        <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
          <Music2 className="w-4 h-4" />
          <span>© 2024 MusicInsta. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
