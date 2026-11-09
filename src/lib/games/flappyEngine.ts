export const FLAPPY_RULESET_VERSION = 'flappy-v2';
export const FLAPPY_WIDTH = 360;
export const FLAPPY_WIDE_WIDTH = 900;
export const FLAPPY_HEIGHT = 560;
export const FLAPPY_STEP = 1 / 120;
export const FLAPPY_TARGETS = [15, 20, 30, 40, 50, 60, 70, 80, 90, 100] as const;

export type FlappyRunStatus = 'ready' | 'playing' | 'paused' | 'failed' | 'completed';
export type FlappyLayout = 'portrait' | 'wide';

export interface FlappyDifficulty {
  speed: number;
  gap: number;
  spacing: number;
  variation: number;
}

export interface FlappyObstacle {
  id: number;
  x: number;
  previousX: number;
  gapCenter: number;
  passed: boolean;
}

export interface FlappyPickup {
  id: number;
  obstacleId: number;
  x: number;
  y: number;
  value: 2 | 4;
  collected: boolean;
}

export interface FlappyRun {
  rulesetVersion: typeof FLAPPY_RULESET_VERSION;
  seed: string;
  level: number;
  layout: FlappyLayout;
  width: number;
  height: number;
  playerX: number;
  status: FlappyRunStatus;
  time: number;
  y: number;
  velocity: number;
  gatesCleared: number;
  baseScore: number;
  bonusScore: number;
  totalRunScore: number;
  obstacles: FlappyObstacle[];
  pickups: FlappyPickup[];
  rngState: number;
  nextId: number;
  lastPickupGate: number;
  flapPulse: number;
  continuesUsed: number;
}

const PLAYER_RADIUS = 14;
const OBSTACLE_WIDTH = 58;
const PICKUP_RADIUS = 13;
const GRAVITY = 760;
const FLAP_IMPULSE = -300;

export function levelTarget(level: number): number {
  return FLAPPY_TARGETS[Math.max(0, Math.min(FLAPPY_TARGETS.length - 1, level - 1))];
}

export function difficultyAt(level: number, gatesCleared: number): FlappyDifficulty {
  const target = levelTarget(level);
  const progress = Math.max(0, Math.min(1, gatesCleared / target));
  const eased = progress * progress * (3 - 2 * progress);
  const levelIndex = Math.max(0, Math.min(9, level - 1));
  const start = { speed: 132 + levelIndex * 3.5, gap: 196 - levelIndex * 2.5, spacing: 270 - levelIndex * 2, variation: 34 + levelIndex * 2 };
  const end = { speed: 184 + levelIndex * 4.8, gap: Math.max(116, 148 - levelIndex * 3.2), spacing: Math.max(218, 238 - levelIndex * 2), variation: 76 + levelIndex * 3 };
  return {
    speed: lerp(start.speed, end.speed, eased),
    gap: lerp(start.gap, end.gap, eased),
    spacing: lerp(start.spacing, end.spacing, eased),
    variation: lerp(start.variation, end.variation, eased),
  };
}

export function createFlappyRun(seed: string, level: number, layout: FlappyLayout = 'portrait'): FlappyRun {
  const width = layout === 'wide' ? FLAPPY_WIDE_WIDTH : FLAPPY_WIDTH;
  const run: FlappyRun = {
    rulesetVersion: FLAPPY_RULESET_VERSION,
    seed,
    level,
    layout,
    width,
    height: FLAPPY_HEIGHT,
    playerX: layout === 'wide' ? 190 : 82,
    status: 'ready',
    time: 0,
    y: 280,
    velocity: 0,
    gatesCleared: 0,
    baseScore: 0,
    bonusScore: 0,
    totalRunScore: 0,
    obstacles: [],
    pickups: [],
    rngState: hashSeed(seed),
    nextId: 1,
    lastPickupGate: -4,
    flapPulse: 0,
    continuesUsed: 0,
  };
  spawnObstacle(run, width + 50, 280);
  return run;
}

export function beginFlappyRun(run: FlappyRun): void {
  run.status = 'playing';
}

export function flapRun(run: FlappyRun): boolean {
  if (run.status !== 'playing') return false;
  run.velocity = FLAP_IMPULSE;
  run.flapPulse = .12;
  return true;
}

export function availableContinues(run: FlappyRun): number {
  if (run.level < 5) return 0;
  return Math.max(0, Math.floor(run.bonusScore / 10) - run.continuesUsed);
}

export function continueFlappyRun(run: FlappyRun): boolean {
  if (run.status !== 'failed' || availableContinues(run) < 1) return false;
  run.continuesUsed += 1;
  run.status = 'paused';
  run.y = run.height / 2;
  run.velocity = 0;
  run.flapPulse = 0;
  run.obstacles = [];
  run.pickups = [];
  spawnObstacle(run, run.width + 80, run.height / 2);
  return true;
}

