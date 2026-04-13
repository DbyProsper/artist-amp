import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

interface Profile {
  id: string;
  user_id: string;
  username: string | null;
  name: string | null;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  location: string | null;
  is_artist: boolean;
  is_verified: boolean;
  onboarding_completed: boolean | null;
  is_admin?: boolean;
  email: string;
  created_at: Date;
  updated_at: Date;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, metadata?: { name?: string; username?: string }) => Promise<{ error: Error | null; profile?: Profile | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; profile?: Profile | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null; profile?: Profile | null; isNew?: boolean }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const profileRef = doc(db, 'profiles', userId);
      const profileSnap = await getDoc(profileRef);

      if (profileSnap.exists()) {
        return profileSnap.data() as Profile;
      }
      return null;
    } catch (error) {
      console.error('Error fetching profile:', error);
      // Return null on permission errors to allow graceful fallback
      return null;
    }
  };

  const createProfile = async (user: User, metadata?: { name?: string; username?: string }) => {
    try {
      const profileData: Profile = {
        id: user.uid,
        user_id: user.uid,
        username: metadata?.username || null,
        name: metadata?.name || user.displayName || null,
        bio: null,
        avatar_url: user.photoURL || null,
        cover_url: null,
        location: null,
        is_artist: false,
        is_verified: false,
        onboarding_completed: false,
        is_admin: false,
        email: user.email || '',
        created_at: new Date(),
        updated_at: new Date(),
      };

      const profileRef = doc(db, 'profiles', user.uid);
      await setDoc(profileRef, profileData);

      return profileData;
    } catch (error) {
      console.error('Error creating profile:', error);
      // Return a basic profile on permission errors to allow the app to continue working
      return {
        id: user.uid,
        user_id: user.uid,
        username: metadata?.username || null,
        name: metadata?.name || user.displayName || null,
        bio: null,
        avatar_url: user.photoURL || null,
        cover_url: null,
        location: null,
        is_artist: false,
        is_verified: false,
        onboarding_completed: false,
        email: user.email || '',
        created_at: new Date(),
        updated_at: new Date(),
      };
    }
  };

  const signUp = async (email: string, password: string, metadata?: { name?: string; username?: string }) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update display name if provided
      if (metadata?.name) {
        await updateProfile(user, { displayName: metadata.name });
      }

      // Create profile in Firestore
      const profile = await createProfile(user, metadata);

      return { error: null, profile };
    } catch (error) {
      console.error('Sign up error:', error);
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const profile = await fetchProfile(user.uid);
      return { error: null, profile: profile || null };
    } catch (error) {
      console.error('Sign in error:', error);
      return { error: error as Error };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if profile exists, create if not
      const existingProfile = await fetchProfile(user.uid);
      if (!existingProfile) {
        const profile = await createProfile(user);
        return { error: null, profile, isNew: true };
      }

      return { error: null, profile: existingProfile, isNew: false };
    } catch (error) {
      console.error('Google sign in error:', error);
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.uid);
      setProfile(profileData);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);

      if (user) {
        console.log('User authenticated:', user.uid);
        const profileData = await fetchProfile(user.uid);
        if (profileData) {
          console.log('Profile loaded:', profileData);
          setProfile(profileData);
        } else {
          console.log('No profile found, creating one...');
          // Try to create profile, but don't fail if it doesn't work
          try {
            const newProfile = await createProfile(user);
            setProfile(newProfile);
          } catch (error) {
            console.warn('Profile creation failed, continuing without profile:', error);
            // Set a basic profile for the UI to work
            setProfile({
              id: user.uid,
              user_id: user.uid,
              username: null,
              name: user.displayName || null,
              bio: null,
              avatar_url: user.photoURL || null,
              cover_url: null,
              location: null,
              is_artist: false,
              is_verified: false,
              onboarding_completed: false,
              email: user.email || '',
              created_at: new Date(),
              updated_at: new Date(),
            });
          }
        }
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value: AuthContextType = {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}