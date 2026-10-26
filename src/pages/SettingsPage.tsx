import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, User, Bell, Mail, Music2, Info, LogOut, 
  BadgeCheck, ChevronRight, Shield, BarChart3, MessageSquare, Lock, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { BackButton } from '@/components/ui/BackButton';
import { useAuth } from '@/context/FirebaseAuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { EmailAuthProvider, linkWithCredential, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function SettingsPage() {
  const { user, profile, signOut } = useAuth();
  const { isAdminOrModerator } = useUserRole();
  const navigate = useNavigate();
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pendingRequest, setPendingRequest] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const hasPasswordProvider = user?.providerData.some(provider => provider.providerId === 'password') ?? false;

  const handlePasswordSave = async () => {
    if (!user?.email) return;
    if (newPassword.length < 8) return void toast.error('Use at least 8 characters.');
    if (newPassword !== confirmPassword) return void toast.error('New passwords do not match.');
    setPasswordSaving(true);
    try {
      if (hasPasswordProvider) {
        if (!currentPassword) throw new Error('Enter your current password.');
        await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, currentPassword));
        await updatePassword(user, newPassword);
      } else {
        await linkWithCredential(user, EmailAuthProvider.credential(user.email, newPassword));
      }
      toast.success(hasPasswordProvider ? 'Password updated.' : 'Password sign-in enabled.');
      setPasswordOpen(false);
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (error) {
      const message = error instanceof Error ? error.message.replace('Firebase: ', '') : 'Unable to update password.';
      toast.error(message);
    } finally {
      setPasswordSaving(false);
    }
  };

  useEffect(() => {
    if (!profile) return;
    const checkPendingRequest = async () => {
      try {
        const requestsQuery = query(collection(db, 'verification_requests'), where('profile_id', '==', profile.id), where('status', '==', 'pending'));
        const querySnapshot = await getDocs(requestsQuery);
        setPendingRequest(!querySnapshot.empty);
      } catch (error) { console.error('Error checking pending request:', error); }
    };
    void checkPendingRequest();
  }, [profile]);

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out successfully');
    navigate('/landing', { replace: true });
  };

  const handleVerificationRequest = async () => {
    if (!profile) return;

    if (pendingRequest) {
      toast.info('You already have a pending verification request');
      return;
    }

    try {
      await addDoc(collection(db, 'verification_requests'), {
        profile_id: profile.id,
        reason: 'Artist verification request submitted via Settings',
        status: 'pending',
        created_at: new Date(),
      });

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
        {
          icon: Lock,
          label: hasPasswordProvider ? 'Change Password' : 'Set a Password',
          description: hasPasswordProvider ? 'Update your sign-in password' : 'Also sign in with email and password',
          onClick: () => setPasswordOpen(true),
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
          icon: MessageSquare,
          label: 'Contact Admin',
          description: 'Get help or report issues',
          onClick: () => navigate('/messages?contact=admin'),
        },
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
              src={profile?.avatar_url || '/musicinsta-default-cover.webp'}
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
                  disabled={'disabled' in item && Boolean(item.disabled)}
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
      {passwordOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={event => event.target === event.currentTarget && setPasswordOpen(false)}>
        <div className="w-full max-w-md rounded-2xl border border-border bg-background p-5 shadow-2xl">
          <div className="mb-5 flex items-start justify-between"><div><h2 className="text-xl font-bold">{hasPasswordProvider ? 'Change password' : 'Set a password'}</h2><p className="mt-1 text-sm text-muted-foreground">{hasPasswordProvider ? 'Confirm your current password, then choose a new one.' : 'Your Google sign-in will keep working. This adds email and password sign-in.'}</p></div><button aria-label="Close" onClick={() => setPasswordOpen(false)} className="rounded-full p-2 hover:bg-muted"><X className="h-4 w-4" /></button></div>
          <div className="space-y-4">
            {hasPasswordProvider && <div><Label htmlFor="current-password">Current password</Label><Input id="current-password" className="mt-2" type="password" autoComplete="current-password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} /></div>}
            <div><Label htmlFor="new-password">New password</Label><Input id="new-password" className="mt-2" type="password" autoComplete="new-password" value={newPassword} onChange={event => setNewPassword(event.target.value)} /></div>
            <div><Label htmlFor="confirm-password">Confirm new password</Label><Input id="confirm-password" className="mt-2" type="password" autoComplete="new-password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} /></div>
            <Button className="w-full" disabled={passwordSaving} onClick={handlePasswordSave}>{passwordSaving ? 'Saving…' : hasPasswordProvider ? 'Update password' : 'Set password'}</Button>
          </div>
        </div>
      </div>}
    </div>
  );
}
