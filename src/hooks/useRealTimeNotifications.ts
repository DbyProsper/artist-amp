import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export interface Notification {
  id: string;
  type: string;
  message: string | null;
  read: boolean | null;
  created_at: string | null;
  from_profile_id: string | null;
  track_id: string | null;
  post_id: string | null;
  from_profile?: {
    id: string;
    username: string | null;
    name: string | null;
    avatar_url: string | null;
  } | null;
}

export function useRealTimeNotifications() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!profile?.id) return;

    const { data, error } = await supabase
      .from('notifications')
      .select(`
        *,
        from_profile:profiles!notifications_from_profile_id_fkey (
          id,
          username,
          name,
          avatar_url
        )
      `)
      .eq('profile_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setNotifications(data as Notification[]);
      setUnreadCount(data.filter(n => !n.read).length);
    }
    setLoading(false);
  }, [profile?.id]);

  const markAsRead = useCallback(async (notificationId: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (!error) {
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!profile?.id) return;

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('profile_id', profile.id)
      .eq('read', false);

    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    }
  }, [profile?.id]);

  useEffect(() => {
    if (!profile?.id) return;

    fetchNotifications();

    // Subscribe to real-time notifications
    const channel = supabase
      .channel(`notifications-${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `profile_id=eq.${profile.id}`,
        },
        async (payload) => {
          // Fetch the full notification with profile data
          const { data, error } = await supabase
            .from('notifications')
            .select(`
              *,
              from_profile:profiles!notifications_from_profile_id_fkey (
                id,
                username,
                name,
                avatar_url
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (!error && data) {
            setNotifications(prev => [data as Notification, ...prev]);
            setUnreadCount(prev => prev + 1);

            // Show toast for new notification
            const notif = data as Notification;
            const fromName = notif.from_profile?.name || notif.from_profile?.username || 'Someone';
            
            let message = '';
            switch (notif.type) {
              case 'like':
                message = `${fromName} liked your post`;
                break;
              case 'follow':
                message = `${fromName} started following you`;
                break;
              case 'comment':
                message = `${fromName} commented on your track`;
                break;
              case 'message':
                message = `${fromName} sent you a message`;
                break;
              default:
                message = notif.message || 'New notification';
            }

            toast(message, {
              description: 'Just now',
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications,
  };
}
