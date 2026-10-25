import { useState, useEffect } from 'react';
import { useAuth } from '@/context/FirebaseAuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type AppRole = 'admin' | 'moderator' | 'user';
export const SUPER_ADMIN_EMAIL = 'mthabisisebata113@gmail.com';

export function useUserRole() {
  const { user, profile } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRoles([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    void Promise.all([user.getIdTokenResult(), getDoc(doc(db, 'users', user.uid)).catch(() => null)]).then(([token, userDoc]) => {
      if (cancelled) return;
      const data = userDoc?.exists() ? userDoc.data() : {};
      const configured = new Set<AppRole>();
      const values = [token.claims.role, data.role, ...(Array.isArray(token.claims.roles) ? token.claims.roles : []), ...(Array.isArray(data.roles) ? data.roles : [])];
      values.forEach(value => { if (value === 'admin' || value === 'moderator' || value === 'user') configured.add(value); });
      if (token.claims.admin === true || data.is_admin === true || profile?.is_admin === true || user.email?.toLowerCase() === SUPER_ADMIN_EMAIL) configured.add('admin');
      setRoles([...configured]); setLoading(false);
    }).catch(() => { if (!cancelled) { setRoles(profile?.is_admin ? ['admin'] : []); setLoading(false); } });
    return () => { cancelled = true; };
  }, [profile?.is_admin, user]);

  const isAdmin = roles.includes('admin');
  const isModerator = roles.includes('moderator');
  const isAdminOrModerator = isAdmin || isModerator;
  const isSuperAdmin = user?.email?.toLowerCase() === SUPER_ADMIN_EMAIL;

  return { roles, isAdmin, isModerator, isAdminOrModerator, isSuperAdmin, loading };
}
