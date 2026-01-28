import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, User, Bell, Mail, Music2, Info, LogOut, 
  BadgeCheck, ChevronRight, Shield, BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { BackButton } from '@/components/ui/BackButton';
import { useAuth } from '@/context/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { user, profile, signOut } = useAuth();
  const { isAdminOrModerator } = useUserRole();
  const navigate = useNavigate();
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pendingRequest, setPendingRequest] = useState(false);

  useEffect(() => {
    if (profile) {
      checkPendingRequest();
    }
  }, [profile]);

  const checkPendingRequest = async () => {
    if (!profile) return;

    const { data } = await supabase
      .from('verification_requests')
      .select('status')
      .eq('profile_id', profile.id)
      .eq('status', 'pending')
      .maybeSingle();

    setPendingRequest(!!data);
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out successfully');
    navigate('/');
  };

  const handleVerificationRequest = async () => {
    if (!profile) return;

    if (pendingRequest) {
      toast.info('You already have a pending verification request');
      return;
    }

    try {
      const { error } = await supabase
        .from('verification_requests')
        .insert({
          profile_id: profile.id,
          reason: 'Artist verification request submitted via Settings',
        });

      if (error) throw error;

      setPendingRequest(true);
      toast.success('Verification request submitted! We\'ll review your profile and get back to you.');
    } catch (err) {
      console.error('Error submitting request:', err);
      toast.error('Failed to submit verification request');
    }
  };

  if (!user) {
    navigate('/auth');
    return null;
  }

  const settingsSections = [
    {
      title: 'Account',
      items: [
        {
          icon: User,
          label: 'Edit Profile',
          description: 'Update your profile information',
          onClick: () => navigate('/settings/edit-profile'),
        },
        ...(profile?.is_artist ? [{
          icon: BarChart3,
          label: 'Analytics',
          description: 'View your performance metrics',
          onClick: () => navigate('/analytics'),
        }] : []),
        ...(profile?.is_artist && !profile?.is_verified ? [{
          icon: BadgeCheck,
          label: pendingRequest ? 'Verification Pending' : 'Request Verification',
          description: pendingRequest ? 'Your request is being reviewed' : 'Get verified as an artist',
          onClick: handleVerificationRequest,
          disabled: pendingRequest,
        }] : []),
        ...(isAdminOrModerator ? [{
          icon: Shield,
          label: 'Admin Panel',
          description: 'Manage users and verification requests',
          onClick: () => navigate('/admin'),
        }] : []),
      ],
    },
    {
      title: 'Notifications',
      items: [
        {
          icon: Bell,
          label: 'Push Notifications',
          description: 'Receive push notifications',
          toggle: true,
          value: pushNotifications,
          onChange: setPushNotifications,
        },
        {
          icon: Mail,
          label: 'Email Notifications',
          description: 'Receive email updates',
          toggle: true,
          value: emailNotifications,
          onChange: setEmailNotifications,
        },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          icon: Music2,
          label: 'Favorite Genres',
          description: 'Update your music preferences',
          onClick: () => navigate('/settings/preferences'),
        },
      ],
    },
    {
      title: 'About',
      items: [
        {
          icon: Info,
          label: 'About MusicInsta',
          description: 'Version 1.0.0',
          onClick: () => toast.info('MusicInsta - Where Music Meets Community'),
        },
        {
          icon: Shield,
          label: 'Privacy Policy',
          description: 'Read our privacy policy',
          onClick: () => toast.info('Privacy policy coming soon'),
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen pb-36">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="flex items-center gap-3 px-4 h-14">
          <BackButton />
          <h1 className="font-display font-bold text-lg">Settings</h1>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Profile Preview */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 p-4 rounded-2xl bg-muted/30"
        >
          <div className="w-16 h-16 rounded-full overflow-hidden gradient-border">
            <img
              src={profile?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
              alt={profile?.name || 'User'}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-display font-bold">{profile?.name || 'User'}</h2>
              {profile?.is_verified && (
                <BadgeCheck className="w-5 h-5 text-primary" fill="currentColor" />
              )}
              {isAdminOrModerator && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">Admin</span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">@{profile?.username || 'user'}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/settings/edit-profile')}>
            Edit
          </Button>
        </motion.div>

        {/* Settings Sections */}
        {settingsSections.map((section, sectionIndex) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: sectionIndex * 0.1 }}
          >
            <h3 className="text-sm font-medium text-muted-foreground mb-2 px-1">
              {section.title}
            </h3>
            <div className="rounded-xl bg-muted/30 overflow-hidden divide-y divide-border">
              {section.items.map((item) => (
                <button
                  key={item.label}
                  onClick={item.toggle ? undefined : item.onClick}
                  disabled={(item as any).disabled}
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                      <item.icon className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{item.label}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                  {item.toggle ? (
                    <Switch
                      checked={item.value}
                      onCheckedChange={item.onChange}
                    />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        ))}

        {/* Sign Out */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 p-4 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sign Out</span>
          </button>
        </motion.div>
      </div>
    </div>
  );
}
