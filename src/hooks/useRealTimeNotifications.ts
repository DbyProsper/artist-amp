import { useEffect, useState, useCallback } from 'react';
import { collection, query, where, orderBy, limit, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/FirebaseAuthContext';
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

    try {
      const notificationsQuery = query(
        collection(db, 'notifications'),
        where('profile_id', '==', profile.id),
        orderBy('created_at', 'desc'),
        limit(50)
      );

      const snapshot = await getDocs(notificationsQuery);
      const notificationsData: Notification[] = [];

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();

        // Fetch from_profile data if it exists
        let fromProfile = null;
        if (data.from_profile_id) {
          try {
            const profileDoc = await getDocs(query(
              collection(db, 'profiles'),
              where('id', '==', data.from_profile_id),
              limit(1)
            ));
            if (!profileDoc.empty) {
              const profileData = profileDoc.docs[0].data();
              fromProfile = {
                id: profileDoc.docs[0].id,
                username: profileData.username,
                name: profileData.name,
                avatar_url: profileData.avatar_url,
              };
            }
          } catch (error) {
            console.error('Error fetching from_profile:', error);
          }
        }

        notificationsData.push({
          id: docSnap.id,
          type: data.type,
          message: data.message,
          read: data.read,
          created_at: data.created_at?.toDate()?.toISOString(),
          from_profile_id: data.from_profile_id,
          track_id: data.track_id,
          post_id: data.post_id,
          from_profile: fromProfile,
        });
      }

      setNotifications(notificationsData);
      setUnreadCount(notificationsData.filter(n => !n.read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
    setLoading(false);
  }, [profile?.id]);

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
    if (!profile?.id) return;

    try {
      // Get all unread notifications
      const unreadQuery = query(
        collection(db, 'notifications'),
        where('profile_id', '==', profile.id),
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
  }, [profile?.id]);

  useEffect(() => {
    if (!profile?.id) return;

    fetchNotifications();

    // TODO: Implement real-time notifications with Firebase
    // For now, we'll just fetch on mount and not have real-time updates
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
