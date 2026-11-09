import { describe, expect, it } from "vitest";
import {
  advanceFlappyRun,
  availableContinues,
  beginFlappyRun,
  continueFlappyRun,
  createFlappyRun,
  difficultyAt,
  FLAPPY_STEP,
  FLAPPY_TARGETS,
  levelTarget,
} from "@/lib/games/flappyEngine";

describe("Flappy v3 deterministic engine", () => {
  it("uses the 15–100 gate progression", () => {
    expect([...FLAPPY_TARGETS]).toEqual([
      15, 20, 30, 40, 50, 60, 70, 80, 90, 100,
    ]);
    expect(levelTarget(1)).toBe(15);
    expect(levelTarget(10)).toBe(100);
  });

  it("raises difficulty smoothly within a level while preserving playable bounds", () => {
    const start = difficultyAt(10, 0);
    const middle = difficultyAt(10, 50);
    const end = difficultyAt(10, 100);
    expect(start.speed).toBeLessThan(middle.speed);
    expect(middle.speed).toBeLessThan(end.speed);
    expect(start.gap).toBeGreaterThan(middle.gap);
    expect(middle.gap).toBeGreaterThan(end.gap);
    expect(end.gap).toBeGreaterThanOrEqual(116);
  });

  it("produces identical worlds from the same seed", () => {
    const first = createFlappyRun("verified-seed", 4);
    const second = createFlappyRun("verified-seed", 4);
    beginFlappyRun(first);
    beginFlappyRun(second);
    for (let index = 0; index < 20; index += 1) {
      advanceFlappyRun(first, FLAPPY_STEP);
      advanceFlappyRun(second, FLAPPY_STEP);
    }
    expect(first).toEqual(second);
  });

  it("spawns only one new obstacle when the wide frame reaches its spacing threshold", () => {
    const run = createFlappyRun("wide-spacing-seed", 1, "wide");
    const difficulty = difficultyAt(run.level, run.gatesCleared);
    run.obstacles[0].x = run.width - difficulty.spacing - 1;
    run.obstacles[0].previousX = run.obstacles[0].x;
    beginFlappyRun(run);

    advanceFlappyRun(run, FLAPPY_STEP);
    expect(run.obstacles).toHaveLength(2);
    expect(run.obstacles[1].x).toBe(run.width + 50);

    advanceFlappyRun(run, FLAPPY_STEP);
    expect(run.obstacles).toHaveLength(2);
  });

  it("collects a bonus only once without advancing gate progress", () => {
    const run = createFlappyRun("pickup-seed", 1);
    run.obstacles = [];
    run.pickups = [
      { id: 90, obstacleId: 1, x: 82, y: 280, value: 4, collected: false },
    ];
    beginFlappyRun(run);
    advanceFlappyRun(run, FLAPPY_STEP);
    expect(run.gatesCleared).toBe(0);
    expect(run.bonusScore).toBe(4);
    advanceFlappyRun(run, FLAPPY_STEP);
    expect(run.bonusScore).toBe(4);
  });

  it("completes and freezes immediately after the final required gate", () => {
    const run = createFlappyRun("completion-seed", 1);
    run.gatesCleared = levelTarget(1) - 1;
    run.baseScore = run.gatesCleared;
    run.totalRunScore = run.baseScore;
    run.obstacles = [
      { id: 1, x: 9, previousX: 9, gapCenter: 280, passed: false },
    ];
    beginFlappyRun(run);
    advanceFlappyRun(run, FLAPPY_STEP);
    expect(run.status).toBe("completed");
    expect(run.gatesCleared).toBe(15);
    const frozen = { y: run.y, score: run.totalRunScore, time: run.time };
    advanceFlappyRun(run, FLAPPY_STEP);
    expect({ y: run.y, score: run.totalRunScore, time: run.time }).toEqual(
      frozen,
    );
  });

  it("earns one score-preserving continuation per 10 bonus points from level 5", () => {
    const run = createFlappyRun("continue-seed", 5, "wide");
    run.gatesCleared = 17;
    run.baseScore = 17;
    run.bonusScore = 24;
    run.totalRunScore = 41;
    run.status = "failed";
    expect(availableContinues(run)).toBe(2);
    expect(continueFlappyRun(run)).toBe(true);
    expect(run.status).toBe("paused");
    expect(run.gatesCleared).toBe(17);
    expect(run.totalRunScore).toBe(41);
    expect(availableContinues(run)).toBe(1);
  });
});
