import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Users, BadgeCheck, CheckCircle, XCircle, 
  Clock, Shield, Search, RefreshCw, Flag, FileImage, Trash2, Pencil, Crown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/FirebaseAuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { collection, query, orderBy, getDocs, updateDoc, doc, addDoc, limit, getDoc, setDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { toast } from 'sonner';

interface VerificationRequest {
  id: string;
  profile_id: string;
  status: string;
  reason: string | null;
  created_at: string;
  profile?: {
    id: string;
    username: string | null;
    name: string | null;
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
  is_admin?: boolean;
  email?: string | null;
}
interface Report { id: string; type: string; target_id: string; reporter_id: string; reason: string; status: string; created_at: Date }
interface OfficialPost { id: string; caption: string; image_url?: string; created_at: Date }

export default function AdminPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdminOrModerator, isSuperAdmin, loading: roleLoading } = useUserRole();
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [officialCaption, setOfficialCaption] = useState('');
  const [officialImageUrl, setOfficialImageUrl] = useState('');
  const [postingOfficial, setPostingOfficial] = useState(false);
  const [officialImageFile, setOfficialImageFile] = useState<File | null>(null);
  const [officialPosts, setOfficialPosts] = useState<OfficialPost[]>([]);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingPostCaption, setEditingPostCaption] = useState('');

  useEffect(() => {
    if (!roleLoading && !isAdminOrModerator) {
      toast.error('Access denied: Admin privileges required');
      navigate('/');
    }
  }, [roleLoading, isAdminOrModerator, navigate]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const requestsQuery = query(
        collection(db, 'verification_requests'),
        orderBy('created_at', 'desc')
      );
      const requestsSnapshot = await getDocs(requestsQuery);

      const requestsData: VerificationRequest[] = [];
      for (const requestDoc of requestsSnapshot.docs) {
        const requestData = requestDoc.data();
        const profileDoc = await getDoc(doc(db, 'profiles', requestData.profile_id));
        const profileData = profileDoc.exists() ? profileDoc.data() : null;

        requestsData.push({
          id: requestDoc.id,
          ...requestData,
          profile: profileData ? {
            id: requestData.profile_id,
            name: profileData.name,
            username: profileData.username,
            avatar_url: profileData.avatar_url,
            is_artist: profileData.is_artist,
            is_verified: profileData.is_verified,
          } : undefined,
        } as VerificationRequest);
      }

      setRequests(requestsData);
    } catch (err) {
      console.error('Error fetching requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfiles = async () => {
    try {
      const profilesQuery = query(
        collection(db, 'profiles'),
        orderBy('created_at', 'desc'),
        limit(100)
      );
      const profilesSnapshot = await getDocs(profilesQuery);
      const profilesData = profilesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Profile[];
      setProfiles(profilesData);
    } catch (err) {
      console.error('Error fetching profiles:', err);
    }
  };
  const fetchReports = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'reports'));
      setReports(snapshot.docs.map(item => ({ id: item.id, ...item.data(), created_at: item.data().created_at?.toDate?.() || new Date() } as Report)).sort((a, b) => b.created_at.getTime() - a.created_at.getTime()));
    } catch (error) { console.error('Error fetching reports:', error); }
  };
  const fetchOfficialPosts = async () => {
    const snapshot = await getDocs(query(collection(db, 'posts'), orderBy('created_at', 'desc'), limit(100)));
    setOfficialPosts(snapshot.docs.filter(item => item.data().profile_id === 'musicinsta-official').map(item => ({ id: item.id, caption: item.data().caption || '', image_url: item.data().image_url || '', created_at: item.data().created_at?.toDate?.() || new Date(0) })));
  };

  useEffect(() => {
    if (isAdminOrModerator) {
      fetchRequests();
      fetchProfiles();
      fetchReports();
      fetchOfficialPosts();
    }
  }, [isAdminOrModerator]);

  const handleApprove = async (request: VerificationRequest) => {
    try {
      // Update verification request
      await updateDoc(doc(db, 'verification_requests', request.id), {
        status: 'verified',
        updated_at: new Date(),
      });

      // Update profile
      await updateDoc(doc(db, 'profiles', request.profile_id), {
        is_verified: true,
      });

      // Create notification for the user
      await addDoc(collection(db, 'notifications'), {
        profile_id: request.profile_id,
        type: 'verification',
        message: 'Congratulations! Your verification request has been approved. You are now a verified artist.',
        created_at: new Date(),
        read: false,
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
      await updateDoc(doc(db, 'verification_requests', request.id), {
        status: 'rejected',
        updated_at: new Date(),
      });

      // Create notification
      await addDoc(collection(db, 'notifications'), {
        profile_id: request.profile_id,
        type: 'verification',
        message: 'Your verification request was not approved at this time. Please try again later with more information.',
        created_at: new Date(),
        read: false,
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
      await updateDoc(doc(db, 'profiles', profile.id), {
        is_artist: !profile.is_artist,
      });

      toast.success(`Artist status ${profile.is_artist ? 'removed' : 'granted'}`);
      fetchProfiles();
    } catch (err) {
      console.error('Error updating artist status:', err);
      toast.error('Failed to update status');
    }
  };

  const toggleVerification = async (profile: Profile) => {
    try {
      await updateDoc(doc(db, 'profiles', profile.id), {
        is_verified: !profile.is_verified,
      });

      toast.success(`Verification ${profile.is_verified ? 'removed' : 'granted'}`);
      fetchProfiles();
    } catch (err) {
      console.error('Error updating verification:', err);
      toast.error('Failed to update verification');
    }
  };

  const createOfficialPost = async () => {
    if (!user || !officialCaption.trim()) return;
    setPostingOfficial(true);
    try {
      let imageUrl = officialImageUrl.trim();
      if (officialImageFile) { const object = ref(storage, `official-posts/${Date.now()}-${officialImageFile.name}`); await uploadBytes(object, officialImageFile); imageUrl = await getDownloadURL(object); }
      await setDoc(doc(db, 'profiles', 'musicinsta-official'), { user_id: 'musicinsta-official', name: 'MusicInsta', username: 'musicinsta', avatar_url: '/musicinsta-default-cover.webp', cover_url: '/musicinsta-default-cover.webp', is_verified: true, is_artist: false, is_system: true, updated_at: serverTimestamp() }, { merge: true });
      await addDoc(collection(db, 'posts'), { profile_id: 'musicinsta-official', type: 'image', image_url: imageUrl || '/musicinsta-default-cover.webp', caption: officialCaption.trim(), likes: 0, comments: 0, shares: 0, is_story: false, is_new_post: true, created_by_admin: user.uid, created_at: serverTimestamp() });
      setOfficialCaption(''); setOfficialImageUrl(''); setOfficialImageFile(null); await fetchOfficialPosts(); toast.success('Posted as MusicInsta.');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Official post could not be created.'); }
    finally { setPostingOfficial(false); }
  };

  const toggleAdmin = async (target: Profile) => {
    if (!isSuperAdmin) return;
    const next = !target.is_admin;
    await Promise.all([
      setDoc(doc(db, 'users', target.id), { is_admin: next, role: next ? 'admin' : 'user', updated_at: serverTimestamp() }, { merge: true }),
      updateDoc(doc(db, 'profiles', target.id), { is_admin: next, role: next ? 'admin' : 'user', updated_at: serverTimestamp() }),
    ]);
    toast.success(next ? 'Admin privileges granted.' : 'Admin privileges removed.'); await fetchProfiles();
  };

  const saveOfficialPost = async (postId: string) => {
    await updateDoc(doc(db, 'posts', postId), { caption: editingPostCaption.trim(), updated_at: serverTimestamp() });
    setEditingPostId(null); await fetchOfficialPosts(); toast.success('Official post updated.');
  };

  const removeOfficialPost = async (postId: string) => {
    if (!window.confirm('Delete this official post?')) return;
    await deleteDoc(doc(db, 'posts', postId)); await fetchOfficialPosts(); toast.success('Official post deleted.');
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
        <section className="mb-5 rounded-2xl border border-border bg-card p-4"><div className="mb-3 flex items-center gap-3"><img src="/musicinsta-default-cover.webp" alt="MusicInsta" className="h-10 w-10 rounded-full object-cover" /><div><h2 className="font-bold">Post as MusicInsta</h2><p className="text-xs text-muted-foreground">Publishes with the official app logo and verified profile.</p></div></div><Textarea value={officialCaption} onChange={event => setOfficialCaption(event.target.value)} placeholder="Official announcement or community update..." className="min-h-24" /><Input value={officialImageUrl} onChange={event => setOfficialImageUrl(event.target.value)} placeholder="Optional image URL" className="mt-2" /><label className="mt-2 flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border p-3 text-sm"><FileImage className="h-4 w-4" />{officialImageFile?.name || 'Upload a custom image'}<input type="file" accept="image/*" className="hidden" onChange={event => setOfficialImageFile(event.target.files?.[0] || null)} /></label><Button className="mt-3" disabled={postingOfficial || !officialCaption.trim()} onClick={() => void createOfficialPost()}>{postingOfficial ? 'Publishing...' : 'Publish official post'}</Button></section>
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
            <TabsTrigger value="reports" className="flex-1 gap-1"><Flag className="w-4 h-4" />Reports ({reports.filter(report => report.status === 'open').length})</TabsTrigger>
            <TabsTrigger value="posts" className="flex-1 gap-1"><FileImage className="w-4 h-4" />Manage posts</TabsTrigger>
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
                    {isSuperAdmin && <Button size="sm" variant={profile.is_admin ? 'default' : 'outline'} className="h-7 px-2 text-xs" onClick={() => void toggleAdmin(profile)}><Crown className="mr-1 h-3 w-3" />Admin</Button>}
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
          <TabsContent value="reports" className="space-y-3">
            <div className="flex items-center justify-between"><h2 className="font-display font-bold">User reports</h2><Button size="sm" variant="ghost" onClick={() => void fetchReports()}><RefreshCw className="h-4 w-4" /></Button></div>
            {!reports.length && <p className="py-12 text-center text-muted-foreground">No reports have been submitted.</p>}
            {reports.map(report => <div key={report.id} className="rounded-xl border border-border bg-muted/30 p-4"><div className="flex items-center justify-between gap-3"><p className="font-semibold capitalize">{report.type} report</p><span className={`rounded-full px-2 py-1 text-xs ${report.status === 'open' ? 'bg-destructive/15 text-destructive' : 'bg-green-500/15 text-green-500'}`}>{report.status}</span></div><p className="mt-2 text-sm text-muted-foreground">{report.reason}</p><p className="mt-2 text-xs text-muted-foreground">Target: {report.target_id} · Reporter: {report.reporter_id} · {report.created_at.toLocaleString()}</p>{report.status === 'open' && <Button className="mt-3" size="sm" onClick={async () => { await updateDoc(doc(db, 'reports', report.id), { status: 'resolved', resolved_at: new Date(), resolved_by: user?.uid }); await fetchReports(); }}>Mark resolved</Button>}</div>)}
          </TabsContent>
          <TabsContent value="posts" className="space-y-3"><div className="flex items-center justify-between"><h2 className="font-display font-bold">Manage MusicInsta posts</h2><Button size="sm" variant="ghost" onClick={() => void fetchOfficialPosts()}><RefreshCw className="h-4 w-4" /></Button></div>{officialPosts.map(post => <article key={post.id} className="flex gap-3 rounded-xl border border-border p-3"><img src={post.image_url || '/musicinsta-default-cover.webp'} alt="" className="h-20 w-20 rounded-lg object-cover" /><div className="min-w-0 flex-1">{editingPostId === post.id ? <Textarea value={editingPostCaption} onChange={event => setEditingPostCaption(event.target.value)} /> : <p className="text-sm">{post.caption}</p>}<p className="mt-1 text-xs text-muted-foreground">{post.created_at.toLocaleString()}</p><div className="mt-2 flex gap-2">{editingPostId === post.id ? <Button size="sm" onClick={() => void saveOfficialPost(post.id)}>Save</Button> : <Button size="sm" variant="outline" onClick={() => { setEditingPostId(post.id); setEditingPostCaption(post.caption); }}><Pencil className="mr-1 h-3.5 w-3.5" />Edit</Button>}<Button size="sm" variant="destructive" onClick={() => void removeOfficialPost(post.id)}><Trash2 className="mr-1 h-3.5 w-3.5" />Delete</Button></div></div></article>)}{!officialPosts.length && <p className="py-10 text-center text-muted-foreground">No official posts yet.</p>}</TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
