import { useEffect, useState, useCallback } from 'react';
import { collection, query, where, limit, getDocs, getDoc, updateDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/FirebaseAuthContext';

export interface Notification {
  id: string;
  type: string;
  message: string | null;
  read: boolean | null;
  created_at: string | null;
  from_profile_id: string | null;
  track_id: string | null;
  post_id: string | null;
  project_id: string | null;
  from_profile?: {
    id: string;
    username: string | null;
    name: string | null;
    avatar_url: string | null;
  } | null;
}

export function useRealTimeNotifications() {
  const { profile, user, loading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    const recipientId = profile?.id || user?.uid;
    if (!recipientId) { setNotifications([]); setUnreadCount(0); setLoading(authLoading); return; }

    try {
      const notificationsQuery = query(
        collection(db, 'notifications'),
        where('profile_id', '==', recipientId),
        limit(50)
      );

      const snapshot = await getDocs(notificationsQuery);
      const senderIds = [...new Set(snapshot.docs.map(item => item.data().from_profile_id).filter(Boolean).map(String))];
      const senderEntries = await Promise.all(senderIds.map(async senderId => {
        try {
          const sender = await getDoc(doc(db, 'profiles', senderId));
          if (!sender.exists()) return [senderId, null] as const;
          const value = sender.data();
          return [senderId, { id: sender.id, username: value.username, name: value.name, avatar_url: value.avatar_url }] as const;
        } catch { return [senderId, null] as const; }
      }));
      const senders = new Map(senderEntries);
      const notificationsData: Notification[] = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          type: data.type,
          message: data.message,
          read: data.read,
          created_at: data.created_at?.toDate()?.toISOString(),
          from_profile_id: data.from_profile_id,
          track_id: data.track_id,
          post_id: data.post_id,
          project_id: data.project_id,
          from_profile: data.from_profile_id ? senders.get(String(data.from_profile_id)) || null : null,
        };
      });

      notificationsData.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      setNotifications(previous => {
        if (previous.length && 'Notification' in window && Notification.permission === 'granted') {
          const known = new Set(previous.map(item => item.id));
          notificationsData.filter(item => !item.read && !known.has(item.id)).forEach(item => {
            const alert = new Notification('MusicInsta', { body: item.message || 'You have a new notification.', icon: item.from_profile?.avatar_url || '/musicinsta-default-cover.webp', tag: `musicinsta-${item.id}` });
            alert.onclick = () => { window.focus(); alert.close(); };
          });
        }
        return notificationsData;
      });
      setUnreadCount(notificationsData.filter(n => !n.read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
    setLoading(false);
  }, [authLoading, profile?.id, user?.uid]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), { read: true });
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    const recipientId = profile?.id || user?.uid;
    if (!recipientId) return;

    try {
      // Get all unread notifications
      const unreadQuery = query(
        collection(db, 'notifications'),
        where('profile_id', '==', recipientId),
        where('read', '==', false)
      );
      const snapshot = await getDocs(unreadQuery);

      // Mark each one as read
      const updatePromises = snapshot.docs.map(docSnap =>
        updateDoc(docSnap.ref, { read: true })
      );
      await Promise.all(updatePromises);

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, [profile?.id, user?.uid]);

  useEffect(() => {
    const recipientId = profile?.id || user?.uid;
    if (!recipientId) { if (!authLoading) setLoading(false); return; }

    const liveQuery = query(collection(db, 'notifications'), where('profile_id', '==', recipientId));
    return onSnapshot(liveQuery, () => void fetchNotifications(), error => { console.error('Notification listener failed:', error); setLoading(false); });
  }, [authLoading, profile?.id, user?.uid, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications,
  };
}
