import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Save, Wand2, AlertCircle } from 'lucide-react';

interface MerchGeneratorProps {
  loading: boolean;
  onGenerate: (data: MerchDesignRequest) => Promise<void>;
  frontImage?: string;
  backImage?: string;
  disabled?: boolean;
}

export interface MerchDesignRequest {
  songTitle: string;
  genre: string;
  style: 'streetwear' | 'luxury' | 'minimal';
}

const MERCH_STYLES = [
  { value: 'streetwear', label: 'Streetwear', description: 'Bold, urban designs' },
  { value: 'luxury', label: 'Luxury', description: 'Premium, minimalist aesthetic' },
  { value: 'minimal', label: 'Minimal', description: 'Clean, simple designs' },
];

export function MerchGenerator({
  loading,
  onGenerate,
  frontImage,
  backImage,
  disabled,
}: MerchGeneratorProps) {
  const [songTitle, setSongTitle] = useState('');
  const [genre, setGenre] = useState('amapiano');
  const [style, setStyle] = useState<'streetwear' | 'luxury' | 'minimal'>('streetwear');

  const handleGenerate = async () => {
    if (!songTitle.trim()) {
      alert('Please enter a song title');
      return;
    }

    try {
      await onGenerate({ songTitle, genre, style });
    } catch (error) {
      console.error('Failed to generate merch:', error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Input Section */}
      <Card className="border border-primary/20">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-primary" />
            Create Merchandise Design
          </CardTitle>
          <CardDescription>
            Generate custom merch designs based on your music
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Song Title */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Song Title</label>
            <Input
              placeholder="e.g., Midnight Dreams"
              value={songTitle}
              onChange={(e) => setSongTitle(e.target.value)}
              disabled={loading || disabled}
              className="bg-muted/50"
            />
          </div>

          {/* Genre */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Genre</label>
            <Select value={genre} onValueChange={setGenre} disabled={loading || disabled}>
              <SelectTrigger className="bg-muted/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="amapiano">Amapiano</SelectItem>
                <SelectItem value="gqom">Gqom</SelectItem>
                <SelectItem value="trap">Trap</SelectItem>
                <SelectItem value="rnb">R&B</SelectItem>
                <SelectItem value="afrobeats">Afrobeats</SelectItem>
                <SelectItem value="house">House</SelectItem>
                <SelectItem value="hiphop">Hip-Hop</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Style */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Design Style</label>
            <div className="grid grid-cols-3 gap-2">
              {MERCH_STYLES.map((s) => (
                <Button
                  key={s.value}
                  variant={style === s.value ? 'default' : 'outline'}
                  className="h-auto py-3 flex flex-col items-center gap-1 text-xs"
                  onClick={() => setStyle(s.value as any)}
                  disabled={loading || disabled}
                >
                  <span className="font-semibold">{s.label}</span>
                  <span className="text-[11px] opacity-70">{s.description}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={loading || disabled || !songTitle.trim()}
            className="w-full bg-gradient-to-r from-primary to-accent h-12"
            size="lg"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                Generating Design...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 mr-2" />
                Generate Merch Design
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Preview Section */}
      {(frontImage || backImage) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          <h3 className="font-semibold">Preview Designs</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Front Design */}
            {frontImage && (
              <Card className="border border-primary/20 overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Front Design</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="aspect-square bg-muted rounded-lg overflow-hidden border border-primary/10">
                    <img
                      src={frontImage}
                      alt="Front design"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = frontImage;
                      link.download = `merch-front-${Date.now()}.png`;
                      link.click();
                    }}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Front
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Back Design */}
            {backImage && (
              <Card className="border border-primary/20 overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Back Design</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="aspect-square bg-muted rounded-lg overflow-hidden border border-primary/10">
                    <img
                      src={backImage}
                      alt="Back design"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = backImage;
                      link.download = `merch-back-${Date.now()}.png`;
                      link.click();
                    }}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Back
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" disabled={disabled}>
              <Save className="w-4 h-4 mr-2" />
              Save to Profile
            </Button>
          </div>
        </motion.div>
      )}

      {/* Empty State */}
      {!frontImage && !backImage && !loading && (
        <Card className="border border-dashed border-muted p-8 text-center">
          <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="text-sm text-muted-foreground">
            Generate a design to see preview
          </p>
        </Card>
      )}
    </motion.div>
  );
}