export function advanceFlappyRun(run: FlappyRun, dt = FLAPPY_STEP): void {
  if (run.status !== 'playing') return;
  const difficulty = difficultyAt(run.level, run.gatesCleared);
  run.time += dt;
  run.flapPulse = Math.max(0, run.flapPulse - dt);
  run.velocity += GRAVITY * dt;
  run.y += run.velocity * dt;

  for (const obstacle of run.obstacles) {
    obstacle.previousX = obstacle.x;
    obstacle.x -= difficulty.speed * dt;
  }
  for (const pickup of run.pickups) pickup.x -= difficulty.speed * dt;

  const last = run.obstacles.at(-1);
  if (!last || last.x < run.width - difficulty.spacing) {
    const previousCenter = last?.gapCenter ?? 280;
    spawnObstacle(run, 410, nextReachableGap(run, previousCenter, difficulty));
  }

  if (run.y - PLAYER_RADIUS <= 0 || run.y + PLAYER_RADIUS >= run.height || collidesWithObstacle(run, difficulty.gap)) {
    run.status = 'failed';
    return;
  }

  for (const pickup of run.pickups) {
    if (pickup.collected) continue;
    const dx = pickup.x - run.playerX;
    const dy = pickup.y - run.y;
    if (dx * dx + dy * dy <= (PLAYER_RADIUS + PICKUP_RADIUS) ** 2) {
      pickup.collected = true;
      run.bonusScore += pickup.value;
      run.totalRunScore = run.baseScore + run.bonusScore;
    }
  }

  for (const obstacle of run.obstacles) {
    if (!obstacle.passed && obstacle.x + OBSTACLE_WIDTH < run.playerX - PLAYER_RADIUS) {
      obstacle.passed = true;
      run.gatesCleared += 1;
      run.baseScore += 1;
      run.totalRunScore = run.baseScore + run.bonusScore;
      if (run.gatesCleared >= levelTarget(run.level)) {
        run.status = 'completed';
        break;
      }
    }
  }

  run.obstacles = run.obstacles.filter(obstacle => obstacle.x > -OBSTACLE_WIDTH - 10);
  run.pickups = run.pickups.filter(pickup => pickup.x > -40 && !pickup.collected);
}

export function mascotTilt(run: FlappyRun): number {
  return Math.max(-24, Math.min(62, run.velocity * .11));
}

function spawnObstacle(run: FlappyRun, x: number, gapCenter: number): void {
  const id = run.nextId++;
  run.obstacles.push({ id, x, previousX: x, gapCenter, passed: false });
  const gateIndex = run.obstacles.length + run.gatesCleared;
  if (gateIndex < 3 || gateIndex - run.lastPickupGate < 2) return;
  const roll = random(run);
  const value: 2 | 4 | 0 = roll < .1 ? 4 : roll < .42 ? 2 : 0;
  if (!value) return;
  const difficulty = difficultyAt(run.level, run.gatesCleared);
  const safeOffset = Math.max(18, difficulty.gap * (value === 4 ? .29 : .18));
  const direction = random(run) < .5 ? -1 : 1;
  const minY = gapCenter - difficulty.gap / 2 + PLAYER_RADIUS + PICKUP_RADIUS + 5;
  const maxY = gapCenter + difficulty.gap / 2 - PLAYER_RADIUS - PICKUP_RADIUS - 5;
  const y = Math.max(minY, Math.min(maxY, gapCenter + direction * safeOffset));
  run.pickups.push({ id: run.nextId++, obstacleId: id, x: x + 18, y, value, collected: false });
  run.lastPickupGate = gateIndex;
}

function nextReachableGap(run: FlappyRun, previous: number, difficulty: FlappyDifficulty): number {
  const reactionSeconds = difficulty.spacing / difficulty.speed;
  const physicsBound = Math.min(difficulty.variation, 42 + reactionSeconds * 28);
  const delta = (random(run) * 2 - 1) * physicsBound;
  const margin = difficulty.gap / 2 + 42;
  const candidate = Math.max(margin, Math.min(run.height - margin, previous + delta));
  return Number.isFinite(candidate) ? candidate : 280;
}

function collidesWithObstacle(run: FlappyRun, gap: number): boolean {
  return run.obstacles.some(obstacle => {
    const horizontal = run.playerX + PLAYER_RADIUS > obstacle.x && run.playerX - PLAYER_RADIUS < obstacle.x + OBSTACLE_WIDTH;
    if (!horizontal) return false;
    return run.y - PLAYER_RADIUS < obstacle.gapCenter - gap / 2 || run.y + PLAYER_RADIUS > obstacle.gapCenter + gap / 2;
  });
}

function random(run: FlappyRun): number {
  let x = run.rngState >>> 0;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  run.rngState = x >>> 0;
  return run.rngState / 4294967296;
}

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0 || 1;
}

function lerp(start: number, end: number, amount: number): number {
  return start + (end - start) * amount;
}
