import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Sparkles, Zap, Heart } from 'lucide-react';

interface MusicPreset {
  id: string;
  name: string;
  genre: string;
  bpm: number;
  mood: string;
  icon: React.ReactNode;
  description: string;
  color: string;
}

const MUSIC_PRESETS: MusicPreset[] = [
  {
    id: 'amapiano-soulful',
    name: 'Amapiano (Soulful)',
    genre: 'amapiano',
    bpm: 112,
    mood: 'soulful',
    icon: <Heart className="w-4 h-4" />,
    description: 'Deep, emotional grooves',
    color: 'from-rose-500/20 to-pink-500/20 border-rose-500/30',
  },
  {
    id: 'amapiano-club',
    name: 'Amapiano (Club Energy)',
    genre: 'amapiano',
    bpm: 115,
    mood: 'energetic',
    icon: <Zap className="w-4 h-4" />,
    description: 'High-energy dance vibes',
    color: 'from-amber-500/20 to-orange-500/20 border-amber-500/30',
  },
  {
    id: 'gqom-deep',
    name: 'Gqom (Deep House)',
    genre: 'gqom',
    bpm: 127,
    mood: 'hypnotic',
    icon: <Sparkles className="w-4 h-4" />,
    description: 'Hypnotic, rolling rhythm',
    color: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
  },
  {
    id: 'trap-hard',
    name: 'Trap (Hard-Hitting)',
    genre: 'trap',
    bpm: 140,
    mood: 'aggressive',
    icon: <Zap className="w-4 h-4" />,
    description: 'Crisp drums and bass',
    color: 'from-red-500/20 to-orange-500/20 border-red-500/30',
  },
  {
    id: 'afrobeats-groove',
    name: 'Afrobeats (Groove)',
    genre: 'afrobeats',
    bpm: 105,
    mood: 'uplifting',
    icon: <Sparkles className="w-4 h-4" />,
    description: 'Infectious percussion',
    color: 'from-green-500/20 to-emerald-500/20 border-green-500/30',
  },
  {
    id: 'rnb-smooth',
    name: 'R&B (Smooth)',
    genre: 'rnb',
    bpm: 75,
    mood: 'romantic',
    icon: <Heart className="w-4 h-4" />,
    description: 'Silky and sensual',
    color: 'from-purple-500/20 to-pink-500/20 border-purple-500/30',
  },
  {
    id: 'house-dance',
    name: 'House (Dance)',
    genre: 'house',
    bpm: 128,
    mood: 'euphoric',
    icon: <Zap className="w-4 h-4" />,
    description: 'Electric dance beats',
    color: 'from-indigo-500/20 to-purple-500/20 border-indigo-500/30',
  },
  {
    id: 'hiphop-boom',
    name: 'Hip-Hop (Boom Bap)',
    genre: 'hiphop',
    bpm: 95,
    mood: 'analytical',
    icon: <Sparkles className="w-4 h-4" />,
    description: 'Classic hip-hop vibes',
    color: 'from-gray-500/20 to-slate-500/20 border-gray-500/30',
  },
];

interface PresetButtonsProps {
  onPresetSelect: (preset: MusicPreset) => void;
  disabled?: boolean;
}

export function PresetButtons({ onPresetSelect, disabled = false }: PresetButtonsProps) {
  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold text-muted-foreground">Quick Start Presets</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {MUSIC_PRESETS.map((preset, idx) => (
          <motion.div
            key={preset.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            <Button
              variant="outline"
              disabled={disabled}
              onClick={() => onPresetSelect(preset)}
              className={`w-full h-auto py-3 px-3 bg-gradient-to-br ${preset.color} hover:shadow-lg transition-all
                border-2 hover:border-opacity-100 border-opacity-50 gap-2 flex flex-col items-start justify-start`}
            >
              <div className="flex items-center gap-2 w-full">
                <div className="text-primary">{preset.icon}</div>
                <div className="text-left flex-1">
                  <div className="font-semibold text-xs">{preset.name}</div>
                  <div className="text-[10px] text-muted-foreground">{preset.description}</div>
                </div>
              </div>
              <div className="text-[10px] text-muted-foreground w-full">
                ♫ {preset.bpm} BPM • {preset.mood}
              </div>
            </Button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export { MUSIC_PRESETS };
export type { MusicPreset };
