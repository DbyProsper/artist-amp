import { useCallback, useEffect, useRef, useState } from 'react';

interface BrandRevealProps {
  onComplete: () => void;
  label?: string;
}

const FADE_DURATION_MS = 700;
const SAFETY_TIMEOUT_MS = 30_000;

export function BrandReveal({ onComplete, label = 'Loading MusicInsta Studio…' }: BrandRevealProps) {
  const [isFading, setIsFading] = useState(false);
  const hasFinished = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const safetyTimer = useRef<number>();
  const completionTimer = useRef<number>();

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const finish = useCallback(() => {
    if (hasFinished.current) return;
    hasFinished.current = true;
    setIsFading(true);
    completionTimer.current = window.setTimeout(() => onCompleteRef.current(), FADE_DURATION_MS);
  }, []);

  useEffect(() => {
    safetyTimer.current = window.setTimeout(finish, SAFETY_TIMEOUT_MS);
    return () => {
      if (safetyTimer.current) window.clearTimeout(safetyTimer.current);
      if (completionTimer.current) window.clearTimeout(completionTimer.current);
    };
  }, [finish]);

  return (
    <div
      role="status"
      aria-label={label}
      className={`fixed inset-0 z-[1000] overflow-hidden bg-black transition-opacity ease-out ${isFading ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
      style={{ transitionDuration: `${FADE_DURATION_MS}ms` }}
    >
      <video
        src="/brand-reveal.mp4"
        autoPlay
        muted
        playsInline
        preload="auto"
        disablePictureInPicture
        controls={false}
        onEnded={finish}
        onError={finish}
        onLoadedMetadata={event => {
          if (!Number.isFinite(event.currentTarget.duration)) return;
          if (safetyTimer.current) window.clearTimeout(safetyTimer.current);
          safetyTimer.current = window.setTimeout(finish, Math.ceil(event.currentTarget.duration * 1000) + 3_000);
        }}
        className="absolute inset-0 h-full w-full object-cover"
      />

      <div className="pointer-events-none absolute inset-x-0 bottom-[10%] z-10 flex flex-col items-center gap-2 px-6 text-center text-white/85 drop-shadow-lg sm:bottom-[8%]">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/35 border-t-white" aria-hidden="true" />
        <span className="text-xs font-semibold uppercase tracking-[0.22em] sm:text-sm">{label}</span>
      </div>
    </div>
  );
}
