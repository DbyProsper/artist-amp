export interface TimedLyricLine {
  text: string;
  startTime: number;
  endTime: number;
}

function parseAuthoredLine(line: string): TimedLyricLine | null {
  const clock = line.match(/^\[\s*(\d{1,3}):(\d{1,2}(?:\.\d+)?)\s*\]\s*(.*)$/);
  if (clock) {
    return {
      text: clock[3],
      startTime: Number(clock[1]) * 60 + Number(clock[2]),
      endTime: 0,
    };
  }

  // Lyria emits lyric ranges in seconds, for example: "[0,1] Then the line".
  const range = line.match(/^\[\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*\]\s*(.*)$/);
  if (!range) return null;
  const startTime = Number(range[1]);
  const suppliedEnd = Number(range[2]);
  return {
    text: range[3],
    startTime,
    endTime: suppliedEnd > startTime ? suppliedEnd : 0,
  };
}

export function hasAuthoredTimestamps(lyrics: string): boolean {
  return lyrics.split(/\r?\n/).some(line => Boolean(parseAuthoredLine(line.trim())));
}

export function buildTimedLyrics(lyrics: string, duration: number, authoredStart?: number): TimedLyricLine[] {
  const lines = lyrics.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const authored = lines.map(parseAuthoredLine).filter((line): line is TimedLyricLine => Boolean(line?.text));

  if (authored.length) {
    return authored.map((line, index) => ({
      ...line,
      endTime: line.endTime > line.startTime
        ? line.endTime
        : authored[index + 1]?.startTime ?? Math.max(duration, line.startTime + 3),
    }));
  }

  const intro = authoredStart ?? (duration > 0 ? Math.min(18, Math.max(6, duration * .075)) : 0);
  const singingEnd = duration > 0 ? Math.max(intro + 1, duration * .92) : intro + lines.length * 3;
  const weights = lines.map(line => {
    const isSection = /^\s*[[(](verse|chorus|hook|bridge|intro|outro|pre.?chorus|refrain|instrumental)[^\])]*[\])]\s*$/i.test(line);
    return isSection ? .65 : Math.max(1.25, line.split(/\s+/).filter(Boolean).length * .42);
  });
  const totalWeight = weights.reduce((sum, value) => sum + value, 0) || 1;
  const available = Math.max(1, singingEnd - intro);
  let cursor = intro;
  return lines.map((text, index) => {
    const startTime = cursor;
    cursor += (weights[index] / totalWeight) * available;
    return { text, startTime, endTime: index === lines.length - 1 ? singingEnd : cursor };
  });
}
