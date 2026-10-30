import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/context/FirebaseAuthContext';

export const AI_TOOLS_UNAVAILABLE_MESSAGE = 'AI tools are currently unavailable. Please contact an administrator to use them.';

export function useAiToolsAvailability() {
  const { profile } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [globalEnabled, setGlobalEnabled] = useState<boolean | null>(null);

  useEffect(() => onSnapshot(
    doc(db, 'system_settings', 'ai_tools'),
    snapshot => setGlobalEnabled(snapshot.exists() ? snapshot.data().enabled !== false : true),
    () => setGlobalEnabled(true),
  ), []);

  const checking = roleLoading || (!isAdmin && globalEnabled === null);
  const hasUserGrant = profile?.ai_studio_access === true;
  const enabled = isAdmin || hasUserGrant || globalEnabled !== false;

  return {
    enabled,
    checking,
    hasUserGrant,
    message: AI_TOOLS_UNAVAILABLE_MESSAGE,
  };
}
