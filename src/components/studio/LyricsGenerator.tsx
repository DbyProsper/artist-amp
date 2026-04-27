import { useState } from 'react';
import { motion } from 'framer-motion';
import { Wand2, Loader, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { generateLyrics } from '@/lib/api';
import { toast } from 'sonner';
import { PresetButtons } from './PresetButtons';
import { saveGeneratedLyrics } from '@/lib/aiMusicStorage';

const LYRICS_PRESETS = {
  amapiano: [
    { mood: 'energetic', label: 'High Energy Amapiano', prompt: 'Upbeat amapiano track with infectious groove, celebratory lyrics about dancing and having fun' },
    { mood: 'romantic', label: 'Smooth Amapiano Love', prompt: 'Smooth amapiano with romantic lyrics, love story theme, sweet melodies' },
    { mood: 'motivational', label: 'Inspiring Amapiano', prompt: 'Motivational amapiano with empowering lyrics about overcoming challenges and success' },
  ],
  hiphop: [
    { mood: 'aggressive', label: 'Hard-Hitting Hip-Hop', prompt: 'Aggressive hip-hop lyrics with strong rhythm, gritty street themes and confident flow' },
    { mood: 'storytelling', label: 'Storytelling Hip-Hop', prompt: 'Hip-hop narrative lyrics telling a compelling story, introspective and real' },
    { mood: 'uplifting', label: 'Positive Hip-Hop', prompt: 'Uplifting hip-hop with positive messages, inspiring youth and community themes' },
  ],
  afrobeats: [
    { mood: 'vibrant', label: 'Vibrant Afrobeats', prompt: 'Vibrant afrobeats lyrics celebrating African culture, dance and unity' },
    { mood: 'smooth', label: 'Smooth Afrobeats', prompt: 'Smooth afrobeats with laid-back lyrics about love, life and relaxation' },
    { mood: 'party', label: 'Party Afrobeats', prompt: 'High-energy afrobeats party lyrics, fun, catchy hooks and celebratory vibes' },
  ],
  rnb: [
    { mood: 'sensual', label: 'Sensual R&B', prompt: 'Sensual R&B lyrics with romantic themes, smooth grooves and emotional depth' },
    { mood: 'soulful', label: 'Soulful R&B', prompt: 'Soulful R&B with deep emotional lyrics, vulnerability and genuine feelings' },
    { mood: 'upbeat', label: 'Upbeat R&B', prompt: 'Upbeat R&B with feel-good lyrics about self-love, confidence and positivity' },
  ],
};

interface LyricsGeneratorProps {
  genre: string;
  mood: string;
  language: string;
  profile: any;
}

export function LyricsGenerator({ genre, mood, language, profile }: LyricsGeneratorProps) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [lyrics, setLyrics] = useState('');
  const [error, setError] = useState('');
  const [selectedMood, setSelectedMood] = useState('energetic');

  const moodPresets = LYRICS_PRESETS[genre as keyof typeof LYRICS_PRESETS] || LYRICS_PRESETS.afrobeats;

  const handleApplyPreset = (preset: any) => {
    setPrompt(preset.prompt);
    setSelectedMood(preset.mood);
    toast.success('Preset applied!');
  };

  const handleGenerateLyrics = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    setLoading(true);
    setError('');
    setLyrics('');

    try {
      const result = await generateLyrics(prompt.trim(), {
        mood: selectedMood,
        genre,
        language,
      });

      if (!result.success) {
        setError(result.error || 'Failed to generate lyrics');
        toast.error('Generation failed', { description: result.error });
      } else {
        const generatedLyrics = result.data?.content || result.lyrics || result.data?.text || '';
        setLyrics(generatedLyrics);
        toast.success('Lyrics generated!', { description: 'Ready to save or edit' });

        // Save to library
        if (profile?.id) {
          try {
            await saveGeneratedLyrics(profile.id, {
              title: `🎵 ${prompt.slice(0, 40)}...`,
              content: generatedLyrics,
              model: 'gemini',
            });
            toast.success('Saved to library!');
          } catch (err) {
            console.error('Failed to save:', err);
          }
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to generate lyrics';
      setError(errorMsg);
      toast.error('Error', { description: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Presets */}
      <Card className="bg-muted/50 border-0">
        <CardHeader>
          <CardTitle className="text-sm">Quick Presets</CardTitle>
          <CardDescription>Select a preset to auto-fill the prompt</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {moodPresets.map((preset, idx) => (
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

      {/* Prompt Input */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Lyrics Prompt</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the lyrics you want to generate... (genre, mood, theme, style)"
            className="w-full h-24 p-2 rounded border border-input bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />

          <div className="flex gap-2">
            <Select value={selectedMood} onValueChange={setSelectedMood}>
              <SelectTrigger className="w-32 h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="energetic">Energetic</SelectItem>
                <SelectItem value="calm">Calm</SelectItem>
                <SelectItem value="romantic">Romantic</SelectItem>
                <SelectItem value="motivational">Motivational</SelectItem>
                <SelectItem value="sad">Sad</SelectItem>
                <SelectItem value="happy">Happy</SelectItem>
              </SelectContent>
            </Select>

            <Button
              onClick={handleGenerateLyrics}
              disabled={loading}
              size="sm"
              className="gap-2 flex-1"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Music className="w-4 h-4" />
                  Generate Lyrics
                </>
              )}
            </Button>
          </div>

          {error && (
            <div className="p-2 rounded bg-destructive/10 text-destructive text-xs">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lyrics Output */}
      {lyrics && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Music className="w-4 h-4" />
                Generated Lyrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <pre className="bg-muted p-3 rounded whitespace-pre-wrap font-mono text-xs overflow-auto max-h-96">
                  {lyrics}
                </pre>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
