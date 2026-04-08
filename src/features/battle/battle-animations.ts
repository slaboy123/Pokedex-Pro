import type { BattleMove } from '@/types/battle';

type Side = 'player' | 'enemy';

export interface AnimationState {
  projectile: { id: string; kind: string; from: Side; to: Side } | null;
  hitSide: Side | null;
  shakingSide: Side | null;
  fadingSide: Side | null;
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
      const progress = Math.min(1, elapsed / durationMs);
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

export const playAttackAnimation = async (attacker: Side, target: Side, move: BattleMove, controller: BattleAnimationController): Promise<void> => {
  const id = crypto.randomUUID();
  controller.setAnimationState((prev) => ({
    ...prev,
    projectile: { id, kind: move.type, from: attacker, to: target },
  }));

  await rafTween(260, () => undefined);

  controller.setAnimationState((prev) => (prev.projectile?.id === id
    ? { ...prev, projectile: null }
    : prev));
};

export const playHitEffect = async (target: Side, controller: BattleAnimationController): Promise<void> => {
  controller.setAnimationState((prev) => ({ ...prev, hitSide: target }));
  await rafTween(180, () => undefined);
  controller.setAnimationState((prev) => ({ ...prev, hitSide: null }));
};

export const shakeSprite = async (target: Side, controller: BattleAnimationController): Promise<void> => {
  controller.setAnimationState((prev) => ({ ...prev, shakingSide: target }));
  await rafTween(220, () => undefined);
  controller.setAnimationState((prev) => ({ ...prev, shakingSide: null }));
};

export const animateHPBar = async (side: Side, newHP: number, controller: BattleAnimationController): Promise<void> => {
  const from = controller.getDisplayedHp(side);
  const delta = newHP - from;

  await rafTween(420, (progress) => {
    const next = Math.round(from + (delta * progress));
    controller.updateDisplayedHp(side, next);
  });
};

export const playSwitchAnimation = async (side: Side, controller: BattleAnimationController): Promise<void> => {
  controller.setAnimationState((prev) => ({ ...prev, fadingSide: side }));
  await rafTween(240, () => undefined);
  controller.setAnimationState((prev) => ({ ...prev, fadingSide: null }));
};
