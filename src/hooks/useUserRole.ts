import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/FirebaseAuthContext';
import { isValidUUID } from '@/lib/utils';

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
        if (!isValidUUID(user.id)) {
          if (profile?.is_admin) {
            setRoles(['admin']);
          } else {
            setRoles([]);
          }
          return;
        }

        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (!error && data) {
          setRoles(data.map(r => r.role as AppRole));
        } else if (profile?.is_admin) {
          setRoles(['admin']);
        }
      } catch (err) {
        console.error('Error fetching roles:', err);
        if (profile?.is_admin) {
          setRoles(['admin']);
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
