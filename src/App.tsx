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

function FirstVisitHome() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user && localStorage.getItem('musicinsta_landing_seen') !== '1') return <Navigate to="/landing" replace />;
  return <HomePage />;
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

function StudioReadOnly({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <>{children}</>;
  return <div className="relative min-h-screen"><div className="pointer-events-none select-none opacity-55" aria-hidden="true">{children}</div><div className="fixed inset-x-4 top-20 z-[100] mx-auto max-w-md rounded-2xl border border-primary/30 bg-background/95 p-5 text-center shadow-2xl backdrop-blur"><h2 className="font-bold">Sign in to use this Studio tool</h2><p className="mt-1 text-sm text-muted-foreground">You can preview MusicInsta Studio, but uploading, editing and generating require an account.</p><a href="/auth" className="mt-4 inline-flex rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">Sign in or create an account</a></div></div>;
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
        
        <Route path="/search" element={<Navigate to="/discover" replace />} />
        
        {/* Main app routes */}
        <Route path="/" element={<FirstVisitHome />} />
        <Route path="/discover" element={<DiscoverPage />} />
        <Route path="/upload" element={authenticatedPage(<UploadPage />)} />
        <Route path="/messages" element={authenticatedPage(<MessagesPage />)} />
        <Route path="/profile" element={authenticatedPage(<ProfilePage />)} />
        <Route path="/user/:userId" element={authenticatedPage(<UserProfilePage />)} />
        <Route path="/playlists" element={<Navigate to="/library" replace />} />
        <Route path="/playlists/:id" element={authenticatedPage(<PlaylistDetailPage />)} />
        <Route path="/library" element={authenticatedPage(<PlaylistsPage />)} />
        <Route path="/settings" element={authenticatedPage(<SettingsPage />)} />
        <Route path="/settings/edit-profile" element={authenticatedPage(<EditProfilePage />)} />
        <Route path="/settings/preferences" element={authenticatedPage(<PreferencesPage />)} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/admin" element={<AdminRoute />} />
        <Route path="/albums/:id" element={authenticatedPage(<AlbumDetailPage />)} />
        <Route path="/upload/album" element={authenticatedPage(<AlbumUploadPage />)} />
        <Route path="/analytics" element={authenticatedPage(<AnalyticsDashboardPage />)} />
        <Route path="/billing" element={authenticatedPage(<BillingPage />)} />
        <Route path="/billing/success" element={authenticatedPage(<BillingSuccessPage />)} />
        <Route path="/studio" element={<StudioPage />} />
        <Route path="/studio/daw" element={<StudioReadOnly><StudioDawPage /></StudioReadOnly>} />
        <Route path="/studio/enhance" element={<StudioReadOnly><AudioEnhancementPage /></StudioReadOnly>} />
        <Route path="/studio/separate" element={<StudioReadOnly><StemSeparationPage /></StudioReadOnly>} />
        <Route path="/studio-legacy" element={<StudioReadOnly><OnlineStudioPage /></StudioReadOnly>} />
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
