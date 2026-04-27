import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { generateImage } from '@/lib/api';
import { toast } from 'sonner';

const COVER_PRESETS = {
  amapiano: [
    { label: '🎆 Vibrant & Dynamic', prompt: 'Vibrant South African amapiano album cover with bold colors, dancing figures, modern aesthetic and energetic vibes' },
    { label: '🌆 Urban Modern', prompt: 'Modern urban album cover with minimalist design, urban landscape, contemporary art style, sleek typography' },
    { label: '💎 Luxury Gold', prompt: 'Luxury album cover with gold accents, elegant design, premium feel, sophisticated color palette' },
  ],
  electronic: [
    { label: '🌀 Neon Cyberpunk', prompt: 'Neon cyberpunk electronic album cover with futuristic design, neon colors, tech aesthetic, digital vibes' },
    { label: '🚀 Sci-Fi Space', prompt: 'Sci-fi space themed album cover with cosmic elements, galaxy, stars, futuristic technology' },
    { label: '🔷 Abstract Geometric', prompt: 'Abstract geometric album cover with minimalist design, bold shapes, vibrant colors, artistic' },
  ],
  afrobeats: [
    { label: '🌍 Cultural Pride', prompt: 'Album cover celebrating African culture with traditional patterns, vibrant colors, cultural symbols, pride' },
    { label: '🎨 Artistic Expression', prompt: 'Artistic album cover with unique aesthetic, hand-drawn elements, creative design, expressive colors' },
    { label: '✨ Glam & Glamour', prompt: 'Glamorous album cover with stylish presentation, modern fashion aesthetic, celebrity vibe, polished' },
  ],
  rnb: [
    { label: '💜 Moody Elegant', prompt: 'Moody elegant R&B album cover with soft colors, romantic atmosphere, intimate aesthetic, smooth design' },
    { label: '👑 Icon Status', prompt: 'Iconic album cover presenting artist as star, celebrity aesthetic, bold statement, charismatic presence' },
    { label: '🌙 Nocturnal Magic', prompt: 'Nocturnal magic album cover with night vibes, mysterious atmosphere, stars, dreamy aesthetic' },
  ],
  hiphop: [
    { label: '🔥 Street Grit', prompt: 'Street culture hip-hop album cover with urban edge, gritty aesthetic, raw energy, authentic street style' },
    { label: '💰 Luxury Lifestyle', prompt: 'Luxury lifestyle hip-hop album cover with wealth aesthetic, premium branding, high-end lifestyle' },
    { label: '👾 Digital Age', prompt: 'Digital age hip-hop cover with modern technology, digital art, contemporary aesthetic, futuristic vibes' },
  ],
};

interface CoverArtGeneratorProps {
  genre: string;
  language: string;
}

export function CoverArtGenerator({ genre, language }: CoverArtGeneratorProps) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [error, setError] = useState('');

  const presets = COVER_PRESETS[genre as keyof typeof COVER_PRESETS] || COVER_PRESETS.afrobeats;

  const handleApplyPreset = (preset: any) => {
    setPrompt(preset.prompt);
    toast.success('Preset applied!');
  };

  const handleGenerateCover = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt or select a preset');
      return;
    }

    setLoading(true);
    setError('');
    setImageUrl('');

    try {
      const result = await generateImage(prompt.trim(), {
        image_type: 'cover',
        genre,
        language,
      });

      if (!result.success) {
        setError(result.error || 'Failed to generate cover');
        toast.error('Generation failed', { description: result.error });
      } else {
        const imageLink = result.cover_url || result.data?.image_url || result.data?.url;
        if (!imageLink) {
          setError('Backend did not return image URL');
          toast.error('No image returned from backend');
        } else {
          setImageUrl(imageLink);
          toast.success('Cover art generated!', { description: 'Ready to download' });
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to generate cover';
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
          <CardTitle className="text-sm">Cover Art Presets</CardTitle>
          <CardDescription>Choose a style to match your vision</CardDescription>
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
          <CardTitle className="text-sm">Generate Album Cover</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your album cover concept... (style, colors, mood, elements, composition)"
            className="w-full h-24 p-2 rounded border border-input bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />

          <Button
            onClick={handleGenerateCover}
            disabled={loading}
            size="sm"
            className="w-full gap-2"
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Generating Cover Art... (45s)
              </>
            ) : (
              <>
                <ImageIcon className="w-4 h-4" />
                Generate Cover Art
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

      {/* Generated Image */}
      {imageUrl && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Generated Cover Art
              </CardTitle>
            </CardHeader>
            <CardContent>
              <img
                src={imageUrl}
                alt="Generated cover"
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
                    link.download = 'album-cover.png';
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
