import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { PlayerProvider } from "@/context/PlayerContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { BottomNav } from "@/components/navigation/BottomNav";
import { MiniPlayer, FullPlayer } from "@/components/player/MusicPlayer";
import { FloatingPlayerButton } from "@/components/player/FloatingPlayerButton";
import LandingPage from "./pages/LandingPage";
import HomePage from "./pages/HomePage";
import DiscoverPage from "./pages/DiscoverPage";
import SearchPage from "./pages/SearchPage";
import UploadPage from "./pages/UploadPage";
import MessagesPage from "./pages/MessagesPage";
import ProfilePage from "./pages/ProfilePage";
import UserProfilePage from "./pages/UserProfilePage";
import PlaylistsPage from "./pages/PlaylistsPage";
import LibraryPage from "./pages/LibraryPage";
import SettingsPage from "./pages/SettingsPage";
import EditProfilePage from "./pages/EditProfilePage";
import PreferencesPage from "./pages/PreferencesPage";
import AuthPage from "./pages/AuthPage";
import OnboardingPage from "./pages/OnboardingPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

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

// Wrapper for player components - only show when user is signed in
function PlayerComponents() {
  const { user } = useAuth();
  
  if (!user) return null;
  
  return (
    <>
      <MiniPlayer />
      <FullPlayer />
      <FloatingPlayerButton />
    </>
  );
}

const AppRoutes = () => {
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <Routes>
        {/* Landing page for new users */}
        <Route path="/landing" element={<LandingRedirect />} />
        
        {/* Search page - accessible without login */}
        <Route path="/search" element={<SearchPage />} />
        
        {/* Main app routes */}
        <Route path="/" element={user ? <HomePage /> : <Navigate to="/landing" replace />} />
        <Route path="/discover" element={user ? <DiscoverPage /> : <Navigate to="/landing" replace />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/user/:userId" element={<UserProfilePage />} />
        <Route path="/playlists" element={<PlaylistsPage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/settings/edit-profile" element={<EditProfilePage />} />
        <Route path="/settings/preferences" element={<PreferencesPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <PlayerComponents />
      <BottomNav />
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
