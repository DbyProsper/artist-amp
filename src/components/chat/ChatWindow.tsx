import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Send,
  BadgeCheck,
  Pencil,
  Trash2,
  Check,
  X,
  Phone,
  Video,
  Gamepad2,
  Trophy,
  Reply,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Artist } from "@/types";
import { useAuth } from "@/context/FirebaseAuthContext";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { EmojiPicker } from "./EmojiPicker";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  arrayRemove,
  arrayUnion,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DEFAULT_MEDIA_IMAGE } from "@/lib/media";
import {
  GifStickerPicker,
  SocialAttachment,
  type SocialMediaAttachment,
} from "@/components/social/GifStickerPicker";
import { CallDialog } from "./CallDialog";
import { useNavigate } from "react-router-dom";

interface Message {
  id: string;
  content: string;
  senderId: string;
  timestamp: Date;
  isOwn: boolean;
  edited: boolean;
  attachment?: SocialMediaAttachment;
  call?: {
    kind: "voice" | "video";
    status: "ringing" | "active" | "ended" | "declined" | "missed";
    duration: number;
  };
  track?: {
    id: string;
    title: string;
    artist: string;
    audioUrl: string;
    coverUrl: string;
  };
  challenge?: { gameId: string; senderScore: number; recipientScore?: number };
  reply?: { id: string; preview: string; senderId: string };
  reactions: Record<string, string[]>;
}

function formatCallDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}:${remaining.toString().padStart(2, "0")}`;
}

interface ChatWindowProps {
  recipient: Artist;
  onBack: () => void;
}

export function ChatWindow({ recipient, onBack }: ChatWindowProps) {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [attachment, setAttachment] = useState<SocialMediaAttachment | null>(
    null,
  );
  const [callKind, setCallKind] = useState<"voice" | "video" | null>(null);
  const [showGames, setShowGames] = useState(false);
  const [gameBests, setGameBests] = useState<Record<string, number>>({});
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [recipientPresence, setRecipientPresence] = useState<{ online: boolean; lastActive: Date | null }>({ online: false, lastActive: null });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!user) return;
    const identityId = profile?.id || user.uid;
    const conversationId = [identityId, recipient.id].sort().join("_");
    return onSnapshot(
      query(
        collection(db, "messages"),
        where("conversation_id", "==", conversationId),
      ),
      (snapshot) => {
        const next = snapshot.docs
          .map((item) => {
            const value = item.data();
            const mediaType =
              value.media_type === "gif" || value.media_type === "sticker"
                ? value.media_type
                : undefined;
            const callStatus = [
              "ringing",
              "active",
              "ended",
              "declined",
              "missed",
            ].includes(value.call_status)
              ? value.call_status
              : "ended";
            return {
              id: item.id,
              content: value.content || "",
              senderId: value.sender_id,
              timestamp: value.created_at?.toDate?.() || new Date(),
              isOwn: value.sender_id === identityId,
              edited: Boolean(value.edited_at),
              attachment: mediaType
                ? {
                    type: mediaType,
                    url: value.media_url || undefined,
                    sticker: value.sticker || undefined,
                  }
                : undefined,
              call:
                value.media_type === "call"
                  ? {
                      kind: value.call_kind === "video" ? "video" : "voice",
                      status: callStatus,
                      duration: Number(value.call_duration_seconds) || 0,
                    }
                  : undefined,
              track:
                value.media_type === "audio" && value.media_url
                  ? {
                      id: value.track_id || item.id,
                      title: value.track_title || "Shared track",
                      artist: value.track_artist || "MusicInsta artist",
                      audioUrl: value.media_url,
                      coverUrl: value.cover_url || DEFAULT_MEDIA_IMAGE,
                    }
                  : undefined,
              challenge:
                value.media_type === "game_challenge"
                  ? {
                      gameId: value.game_id || "flappy",
                      senderScore: Number(value.sender_score) || 0,
                      recipientScore:
                        value.recipient_score == null
                          ? undefined
                          : Number(value.recipient_score),
                    }
                  : undefined,
              reply: value.reply_to_id ? { id: value.reply_to_id, preview: value.reply_preview || "Message", senderId: value.reply_sender_id || "" } : undefined,
              reactions: Object.fromEntries(Object.entries(value.reactions || {}).map(([key, ids]) => [key, Array.isArray(ids) ? ids.map(String) : []])),
            };
          })
          .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        setMessages(next);
        const unread = snapshot.docs.filter(
          (item) =>
            item.data().recipient_id === identityId && !item.data().read,
        );
        if (unread.length) {
          const batch = writeBatch(db);
          unread.forEach((item) =>
            batch.update(item.ref, { read: true, read_at: serverTimestamp() }),
          );
          void batch.commit();
        }
      },
      () => toast.error("Messages could not be loaded."),
    );
  }, [profile?.id, recipient.id, user]);

  useEffect(() => onSnapshot(doc(db, "profiles", recipient.id), snapshot => {
    const value = snapshot.data();
    const lastActive = value?.last_active?.toDate?.() || null;
    setRecipientPresence({ online: Boolean(value?.is_online) && Boolean(lastActive && Date.now() - lastActive.getTime() < 120_000), lastActive });
  }), [recipient.id]);

  useEffect(() => {
    if (!user) return;
    void getDoc(doc(db, "game_profiles", user.uid)).then((snapshot) => {
      const progress = snapshot.data()?.progress || {};
      setGameBests(
        Object.fromEntries(
          Object.entries(progress).map(([id, value]) => [
            id,
            Number((value as { best?: number })?.best) || 0,
          ]),
        ),
      );
    });
  }, [user]);

  const handleSend = async () => {
    if ((!newMessage.trim() && !attachment) || !user || !profile) return;

    const content = newMessage.trim();
    const selectedAttachment = attachment;
    setNewMessage("");
    setAttachment(null);
    setSending(true);
    try {
      const identityId = profile.id || user.uid;
      const conversationId = [identityId, recipient.id].sort().join("_");
      const batch = writeBatch(db);
      batch.set(doc(collection(db, "messages")), {
        conversation_id: conversationId,
        sender_id: identityId,
        actor_uid: user.uid,
        recipient_id: recipient.id,
        content,
        media_type: selectedAttachment?.type || null,
        media_url: selectedAttachment?.url || null,
        sticker: selectedAttachment?.sticker || null,
        reply_to_id: replyingTo?.id || null,
        reply_preview: replyingTo?.content || replyingTo?.track?.title || replyingTo?.attachment?.type || null,
        reply_sender_id: replyingTo?.senderId || null,
        created_at: serverTimestamp(),
        read: false,
      });
      batch.set(
        doc(db, "conversations", conversationId),
        {
          participant_ids: [identityId, recipient.id],
          actor_uids: [user.uid],
          last_message:
            content ||
            (selectedAttachment?.type === "gif"
              ? "Sent a GIF"
              : "Sent a sticker"),
          last_sender_id: identityId,
          updated_at: serverTimestamp(),
        },
        { merge: true },
      );
      batch.set(doc(collection(db, "notifications")), {
        profile_id: recipient.id,
        from_profile_id: profile.id,
        type: "message",
        message: "sent you a message",
        read: false,
        created_at: serverTimestamp(),
      });
      await batch.commit();
      setReplyingTo(null);
    } catch {
      setNewMessage(content);
      setAttachment(selectedAttachment);
      toast.error("Message could not be sent.");
    } finally {
      setSending(false);
    }
  };

  const saveEdit = async () => {
    if (!editingId || !editingText.trim()) return;
    await updateDoc(doc(db, "messages", editingId), {
      content: editingText.trim(),
      edited_at: serverTimestamp(),
    });
    setEditingId(null);
    setEditingText("");
  };

  const removeMessage = async (messageId: string) => {
    if (!window.confirm("Delete this message?")) return;
    await deleteDoc(doc(db, "messages", messageId));
  };

  const handleEmojiSelect = (emoji: string) => {
    setNewMessage((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  const reactionEmoji: Record<string, string> = { heart: "❤️", laugh: "😂", fire: "🔥" };
  const toggleReaction = async (message: Message, reaction: string) => {
    if (!profile) return;
    const reacted = message.reactions[reaction]?.includes(profile.id);
    await updateDoc(doc(db, "messages", message.id), { [`reactions.${reaction}`]: reacted ? arrayRemove(profile.id) : arrayUnion(profile.id) });
  };

  const gameNames: Record<string, string> = {
    "release-day": "Release Day Simulator",
    flappy: "MusicInsta Mascot",
    "musicinsta-piano": "MusicInsta Piano",
    "memory-heist": "Memory Heist",
  };
  const sendChallenge = async (gameId: string) => {
    if (!user || !profile) return;
    const conversationId = [profile.id, recipient.id].sort().join("_");
    const batch = writeBatch(db);
    batch.set(doc(collection(db, "messages")), {
      conversation_id: conversationId,
      sender_id: profile.id,
      actor_uid: user.uid,
      recipient_id: recipient.id,
      content: "",
      media_type: "game_challenge",
      game_id: gameId,
      sender_score: gameBests[gameId] || 0,
      created_at: serverTimestamp(),
      read: false,
    });
    batch.set(
      doc(db, "conversations", conversationId),
      {
        participant_ids: [profile.id, recipient.id],
        actor_uids: [user.uid],
        last_message: `Game challenge: ${gameNames[gameId]}`,
        last_sender_id: profile.id,
        updated_at: serverTimestamp(),
      },
      { merge: true },
    );
    await batch.commit();
    setShowGames(false);
    toast.success("Challenge sent.");
  };
  const acceptChallenge = async (message: Message) => {
    if (!message.challenge) return;
    if (!message.isOwn)
      await updateDoc(doc(db, "messages", message.id), {
        recipient_score: gameBests[message.challenge.gameId] || 0,
        challenge_accepted_at: serverTimestamp(),
      });
    navigate(
      `/games?challenge=${encodeURIComponent(message.challenge.gameId)}&from=${encodeURIComponent(recipient.id)}`,
    );
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border bg-card">
        <button
          onClick={onBack}
          className="p-2 rounded-full hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={() => navigate(`/user/${recipient.id}`)}
          className="flex flex-1 items-center gap-3 rounded-xl text-left hover:bg-muted/60"
        >
          <div className="w-10 h-10 rounded-full overflow-hidden">
            <img
              src={recipient.avatar || DEFAULT_MEDIA_IMAGE}
              alt={recipient.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="font-semibold">{recipient.name}</span>
              {recipient.isVerified && (
                <BadgeCheck
                  className="w-4 h-4 text-primary"
                  fill="currentColor"
                />
              )}
            </div>
            <span className="text-xs text-muted-foreground">{recipientPresence.online ? "Active now" : recipientPresence.lastActive ? `Last active ${formatDistanceToNow(recipientPresence.lastActive, { addSuffix: true })}` : "Offline"}</span>
          </div>
        </button>
        <button
          aria-label="Start voice call"
          onClick={() => setCallKind("voice")}
          className="rounded-full p-2 hover:bg-muted"
        >
          <Phone className="h-5 w-5" />
        </button>
        <button
          aria-label="Start video call"
          onClick={() => setCallKind("video")}
          className="rounded-full p-2 hover:bg-muted"
        >
          <Video className="h-5 w-5" />
        </button>
        <button
          aria-label="Challenge to a game"
          onClick={() => setShowGames(true)}
          className="rounded-full p-2 hover:bg-muted"
        >
          <Gamepad2 className="h-5 w-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`flex ${message.isOwn ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[75%] px-4 py-2 rounded-2xl ${
                message.isOwn
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-muted rounded-bl-md"
              }`}
            >
              {message.reply && <div className="mb-2 border-l-2 border-current/50 pl-2 text-xs opacity-70"><p className="line-clamp-2">{message.reply.preview}</p></div>}
              {message.attachment && (
                <SocialAttachment
                  attachment={message.attachment}
                  className={message.content ? "mb-2" : ""}
                />
              )}
              {message.track && (
                <div className="mb-1 w-[min(72vw,320px)] overflow-hidden rounded-xl bg-black/20 p-2">
                  <div className="mb-2 flex items-center gap-2">
                    <img
                      src={message.track.coverUrl}
                      alt=""
                      className="h-11 w-11 rounded-lg object-cover"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {message.track.title}
                      </p>
                      <p className="truncate text-xs opacity-70">
                        {message.track.artist}
                      </p>
                    </div>
                  </div>
                  <audio
                    controls
                    preload="metadata"
                    src={message.track.audioUrl}
                    className="h-10 w-full"
                  />
                </div>
              )}
              {message.challenge && (
                <div className="w-[min(72vw,320px)] rounded-xl bg-black/20 p-3">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-6 w-6 text-amber-400" />
                    <div>
                      <p className="text-sm font-bold">
                        {gameNames[message.challenge.gameId] ||
                          "MusicInsta game"}{" "}
                        challenge
                      </p>
                      <p className="text-xs opacity-75">
                        Challenger best: {message.challenge.senderScore}
                      </p>
                      {message.challenge.recipientScore != null && (
                        <p className="text-xs opacity-75">
                          Opponent best: {message.challenge.recipientScore} ·{" "}
                          {message.challenge.senderScore ===
                          message.challenge.recipientScore
                            ? "Tied"
                            : Math.max(
                                  message.challenge.senderScore,
                                  message.challenge.recipientScore,
                                ) === message.challenge.senderScore
                              ? "Challenger leads"
                              : "Opponent leads"}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="mt-3 w-full"
                    onClick={() => void acceptChallenge(message)}
                  >
                    {message.isOwn ? "Play again" : "Accept challenge"}
                  </Button>
                </div>
              )}
              {message.call ? (
                <div className="flex min-w-48 items-center gap-3 py-1">
                  <span
                    className={`grid h-10 w-10 place-items-center rounded-full ${message.call.status === "missed" || message.call.status === "declined" ? "bg-red-500/20" : "bg-background/20"}`}
                  >
                    {message.call.kind === "video" ? (
                      <Video className="h-5 w-5" />
                    ) : (
                      <Phone className="h-5 w-5" />
                    )}
                  </span>
                  <div>
                    <p className="text-sm font-semibold">
                      {message.call.kind === "video"
                        ? "Video call"
                        : "Voice call"}
                    </p>
                    <p className="text-xs opacity-75">
                      {message.call.status === "ringing"
                        ? message.isOwn
                          ? "Outgoing call"
                          : "Incoming call"
                        : message.call.status === "active"
                          ? "Ongoing call"
                          : message.call.status === "declined"
                            ? "Declined"
                            : message.call.status === "missed"
                              ? "Missed call"
                              : message.call.duration
                                ? `Ended · ${formatCallDuration(message.call.duration)}`
                                : "Ended"}
                    </p>
                  </div>
                </div>
              ) : editingId === message.id ? (
                <div className="flex items-center gap-1">
                  <Input
                    value={editingText}
                    onChange={(event) => setEditingText(event.target.value)}
                    className="h-8 min-w-48 bg-background text-foreground"
                    autoFocus
                  />
                  <button
                    aria-label="Save message"
                    onClick={() => void saveEdit()}
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    aria-label="Cancel editing"
                    onClick={() => setEditingId(null)}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : message.content ? (
                <p className="whitespace-pre-wrap break-words text-sm">
                  {message.content}
                </p>
              ) : null}
              <p
                className={`text-[10px] mt-1 ${message.isOwn ? "text-primary-foreground/70" : "text-muted-foreground"}`}
              >
                {formatDistanceToNow(message.timestamp, { addSuffix: true })}
                {message.edited ? " · edited" : ""}
              </p>
              {message.isOwn && editingId !== message.id && (
                <div className="mt-1 flex justify-end gap-2 opacity-70">
                  {message.content && !message.call && (
                    <button
                      aria-label="Edit message"
                      onClick={() => {
                        setEditingId(message.id);
                        setEditingText(message.content);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    aria-label="Delete message"
                    onClick={() => void removeMessage(message.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              {editingId !== message.id && <div className="mt-1 flex flex-wrap items-center gap-1 border-t border-current/10 pt-1">
                {Object.entries(message.reactions).map(([reaction, ids]) => ids.length ? <button key={reaction} type="button" onClick={() => void toggleReaction(message, reaction)} className={`rounded-full bg-background/20 px-1.5 py-0.5 text-[11px] ${profile?.id && ids.includes(profile.id) ? "ring-1 ring-current" : ""}`} title={`${ids.length} reaction${ids.length === 1 ? "" : "s"}`}>{reactionEmoji[reaction] || "👍"} {ids.length}</button> : null)}
                <button type="button" onClick={() => setReplyingTo(message)} aria-label="Reply to message" className="ml-auto rounded-full p-1 opacity-70 hover:bg-background/20"><Reply className="h-3.5 w-3.5" /></button>
                {Object.entries(reactionEmoji).map(([reaction, emoji]) => <button key={reaction} type="button" onClick={() => void toggleReaction(message, reaction)} aria-label={`React ${emoji}`} className="rounded-full p-0.5 text-xs opacity-70 hover:bg-background/20 hover:opacity-100">{emoji}</button>)}
              </div>}
            </div>
          </motion.div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border bg-card safe-bottom">
        {replyingTo && <div className="mb-2 flex items-center gap-2 rounded-xl border-l-2 border-primary bg-muted/50 px-3 py-2"><Reply className="h-4 w-4 text-primary" /><p className="min-w-0 flex-1 truncate text-xs">Replying to {replyingTo.isOwn ? "your message" : recipient.name}: {replyingTo.content || replyingTo.track?.title || "attachment"}</p><button type="button" aria-label="Cancel reply" onClick={() => setReplyingTo(null)}><X className="h-4 w-4" /></button></div>}
        {attachment && (
          <div className="mb-2 flex items-end gap-2 rounded-xl bg-muted/60 p-2">
            <SocialAttachment attachment={attachment} />
            <button
              type="button"
              aria-label="Remove attachment"
              onClick={() => setAttachment(null)}
              className="rounded-full bg-background p-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Input
            ref={inputRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            placeholder="Type a message..."
            className="flex-1 bg-muted border-none"
          />
          <EmojiPicker onEmojiSelect={handleEmojiSelect} />
          <GifStickerPicker onSelect={setAttachment} disabled={sending} />
          <Button
            size="icon"
            onClick={() => void handleSend()}
            disabled={(!newMessage.trim() && !attachment) || sending}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <CallDialog
        recipient={recipient}
        requestedKind={callKind}
        onRequestHandled={() => setCallKind(null)}
        listenIncoming={false}
      />
      {showGames && (
        <div
          className="fixed inset-0 z-[165] grid place-items-center bg-black/75 p-4"
          onClick={() => setShowGames(false)}
        >
          <section
            className="w-full max-w-sm rounded-2xl border bg-card p-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="font-bold">Send a game challenge</h2>
                <p className="text-xs text-muted-foreground">
                  Your current high score is attached.
                </p>
              </div>
              <button onClick={() => setShowGames(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            {Object.entries(gameNames).map(([id, name]) => (
              <button
                key={id}
                onClick={() => void sendChallenge(id)}
                className="flex w-full items-center justify-between rounded-xl p-3 text-left hover:bg-muted"
              >
                <span>{name}</span>
                <span className="text-xs text-primary">
                  Best {gameBests[id] || 0}
                </span>
              </button>
            ))}
          </section>
        </div>
      )}
    </div>
  );
}
