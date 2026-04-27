import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { generateImage } from '@/lib/api';
import { toast } from 'sonner';

const POSTER_PRESETS = {
  concert: [
    { label: '🎤 Live Concert', prompt: 'Eye-catching concert poster with artist image, vibrant colors, bold typography, date/time prominently displayed, energy and excitement' },
    { label: '🎸 Rock Show', prompt: 'Rock concert poster with edgy design, high contrast, electric colors, dynamic composition, musician silhouettes' },
    { label: '🎵 Music Festival', prompt: 'Music festival poster with multiple artists, colorful design, festive atmosphere, event details, visual impact' },
  ],
  festival: [
    { label: '🌟 Mega Festival', prompt: 'Large-scale festival poster with spectacular design, multiple visual elements, celebration vibes, star appeal' },
    { label: '🎉 Summer Vibes', prompt: 'Summer festival poster with bright colors, outdoor aesthetic, fun typography, seasonal energy' },
    { label: '🎊 Night Festival', prompt: 'Night festival poster with dark background, neon colors, mysterious vibe, star-filled sky' },
  ],
  album_release: [
    { label: '📀 Album Drop', prompt: 'Album release poster with album artwork, artist name, release date, bold modern design, professional aesthetic' },
    { label: '🆕 New Music', prompt: 'New music poster highlighting upcoming release, teaser design, artistic imagery, compelling typography' },
    { label: '💿 Exclusive', prompt: 'Exclusive album release poster with premium design, limited edition vibes, artistic and sophisticated' },
  ],
  party_event: [
    { label: '🎉 Club Party', prompt: 'Club party poster with vibrant colors, DJ imagery, energetic design, event details, nightlife atmosphere' },
    { label: '🎊 Rave Night', prompt: 'Rave party poster with neon colors, electronic vibes, dancing figures, high energy design' },
    { label: '🌃 After Party', prompt: 'After party poster with sleek design, VIP aesthetic, exclusive event feel, stylish typography' },
  ],
  promotional: [
    { label: '📣 Promotion', prompt: 'Promotional poster for artist or music project, professional design, key visuals, compelling call-to-action' },
    { label: '🌟 Artist Spotlight', prompt: 'Artist spotlight promotional poster with portrait, artist branding, achievements, impressive design' },
    { label: '📢 Campaign', prompt: 'Marketing campaign poster for music project, eye-catching design, clear message, professional layout' },
  ],
};

interface PosterGeneratorProps {
  language: string;
}

export function PosterGenerator({ language }: PosterGeneratorProps) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('concert');

  const presets = POSTER_PRESETS[selectedCategory as keyof typeof POSTER_PRESETS] || POSTER_PRESETS.concert;

  const handleApplyPreset = (preset: any) => {
    setPrompt(preset.prompt);
    toast.success('Preset applied!');
  };

  const handleGeneratePoster = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt or select a preset');
      return;
    }

    setLoading(true);
    setError('');
    setImageUrl('');

    try {
      const result = await generateImage(prompt.trim(), {
        image_type: 'poster',
        language,
      });

      if (!result.success) {
        setError(result.error || 'Failed to generate poster');
        toast.error('Generation failed', { description: result.error });
      } else {
        const imageLink = result.cover_url || result.data?.image_url || result.data?.url;
        if (!imageLink) {
          setError('Backend did not return image URL');
          toast.error('No image returned from backend');
        } else {
          setImageUrl(imageLink);
          toast.success('Poster generated!', { description: 'Ready to download' });
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to generate poster';
      setError(errorMsg);
      toast.error('Error', { description: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Category Selection */}
      <Card className="bg-muted/50 border-0">
        <CardHeader>
          <CardTitle className="text-sm">Poster Category</CardTitle>
          <CardDescription>Choose the type of poster you want</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.keys(POSTER_PRESETS).map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className="text-xs capitalize"
              >
                {category.replace('_', ' ')}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Presets */}
      <Card className="bg-muted/50 border-0">
        <CardHeader>
          <CardTitle className="text-sm">Poster Presets</CardTitle>
          <CardDescription>Choose a style for your poster</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {presets.map((preset, idx) => (
              <Button
                key={idx}
                variant="outline"
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
          <CardTitle className="text-sm">Generate Poster</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your poster concept... (event, design style, colors, key elements, typography)"
            className="w-full h-24 p-2 rounded border border-input bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />

          <Button
            onClick={handleGeneratePoster}
            disabled={loading}
            size="sm"
            className="w-full gap-2"
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Generating Poster... (45s)
              </>
            ) : (
              <>
                <ImageIcon className="w-4 h-4" />
                Generate Poster
              </>
            )}
          </Button>

          {error && (
            <div className="p-2 rounded bg-destructive/10 text-destructive text-xs">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generated Poster */}
      {imageUrl && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Generated Poster
              </CardTitle>
            </CardHeader>
            <CardContent>
              <img
                src={imageUrl}
                alt="Generated poster"
                className="w-full rounded-lg object-cover"
              />
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-xs"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = imageUrl;
                    link.download = 'poster.png';
                    link.click();
                  }}
                >
                  Download
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
