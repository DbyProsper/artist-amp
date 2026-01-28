import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Users, BadgeCheck, CheckCircle, XCircle, 
  Clock, Shield, Search, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VerificationRequest {
  id: string;
  profile_id: string;
  status: string;
  reason: string | null;
  created_at: string;
  profile?: {
    id: string;
    name: string | null;
    username: string | null;
    avatar_url: string | null;
    is_artist: boolean | null;
    is_verified: boolean | null;
  };
}

interface Profile {
  id: string;
  user_id: string;
  name: string | null;
  username: string | null;
  avatar_url: string | null;
  is_artist: boolean | null;
  is_verified: boolean | null;
}

export default function AdminPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdminOrModerator, loading: roleLoading } = useUserRole();
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    if (!roleLoading && !isAdminOrModerator) {
      toast.error('Access denied: Admin privileges required');
      navigate('/');
    }
  }, [roleLoading, isAdminOrModerator, navigate]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('verification_requests')
        .select(`
          *,
          profile:profiles!verification_requests_profile_id_fkey (
            id, name, username, avatar_url, is_artist, is_verified
          )
        `)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setRequests(data as VerificationRequest[]);
      }
    } catch (err) {
      console.error('Error fetching requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error && data) {
        setProfiles(data);
      }
    } catch (err) {
      console.error('Error fetching profiles:', err);
    }
  };

  useEffect(() => {
    if (isAdminOrModerator) {
      fetchRequests();
      fetchProfiles();
    }
  }, [isAdminOrModerator]);

  const handleApprove = async (request: VerificationRequest) => {
    try {
      // Update verification request
      await supabase
        .from('verification_requests')
        .update({ status: 'verified', updated_at: new Date().toISOString() })
        .eq('id', request.id);

      // Update profile
      await supabase
        .from('profiles')
        .update({ is_verified: true })
        .eq('id', request.profile_id);

      // Create notification for the user
      await supabase
        .from('notifications')
        .insert({
          profile_id: request.profile_id,
          type: 'verification',
          message: 'Congratulations! Your verification request has been approved. You are now a verified artist.',
        });

      toast.success('Verification approved!');
      fetchRequests();
    } catch (err) {
      console.error('Error approving:', err);
      toast.error('Failed to approve verification');
    }
  };

  const handleReject = async (request: VerificationRequest) => {
    try {
      await supabase
        .from('verification_requests')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', request.id);

      // Create notification
      await supabase
        .from('notifications')
        .insert({
          profile_id: request.profile_id,
          type: 'verification',
          message: 'Your verification request was not approved at this time. Please try again later with more information.',
        });

      toast.success('Request rejected');
      fetchRequests();
    } catch (err) {
      console.error('Error rejecting:', err);
      toast.error('Failed to reject request');
    }
  };

  const toggleArtistStatus = async (profile: Profile) => {
    try {
      await supabase
        .from('profiles')
        .update({ is_artist: !profile.is_artist })
        .eq('id', profile.id);

      toast.success(`Artist status ${profile.is_artist ? 'removed' : 'granted'}`);
      fetchProfiles();
    } catch (err) {
      console.error('Error updating artist status:', err);
      toast.error('Failed to update status');
    }
  };

  const toggleVerification = async (profile: Profile) => {
    try {
      await supabase
        .from('profiles')
        .update({ is_verified: !profile.is_verified })
        .eq('id', profile.id);

      toast.success(`Verification ${profile.is_verified ? 'removed' : 'granted'}`);
      fetchProfiles();
    } catch (err) {
      console.error('Error updating verification:', err);
      toast.error('Failed to update verification');
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const approvedRequests = requests.filter(r => r.status === 'verified');
  const rejectedRequests = requests.filter(r => r.status === 'rejected');

  const filteredProfiles = profiles.filter(p => 
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAdminOrModerator) {
    return null;
  }

  return (
    <div className="min-h-screen pb-36">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="flex items-center gap-3 px-4 h-14">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Shield className="w-5 h-5 text-primary" />
          <h1 className="font-display font-bold text-lg">Admin Panel</h1>
        </div>
      </header>

      <div className="p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full bg-muted/50 mb-4">
            <TabsTrigger value="pending" className="flex-1 gap-1">
              <Clock className="w-4 h-4" />
              Pending ({pendingRequests.length})
            </TabsTrigger>
            <TabsTrigger value="users" className="flex-1 gap-1">
              <Users className="w-4 h-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="history" className="flex-1 gap-1">
              <BadgeCheck className="w-4 h-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold">Verification Requests</h2>
              <Button variant="ghost" size="sm" onClick={fetchRequests}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>

            {loading ? (
              <div className="py-12 text-center text-muted-foreground">Loading...</div>
            ) : pendingRequests.length === 0 ? (
              <div className="py-12 text-center">
                <BadgeCheck className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No pending requests</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map((request) => (
                  <motion.div
                    key={request.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl bg-muted/30 border border-border"
                  >
                    <div className="flex items-start gap-3">
                      <img
                        src={request.profile?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                        alt={request.profile?.name || 'User'}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{request.profile?.name || 'Unknown'}</p>
                          {request.profile?.is_artist && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">Artist</span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">@{request.profile?.username || 'user'}</p>
                        {request.reason && (
                          <p className="text-sm mt-2 p-2 rounded-lg bg-muted">{request.reason}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(request.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => handleApprove(request)}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="flex-1"
                        onClick={() => handleReject(request)}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                className="pl-9 bg-muted border-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              {filteredProfiles.map((profile) => (
                <div
                  key={profile.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-muted/30"
                >
                  <img
                    src={profile.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                    alt={profile.name || 'User'}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <p className="font-medium truncate">{profile.name || 'User'}</p>
                      {profile.is_verified && (
                        <BadgeCheck className="w-4 h-4 text-primary flex-shrink-0" fill="currentColor" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">@{profile.username || 'user'}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant={profile.is_artist ? 'default' : 'outline'}
                      className="text-xs h-7 px-2"
                      onClick={() => toggleArtistStatus(profile)}
                    >
                      Artist
                    </Button>
                    <Button
                      size="sm"
                      variant={profile.is_verified ? 'default' : 'outline'}
                      className="text-xs h-7 px-2"
                      onClick={() => toggleVerification(profile)}
                    >
                      Verified
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <h3 className="font-medium text-green-500">Approved ({approvedRequests.length})</h3>
            {approvedRequests.map((request) => (
              <div key={request.id} className="flex items-center gap-3 p-3 rounded-xl bg-green-500/10">
                <img
                  src={request.profile?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div className="flex-1">
                  <p className="font-medium">{request.profile?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Approved {new Date(request.created_at).toLocaleDateString()}
                  </p>
                </div>
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
            ))}

            <h3 className="font-medium text-red-500 mt-6">Rejected ({rejectedRequests.length})</h3>
            {rejectedRequests.map((request) => (
              <div key={request.id} className="flex items-center gap-3 p-3 rounded-xl bg-red-500/10">
                <img
                  src={request.profile?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div className="flex-1">
                  <p className="font-medium">{request.profile?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Rejected {new Date(request.created_at).toLocaleDateString()}
                  </p>
                </div>
                <XCircle className="w-5 h-5 text-red-500" />
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
