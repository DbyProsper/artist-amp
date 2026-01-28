import { motion } from 'framer-motion';
import { Play, ArrowRight, Music2, Users, Radio, Headphones, Heart, TrendingUp, Star, Zap, Globe } from 'lucide-react';
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

const testimonials = [
  {
    name: 'Prosper Masuku',
    role: 'Independent Artist',
    quote: 'MusicInsta helped me grow my fanbase from 100 to 15K in just 6 months. The engagement here is unreal!',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
  },
  {
    name: 'Luna Wave',
    role: 'Electronic Producer',
    quote: 'Finally a platform that understands what independent artists need. The analytics alone are game-changing.',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
  },
  {
    name: 'Marcus Stone',
    role: 'Hip-Hop Producer',
    quote: 'The community here is incredibly supportive. I\'ve collaborated with artists I never would have met otherwise.',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150',
  },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background overflow-x-hidden relative">
      {/* Full-page Background with Floating Notes */}
      <div className="fixed inset-0 -z-10">
        <img
          src={landingHero}
          alt="Young person enjoying music"
          className="w-full h-full object-cover object-top"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/20" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-transparent to-background" />
      </div>

      {/* Floating Music Notes - Full Page */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <FloatingMusicNotes />
      </div>

      {/* Header */}
      <header className="relative z-10 py-4 px-4 safe-top">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <motion.div 
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary via-accent to-secondary flex items-center justify-center"
              animate={{ boxShadow: ['0 0 20px hsla(330, 85%, 60%, 0.3)', '0 0 40px hsla(330, 85%, 60%, 0.6)', '0 0 20px hsla(330, 85%, 60%, 0.3)'] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Music2 className="w-6 h-6 text-white" />
            </motion.div>
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
          <motion.h1 
            className="text-4xl md:text-6xl font-display font-bold mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            Where{' '}
            <motion.span 
              className="text-gradient relative inline-block"
              animate={{ 
                textShadow: [
                  '0 0 20px hsla(330, 85%, 60%, 0.5)',
                  '0 0 40px hsla(330, 85%, 60%, 0.8)',
                  '0 0 20px hsla(330, 85%, 60%, 0.5)'
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              Music
            </motion.span>
            {' '}Meets{' '}
            <motion.span 
              className="text-gradient relative inline-block"
              animate={{ 
                textShadow: [
                  '0 0 20px hsla(280, 70%, 50%, 0.5)',
                  '0 0 40px hsla(280, 70%, 50%, 0.8)',
                  '0 0 20px hsla(280, 70%, 50%, 0.5)'
                ]
              }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
            >
              Community
            </motion.span>
          </motion.h1>
          <motion.p 
            className="text-base md:text-lg text-muted-foreground mb-8 max-w-md mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Discover, share, and connect through music. Join thousands of artists and fans 
            on the social platform built for music lovers.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex flex-col gap-3 max-w-sm mx-auto"
          >
            <Button
              size="lg"
              onClick={() => navigate('/search')}
              className="w-full text-base py-6 rounded-xl animate-glow"
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
            Everything You Need for{' '}
            <motion.span 
              className="text-gradient"
              animate={{ 
                textShadow: [
                  '0 0 10px hsla(330, 85%, 60%, 0.3)',
                  '0 0 20px hsla(330, 85%, 60%, 0.5)',
                  '0 0 10px hsla(330, 85%, 60%, 0.3)'
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              Music
            </motion.span>
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
              whileHover={{ scale: 1.02, boxShadow: '0 0 30px hsla(330, 85%, 60%, 0.2)' }}
              className="p-6 rounded-2xl bg-muted/30 backdrop-blur-sm border border-border transition-all"
            >
              <motion.div 
                className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4"
                whileHover={{ 
                  boxShadow: '0 0 20px hsla(330, 85%, 60%, 0.4)'
                }}
              >
                <feature.icon className="w-6 h-6 text-primary" />
              </motion.div>
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
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="p-4 rounded-xl"
          >
            <motion.p 
              className="text-3xl md:text-4xl font-display font-bold text-gradient"
              animate={{ 
                textShadow: [
                  '0 0 10px hsla(330, 85%, 60%, 0.3)',
                  '0 0 25px hsla(330, 85%, 60%, 0.6)',
                  '0 0 10px hsla(330, 85%, 60%, 0.3)'
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              10K+
            </motion.p>
            <p className="text-sm text-muted-foreground mt-1">Artists</p>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="p-4 rounded-xl"
          >
            <motion.p 
              className="text-3xl md:text-4xl font-display font-bold text-gradient"
              animate={{ 
                textShadow: [
                  '0 0 10px hsla(280, 70%, 50%, 0.3)',
                  '0 0 25px hsla(280, 70%, 50%, 0.6)',
                  '0 0 10px hsla(280, 70%, 50%, 0.3)'
                ]
              }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
            >
              50K+
            </motion.p>
            <p className="text-sm text-muted-foreground mt-1">Tracks</p>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="p-4 rounded-xl"
          >
            <motion.p 
              className="text-3xl md:text-4xl font-display font-bold text-gradient"
              animate={{ 
                textShadow: [
                  '0 0 10px hsla(240, 60%, 55%, 0.3)',
                  '0 0 25px hsla(240, 60%, 55%, 0.6)',
                  '0 0 10px hsla(240, 60%, 55%, 0.3)'
                ]
              }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.6 }}
            >
              100K+
            </motion.p>
            <p className="text-sm text-muted-foreground mt-1">Fans</p>
          </motion.div>
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
            How It{' '}
            <motion.span 
              className="text-gradient"
              animate={{ 
                textShadow: [
                  '0 0 15px hsla(330, 85%, 60%, 0.4)',
                  '0 0 30px hsla(330, 85%, 60%, 0.7)',
                  '0 0 15px hsla(330, 85%, 60%, 0.4)'
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              Works
            </motion.span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {[
            { step: '1', icon: Zap, title: 'Create Account', desc: 'Sign up for free and set up your profile in minutes.' },
            { step: '2', icon: Globe, title: 'Explore Music', desc: 'Discover new artists and tracks tailored to your taste.' },
            { step: '3', icon: Star, title: 'Connect & Share', desc: 'Follow artists, share tracks, and join the community.' },
          ].map((item, index) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
              className="text-center"
            >
              <motion.div 
                className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 text-primary font-display font-bold text-xl flex items-center justify-center mx-auto mb-4"
                animate={{ 
                  boxShadow: [
                    '0 0 10px hsla(330, 85%, 60%, 0.2)',
                    '0 0 25px hsla(330, 85%, 60%, 0.4)',
                    '0 0 10px hsla(330, 85%, 60%, 0.2)'
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity, delay: index * 0.3 }}
              >
                <item.icon className="w-7 h-7" />
              </motion.div>
              <h3 className="font-display font-bold text-lg mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="relative z-10 px-6 py-16 bg-muted/10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-2xl md:text-3xl font-display font-bold mb-3">
            What Artists Are{' '}
            <motion.span 
              className="text-gradient"
              animate={{ 
                textShadow: [
                  '0 0 15px hsla(330, 85%, 60%, 0.4)',
                  '0 0 30px hsla(330, 85%, 60%, 0.7)',
                  '0 0 15px hsla(330, 85%, 60%, 0.4)'
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              Saying
            </motion.span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="p-6 rounded-2xl bg-muted/30 backdrop-blur-sm border border-border"
            >
              <p className="text-sm text-muted-foreground mb-4 italic">"{testimonial.quote}"</p>
              <div className="flex items-center gap-3">
                <img
                  src={testimonial.avatar}
                  alt={testimonial.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <p className="font-medium text-sm">{testimonial.name}</p>
                  <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                </div>
              </div>
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
          <motion.div
            animate={{ 
              boxShadow: [
                '0 0 30px hsla(330, 85%, 60%, 0.3)',
                '0 0 60px hsla(330, 85%, 60%, 0.5)',
                '0 0 30px hsla(330, 85%, 60%, 0.3)'
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mx-auto mb-6"
          >
            <Headphones className="w-10 h-10 text-primary" />
          </motion.div>
          <h2 className="text-2xl md:text-3xl font-display font-bold mb-3">
            Ready to{' '}
            <motion.span 
              className="text-gradient"
              animate={{ 
                textShadow: [
                  '0 0 20px hsla(330, 85%, 60%, 0.5)',
                  '0 0 40px hsla(330, 85%, 60%, 0.8)',
                  '0 0 20px hsla(330, 85%, 60%, 0.5)'
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              Start?
            </motion.span>
          </h2>
          <p className="text-muted-foreground mb-8">
            Join MusicInsta today and be part of the next generation of music discovery.
          </p>
          <div className="flex flex-col gap-3">
            <Button
              size="lg"
              onClick={() => navigate('/auth')}
              className="w-full text-base py-6 rounded-xl animate-glow"
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
