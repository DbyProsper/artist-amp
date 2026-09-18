import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Heart, MessageCircle, UserPlus, Music2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useRealTimeNotifications, type Notification } from '@/hooks/useRealTimeNotifications';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}
const iconFor = (type: string) => {
  if (type === 'like') return <Heart className="h-4 w-4 fill-red-500 text-red-500" />;
  if (type === 'comment' || type === 'message') return <MessageCircle className="h-4 w-4 text-primary" />;
  if (type === 'follow') return <UserPlus className="h-4 w-4 text-green-500" />;
  if (type === 'music') return <Music2 className="h-4 w-4 text-accent" />;
  return <Bell className="h-4 w-4" />;
};

export function NotificationsPanel({ isOpen, onClose }: Props) {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead, loading } = useRealTimeNotifications();

  const openNotification = (notification: Notification) => {
    void markAsRead(notification.id);
    if (notification.type === 'message') navigate('/messages');
    else if (notification.from_profile_id) navigate(`/user/${notification.from_profile_id}`);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/40" onClick={onClose} />
          <motion.div initial={{ opacity: 0, y: -10, scale: .95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: .95 }} className="fixed right-2 top-14 z-50 max-h-[70vh] w-80 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border p-4">
              <div className="flex items-center gap-2"><h3 className="font-display font-bold">Notifications</h3>{unreadCount > 0 && <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">{unreadCount}</span>}</div>
              <div className="flex items-center gap-3">{unreadCount > 0 && <button onClick={() => void markAllAsRead()} className="text-xs text-primary hover:underline">Mark all read</button>}<button aria-label="Close" onClick={onClose}><X className="h-4 w-4" /></button></div>
            </div>
            <div className="max-h-[55vh] overflow-y-auto">
              {loading && <p className="p-8 text-center text-sm text-muted-foreground">Loading notifications…</p>}
              {!loading && notifications.length === 0 && <div className="p-8 text-center"><Bell className="mx-auto mb-2 h-10 w-10 text-muted-foreground" /><p className="text-sm text-muted-foreground">No notifications yet</p></div>}
              {notifications.map((notification, index) => (
                <motion.button key={notification.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * .03 }} onClick={() => openNotification(notification)} className={`flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-muted/50 ${!notification.read ? 'bg-primary/5' : ''}`}>
                  <div className="relative"><img src={notification.from_profile?.avatar_url || '/placeholder.svg'} alt="" className="h-10 w-10 rounded-full object-cover" /><div className="absolute -bottom-1 -right-1 rounded-full bg-card p-1">{iconFor(notification.type)}</div></div>
                  <div className="min-w-0 flex-1"><p className="text-sm"><strong>{notification.from_profile?.name || notification.from_profile?.username || 'Someone'}</strong> <span className="text-muted-foreground">{notification.message}</span></p>{notification.created_at && <p className="mt-0.5 text-xs text-muted-foreground">{formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}</p>}</div>
                  {!notification.read && <span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-primary" />}
                </motion.button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
