import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, Headphones, Zap, Skull, Heart, Plus } from 'lucide-react';
import { useState } from 'react';

export interface MoodPreset {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  color: string;
}

const MOOD_PRESETS: MoodPreset[] = [
  {
    id: 'chill',
    label: 'Chill',
    icon: <Headphones className="w-4 h-4" />,
    description: 'Relaxed vibes',
    color: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30 hover:border-blue-500/60',
  },
  {
    id: 'emotional',
    label: 'Emotional',
    icon: <Heart className="w-4 h-4" />,
    description: 'Deep feelings',
    color: 'from-rose-500/20 to-pink-500/20 border-rose-500/30 hover:border-rose-500/60',
  },
  {
    id: 'club',
    label: 'Club',
    icon: <Zap className="w-4 h-4" />,
    description: 'Dance floor',
    color: 'from-amber-500/20 to-orange-500/20 border-amber-500/30 hover:border-amber-500/60',
  },
  {
    id: 'dark',
    label: 'Dark',
    icon: <Skull className="w-4 h-4" />,
    description: 'Intense mood',
    color: 'from-purple-500/20 to-indigo-500/20 border-purple-500/30 hover:border-purple-500/60',
  },
  {
    id: 'spiritual',
    label: 'Spiritual',
    icon: <Sparkles className="w-4 h-4" />,
    description: 'Transcendent',
    color: 'from-green-500/20 to-emerald-500/20 border-green-500/30 hover:border-green-500/60',
  },
];

interface MoodPresetsProps {
  selected?: string;
  onSelect: (moodId: string) => void;
  disabled?: boolean;
}

export function MoodPresets({ selected, onSelect, disabled = false }: MoodPresetsProps) {
  const [customMood, setCustomMood] = useState('');

  const handleCustomMoodSubmit = () => {
    if (customMood.trim()) {
      onSelect(customMood.trim());
      setCustomMood('');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="w-full"
    >
      <div className="mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pl-2">
          Mood
        </h3>
      </div>

      <div className="grid grid-cols-5 gap-2 mb-4">
        {MOOD_PRESETS.map((mood, idx) => (
          <motion.button
            key={mood.id}
            whileHover={!disabled ? { scale: 1.05, y: -2 } : {}}
            whileTap={!disabled ? { scale: 0.95 } : {}}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.08 }}
            onClick={() => !disabled && onSelect(mood.id)}
            disabled={disabled}
            className={`group relative p-3 rounded-2xl border-2 transition-all duration-200 flex flex-col items-center gap-1.5 text-center backdrop-blur-sm ${
              selected === mood.id
                ? `bg-gradient-to-br ${mood.color} border-primary/80 shadow-lg shadow-primary/30`
                : `bg-gradient-to-br ${mood.color} hover:bg-opacity-80 disabled:opacity-50 disabled:cursor-not-allowed`
            }`}
          >
            <div
              className={`transition-colors duration-200 ${
                selected === mood.id ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'
              }`}
            >
              {mood.icon}
            </div>
            <div className="text-xs font-bold leading-tight">{mood.label}</div>
            <div className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
              {mood.description}
            </div>
          </motion.button>
        ))}
      </div>

      {/* Custom Mood Input */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex gap-2"
      >
        <Input
          placeholder="Enter custom mood..."
          value={customMood}
          onChange={(e) => setCustomMood(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleCustomMoodSubmit()}
          disabled={disabled}
          className="flex-1"
        />
        <Button
          size="sm"
          onClick={handleCustomMoodSubmit}
          disabled={disabled || !customMood.trim()}
          className="px-3"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </motion.div>
    </motion.div>
  );
}
