import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Sparkles, Zap, Heart, Mic2, Image, Megaphone, Shirt } from 'lucide-react';
import { StudioFeature } from './StudioEntryScreen';

interface MusicPreset {
  id: string;
  name: string;
  genre: string;
  bpm: number;
  mood: string;
  prompt: string;
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
    prompt: 'Soulful amapiano beat with warm piano chords, deep bass, mellow percussion, and smooth melodic hooks',
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
    prompt: 'Upbeat amapiano club beat with punchy kicks, lively shakers, and a dancefloor-ready rhythm',
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
    prompt: 'Dark gqom-inspired house beat with heavy bass, syncopated percussion, and trance-like energy',
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
    prompt: 'Hard-hitting trap beat with booming 808s, crisp hi-hat rolls, and dark cinematic textures',
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
    prompt: 'Vibrant afrobeats groove with layered percussion, warm synths, and bright melodic hooks',
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
    prompt: 'Smooth R&B beat with warm chords, soulful percussion, and a gentle, romantic groove',
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
    prompt: 'Uplifting house beat with driving bass, bright synth stabs, and festival-ready energy',
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
    prompt: 'Classic boom bap hip-hop beat with punchy drums, warm bass, and soulful sample textures',
    icon: <Sparkles className="w-4 h-4" />,
    description: 'Classic hip-hop vibes',
    color: 'from-gray-500/20 to-slate-500/20 border-gray-500/30',
  },
];

const LYRICS_PRESETS: MusicPreset[] = [
  {
    id: 'amapiano-love-lyrics',
    name: 'Amapiano Love Story',
    genre: 'amapiano',
    bpm: 112,
    mood: 'romantic',
    prompt: 'Write heartfelt lyrics about finding love in unexpected places, with themes of connection and soulful melodies',
    icon: <Heart className="w-4 h-4" />,
    description: 'Romantic love ballad',
    color: 'from-rose-500/20 to-pink-500/20 border-rose-500/30',
  },
  {
    id: 'trap-street-lyrics',
    name: 'Trap Street Wisdom',
    genre: 'trap',
    bpm: 140,
    mood: 'confident',
    prompt: 'Write empowering lyrics about overcoming street life challenges, with themes of resilience and success',
    icon: <Zap className="w-4 h-4" />,
    description: 'Street-smart anthem',
    color: 'from-red-500/20 to-orange-500/20 border-red-500/30',
  },
  {
    id: 'afrobeats-party-lyrics',
    name: 'Afrobeats Party Vibes',
    genre: 'afrobeats',
    bpm: 105,
    mood: 'celebratory',
    prompt: 'Write energetic lyrics about partying and celebrating life, with themes of joy and dance',
    icon: <Sparkles className="w-4 h-4" />,
    description: 'Party celebration song',
    color: 'from-green-500/20 to-emerald-500/20 border-green-500/30',
  },
  {
    id: 'rnb-heartbreak-lyrics',
    name: 'R&B Heartbreak',
    genre: 'rnb',
    bpm: 75,
    mood: 'melancholic',
    prompt: 'Write emotional lyrics about heartbreak and healing, with themes of loss and hope',
    icon: <Heart className="w-4 h-4" />,
    description: 'Emotional ballad',
    color: 'from-purple-500/20 to-pink-500/20 border-purple-500/30',
  },
  {
    id: 'house-club-lyrics',
    name: 'House Club Energy',
    genre: 'house',
    bpm: 128,
    mood: 'euphoric',
    prompt: 'Write uplifting lyrics about club life and freedom, with themes of dance and liberation',
    icon: <Zap className="w-4 h-4" />,
    description: 'Club anthem',
    color: 'from-indigo-500/20 to-purple-500/20 border-indigo-500/30',
  },
  {
    id: 'hiphop-conscious-lyrics',
    name: 'Hip-Hop Conscious Flow',
    genre: 'hiphop',
    bpm: 95,
    mood: 'thoughtful',
    prompt: 'Write conscious lyrics about social issues and personal growth, with themes of awareness and change',
    icon: <Sparkles className="w-4 h-4" />,
    description: 'Mindful hip-hop',
    color: 'from-gray-500/20 to-slate-500/20 border-gray-500/30',
  },
  {
    id: 'gqom-spiritual-lyrics',
    name: 'Gqom Spiritual Journey',
    genre: 'gqom',
    bpm: 127,
    mood: 'transcendent',
    prompt: 'Write spiritual lyrics about inner peace and enlightenment, with themes of meditation and unity',
    icon: <Sparkles className="w-4 h-4" />,
    description: 'Spiritual journey',
    color: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
  },
  {
    id: 'amapiano-motivational-lyrics',
    name: 'Amapiano Motivation',
    genre: 'amapiano',
    bpm: 115,
    mood: 'inspiring',
    prompt: 'Write motivational lyrics about chasing dreams and overcoming obstacles, with themes of hope and determination',
    icon: <Zap className="w-4 h-4" />,
    description: 'Inspirational anthem',
    color: 'from-amber-500/20 to-orange-500/20 border-amber-500/30',
  },
];

