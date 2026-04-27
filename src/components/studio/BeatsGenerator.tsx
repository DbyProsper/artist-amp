import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { generateBeats } from '@/lib/api';
import { toast } from 'sonner';
import { saveGeneratedAudio } from '@/lib/aiMusicStorage';
import { useRef } from 'react';

const BEATS_PRESETS = {
  amapiano: [
    { mood: 'energetic', bpm: 115, label: '🎵 Club Banger', prompt: 'High-energy amapiano beat with deep bass, energetic hi-hats and infectious groove, perfect for dancing' },
    { mood: 'smooth', bpm: 100, label: '🎶 Smooth Vibes', prompt: 'Smooth amapiano beat with laid-back rhythm, warm synths and relaxed vibe' },
    { mood: 'party', bpm: 120, label: '🎉 Party Mode', prompt: 'Upbeat amapiano party beat with catchy rhythm, crowd-pleasing energy' },
  ],
  electronic: [
    { mood: 'energetic', bpm: 128, label: '⚡ Tech House', prompt: 'Tech house beat with tight kick, crisp hi-hats and electronic synths, hypnotic rhythm' },
    { mood: 'ambient', bpm: 90, label: '🌌 Ambient Chill', prompt: 'Ambient electronic beat with atmospheric pads, slow tempo and ethereal vibes' },
    { mood: 'dance', bpm: 130, label: '💃 Dance Floor', prompt: 'Dance electronic beat with driving kick, heavy bass and peak-time energy' },
  ],
  hiphop: [
    { mood: 'boom-bap', bpm: 95, label: '🔥 Boom Bap', prompt: 'Classic boom bap beat with heavy drums, gritty samples and vintage hip-hop feel' },
    { mood: 'trap', bpm: 140, label: '🎯 Trap Beat', prompt: 'Modern trap beat with 808 bass, hi-hat rolls and aggressive hi-hats' },
    { mood: 'conscious', bpm: 85, label: '🎤 Conscious', prompt: 'Conscious hip-hop beat with soulful samples, thoughtful rhythm for lyrical delivery' },
  ],
};

interface BeatsGeneratorProps {
  genre: string;
  mood: string;
  language: string;
  profile: any;
}

export function BeatsGenerator({ genre, mood, language, profile }: BeatsGeneratorProps) {
  const [prompt, setPrompt] = useState('');
  const [bpm, setBpm] = useState(110);
  const [loading, setLoading] = useState(false);
  const [beatUrl, setBeatUrl] = useState('');
  const [error, setError] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [selectedMood, setSelectedMood] = useState('energetic');

  const presets = BEATS_PRESETS[genre as keyof typeof BEATS_PRESETS] || BEATS_PRESETS.electronic;

  const handleApplyPreset = (preset: any) => {
    setPrompt(preset.prompt);
    setSelectedMood(preset.mood);
    setBpm(preset.bpm);
    toast.success('Preset applied!');
  };

  const handleGenerateBeats = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    if (bpm < 60 || bpm > 180) {
      toast.error('BPM must be between 60 and 180');
      return;
    }

    setLoading(true);
    setError('');
    setBeatUrl('');

    try {
      const result = await generateBeats(prompt.trim(), {
        genre,
        mood: selectedMood,
        language,
        bpm,
      });

      if (!result.success) {
        setError(result.error || 'Failed to generate beat');
        toast.error('Generation failed', { description: result.error });
      } else {
        const audioUrl = result.audio_url || result.data?.audio_url;
        if (!audioUrl) {
          setError('Backend did not return audio URL');
          toast.error('No audio returned from backend');
        } else {
          setBeatUrl(audioUrl);
          toast.success('Beat generated!', { description: 'Ready to play and download' });

          // Save to library
          if (profile?.id) {
            try {
              await saveGeneratedAudio(profile.id, {
                title: `🎵 Beat - ${prompt.slice(0, 40)}... (${bpm} BPM)`,
                audio_url: audioUrl,
                mode: 'beat_generation',
              });
              toast.success('Saved to library!');
            } catch (err) {
              console.error('Failed to save:', err);
            }
          }
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to generate beat';
      setError(errorMsg);
      toast.error('Error', { description: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="space-y-4">
      {/* Presets */}
      <Card className="bg-muted/50 border-0">
        <CardHeader>
          <CardTitle className="text-sm">Beat Presets</CardTitle>
          <CardDescription>Select a preset to auto-fill prompt and BPM</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {presets.map((preset, idx) => (
              <Button
                key={idx}
                variant={selectedMood === preset.mood ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleApplyPreset(preset)}
                className="text-xs"
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Prompt and Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Beat Generation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the beat you want... (style, tempo, vibe, elements)"
            className="w-full h-24 p-2 rounded border border-input bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />

          {/* BPM Slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-medium">Tempo (BPM)</label>
              <span className="text-sm font-bold text-primary">{bpm} BPM</span>
            </div>
            <Slider
              value={[bpm]}
              onValueChange={(value) => setBpm(value[0])}
              min={60}
              max={180}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>60</span>
              <span>120</span>
              <span>180</span>
            </div>
          </div>

          {/* Mood Select */}
          <Select value={selectedMood} onValueChange={setSelectedMood}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Select mood" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="energetic">Energetic</SelectItem>
              <SelectItem value="smooth">Smooth</SelectItem>
              <SelectItem value="aggressive">Aggressive</SelectItem>
              <SelectItem value="chill">Chill</SelectItem>
              <SelectItem value="party">Party</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={handleGenerateBeats}
            disabled={loading}
            size="sm"
            className="w-full gap-2"
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Generating Beat...
              </>
            ) : (
              <>Generate Beat</>
            )}
          </Button>

          {error && (
            <div className="p-2 rounded bg-destructive/10 text-destructive text-xs">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audio Player */}
      {beatUrl && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <audio
                ref={audioRef}
                src={beatUrl}
                onEnded={() => setIsPlaying(false)}
                className="hidden"
              />
              <div className="flex items-center gap-3">
                <Button
                  onClick={handlePlayPause}
                  size="sm"
                  variant="default"
                  className="rounded-full w-10 h-10 p-0"
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </Button>
                <div className="flex-1">
                  <p className="text-xs font-medium">Beat generated successfully</p>
                  <p className="text-xs text-muted-foreground">
                    Ready to download or add to playlist
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
