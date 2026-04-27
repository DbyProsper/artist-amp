import { motion } from 'framer-motion';
import { Music, Mic2, AudioWaveform, Image, Shirt, MessageCircle, Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type StudioFeature = 'beat' | 'lyrics' | 'song' | 'cover' | 'poster' | 'merch' | 'chat';

interface StudioEntryScreenProps {
  onFeatureSelect: (feature: StudioFeature) => void;
}

const features: Array<{
  id: StudioFeature;
  icon: React.ReactNode;
  label: string;
  description: string;
  badge?: string;
}> = [
  {
    id: 'beat',
    icon: <Music className="w-8 h-8" />,
    label: 'Beat',
    description: 'Generate instrumental beats',
  },
  {
    id: 'lyrics',
    icon: <Mic2 className="w-8 h-8" />,
    label: 'Lyrics',
    description: 'Write and generate lyrics',
  },
  {
    id: 'song',
    icon: <AudioWaveform className="w-8 h-8" />,
    label: 'Full Song',
    description: 'Create complete tracks',
    badge: 'Premium',
  },
  {
    id: 'cover',
    icon: <Image className="w-8 h-8" />,
    label: 'Cover Art',
    description: 'Generate album artwork',
  },
  {
    id: 'poster',
    icon: <Megaphone className="w-8 h-8" />,
    label: 'Posters',
    description: 'Create event posters',
  },
  {
    id: 'merch',
    icon: <Shirt className="w-8 h-8" />,
    label: 'Merch',
    description: 'Design merchandise',
  },
  {
    id: 'chat',
    icon: <MessageCircle className="w-8 h-8" />,
    label: 'Chat with AI',
    description: 'Get creative suggestions',
  },
];

export function StudioEntryScreen({ onFeatureSelect }: StudioEntryScreenProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-background to-muted/30"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-center mb-16 max-w-2xl"
      >
        <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent mb-4">
          What do you want to create?
        </h1>
        <p className="text-xl text-muted-foreground">
          Choose a creative tool and bring your musical vision to life with AI
        </p>
      </motion.div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-5xl">
        {features.map((feature, index) => (
          <motion.button
            key={feature.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + index * 0.05 }}
            whileHover={{ scale: 1.05, translateY: -5 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onFeatureSelect(feature.id)}
            className="group relative p-6 rounded-2xl bg-card border border-border/50 hover:border-primary/50 transition-all duration-300 text-left overflow-hidden"
          >
            {/* Gradient background on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity" />

            {/* Content */}
            <div className="relative z-10">
              {/* Icon */}
              <div className="mb-4 p-3 bg-muted rounded-lg w-fit group-hover:bg-primary/10 transition-colors">
                {feature.icon}
              </div>

              {/* Label & Description */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
                    {feature.label}
                  </h3>
                  {feature.badge && (
                    <span className="text-xs px-2 py-1 rounded-full bg-accent/20 text-accent font-medium">
                      {feature.badge}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground group-hover:text-foreground/70 transition-colors">
                  {feature.description}
                </p>
              </div>

              {/* Arrow */}
              <div className="mt-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                →
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Footer hint */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-sm text-muted-foreground mt-12"
      >
        You can switch between features anytime from the side panel
      </motion.p>
    </motion.div>
  );
}
