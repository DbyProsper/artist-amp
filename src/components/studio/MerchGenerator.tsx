import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { generateImage } from '@/lib/api';
import { toast } from 'sonner';

const MERCH_PRESETS = {
  'T-shirt': [
    { label: '👕 Classic Tee', prompt: 'Classic T-shirt design with artist logo centered on chest, modern typography, street wear aesthetic' },
    { label: '🎨 Artistic Tee', prompt: 'Artistic T-shirt design with unique graphic art, bold colors, eye-catching design front and back' },
    { label: '⭐ Limited Edition', prompt: 'Limited edition T-shirt design with exclusive graphic, premium feel, collectible aesthetic' },
  ],
  'Golf Shirt': [
    { label: '⛳ Classic Golf', prompt: 'Classic golf shirt with embroidered artist logo, professional aesthetic, clean design, premium quality' },
    { label: '🌟 Premium Golf', prompt: 'Premium golf shirt with subtle branding, sophisticated design, elegant color scheme' },
    { label: '🏆 Elite Golf', prompt: 'Elite golf shirt with premium embroidery, luxury aesthetic, high-end design' },
  ],
  Hoodie: [
    { label: '🧥 Classic Hoodie', prompt: 'Classic hoodie design with front print, back logo, cozy streetwear aesthetic, bold colors' },
    { label: '❄️ Winter Hoodie', prompt: 'Winter hoodie with warm colors, large graphic design, layered elements, premium warmth aesthetic' },
    { label: '✨ Premium Hoodie', prompt: 'Premium hoodie with exclusive design, luxury materials feel, sophisticated styling' },
  ],
  'Crop Top': [
    { label: '👗 Fashion Crop', prompt: 'Fashion crop top design with trendy aesthetic, modern print, contemporary style, flattering fit' },
    { label: '💃 Dance Crop', prompt: 'Dance-friendly crop top with vibrant design, energetic vibes, festival fashion aesthetic' },
    { label: '🎉 Festival Crop', prompt: 'Festival crop top with eye-catching design, bold colors, party-ready aesthetic' },
  ],
  Cap: [
    { label: '🧢 Classic Cap', prompt: 'Classic cap design with embroidered artist logo, front and back branding, adjustable style' },
    { label: '🏴 Trucker Cap', prompt: 'Trucker cap design with mesh panels, bold front graphic, casual streetwear style' },
    { label: '👀 Statement Cap', prompt: 'Statement cap with unique design, standout aesthetic, memorable branding' },
  ],
  'Long Sleeve': [
    { label: '👔 Classic Long Sleeve', prompt: 'Classic long sleeve shirt with artist branding, front print, back logo, professional aesthetic' },
    { label: '🌙 Streetwear Long Sleeve', prompt: 'Streetwear long sleeve with artistic design, oversized fit feel, bold graphics' },
    { label: '✨ Premium Long Sleeve', prompt: 'Premium long sleeve with intricate design, luxury quality feel, sophisticated style' },
  ],
};

const MERCH_ICONS = {
  'T-shirt': '👕',
  'Golf Shirt': '⛳',
  Hoodie: '🧥',
  'Crop Top': '👗',
  Cap: '🧢',
  'Long Sleeve': '👔',
};

interface SimpleMerchGeneratorProps {
  language: string;
}

export function MerchGenerator({ language }: SimpleMerchGeneratorProps) {
  const [prompt, setPrompt] = useState('');
  const [merchandiseType, setMerchandiseType] = useState('T-shirt');
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [error, setError] = useState('');

  const presets = MERCH_PRESETS[merchandiseType as keyof typeof MERCH_PRESETS] || MERCH_PRESETS['T-shirt'];

  const handleApplyPreset = (preset: any) => {
    setPrompt(preset.prompt);
    toast.success('Preset applied!');
  };

  const handleGenerateMerch = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt or select a preset');
      return;
    }

    setLoading(true);
    setError('');
    setImageUrl('');

    try {
      const result = await generateImage(prompt.trim(), {
        image_type: 'merch',
        language,
      });

      if (!result.success) {
        setError(result.error || 'Failed to generate merch design');
        toast.error('Generation failed', { description: result.error });
      } else {
        const imageLink = result.cover_url || result.data?.image_url || result.data?.url;
        if (!imageLink) {
          setError('Backend did not return image URL');
          toast.error('No image returned from backend');
        } else {
          setImageUrl(imageLink);
          toast.success('Merch design generated!', { description: 'Ready to download' });
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to generate merch';
      setError(errorMsg);
      toast.error('Error', { description: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Merchandise Type Selection */}
      <Card className="bg-muted/50 border-0">
        <CardHeader>
          <CardTitle className="text-sm">Merchandise Type</CardTitle>
          <CardDescription>Choose the type of merch to design</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {Object.keys(MERCH_PRESETS).map((type) => (
              <Button
                key={type}
                variant={merchandiseType === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMerchandiseType(type)}
                className="text-xs gap-2"
              >
                <span>{MERCH_ICONS[type as keyof typeof MERCH_ICONS]}</span>
                {type}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Presets */}
      <Card className="bg-muted/50 border-0">
        <CardHeader>
          <CardTitle className="text-sm">Design Presets</CardTitle>
          <CardDescription>Choose a design style for your merch</CardDescription>
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
          <CardTitle className="text-sm">Generate Merch Design</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your merch design... (colors, graphics, style, branding, placement)"
            className="w-full h-24 p-2 rounded border border-input bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />

          <Button
            onClick={handleGenerateMerch}
            disabled={loading}
            size="sm"
            className="w-full gap-2"
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Generating Design... (45s)
              </>
            ) : (
              <>
                <ShoppingBag className="w-4 h-4" />
                Generate Merch Design
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

      {/* Generated Design */}
      {imageUrl && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" />
                Generated Merch Design
              </CardTitle>
            </CardHeader>
            <CardContent>
              <img
                src={imageUrl}
                alt="Generated merch design"
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
                    link.download = `merch-${merchandiseType}.png`;
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
