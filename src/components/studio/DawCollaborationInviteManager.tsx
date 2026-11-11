import { useMemo } from 'react';
import { FolderOpen, Users, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRealTimeNotifications } from '@/hooks/useRealTimeNotifications';

export function DawCollaborationInviteManager() {
  const navigate = useNavigate();
  const { notifications, markAsRead } = useRealTimeNotifications();
  const invitation = useMemo(
    () => notifications.find(item => item.type === 'daw_collaboration' && !item.read && item.project_id),
    [notifications],
  );

  if (!invitation?.project_id) return null;

  const openProject = () => {
    localStorage.setItem('musicinsta_active_daw_project', invitation.project_id!);
    void markAsRead(invitation.id);
    navigate(`/studio/daw?project=${encodeURIComponent(invitation.project_id!)}`);
  };

  return <aside role="dialog" aria-label="DAW collaboration invitation" className="fixed right-4 top-20 z-[190] w-[min(92vw,25rem)] rounded-2xl border border-primary/30 bg-card p-4 shadow-2xl">
    <div className="flex items-start gap-3">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary/15 text-primary"><Users className="h-5 w-5" /></div>
      <div className="min-w-0 flex-1"><h2 className="font-bold">DAW collaboration invitation</h2><p className="mt-1 text-sm text-muted-foreground">{invitation.message || 'You were invited to edit a MusicInsta DAW project.'}</p></div>
      <button type="button" aria-label="Dismiss collaboration invitation" onClick={() => void markAsRead(invitation.id)} className="rounded-full p-1 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
    </div>
    <button type="button" onClick={openProject} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"><FolderOpen className="h-4 w-4" />Open shared project</button>
  </aside>;
}
