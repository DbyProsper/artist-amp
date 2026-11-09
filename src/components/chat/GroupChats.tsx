import { useEffect, useMemo, useState } from "react";
import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { Copy, Link2, Send, Users, X } from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/FirebaseAuthContext";
import { DEFAULT_MEDIA_IMAGE } from "@/lib/media";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export interface GroupSummary {
  id: string;
  name: string;
  participantIds: string[];
  adminIds: string[];
  inviteToken: string;
  updatedAt: Date;
}
interface Person {
  id: string;
  authUid: string;
  name: string;
  username: string;
  avatar: string;
}

export function GroupCreateDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (group: GroupSummary) => void;
}) {
  const { user, profile } = useAuth();
  const [name, setName] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  useEffect(() => {
    if (!open || !user || !profile) return;
    void Promise.all([
      getDocs(collection(db, "follows")),
      getDocs(collection(db, "profiles")),
    ]).then(([follows, profiles]) => {
      const edges = new Set(
        follows.docs.map(
          (item) => `${item.data().follower_id}:${item.data().following_id}`,
        ),
      );
      const mutualIds = new Set<string>();
      profiles.docs.forEach((person) => {
        if (
          person.id !== profile.id &&
          edges.has(`${profile.id}:${person.id}`) &&
          edges.has(`${person.id}:${profile.id}`)
        )
          mutualIds.add(person.id);
      });
      setPeople(
        profiles.docs
          .filter((item) => mutualIds.has(item.id))
          .map((item) => ({
            id: item.id,
            authUid: item.data().user_id || item.id,
            name: item.data().name || "MusicInsta user",
            username: item.data().username || "user",
            avatar: item.data().avatar_url || DEFAULT_MEDIA_IMAGE,
          })),
      );
    });
  }, [open, profile, user]);
  if (!open) return null;
  const create = async () => {
    if (!user || !profile || !name.trim() || !selected.length) return;
    const groupRef = doc(collection(db, "conversations"));
    const inviteToken = crypto.randomUUID();
    const selectedAuthUids = people
      .filter((person) => selected.includes(person.id))
      .map((person) => person.authUid);
    const value = {
      type: "group",
      name: name.trim(),
      participant_ids: [profile.id, ...selected],
      auth_uids: [user.uid, ...selectedAuthUids],
      admin_ids: [profile.id],
      admin_auth_uids: [user.uid],
      invite_token: inviteToken,
      last_message: "Group created",
      updated_at: serverTimestamp(),
      created_at: serverTimestamp(),
    };
    await setDoc(groupRef, value);
    const group = {
      id: groupRef.id,
      name: name.trim(),
      participantIds: value.participant_ids,
      adminIds: value.admin_ids,
      inviteToken,
      updatedAt: new Date(),
    };
    toast.success("Group created.");
    onCreated(group);
    onClose();
    setName("");
    setSelected([]);
  };
  return (
    <div
      className="fixed inset-0 z-[170] grid place-items-center bg-black/75 p-4"
      onClick={onClose}
    >
      <section
        className="w-full max-w-md rounded-2xl border bg-card p-4"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold">New group chat</h2>
            <p className="text-xs text-muted-foreground">
              Only mutual followers can be added directly.
            </p>
          </div>
          <button onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <Input
          className="mt-4"
          placeholder="Group name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <div className="mt-3 max-h-64 space-y-1 overflow-y-auto">
          {people.map((person) => (
            <label
              key={person.id}
              className="flex cursor-pointer items-center gap-3 rounded-xl p-2 hover:bg-muted"
            >
              <input
                type="checkbox"
                checked={selected.includes(person.id)}
                onChange={() =>
                  setSelected((items) =>
                    items.includes(person.id)
                      ? items.filter((id) => id !== person.id)
                      : [...items, person.id],
                  )
                }
              />
              <img
                src={person.avatar}
                alt=""
                className="h-10 w-10 rounded-full object-cover"
              />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">
                  {person.name}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  @{person.username}
                </span>
              </span>
            </label>
          ))}
          {!people.length && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No mutual followers are available. Create the group later and use
              its invite link.
            </p>
          )}
        </div>
        <Button
          className="mt-4 w-full"
          disabled={!name.trim() || !selected.length}
          onClick={() => void create()}
        >
          <Users className="mr-2 h-4 w-4" />
          Create group
        </Button>
      </section>
    </div>
  );
}

