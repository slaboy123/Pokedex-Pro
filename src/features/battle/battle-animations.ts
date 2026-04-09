import type { BattleMove } from '@/types/battle';

type Side = 'player' | 'enemy';

export interface AnimationState {
  projectile: { id: string; kind: string; from: Side; to: Side } | null;
  hitSide: Side | null;
  shakingSide: Side | null;
  fadingSide: Side | null;
  lungingSide: Side | null;
  camera: { x: number; y: number };
  impactFlash: boolean;
  hitStop: boolean;
}

export interface BattleAnimationController {
  setAnimationState: (updater: (prev: AnimationState) => AnimationState) => void;
  updateDisplayedHp: (side: Side, nextHp: number) => void;
  getDisplayedHp: (side: Side) => number;
}

const rafTween = (durationMs: number, onProgress: (progress: number) => void): Promise<void> => {
  return new Promise((resolve) => {
    const start = performance.now();

    const frame = (time: number): void => {
      const elapsed = time - start;
      const progress = durationMs <= 0 ? 1 : Math.min(1, elapsed / durationMs);
      onProgress(progress);
      if (progress >= 1) {
        resolve();
        return;
      }
      window.requestAnimationFrame(frame);
    };

    window.requestAnimationFrame(frame);
  });
};

const waitMs = (durationMs: number): Promise<void> => rafTween(durationMs, () => undefined);

export const shakeCamera = async (
  intensity: number,
  durationMs: number,
  controller: BattleAnimationController,
): Promise<void> => {
  await rafTween(durationMs, (progress) => {
    const damping = 1 - progress;
    const offsetX = (Math.random() * 2 - 1) * intensity * damping;
    const offsetY = (Math.random() * 2 - 1) * intensity * damping;
    controller.setAnimationState((prev) => ({ ...prev, camera: { x: offsetX, y: offsetY } }));
  });

  controller.setAnimationState((prev) => ({ ...prev, camera: { x: 0, y: 0 } }));
};

export const playAttackAnimation = async (
  attacker: Side,
  target: Side,
  move: BattleMove,
  controller: BattleAnimationController,
): Promise<void> => {
  const id = crypto.randomUUID();

  controller.setAnimationState((prev) => ({
    ...prev,
    projectile: { id, kind: move.type, from: attacker, to: target },
    lungingSide: attacker,
  }));

  await waitMs(130);

  controller.setAnimationState((prev) => ({
    ...prev,
    lungingSide: null,
  }));

  await waitMs(110);

  controller.setAnimationState((prev) => (prev.projectile?.id === id
    ? { ...prev, projectile: null }
    : prev));
};

export const playImpactFrame = async (controller: BattleAnimationController): Promise<void> => {
  controller.setAnimationState((prev) => ({ ...prev, impactFlash: true }));
  await waitMs(50);
  controller.setAnimationState((prev) => ({ ...prev, impactFlash: false }));
};

export const playHitStop = async (durationMs: number, controller: BattleAnimationController): Promise<void> => {
  controller.setAnimationState((prev) => ({ ...prev, hitStop: true }));
  await waitMs(durationMs);
  controller.setAnimationState((prev) => ({ ...prev, hitStop: false }));
};

export const playHitEffect = async (
  target: Side,
  controller: BattleAnimationController,
): Promise<void> => {
  controller.setAnimationState((prev) => ({ ...prev, hitSide: target, shakingSide: target }));
  await waitMs(180);
  controller.setAnimationState((prev) => ({ ...prev, hitSide: null, shakingSide: null }));
};

export const animateHPBar = async (
  side: Side,
  newHP: number,
  controller: BattleAnimationController,
  velocityFactor = 1,
): Promise<void> => {
  const from = controller.getDisplayedHp(side);
  const delta = newHP - from;
  const duration = Math.max(180, Math.min(700, Math.abs(delta) * (9 / Math.max(0.25, velocityFactor))));

  await rafTween(duration, (progress) => {
    const next = Math.round(from + (delta * progress));
    controller.updateDisplayedHp(side, next);
  });
};

export const playSwitchAnimation = async (side: Side, controller: BattleAnimationController): Promise<void> => {
  controller.setAnimationState((prev) => ({ ...prev, fadingSide: side }));
  await waitMs(230);
  controller.setAnimationState((prev) => ({ ...prev, fadingSide: null }));
};
