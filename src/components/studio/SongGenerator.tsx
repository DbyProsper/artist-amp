import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Loader, Play, Pause, Download, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { generateSong } from '@/lib/api';
import { toast } from 'sonner';
import { saveGeneratedAudio } from '@/lib/aiMusicStorage';

const SONG_PRESETS = {
  amapiano: [
    { mood: 'celebration', label: '🎉 Celebration Anthem', prompt: 'Upbeat amapiano celebration song about joy, dancing and good times with friends' },
    { mood: 'love', label: '💕 Love Story', prompt: 'Romantic amapiano song with beautiful melodies, emotional lyrics about love and connection' },
    { mood: 'motivational', label: '🚀 Rise & Shine', prompt: 'Motivational amapiano track with inspiring lyrics about dreams, success and perseverance' },
  ],
  electronic: [
    { mood: 'uplifting', label: '⬆️ Uplifting', prompt: 'Uplifting electronic song with positive vibes, soaring synths and hopeful lyrics' },
    { mood: 'experimental', label: '🔬 Experimental', prompt: 'Experimental electronic music blending different sounds, innovative and creative' },
    { mood: 'dark', label: '🌑 Dark Vibes', prompt: 'Dark electronic track with moody atmosphere, mysterious and intense energy' },
  ],
  afrobeats: [
    { mood: 'party', label: '🎊 Afrobeats Party', prompt: 'High-energy afrobeats party anthem with infectious rhythm and celebratory lyrics' },
    { mood: 'soulful', label: '🎵 Soulful', prompt: 'Soulful afrobeats ballad with emotional depth, introspective and beautiful' },
    { mood: 'vibrant', label: '🌟 Vibrant', prompt: 'Vibrant afrobeats celebrating culture, diversity and unity with positive message' },
  ],
};

interface SongGeneratorProps {
  genre: string;
  mood: string;
  language: string;
  profile: any;
}

export function SongGenerator({ genre, mood, language, profile }: SongGeneratorProps) {
  const [prompt, setPrompt] = useState('');
  const [bpm, setBpm] = useState(110);
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [error, setError] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [selectedMood, setSelectedMood] = useState('celebration');

  const presets = SONG_PRESETS[genre as keyof typeof SONG_PRESETS] || SONG_PRESETS.afrobeats;

  const handleApplyPreset = (preset: any) => {
    setPrompt(preset.prompt);
    setSelectedMood(preset.mood);
    toast.success('Preset applied!');
  };

  const handleGenerateSong = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    setLoading(true);
    setError('');
    setAudioUrl('');
    setCoverUrl('');
    setLyrics('');

    try {
      const result = await generateSong(prompt.trim(), {
        genre,
        mood: selectedMood,
        language,
        bpm,
      });

      if (!result.success) {
        setError(result.error || 'Failed to generate song');
        toast.error('Generation failed', { description: result.error });
      } else {
        // Extract audio URL
        const audio = result.data?.audio?.url || result.audio_url || result.data?.audio_url;
        if (audio) setAudioUrl(audio);

        // Extract cover URL
        const cover = result.data?.image?.url || result.data?.image_url || result.cover_url;
        if (cover) setCoverUrl(cover);

        // Extract lyrics
        const lyricsText = result.data?.lyrics?.text || result.lyrics || result.data?.lyrics || result.data?.text;
        if (lyricsText) setLyrics(lyricsText);

        if (audio) {
          toast.success('Complete song generated!', {
            description: 'Music, lyrics, and cover art created',
          });

          // Save to library
          if (profile?.id) {
            try {
              await saveGeneratedAudio(profile.id, {
                title: `🎵 Song - ${prompt.slice(0, 40)}... (${bpm} BPM)`,
                audio_url: audio,
                cover_url: cover,
                mode: 'song_generation',
              });
              toast.success('Saved to library!');
            } catch (err) {
              console.error('Failed to save:', err);
            }
          }
        } else {
          setError('Backend did not return audio URL');
          toast.error('No audio returned from backend');
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to generate song';
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
          <CardTitle className="text-sm">Song Presets</CardTitle>
          <CardDescription>Auto-generate complete songs with presets</CardDescription>
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

      {/* Song Generation Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Complete Song Generator</CardTitle>
          <CardDescription>Generates music, lyrics, and cover art</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your complete song concept... (theme, story, vibe, style)"
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
          </div>

          {/* Mood Select */}
          <Select value={selectedMood} onValueChange={setSelectedMood}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Select mood" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="celebration">Celebration</SelectItem>
              <SelectItem value="love">Love</SelectItem>
              <SelectItem value="motivational">Motivational</SelectItem>
              <SelectItem value="party">Party</SelectItem>
              <SelectItem value="soulful">Soulful</SelectItem>
              <SelectItem value="melancholic">Melancholic</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={handleGenerateSong}
            disabled={loading}
            size="sm"
            className="w-full gap-2"
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Generating Complete Song... (2-3 min)
              </>
            ) : (
              <>Generate Complete Song</>
            )}
          </Button>

          {error && (
            <div className="p-2 rounded bg-destructive/10 text-destructive text-xs">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {(audioUrl || coverUrl || lyrics) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Audio Player */}
          {audioUrl && (
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="text-sm">🎵 Audio</CardTitle>
              </CardHeader>
              <CardContent>
                <audio
                  ref={audioRef}
                  src={audioUrl}
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
                  <span className="text-xs text-muted-foreground">
                    {isPlaying ? 'Playing...' : 'Ready to play'}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cover Art */}
          {coverUrl && (
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Image className="w-4 h-4" />
                  Cover Art
                </CardTitle>
              </CardHeader>
              <CardContent>
                <img
                  src={coverUrl}
                  alt="Generated cover"
                  className="w-full rounded-lg object-cover"
                />
              </CardContent>
            </Card>
          )}

          {/* Lyrics */}
          {lyrics && (
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="text-sm">📝 Lyrics</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted p-3 rounded whitespace-pre-wrap font-mono text-xs overflow-auto max-h-96">
                  {lyrics}
                </pre>
              </CardContent>
            </Card>
          )}
        </motion.div>
      )}
    </div>
  );
}