export function GroupChatWindow({
  group,
  onBack,
}: {
  group: GroupSummary;
  onBack: () => void;
}) {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<
    Array<{
      id: string;
      sender: string;
      content: string;
      own: boolean;
      at: Date;
    }>
  >([]);
  const [text, setText] = useState("");
  useEffect(() => {
    if (!user || !profile) return;
    return onSnapshot(
      query(
        collection(db, "messages"),
        where("conversation_id", "==", group.id),
      ),
      (snapshot) =>
        setMessages(
          snapshot.docs
            .map((item) => ({
              id: item.id,
              sender: item.data().sender_name || "Member",
              content: item.data().content || "",
              own: item.data().sender_id === profile.id,
              at: item.data().created_at?.toDate?.() || new Date(),
            }))
            .sort((a, b) => a.at.getTime() - b.at.getTime()),
        ),
    );
  }, [group.id, profile, user]);
  const send = async () => {
    if (!user || !profile || !text.trim()) return;
    const content = text.trim();
    setText("");
    const batch = writeBatch(db);
    batch.set(doc(collection(db, "messages")), {
      conversation_id: group.id,
      group_id: group.id,
      sender_id: profile.id,
      actor_uid: user.uid,
      sender_name: profile.name,
      content,
      created_at: serverTimestamp(),
      read: true,
    });
    batch.update(doc(db, "conversations", group.id), {
      last_message: content,
      last_sender_id: profile.id,
      updated_at: serverTimestamp(),
    });
    await batch.commit().catch(() => {
      setText(content);
      toast.error("Message could not be sent.");
    });
  };
  const inviteUrl = `${window.location.origin}/messages?groupInvite=${group.id}&token=${encodeURIComponent(group.inviteToken)}`;
  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center gap-3 border-b bg-card p-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          Back
        </Button>
        <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/15">
          <Users className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-bold">{group.name}</h1>
          <p className="text-xs text-muted-foreground">
            {group.participantIds.length} members
          </p>
        </div>
        {profile && group.adminIds.includes(profile.id) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              void navigator.clipboard
                .writeText(inviteUrl)
                .then(() => toast.success("Group invite link copied."))
            }
          >
            <Link2 className="mr-1 h-4 w-4" />
            <span className="hidden sm:inline">Invite</span>
            <Copy className="ml-1 h-3 w-3" />
          </Button>
        )}
      </header>
      <main className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.own ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[82%] rounded-2xl px-4 py-2 ${message.own ? "bg-primary text-primary-foreground" : "bg-muted"}`}
            >
              {!message.own && (
                <p className="mb-1 text-[10px] font-semibold opacity-70">
                  {message.sender}
                </p>
              )}
              <p className="whitespace-pre-wrap break-words text-sm">
                {message.content}
              </p>
            </div>
          </div>
        ))}
      </main>
      <footer className="flex gap-2 border-t bg-card p-4">
        <Input
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void send();
          }}
          placeholder="Message the group"
        />
        <Button size="icon" disabled={!text.trim()} onClick={() => void send()}>
          <Send className="h-4 w-4" />
        </Button>
      </footer>
    </div>
  );
}

export async function joinGroupFromInvite(
  groupId: string,
  token: string,
  uid: string,
  profileId: string,
) {
  const reference = doc(db, "conversations", groupId);
  const snapshot = await getDoc(reference);
  if (
    !snapshot.exists() ||
    snapshot.data().type !== "group" ||
    snapshot.data().invite_token !== token
  )
    throw new Error("This invite link is invalid or expired.");
  await updateDoc(reference, {
    participant_ids: arrayUnion(profileId),
    auth_uids: arrayUnion(uid),
    updated_at: serverTimestamp(),
  });
}