const COVER_ART_PRESETS: MusicPreset[] = [
  {
    id: 'amapiano-album-cover',
    name: 'Amapiano Album Art',
    genre: 'amapiano',
    bpm: 112,
    mood: 'vibrant',
    prompt: 'Create vibrant album cover art with warm colors, geometric patterns, and a modern African aesthetic',
    icon: <Image className="w-4 h-4" />,
    description: 'Colorful geometric design',
    color: 'from-orange-500/20 to-yellow-500/20 border-orange-500/30',
  },
  {
    id: 'trap-dark-cover',
    name: 'Trap Dark Aesthetic',
    genre: 'trap',
    bpm: 140,
    mood: 'intense',
    prompt: 'Create dark, moody album cover art with urban elements, shadows, and a cinematic feel',
    icon: <Image className="w-4 h-4" />,
    description: 'Dark urban aesthetic',
    color: 'from-gray-500/20 to-black/20 border-gray-500/30',
  },
  {
    id: 'afrobeats-bright-cover',
    name: 'Afrobeats Bright Colors',
    genre: 'afrobeats',
    bpm: 105,
    mood: 'joyful',
    prompt: 'Create bright, colorful album cover art with African patterns, vibrant hues, and energetic composition',
    icon: <Image className="w-4 h-4" />,
    description: 'Bright African patterns',
    color: 'from-green-500/20 to-yellow-500/20 border-green-500/30',
  },
  {
    id: 'rnb-romantic-cover',
    name: 'R&B Romantic Scene',
    genre: 'rnb',
    bpm: 75,
    mood: 'intimate',
    prompt: 'Create romantic album cover art with soft lighting, intimate scenes, and emotional color palette',
    icon: <Image className="w-4 h-4" />,
    description: 'Soft romantic lighting',
    color: 'from-pink-500/20 to-purple-500/20 border-pink-500/30',
  },
  {
    id: 'house-neon-cover',
    name: 'House Neon Glow',
    genre: 'house',
    bpm: 128,
    mood: 'electric',
    prompt: 'Create neon-lit album cover art with futuristic elements, glowing effects, and club atmosphere',
    icon: <Image className="w-4 h-4" />,
    description: 'Neon club aesthetic',
    color: 'from-cyan-500/20 to-purple-500/20 border-cyan-500/30',
  },
  {
    id: 'hiphop-street-cover',
    name: 'Hip-Hop Street Art',
    genre: 'hiphop',
    bpm: 95,
    mood: 'authentic',
    prompt: 'Create street-inspired album cover art with graffiti elements, urban textures, and authentic hip-hop vibe',
    icon: <Image className="w-4 h-4" />,
    description: 'Urban street art style',
    color: 'from-blue-500/20 to-gray-500/20 border-blue-500/30',
  },
  {
    id: 'gqom-abstract-cover',
    name: 'Gqom Abstract Waves',
    genre: 'gqom',
    bpm: 127,
    mood: 'hypnotic',
    prompt: 'Create abstract album cover art with wave patterns, deep colors, and hypnotic visual effects',
    icon: <Image className="w-4 h-4" />,
    description: 'Abstract wave patterns',
    color: 'from-indigo-500/20 to-teal-500/20 border-indigo-500/30',
  },
  {
    id: 'amapiano-sunset-cover',
    name: 'Amapiano Sunset Vibes',
    genre: 'amapiano',
    bpm: 115,
    mood: 'peaceful',
    prompt: 'Create sunset-themed album cover art with warm gradients, peaceful landscapes, and golden hour lighting',
    icon: <Image className="w-4 h-4" />,
    description: 'Golden sunset landscape',
    color: 'from-yellow-500/20 to-orange-500/20 border-yellow-500/30',
  },
];

