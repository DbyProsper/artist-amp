import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { ExternalLink, Search, Send, X } from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/FirebaseAuthContext";
import { DEFAULT_MEDIA_IMAGE } from "@/lib/media";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { loadShareProfiles } from '@/services/backendPersistenceService';

interface SharedTrack {
  id: string;
  title: string;
  audioUrl?: string;
  coverArt?: string;
  artistName?: string;
  youtubeVideoId?: string;
}
interface Person {
  id: string;
  name: string;
  username: string;
  avatar: string;
}

export function ShareTrackDialog({
  open,
  track,
  onClose,
}: {
  open: boolean;
  track: SharedTrack | null;
  onClose: () => void;
}) {
  const { user, profile } = useAuth();
  const [people, setPeople] = useState<Person[]>([]);
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState("");
  useEffect(() => {
    if (!open) return;
    void loadShareProfiles().then(items => setPeople(items.map(item => ({ ...item, avatar: item.avatar || DEFAULT_MEDIA_IMAGE })).filter(item => item.id !== profile?.id))).catch(() => toast.error('People could not be loaded.'));
  }, [open, profile?.id]);
  const visible = useMemo(
    () =>
      people
        .filter((person) =>
          `${person.name} ${person.username}`
            .toLowerCase()
            .includes(search.toLowerCase()),
        )
        .slice(0, 30),
    [people, search],
  );
  if (!open || !track) return null;
  const url = `${window.location.origin}/?track=${encodeURIComponent(track.id)}`;
  const send = async (person: Person) => {
    if (!user || (!track.audioUrl && !track.youtubeVideoId)) return;
    setSending(person.id);
    try {
      const actorId = profile?.id || user.uid;
      const conversationId = [actorId, person.id].sort().join("_");
      const batch = writeBatch(db);
      batch.set(doc(collection(db, "messages")), {
        conversation_id: conversationId,
        sender_id: actorId,
        actor_uid: user.uid,
        recipient_id: person.id,
        content: "",
        media_type: "audio",
        track_id: track.id,
        track_title: track.title,
        track_artist: track.artistName || profile.name,
        media_url: track.audioUrl || `https://www.youtube.com/watch?v=${track.youtubeVideoId}`,
        youtube_video_id: track.youtubeVideoId || null,
        cover_url: track.coverArt || DEFAULT_MEDIA_IMAGE,
        created_at: serverTimestamp(),
        read: false,
      });
      batch.set(
        doc(db, "conversations", conversationId),
        {
          participant_ids: [actorId, person.id],
          actor_uids: [user.uid],
          last_message: `Shared ${track.title}`,
          last_sender_id: actorId,
          updated_at: serverTimestamp(),
        },
        { merge: true },
      );
      await batch.commit();
      toast.success(`Sent to ${person.name}.`);
    } catch {
      toast.error("The track could not be sent.");
    } finally {
      setSending("");
    }
  };
  const external = async () => {
    try {
      if (navigator.share)
        await navigator.share({
          title: track.title,
          text: `Listen to ${track.title} on MusicInsta`,
          url,
        });
      else {
        await navigator.clipboard.writeText(url);
        toast.success("Track link copied.");
      }
    } catch (error) {
      if ((error as DOMException).name !== "AbortError")
        toast.error("The track could not be shared.");
    }
  };
  return (
    <div
      className="fixed inset-0 z-[160] grid place-items-center bg-black/75 p-4"
      onClick={onClose}
    >
      <section
        className="w-full max-w-md rounded-2xl border border-border bg-card p-4"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="font-bold">Share music</h2>
            <p className="text-xs text-muted-foreground">
              Send a playable track in MusicInsta chat.
            </p>
          </div>
          <button onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mb-3 flex items-center gap-3 rounded-xl bg-muted/50 p-2">
          <img
            src={track.coverArt || DEFAULT_MEDIA_IMAGE}
            alt=""
            className="h-12 w-12 rounded-lg object-cover"
          />
          <div className="min-w-0">
            <p className="truncate font-medium">{track.title}</p>
            <p className="truncate text-xs text-muted-foreground">
              {track.artistName}
            </p>
          </div>
        </div>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search people"
          />
        </div>
        <div className="max-h-72 space-y-1 overflow-y-auto">
          {visible.map((person) => (
            <div
              key={person.id}
              className="flex items-center gap-3 rounded-xl p-2 hover:bg-muted"
            >
              <img
                src={person.avatar}
                alt=""
                className="h-10 w-10 rounded-full object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{person.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  @{person.username}
                </p>
              </div>
              <Button
                size="sm"
                disabled={sending === person.id || (!track.audioUrl && !track.youtubeVideoId)}
                onClick={() => void send(person)}
              >
                <Send className="mr-1 h-4 w-4" />
                Send
              </Button>
            </div>
          ))}
        </div>
        <Button
          variant="outline"
          className="mt-4 w-full"
          onClick={() => void external()}
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          Share outside MusicInsta
        </Button>
      </section>
    </div>
  );
}
