import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface BPMConfig {
  min: number;
  max: number;
  default: number;
  description: string;
}

const BPM_RANGES: Record<string, BPMConfig> = {
  amapiano: { min: 108, max: 115, default: 112, description: 'Private School Groove' },
  gqom: { min: 125, max: 130, default: 127, description: 'Deep House Bounce' },
  trap: { min: 130, max: 160, default: 140, description: 'Hard-Hitting Rhythm' },
  rnb: { min: 60, max: 95, default: 75, description: 'Smooth & Soulful' },
  afrobeats: { min: 95, max: 110, default: 105, description: 'Rhythmic Groove' },
  house: { min: 120, max: 130, default: 128, description: 'Dance Floor Energy' },
  hiphop: { min: 85, max: 115, default: 95, description: 'Boom Bap Beat' },
  reggae: { min: 70, max: 95, default: 80, description: 'Island Vibes' },
  default: { min: 60, max: 180, default: 100, description: 'Custom Tempo' },
};

interface BPMSliderProps {
  genre: string;
  bpm: number;
  onBPMChange: (bpm: number) => void;
  disabled?: boolean;
}

export function BPMSlider({ genre, bpm, onBPMChange, disabled = false }: BPMSliderProps) {
  const config = BPM_RANGES[genre.toLowerCase()] || BPM_RANGES.default;
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    // Reset to default when genre changes (if user hasn't manually adjusted)
    if (!isDragging && bpm !== config.default) {
      onBPMChange(config.default);
    }
  }, [genre]);

  const percentage = ((bpm - config.min) / (config.max - config.min)) * 100;

  return (
    <Card className="border border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          BPM Control
        </CardTitle>
        <CardDescription className="text-xs">
          Adjust tempo for {genre || 'your track'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* BPM Display */}
        <motion.div
          animate={{ scale: isDragging ? 1.05 : 1 }}
          className="text-center"
        >
          <div className="text-3xl font-bold text-primary font-display">
            {bpm}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {config.description}
          </div>
        </motion.div>

        {/* Slider */}
        <div className="space-y-2">
          <input
            type="range"
            min={config.min}
            max={config.max}
            value={bpm}
            onChange={(e) => onBPMChange(parseInt(e.target.value))}
            onMouseDown={() => setIsDragging(true)}
            onMouseUp={() => setIsDragging(false)}
            onTouchStart={() => setIsDragging(true)}
            onTouchEnd={() => setIsDragging(false)}
            disabled={disabled}
            className="w-full h-2 bg-gradient-to-r from-primary/20 to-accent/20 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-pointer
              [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-lg [&::-moz-range-thumb]:cursor-pointer"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{config.min}</span>
            <span>{config.max}</span>
          </div>
        </div>

        {/* Info */}
        <div className="bg-background/50 rounded-lg p-2 text-xs text-muted-foreground">
          <p>
            ♫ Recommended range: <span className="text-primary font-semibold">{config.min}–{config.max}</span> BPM
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
