import { useCallback, useEffect, useRef, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Volume2,
  X,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/FirebaseAuthContext";
import type { Artist } from "@/types";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type CallKind = "voice" | "video";
type Signal = { type: RTCSdpType; sdp?: string };
type IncomingCall = { id: string; kind: CallKind; offer: Signal };
const turnUrl = import.meta.env.VITE_TURN_URL as string | undefined;
const rtcConfig: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    ...(turnUrl
      ? [
          {
            urls: turnUrl,
            username: import.meta.env.VITE_TURN_USERNAME as string | undefined,
            credential: import.meta.env.VITE_TURN_CREDENTIAL as
              string | undefined,
          },
        ]
      : []),
  ],
};
const callHistoryRef = (callId: string) =>
  doc(db, "messages", `call_${callId}`);
const updateCallHistory = (callId: string, values: Record<string, unknown>) =>
  updateDoc(callHistoryRef(callId), values).catch(() => undefined);

export function CallDialog({
  recipient,
  requestedKind,
  onRequestHandled,
  listenIncoming = true,
}: {
  recipient: Artist;
  requestedKind: CallKind | null;
  onRequestHandled: () => void;
  listenIncoming?: boolean;
}) {
  const { user, profile } = useAuth();
  const identityId = profile?.id || user?.uid || "";
  const [incoming, setIncoming] = useState<IncomingCall | null>(null);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [kind, setKind] = useState<CallKind>("voice");
  const [status, setStatus] = useState<
    "idle" | "ringing" | "connecting" | "active"
  >("idle");
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream>(new MediaStream());
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const callUnsubscribeRef = useRef<(() => void) | null>(null);
  const candidateUnsubscribeRef = useRef<(() => void) | null>(null);
  const callConnectedAtRef = useRef<number | null>(null);
  const missedTimerRef = useRef<number | null>(null);

  const release = useCallback(() => {
    callUnsubscribeRef.current?.();
    candidateUnsubscribeRef.current?.();
    callUnsubscribeRef.current = null;
    candidateUnsubscribeRef.current = null;
    if (missedTimerRef.current) window.clearTimeout(missedTimerRef.current);
    missedTimerRef.current = null;
    callConnectedAtRef.current = null;
    peerRef.current?.close();
    peerRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = new MediaStream();
    pendingCandidatesRef.current = [];
    setActiveCallId(null);
    setStatus("idle");
    setMuted(false);
    setCameraOff(false);
    setSpeakerOn(true);
  }, []);

  useEffect(() => () => release(), [release]);

  const connectMedia = async (callKind: CallKind) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: callKind === "video",
    });
    localStreamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    const peer = new RTCPeerConnection(rtcConfig);
    stream.getTracks().forEach((track) => peer.addTrack(track, stream));
    remoteStreamRef.current = new MediaStream();
    peer.ontrack = (event) => {
      const remote = event.streams[0];
      if (remote)
        remote.getTracks().forEach((track) => {
          if (
            !remoteStreamRef.current
              .getTracks()
              .some((item) => item.id === track.id)
          )
            remoteStreamRef.current.addTrack(track);
        });
      else if (
        !remoteStreamRef.current
          .getTracks()
          .some((item) => item.id === event.track.id)
      )
        remoteStreamRef.current.addTrack(event.track);
      if (remoteVideoRef.current)
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStreamRef.current;
        void remoteAudioRef.current.play().catch(() => undefined);
      }
      setStatus("active");
    };
    peerRef.current = peer;
    return peer;
  };

  const listenForCandidates = (
    callId: string,
    side: "callerCandidates" | "calleeCandidates",
    peer: RTCPeerConnection,
  ) => {
    candidateUnsubscribeRef.current = onSnapshot(
      collection(db, "calls", callId, side),
      (snapshot) =>
        snapshot.docChanges().forEach((change) => {
          if (change.type !== "added") return;
          const candidate = change.doc.data() as RTCIceCandidateInit;
          if (!peer.remoteDescription)
            pendingCandidatesRef.current.push(candidate);
          else
            void peer
              .addIceCandidate(new RTCIceCandidate(candidate))
              .catch(() => undefined);
        }),
    );
  };

  const applyRemoteDescription = async (
    peer: RTCPeerConnection,
    description: RTCSessionDescriptionInit,
  ) => {
    if (!peer.currentRemoteDescription)
      await peer.setRemoteDescription(new RTCSessionDescription(description));
    const queued = pendingCandidatesRef.current.splice(0);
    await Promise.all(
      queued.map((candidate) =>
        peer
          .addIceCandidate(new RTCIceCandidate(candidate))
          .catch(() => undefined),
      ),
    );
  };

  const start = useCallback(
    async (callKind: CallKind) => {
      if (!user || !identityId) return;
      if (
        !navigator.mediaDevices?.getUserMedia ||
        typeof RTCPeerConnection === "undefined"
      ) {
        toast.error("Calls are not supported by this browser.");
        return;
      }
      setKind(callKind);
      setStatus("connecting");
      try {
        const peer = await connectMedia(callKind);
        const callRef = await addDoc(collection(db, "calls"), {
          caller_id: identityId,
          caller_uid: user.uid,
          recipient_id: recipient.id,
          conversation_id: [identityId, recipient.id].sort().join("_"),
          kind: callKind,
          status: "preparing",
          created_at: serverTimestamp(),
        });
        const conversationId = [identityId, recipient.id].sort().join("_");
        await Promise.all([
          setDoc(callHistoryRef(callRef.id), {
            conversation_id: conversationId,
            sender_id: identityId,
            actor_uid: user.uid,
            recipient_id: recipient.id,
            content: `${callKind === "video" ? "Video" : "Voice"} call`,
            media_type: "call",
            call_id: callRef.id,
            call_kind: callKind,
            call_status: "ringing",
            call_duration_seconds: 0,
            created_at: serverTimestamp(),
            read: false,
          }),
          setDoc(
            doc(db, "conversations", conversationId),
            {
              participant_ids: [identityId, recipient.id],
              actor_uids: [user.uid],
              last_message: `${callKind === "video" ? "Video" : "Voice"} call`,
              last_sender_id: identityId,
              updated_at: serverTimestamp(),
            },
            { merge: true },
          ),
        ]);
        setActiveCallId(callRef.id);
        peer.onicecandidate = (event) => {
          if (event.candidate)
            void addDoc(
              collection(db, "calls", callRef.id, "callerCandidates"),
              event.candidate.toJSON(),
            );
        };
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        await updateDoc(callRef, {
          offer: { type: offer.type, sdp: offer.sdp },
          status: "ringing",
        });
        setStatus("ringing");
        missedTimerRef.current = window.setTimeout(() => {
          void updateDoc(callRef, {
            status: "missed",
            ended_at: serverTimestamp(),
          }).catch(() => undefined);
          void updateCallHistory(callRef.id, {
            call_status: "missed",
            ended_at: serverTimestamp(),
          });
        }, 60_000);
        listenForCandidates(callRef.id, "calleeCandidates", peer);
        callUnsubscribeRef.current = onSnapshot(callRef, (snapshot) => {
          const data = snapshot.data();
          if (data?.answer && !peer.currentRemoteDescription)
            void applyRemoteDescription(peer, data.answer);
          if (data?.status === "active" && !callConnectedAtRef.current) {
            callConnectedAtRef.current = Date.now();
            if (missedTimerRef.current)
              window.clearTimeout(missedTimerRef.current);
            void updateCallHistory(callRef.id, {
              call_status: "active",
              answered_at: serverTimestamp(),
            });
          }
          if (["declined", "ended", "missed"].includes(data?.status)) {
            const duration = callConnectedAtRef.current
              ? Math.max(
                  1,
                  Math.round((Date.now() - callConnectedAtRef.current) / 1000),
                )
              : 0;
            void updateCallHistory(callRef.id, {
              call_status: data.status,
              call_duration_seconds: duration,
              ended_at: serverTimestamp(),
            });
            toast.info(
              data.status === "declined"
                ? "Call declined."
                : data.status === "missed"
                  ? "No answer."
                  : "Call ended.",
            );
            release();
          }
        });
      } catch (error) {
        release();
        toast.error(
          error instanceof DOMException && error.name === "NotAllowedError"
            ? "Microphone or camera permission was denied."
            : "The call could not be started.",
        );
      }
    },
    [identityId, recipient.id, release, user],
  );

  useEffect(() => {
    if (!requestedKind) return;
    void start(requestedKind);
    onRequestHandled();
  }, [onRequestHandled, requestedKind, start]);

  useEffect(() => {
    if (!identityId || !listenIncoming) return;
    return onSnapshot(
      query(collection(db, "calls"), where("recipient_id", "==", identityId)),
      (snapshot) => {
        const pending = snapshot.docs.find(
          (item) =>
            item.data().status === "ringing" &&
            item.data().caller_id === recipient.id,
        );
        if (pending)
          setIncoming({
            id: pending.id,
            kind: pending.data().kind === "video" ? "video" : "voice",
            offer: pending.data().offer,
          });
      },
    );
  }, [identityId, listenIncoming, recipient.id]);

  const accept = async () => {
    if (!incoming) return;
    setKind(incoming.kind);
    setStatus("connecting");
    setActiveCallId(incoming.id);
    try {
      const peer = await connectMedia(incoming.kind);
      peer.onicecandidate = (event) => {
        if (event.candidate)
          void addDoc(
            collection(db, "calls", incoming.id, "calleeCandidates"),
            event.candidate.toJSON(),
          );
      };
      await applyRemoteDescription(peer, incoming.offer);
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      await updateDoc(doc(db, "calls", incoming.id), {
        answer: { type: answer.type, sdp: answer.sdp },
        status: "active",
        answered_at: serverTimestamp(),
      });
      callConnectedAtRef.current = Date.now();
      await updateCallHistory(incoming.id, {
        call_status: "active",
        answered_at: serverTimestamp(),
        read: true,
        read_at: serverTimestamp(),
      });
      listenForCandidates(incoming.id, "callerCandidates", peer);
      setIncoming(null);
      callUnsubscribeRef.current = onSnapshot(
        doc(db, "calls", incoming.id),
        (snapshot) => {
          const nextStatus = snapshot.data()?.status;
          if (["declined", "ended"].includes(nextStatus)) {
            const duration = callConnectedAtRef.current
              ? Math.max(
                  1,
                  Math.round((Date.now() - callConnectedAtRef.current) / 1000),
                )
              : 0;
            void updateCallHistory(incoming.id, {
              call_status: nextStatus,
              call_duration_seconds: duration,
              ended_at: serverTimestamp(),
            });
            release();
          }
        },
      );
    } catch {
      release();
      setIncoming(null);
      toast.error("The call could not be answered.");
    }
  };
  const decline = async () => {
    if (incoming) {
      await updateDoc(doc(db, "calls", incoming.id), {
        status: "declined",
        ended_at: serverTimestamp(),
      });
      await updateCallHistory(incoming.id, {
        call_status: "declined",
        ended_at: serverTimestamp(),
        read: true,
        read_at: serverTimestamp(),
      });
    }
    setIncoming(null);
  };
  const hangup = async () => {
    if (activeCallId) {
      const duration = callConnectedAtRef.current
        ? Math.max(
            1,
            Math.round((Date.now() - callConnectedAtRef.current) / 1000),
          )
        : 0;
      await Promise.all([
        updateDoc(doc(db, "calls", activeCallId), {
          status: "ended",
          ended_at: serverTimestamp(),
        }).catch(() => undefined),
        updateCallHistory(activeCallId, {
          call_status: "ended",
          call_duration_seconds: duration,
          ended_at: serverTimestamp(),
        }),
      ]);
    }
    release();
  };
  const toggleMute = () => {
    const next = !muted;
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !next;
    });
    setMuted(next);
  };
  const toggleCamera = () => {
    const next = !cameraOff;
    localStreamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = !next;
    });
    setCameraOff(next);
  };
  const toggleSpeaker = async () => {
    const next = !speakerOn;
    const output = remoteAudioRef.current as
      (HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> }) | null;
    if (next && output?.setSinkId)
      await output.setSinkId("default").catch(() => undefined);
    if (remoteAudioRef.current) remoteAudioRef.current.muted = !next;
    setSpeakerOn(next);
  };

  return (
    <>
      {incoming && (
        <div className="fixed inset-0 z-[180] grid place-items-center bg-black/80 p-4">
          <section className="relative w-full max-w-sm rounded-3xl border border-border bg-card p-7 text-center">
            <button
              aria-label="Ignore call"
              onClick={() => setIncoming(null)}
              className="absolute right-4 top-4 rounded-full p-2 hover:bg-muted"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={recipient.avatar}
              alt=""
              className="mx-auto h-24 w-24 rounded-full object-cover"
            />
            <h2 className="mt-4 text-xl font-bold">{recipient.name}</h2>
            <p className="text-muted-foreground">
              Incoming {incoming.kind} call
            </p>
            <div className="mt-7 flex justify-center gap-6">
              <Button
                aria-label="Reject call"
                size="icon"
                variant="destructive"
                className="h-14 w-14 rounded-full"
                onClick={() => void decline()}
              >
                <PhoneOff />
              </Button>
              <Button
                aria-label="Answer call"
                size="icon"
                className="h-14 w-14 rounded-full bg-green-600 hover:bg-green-500"
                onClick={() => void accept()}
              >
                <Phone />
              </Button>
            </div>
          </section>
        </div>
      )}
      {status !== "idle" && (
        <div className="fixed inset-0 z-[175] flex flex-col bg-[#090909]">
          <div className="relative flex-1 overflow-hidden">
            {kind === "video" ? (
              <>
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                />
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="absolute right-4 top-4 h-44 w-28 rounded-xl border border-white/20 bg-black object-cover sm:h-52 sm:w-36"
                />
              </>
            ) : (
              <div className="grid h-full place-items-center text-center">
                <div>
                  <img
                    src={recipient.avatar}
                    alt=""
                    className="mx-auto h-36 w-36 rounded-full object-cover"
                  />
                  <h2 className="mt-5 text-2xl font-bold text-white">
                    {recipient.name}
                  </h2>
                  <p className="mt-1 text-white/60">
                    {status === "ringing"
                      ? "Ringing…"
                      : status === "active"
                        ? "Voice call"
                        : "Connecting…"}
                  </p>
                </div>
              </div>
            )}
            <audio ref={remoteAudioRef} autoPlay />
            <div className="absolute inset-x-0 bottom-8 flex flex-wrap justify-center gap-4 px-4">
              <Button
                aria-label={muted ? "Unmute microphone" : "Mute microphone"}
                size="icon"
                variant={muted ? "destructive" : "secondary"}
                className="h-14 w-14 rounded-full"
                onClick={toggleMute}
              >
                {muted ? <MicOff /> : <Mic />}
              </Button>
              <Button
                aria-label={speakerOn ? "Turn speaker off" : "Turn speaker on"}
                size="icon"
                variant={speakerOn ? "secondary" : "destructive"}
                className="h-14 w-14 rounded-full"
                onClick={() => void toggleSpeaker()}
              >
                <Volume2 />
              </Button>
              {kind === "video" && (
                <Button
                  aria-label={cameraOff ? "Turn camera on" : "Turn camera off"}
                  size="icon"
                  variant={cameraOff ? "destructive" : "secondary"}
                  className="h-14 w-14 rounded-full"
                  onClick={toggleCamera}
                >
                  {cameraOff ? <VideoOff /> : <Video />}
                </Button>
              )}
              <Button
                aria-label="End call"
                size="icon"
                variant="destructive"
                className="h-14 w-14 rounded-full"
                onClick={() => void hangup()}
              >
                <PhoneOff />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
