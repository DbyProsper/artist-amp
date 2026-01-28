import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ExternalLink, Youtube, Music, Globe, Instagram, Facebook } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SocialLinksModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileId: string;
}

interface SocialLinks {
  youtube?: string | null;
  apple_music?: string | null;
  spotify?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  website?: string | null;
}

export function SocialLinksModal({ isOpen, onClose, profileId }: SocialLinksModalProps) {
  const [links, setLinks] = useState<SocialLinks>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !profileId) return;

    const fetchLinks = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('social_links')
        .select('*')
        .eq('profile_id', profileId)
        .maybeSingle();

      if (!error && data) {
        setLinks(data);
      }
      setLoading(false);
    };

    fetchLinks();
  }, [isOpen, profileId]);

  const linkItems = [
    { key: 'youtube', icon: Youtube, label: 'YouTube', color: 'text-red-500', bgColor: 'bg-red-500/10' },
    { key: 'apple_music', icon: Music, label: 'Apple Music', color: 'text-pink-500', bgColor: 'bg-pink-500/10' },
    { key: 'spotify', icon: Music, label: 'Spotify', color: 'text-green-500', bgColor: 'bg-green-500/10' },
    { key: 'instagram', icon: Instagram, label: 'Instagram', color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
    { key: 'facebook', icon: Facebook, label: 'Facebook', color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
    { key: 'website', icon: Globe, label: 'Website', color: 'text-muted-foreground', bgColor: 'bg-muted' },
  ];

  const hasAnyLinks = Object.values(links).some(v => v);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Links</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : !hasAnyLinks ? (
            <div className="text-center py-8 text-muted-foreground">
              No links added yet
            </div>
          ) : (
            linkItems.map((item) => {
              const url = links[item.key as keyof SocialLinks];
              if (!url) return null;

              return (
                <a
                  key={item.key}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-3 p-3 rounded-xl ${item.bgColor} hover:opacity-80 transition-opacity`}
                >
                  <item.icon className={`w-5 h-5 ${item.color}`} />
                  <span className="flex-1 font-medium">{item.label}</span>
                  <ExternalLink className="w-4 h-4 text-muted-foreground" />
                </a>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
