import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Music2, Save, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { genres } from '@/data/mockData';

export default function PreferencesPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

  useEffect(() => {
    // Could fetch from user_preferences table
  }, [profile]);

  if (!user) {
    navigate('/auth');
    return null;
  }

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev => 
      prev.includes(genre)
        ? prev.filter(g => g !== genre)
        : [...prev, genre]
    );
  };

  const handleSave = async () => {
    if (!profile) return;
    
    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          profile_id: profile.id,
          favorite_genres: selectedGenres,
        }, { onConflict: 'profile_id' });
      
      if (error) throw error;
      
      toast.success('Preferences saved!');
      navigate(-1);
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(error.message || 'Failed to save preferences');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-36">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-full hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-display font-bold text-lg">Music Preferences</h1>
          </div>
          <Button onClick={handleSave} disabled={loading} size="sm">
            <Save className="w-4 h-4 mr-1" />
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </header>

      <div className="p-4 space-y-6">
        <div className="text-center py-6">
          <Music2 className="w-12 h-12 mx-auto text-primary mb-3" />
          <h2 className="font-display font-bold text-xl mb-2">What do you like?</h2>
          <p className="text-sm text-muted-foreground">
            Select your favorite genres to get better recommendations
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {genres.map((genre) => (
            <motion.button
              key={genre}
              whileTap={{ scale: 0.95 }}
              onClick={() => toggleGenre(genre)}
              className={`px-4 py-2 rounded-full border transition-all flex items-center gap-2 ${
                selectedGenres.includes(genre)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted/30 border-border hover:border-muted-foreground'
              }`}
            >
              {selectedGenres.includes(genre) && <Check className="w-4 h-4" />}
              {genre}
            </motion.button>
          ))}
        </div>

        <p className="text-sm text-muted-foreground text-center">
          Selected: {selectedGenres.length} genres
        </p>
      </div>
    </div>
  );
}
