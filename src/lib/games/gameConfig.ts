export type GameId = 'release-day' | 'one-more-floor' | 'memory-heist' | 'angry-birds' | 'stack' | 'flappy' | '2048' | 'whack-a-mole';
export type RewardKind = 'images' | 'beats' | 'fullSongs';

export const GAME_CATALOGUE: Array<{ id: GameId; title: string; playable: boolean; difficulty: string; summary: string; colour: string; cover?: string }> = [
  { id: 'release-day', title: 'Release Day Simulator', playable: true, difficulty: 'Strategic', summary: 'Manage six distinct South African release campaigns with real dependencies, budgets and consequences.', colour: 'from-fuchsia-600 to-violet-700', cover: '/assets/games/release-simulator/ui/game-cover.webp' },
  { id: 'flappy', title: 'Flappy Bird', playable: true, difficulty: 'Reflex', summary: 'Guide the MusicInsta mascot through three responsive music worlds.', colour: 'from-pink-500 to-purple-700', cover: '/assets/games/flappy/ui/game-cover.jpg' },
  { id: 'one-more-floor', title: 'One More Floor', playable: false, difficulty: 'Arcade', summary: 'Climb a musical tower one risky floor at a time.', colour: 'from-cyan-600 to-blue-700' },
  { id: 'memory-heist', title: 'Memory Heist', playable: true, difficulty: 'Memory', summary: 'Recover 48 music artefacts across four premium heist chapters.', colour: 'from-fuchsia-600 to-violet-900', cover: '/assets/games/memory-heist/ui/game-cover.png' },
  { id: 'angry-birds', title: 'Angry Birds', playable: false, difficulty: 'Physics', summary: 'A future MusicInsta physics challenge with original characters.', colour: 'from-red-500 to-rose-700' },
  { id: 'stack', title: 'Stack', playable: false, difficulty: 'Timing', summary: 'Place moving blocks; every missed edge is trimmed away.', colour: 'from-emerald-500 to-teal-700' },
  { id: '2048', title: '2048', playable: false, difficulty: 'Puzzle', summary: 'Swipe or use arrow keys to combine music-themed tiles.', colour: 'from-yellow-500 to-amber-700' },
  { id: 'whack-a-mole', title: 'Whack-a-Mole', playable: false, difficulty: 'Reaction', summary: 'Tap studio targets before the beat moves on.', colour: 'from-lime-500 to-green-700' },
];

export const REWARD_MILESTONES: Array<{ points: number; kind: RewardKind; amount: number }> = [
  { points: 1000, kind: 'images', amount: 1 }, { points: 2500, kind: 'images', amount: 1 },
  { points: 4500, kind: 'images', amount: 1 }, { points: 7000, kind: 'beats', amount: 1 },
  { points: 10000, kind: 'fullSongs', amount: 1 }, { points: 14000, kind: 'beats', amount: 1 },
  { points: 20000, kind: 'fullSongs', amount: 1 },
];

export const DAILY_REPEAT_CAP = 300;
export const RELEASE_CAMPAIGNS = ['First Single', 'Campus Launch', 'Independent Hustle', 'Collaboration Release', 'Regional Campaign', 'Release Under Pressure'];
export const MEMORY_LEVELS = Array.from({ length: 12 }, (_, index) => ({ level: index + 1, pairs: index < 3 ? 3 + Math.floor(index / 2) : index < 6 ? 6 : index < 9 ? 8 : 10, preview: Math.max(2.5, 7 - index * .35) }));
const FLAPPY_TARGETS = [15, 20, 30, 40, 50, 60, 70, 80, 90, 100] as const;
export const FLAPPY_LEVELS = FLAPPY_TARGETS.map((target, index) => ({ level: index + 1, target, speed: 145 + index * 5, gap: Math.max(128, 172 - index * 4), spacing: 245 + index * 3 }));

export function nextMilestone(points: number) { return REWARD_MILESTONES.find(item => item.points > points) || null; }
