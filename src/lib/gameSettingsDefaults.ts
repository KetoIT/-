import type { GameSettings } from '../types/game';

/** Дефолты для полей, которых не было в старых сохранениях */
export function normalizeGameSettings(s: GameSettings): GameSettings {
  return {
    ...s,
    screenAudioEnabled: s.screenAudioEnabled ?? true,
    screenMusicVolume: clamp01(s.screenMusicVolume ?? 0.22),
    screenSfxVolume: clamp01(s.screenSfxVolume ?? 0.55),
    screenMemesEnabled: s.screenMemesEnabled ?? true,
    memeTriggerChance: clamp01(s.memeTriggerChance ?? 0.065),
    memeCooldownSec: Math.max(12, Math.min(600, s.memeCooldownSec ?? 48)),
  };
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}