const POSTER_PRESETS: MusicPreset[] = [
  {
    id: 'amapiano-event-poster',
    name: 'Amapiano Event Poster',
    genre: 'amapiano',
    bpm: 112,
    mood: 'festive',
    prompt: 'Create vibrant event poster with bold typography, geometric patterns, and festival atmosphere',
    icon: <Megaphone className="w-4 h-4" />,
    description: 'Bold festival poster',
    color: 'from-orange-500/20 to-red-500/20 border-orange-500/30',
  },
  {
    id: 'trap-concert-poster',
    name: 'Trap Concert Flyer',
    genre: 'trap',
    bpm: 140,
    mood: 'intense',
    prompt: 'Create edgy concert poster with dark colors, bold text, and urban street art elements',
    icon: <Megaphone className="w-4 h-4" />,
    description: 'Edgy concert flyer',
    color: 'from-black/20 to-red-500/20 border-black/30',
  },
  {
    id: 'afrobeats-festival-poster',
    name: 'Afrobeats Festival Poster',
    genre: 'afrobeats',
    bpm: 105,
    mood: 'celebratory',
    prompt: 'Create colorful festival poster with African motifs, bright colors, and celebratory design',
    icon: <Megaphone className="w-4 h-4" />,
    description: 'Colorful festival design',
    color: 'from-green-500/20 to-yellow-500/20 border-green-500/30',
  },
  {
    id: 'rnb-romance-poster',
    name: 'R&B Romance Poster',
    genre: 'rnb',
    bpm: 75,
    mood: 'romantic',
    prompt: 'Create romantic event poster with soft colors, elegant typography, and intimate atmosphere',
    icon: <Megaphone className="w-4 h-4" />,
    description: 'Elegant romantic poster',
    color: 'from-pink-500/20 to-purple-500/20 border-pink-500/30',
  },
  {
    id: 'house-club-poster',
    name: 'House Club Night Poster',
    genre: 'house',
    bpm: 128,
    mood: 'energetic',
    prompt: 'Create energetic club poster with neon colors, futuristic fonts, and party atmosphere',
    icon: <Megaphone className="w-4 h-4" />,
    description: 'Neon club night poster',
    color: 'from-cyan-500/20 to-pink-500/20 border-cyan-500/30',
  },
  {
    id: 'hiphop-show-poster',
    name: 'Hip-Hop Show Poster',
    genre: 'hiphop',
    bpm: 95,
    mood: 'authentic',
    prompt: 'Create authentic hip-hop show poster with street art style, bold lettering, and urban vibe',
    icon: <Megaphone className="w-4 h-4" />,
    description: 'Street art show poster',
    color: 'from-blue-500/20 to-orange-500/20 border-blue-500/30',
  },
  {
    id: 'gqom-underground-poster',
    name: 'Gqom Underground Poster',
    genre: 'gqom',
    bpm: 127,
    mood: 'mysterious',
    prompt: 'Create mysterious underground event poster with dark colors, abstract patterns, and enigmatic design',
    icon: <Megaphone className="w-4 h-4" />,
    description: 'Mysterious underground poster',
    color: 'from-purple-500/20 to-black/20 border-purple-500/30',
  },
  {
    id: 'amapiano-summer-poster',
    name: 'Amapiano Summer Poster',
    genre: 'amapiano',
    bpm: 115,
    mood: 'joyful',
    prompt: 'Create joyful summer event poster with bright colors, beach vibes, and celebratory design',
    icon: <Megaphone className="w-4 h-4" />,
    description: 'Bright summer celebration',
    color: 'from-yellow-500/20 to-blue-500/20 border-yellow-500/30',
  },
];

