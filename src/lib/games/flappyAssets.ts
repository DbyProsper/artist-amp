export type FlappyEnvironmentId = 'cosmic-groove' | 'neon-studio' | 'jozi-skyline';

export interface FlappyEnvironmentAsset {
  id: FlappyEnvironmentId;
  name: string;
  description: string;
  accent: string;
  preview: string;
  background: { far: string; mid: string; near: string; width: 360; height: 560 };
  obstacles: {
    top: { src: string; width: 160; height: 480; anchorX: .5; anchorY: 1; collisionInset: 9 };
    bottom: { src: string; width: 160; height: 480; anchorX: .5; anchorY: 0; collisionInset: 9 };
  };
}

const ROOT = '/assets/games/flappy';

export const FLAPPY_BRAND = {
  logo: `${ROOT}/brand/musicinsta-logo.png`,
  symbol: `${ROOT}/brand/musicinsta-symbol.png`,
  mascot: {
    idle: `${ROOT}/character/mascot-idle.png`,
    flap: `${ROOT}/character/mascot-flap.png`,
    fall: `${ROOT}/character/mascot-fall.png`,
    width: 192,
    height: 192,
    anchorX: .5,
    anchorY: .5,
    collisionRadius: 14,
  },
  pickups: {
    note2: `${ROOT}/pickups/note-plus-2.svg`,
    note4: `${ROOT}/pickups/double-note-plus-4.svg`,
  },
  effects: {
    partyPopper: `${ROOT}/effects/party-popper.svg`,
    sparkle: `${ROOT}/effects/sparkle.svg`,
  },
  cover: `${ROOT}/ui/game-cover.jpg`,
} as const;

export const FLAPPY_ENVIRONMENTS: Record<FlappyEnvironmentId, FlappyEnvironmentAsset> = {
  'cosmic-groove': environment('cosmic-groove', 'Cosmic Groove', 'Ringed planets, crystals and orbital speakers.', '#c456ff'),
  'neon-studio': environment('neon-studio', 'Neon Studio', 'A futuristic production room with equaliser towers.', '#ff4fb8'),
  'jozi-skyline': environment('jozi-skyline', 'Jozi Skyline', 'A warm Johannesburg-inspired skyline at sunset.', '#ff9d4d'),
};

function environment(id: FlappyEnvironmentId, name: string, description: string, accent: string): FlappyEnvironmentAsset {
  const base = `${ROOT}/environments/${id}`;
  return {
    id, name, description, accent, preview: `${base}/preview.jpg`,
    background: { far: `${base}/background-far.jpg`, mid: `${base}/background-mid.svg`, near: `${base}/background-near.svg`, width: 360, height: 560 },
    obstacles: {
      top: { src: `${base}/obstacle-top.png`, width: 160, height: 480, anchorX: .5, anchorY: 1, collisionInset: 9 },
      bottom: { src: `${base}/obstacle-bottom.png`, width: 160, height: 480, anchorX: .5, anchorY: 0, collisionInset: 9 },
    },
  };
}

export interface LoadedFlappyAssets {
  far: HTMLImageElement;
  mid: HTMLImageElement;
  near: HTMLImageElement;
  obstacleTop: HTMLImageElement;
  obstacleBottom: HTMLImageElement;
  mascotIdle: HTMLImageElement;
  mascotFlap: HTMLImageElement;
  mascotFall: HTMLImageElement;
  note2: HTMLImageElement;
  note4: HTMLImageElement;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load ${src}`));
    image.src = src;
  });
}

export async function loadFlappyAssets(environmentId: FlappyEnvironmentId): Promise<LoadedFlappyAssets> {
  const environmentAsset = FLAPPY_ENVIRONMENTS[environmentId];
  const [far, mid, near, obstacleTop, obstacleBottom, mascotIdle, mascotFlap, mascotFall, note2, note4] = await Promise.all([
    loadImage(environmentAsset.background.far), loadImage(environmentAsset.background.mid), loadImage(environmentAsset.background.near),
    loadImage(environmentAsset.obstacles.top.src), loadImage(environmentAsset.obstacles.bottom.src),
    loadImage(FLAPPY_BRAND.mascot.idle), loadImage(FLAPPY_BRAND.mascot.flap), loadImage(FLAPPY_BRAND.mascot.fall),
    loadImage(FLAPPY_BRAND.pickups.note2), loadImage(FLAPPY_BRAND.pickups.note4),
  ]);
  return { far, mid, near, obstacleTop, obstacleBottom, mascotIdle, mascotFlap, mascotFall, note2, note4 };
}
