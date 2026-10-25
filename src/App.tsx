import { Toaster } from "@/components/ui/toaster";
import { useEffect, useState, type ReactNode } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { PlayerProvider } from "@/context/PlayerContext";
import { AuthProvider, useAuth } from "@/context/FirebaseAuthContext";
import { BottomNav } from "@/components/navigation/BottomNav";
import { MiniPlayer, FullPlayer } from "@/components/player/MusicPlayer";
import { FloatingPlayerButton } from "@/components/player/FloatingPlayerButton";
import { useScrollToTop } from "@/hooks/useScrollToTop";
import LandingPage from "./pages/LandingPage";
import HomePage from "./pages/HomePage";
import DiscoverPage from "./pages/DiscoverPage";
import SearchPage from "./pages/SearchPage";
import UploadPage from "./pages/UploadPage";
import MessagesPage from "./pages/MessagesPage";
import ProfilePage from "./pages/ProfilePage";
import UserProfilePage from "./pages/UserProfilePage";
import PlaylistsPage from "./pages/PlaylistsPage";
import PlaylistDetailPage from "./pages/PlaylistDetailPage";
import SettingsPage from "./pages/SettingsPage";
import EditProfilePage from "./pages/EditProfilePage";
import PreferencesPage from "./pages/PreferencesPage";
import AuthPage from "./pages/AuthPage";
import OnboardingPage from "./pages/OnboardingPage";
import AdminPage from "./pages/AdminPage";
import AnalyticsDashboardPage from "./pages/AnalyticsDashboardPage";
import OnlineStudioPage from "./pages/OnlineStudioPage";
import StudioPage from "./pages/StudioPage";
import StudioDawPage from "./pages/StudioDawPage";
import AudioEnhancementPage from "./features/audio-enhancement/AudioEnhancementPage";
import BillingPage from "./pages/BillingPage";
import BillingSuccessPage from "./pages/BillingSuccessPage";
import NotFound from "./pages/NotFound";
import AlbumDetailPage from "./pages/AlbumDetailPage";
import AlbumUploadPage from "./pages/AlbumUploadPage";
import StemSeparationPage from "./features/stem-separation/StemSeparationPage";
import { useUserRole } from "@/hooks/useUserRole";
import UpgradeModal from "@/components/UpgradeModal";
import type { QuotaKey } from "@/lib/planLimits";

const queryClient = new QueryClient();

const SERVER_QUOTA_KEYS: Record<string, QuotaKey> = {
  full_songs: 'fullSongs',
  beats: 'clips30s',
  clips_30s: 'clips30s',
  images: 'images',
  lyrics: 'lyrics',
  audio_enhance: 'audioEnhance',
  audio_enhance_standard: 'audioEnhanceStandard',
};

function GlobalQuotaPrompt() {
  const [blocked, setBlocked] = useState<{ reason: 'monthly_limit' | 'daily_limit' | 'plan_blocked'; key: QuotaKey } | null>(null);

  useEffect(() => {
    const showPrompt = (event: Event) => {
      const detail = (event as CustomEvent<Record<string, unknown> | null>).detail;
      const code = String(detail?.code ?? 'MONTHLY_LIMIT');
      const reason = code === 'DAILY_LIMIT' ? 'daily_limit' : code === 'PLAN_BLOCKED' ? 'plan_blocked' : 'monthly_limit';
      const key = SERVER_QUOTA_KEYS[String(detail?.quota_key ?? 'full_songs')] ?? 'fullSongs';
      setBlocked({ reason, key });
    };
    window.addEventListener('musicinsta:quota-exceeded', showPrompt);
    return () => window.removeEventListener('musicinsta:quota-exceeded', showPrompt);
  }, []);

  return blocked ? <UpgradeModal reason={blocked.reason} quotaKey={blocked.key} onClose={() => setBlocked(null)} /> : null;
}

// Component to handle landing page redirect logic
function LandingRedirect() {
  const { user, loading } = useAuth();
  
  if (loading) return null;
  
  // If user is logged in, redirect to home
  if (user) {
    return <Navigate to="/" replace />;
  }
  
  return <LandingPage />;
}

function PlayerComponents() {
  return (
    <>
      <MiniPlayer />
      <FullPlayer />
      <FloatingPlayerButton />
    </>
  );
}

// ScrollToTop component
function ScrollToTop() {
  useScrollToTop();
  return null;
}

function AdminRoute() {
  const { isAdminOrModerator, loading } = useUserRole();
  if (loading) return null;
  return isAdminOrModerator ? <AdminPage /> : <Navigate to="/" replace />;
}

const AppRoutes = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  
  // Hide bottom nav on studio page
  const showBottomNav = !location.pathname.startsWith('/studio');
  const authenticatedPage = (page: ReactNode) => loading
    ? <div className="grid min-h-screen place-items-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
    : user ? page : <Navigate to="/landing" replace />;

  return (
    <div className="min-h-screen bg-background">
      <ScrollToTop />
      <GlobalQuotaPrompt />
      <Routes>
        {/* Landing page for new users */}
        <Route path="/landing" element={<LandingRedirect />} />
        
        {/* Search page - accessible without login */}
        <Route path="/search" element={<SearchPage />} />
        
        {/* Main app routes */}
        <Route path="/" element={authenticatedPage(<HomePage />)} />
        <Route path="/discover" element={authenticatedPage(<DiscoverPage />)} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/user/:userId" element={<UserProfilePage />} />
        <Route path="/playlists" element={<Navigate to="/library" replace />} />
        <Route path="/playlists/:id" element={<PlaylistDetailPage />} />
        <Route path="/library" element={<PlaylistsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/settings/edit-profile" element={<EditProfilePage />} />
        <Route path="/settings/preferences" element={<PreferencesPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/admin" element={<AdminRoute />} />
        <Route path="/albums/:id" element={<AlbumDetailPage />} />
        <Route path="/upload/album" element={<AlbumUploadPage />} />
        <Route path="/analytics" element={<AnalyticsDashboardPage />} />
        <Route path="/billing" element={<BillingPage />} />
        <Route path="/billing/success" element={<BillingSuccessPage />} />
        <Route path="/studio" element={<StudioPage />} />
        <Route path="/studio/daw" element={<StudioDawPage />} />
        <Route path="/studio/enhance" element={<AudioEnhancementPage />} />
        <Route path="/studio/separate" element={<StemSeparationPage />} />
        <Route path="/studio-legacy" element={<OnlineStudioPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <PlayerComponents />
      {showBottomNav && <BottomNav />}
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <PlayerProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </PlayerProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
