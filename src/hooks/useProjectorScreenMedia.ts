import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameFormatPhase, GameSettings, PulseKind } from '../types/game';
import { MEME_ASSET_URLS } from '../lib/memeAssetUrls';
import {
  MUSIC_QUESTION_URL,
  SFX_BANK_URL,
  SFX_CORRECT_URL,
  SFX_DUEL_URL,
  SFX_TIMER_FIVE_URL,
  SFX_TIMER_POP_URL,
  SFX_WRONG_URL,
} from '../lib/projectorSoundUrls';

function pickRandomMeme(): string | undefined {
  if (MEME_ASSET_URLS.length === 0) return undefined;
  return MEME_ASSET_URLS[Math.floor(Math.random() * MEME_ASSET_URLS.length)]!;
}

function playOneShot(url: string, volume: number, enabled: boolean) {
  if (!enabled || volume <= 0) return;
  const a = new Audio(url);
  a.volume = Math.min(1, Math.max(0, volume));
  void a.play().catch(() => {
    /* autoplay / decode */
  });
}

export type ProjectorLayout = 'main' | 'kick' | 'duel' | 'leaderboard' | 'award';

export function useProjectorScreenMedia(opts: {
  layout: ProjectorLayout;
  settings: GameSettings;
  showQuestionOnScreen: boolean;
  timerRunning: boolean;
  timerSeconds: number;
  lastPulse: { kind: PulseKind; at: number };
  duelPresentationActive: boolean;
  formatPhase: GameFormatPhase;
  roundTimeExpired: boolean;
}): { memeUrl: string | null } {
  const [memeUrl, setMemeUrl] = useState<string | null>(null);
  const memeClearId = useRef(0);

  const ambientRef = useRef<HTMLAudioElement | null>(null);
  const prevPulseSigRef = useRef('');
  const prevDuelRef = useRef(false);
  const prevTimerSecRef = useRef<number | undefined>(undefined);
  const prevRoundExpiredRef = useRef(false);

  const lastMemeAtRef = useRef(0);

  const {
    layout,
    settings,
    showQuestionOnScreen,
    timerRunning,
    timerSeconds,
    lastPulse,
    duelPresentationActive,
    formatPhase,
    roundTimeExpired,
  } = opts;

  const audioOn = settings.screenAudioEnabled;
  const musicVol = settings.screenMusicVolume;
  const sfxVol = settings.screenSfxVolume;
  const memesOn = settings.screenMemesEnabled;
  const memeChance = settings.memeTriggerChance;
  const memeCdMs = settings.memeCooldownSec * 1000;

  const tryShowMeme = useCallback(() => {
    if (!memesOn || MEME_ASSET_URLS.length === 0) return;
    if (layout !== 'main') return;
    const now = Date.now();
    if (now - lastMemeAtRef.current < memeCdMs) return;
    if (Math.random() > memeChance) return;
    const url = pickRandomMeme();
    if (!url) return;
    lastMemeAtRef.current = now;
    window.clearTimeout(memeClearId.current);
    setMemeUrl(url);
    memeClearId.current = window.setTimeout(() => {
      setMemeUrl(null);
    }, 2800);
  }, [memesOn, layout, memeChance, memeCdMs]);

  useEffect(() => {
    if (layout !== 'main') {
      window.clearTimeout(memeClearId.current);
      setMemeUrl(null);
    }
  }, [layout]);

  useEffect(() => {
    return () => {
      window.clearTimeout(memeClearId.current);
      if (ambientRef.current) {
        ambientRef.current.pause();
        ambientRef.current.src = '';
        ambientRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!audioOn) {
      ambientRef.current?.pause();
      return;
    }
    if (musicVol <= 0) {
      ambientRef.current?.pause();
      return;
    }
    // Не привязываем к timerRunning: музыка есть при открытом вопросе и оставшемся времени,
    // в т.ч. до старта таймера и на паузе (иначе кажется, что «фона нет»).
    const shouldPlay =
      layout === 'main' &&
      !roundTimeExpired &&
      formatPhase !== 'final_duel' &&
      showQuestionOnScreen &&
      timerSeconds > 0;

    if (!shouldPlay) {
      ambientRef.current?.pause();
      return;
    }

    let a = ambientRef.current;
    if (!a) {
      a = new Audio(MUSIC_QUESTION_URL);
      a.loop = true;
      ambientRef.current = a;
    }
    a.volume = Math.min(1, Math.max(0, musicVol));
    void a.play().catch(() => {
      /* autoplay: ждём первый жест */
    });

    const unlock = () => {
      const cur = ambientRef.current;
      if (!cur) return;
      void cur.play().catch(() => {});
    };
    window.addEventListener('pointerdown', unlock, { passive: true });
    return () => window.removeEventListener('pointerdown', unlock);
  }, [
    audioOn,
    layout,
    formatPhase,
    showQuestionOnScreen,
    timerSeconds,
    roundTimeExpired,
    musicVol,
  ]);

  useEffect(() => {
    if (!audioOn || layout !== 'main' || formatPhase === 'final_duel' || formatPhase === 'award') return;
    const prev = prevTimerSecRef.current;
    prevTimerSecRef.current = timerSeconds;
    if (prev === undefined) return;
    if (timerRunning && prev > 5 && timerSeconds === 5) {
      playOneShot(SFX_TIMER_FIVE_URL, sfxVol, audioOn);
    }
  }, [timerSeconds, timerRunning, audioOn, sfxVol, layout, formatPhase]);

  useEffect(() => {
    if (!audioOn) return;
    if (roundTimeExpired && !prevRoundExpiredRef.current) {
      playOneShot(SFX_TIMER_POP_URL, sfxVol, audioOn);
    }
    prevRoundExpiredRef.current = roundTimeExpired;
  }, [roundTimeExpired, audioOn, sfxVol]);

  useEffect(() => {
    const sig = `${lastPulse.at}:${lastPulse.kind ?? ''}`;
    if (prevPulseSigRef.current === sig) return;
    prevPulseSigRef.current = sig;
    const kind = lastPulse.kind;
    if (!kind) return;

    if (audioOn) {
      if (kind === 'correct') playOneShot(SFX_CORRECT_URL, sfxVol, audioOn);
      else if (kind === 'wrong') playOneShot(SFX_WRONG_URL, sfxVol, audioOn);
      else if (kind === 'bank') playOneShot(SFX_BANK_URL, sfxVol, audioOn);
    }

    if (kind === 'correct' || kind === 'wrong' || kind === 'bank') {
      tryShowMeme();
    }
  }, [lastPulse, audioOn, sfxVol, tryShowMeme]);

  useEffect(() => {
    if (duelPresentationActive && !prevDuelRef.current) {
      playOneShot(SFX_DUEL_URL, sfxVol, audioOn);
    }
    prevDuelRef.current = duelPresentationActive;
  }, [duelPresentationActive, audioOn, sfxVol]);

  return { memeUrl };
}
