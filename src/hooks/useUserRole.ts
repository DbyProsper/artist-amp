import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/FirebaseAuthContext';

type AppRole = 'admin' | 'moderator' | 'user';

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

    const fetchRoles = async () => {
      setLoading(true);
      try {
        // Check if user has admin role in profile first
        if (profile?.is_admin) {
          setRoles(['admin']);
          setLoading(false);
          return;
        }

        // Fetch roles from Firestore
        const rolesQuery = query(
          collection(db, 'user_roles'),
          where('user_id', '==', user.uid)
        );
        const rolesSnapshot = await getDocs(rolesQuery);
        const userRoles = rolesSnapshot.docs.map(doc => doc.data().role as AppRole);
        setRoles(userRoles);
      } catch (err) {
        console.error('Error fetching roles:', err);
        // Fallback to profile admin status
        if (profile?.is_admin) {
          setRoles(['admin']);
        } else {
          setRoles([]);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();
  }, [user, profile]);

  const isAdmin = roles.includes('admin');
  const isModerator = roles.includes('moderator');
  const isAdminOrModerator = isAdmin || isModerator;

  return { roles, isAdmin, isModerator, isAdminOrModerator, loading };
}