const MERCH_PRESETS: MusicPreset[] = [
  {
    id: 'amapiano-tshirt-design',
    name: 'Amapiano T-Shirt',
    genre: 'amapiano',
    bpm: 112,
    mood: 'stylish',
    prompt: 'Create stylish t-shirt design with geometric patterns, bold colors, and modern African fashion aesthetic',
    icon: <Shirt className="w-4 h-4" />,
    description: 'Geometric fashion design',
    color: 'from-orange-500/20 to-purple-500/20 border-orange-500/30',
  },
  {
    id: 'trap-streetwear-design',
    name: 'Trap Streetwear',
    genre: 'trap',
    bpm: 140,
    mood: 'edgy',
    prompt: 'Create edgy streetwear design with urban elements, bold graphics, and street culture inspiration',
    icon: <Shirt className="w-4 h-4" />,
    description: 'Urban streetwear style',
    color: 'from-black/20 to-red-500/20 border-black/30',
  },
  {
    id: 'afrobeats-vibrant-design',
    name: 'Afrobeats Vibrant Merch',
    genre: 'afrobeats',
    bpm: 105,
    mood: 'colorful',
    prompt: 'Create vibrant merchandise design with African prints, bright colors, and cultural patterns',
    icon: <Shirt className="w-4 h-4" />,
    description: 'Colorful African prints',
    color: 'from-green-500/20 to-yellow-500/20 border-green-500/30',
  },
  {
    id: 'rnb-elegant-design',
    name: 'R&B Elegant Apparel',
    genre: 'rnb',
    bpm: 75,
    mood: 'sophisticated',
    prompt: 'Create elegant merchandise design with soft colors, sophisticated typography, and romantic aesthetic',
    icon: <Shirt className="w-4 h-4" />,
    description: 'Sophisticated romantic style',
    color: 'from-pink-500/20 to-gray-500/20 border-pink-500/30',
  },
  {
    id: 'house-neon-design',
    name: 'House Neon Merch',
    genre: 'house',
    bpm: 128,
    mood: 'electric',
    prompt: 'Create neon-inspired merchandise design with glowing effects, futuristic elements, and club energy',
    icon: <Shirt className="w-4 h-4" />,
    description: 'Neon club merchandise',
    color: 'from-cyan-500/20 to-pink-500/20 border-cyan-500/30',
  },
  {
    id: 'hiphop-classic-design',
    name: 'Hip-Hop Classic Tee',
    genre: 'hiphop',
    bpm: 95,
    mood: 'timeless',
    prompt: 'Create classic hip-hop merchandise design with vintage elements, bold lettering, and timeless style',
    icon: <Shirt className="w-4 h-4" />,
    description: 'Classic hip-hop style',
    color: 'from-blue-500/20 to-gold-500/20 border-blue-500/30',
  },
  {
    id: 'gqom-abstract-design',
    name: 'Gqom Abstract Merch',
    genre: 'gqom',
    bpm: 127,
    mood: 'artistic',
    prompt: 'Create abstract merchandise design with wave patterns, deep colors, and artistic expression',
    icon: <Shirt className="w-4 h-4" />,
    description: 'Abstract artistic design',
    color: 'from-indigo-500/20 to-teal-500/20 border-indigo-500/30',
  },
  {
    id: 'amapiano-luxury-design',
    name: 'Amapiano Luxury Merch',
    genre: 'amapiano',
    bpm: 115,
    mood: 'premium',
    prompt: 'Create luxury merchandise design with gold accents, elegant patterns, and premium aesthetic',
    icon: <Shirt className="w-4 h-4" />,
    description: 'Luxury gold accents',
    color: 'from-gold-500/20 to-black/20 border-gold-500/30',
  },
];

interface PresetButtonsProps {
  feature: StudioFeature;
  onPresetSelect: (preset: MusicPreset) => void;
  disabled?: boolean;
}

export function PresetButtons({ feature, onPresetSelect, disabled = false }: PresetButtonsProps) {
  const getPresets = () => {
    switch (feature) {
      case 'lyrics':
        return LYRICS_PRESETS;
      case 'cover':
        return COVER_ART_PRESETS;
      case 'poster':
        return POSTER_PRESETS;
      case 'merch':
        return MERCH_PRESETS;
      default:
        return MUSIC_PRESETS;
    }
  };

  const presets = getPresets();

  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold text-muted-foreground">Quick Start Presets</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {presets.map((preset, idx) => (
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
                {feature === 'lyrics' ? '♪' : feature === 'cover' || feature === 'poster' || feature === 'merch' ? '🎨' : '♫'} {preset.genre} • {preset.mood}
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
