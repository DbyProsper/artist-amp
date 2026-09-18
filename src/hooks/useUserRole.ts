import { useState, useEffect } from 'react';
import { useAuth } from '@/context/FirebaseAuthContext';

type AppRole = 'admin' | 'moderator' | 'user';

export function useUserRole() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRoles([]);
      setLoading(false);
      return;
    }

    setRoles(['admin']); setLoading(false);
  }, [user]);

  const isAdmin = roles.includes('admin');
  const isModerator = roles.includes('moderator');
  const isAdminOrModerator = isAdmin || isModerator;

  return { roles, isAdmin, isModerator, isAdminOrModerator, loading };
}
