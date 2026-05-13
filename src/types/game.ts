export type ThemeId = 'dark' | 'light';

export type PulseKind = 'correct' | 'wrong' | 'bank' | null;

export type ScreenFocus = 'question' | 'money';

/** Этапы формата «Слабое звено» (ведущий переключает вручную) */
export type GameFormatPhase = 'team_rounds' | 'merged_queue' | 'pre_final' | 'final_duel' | 'award';

export interface Player {
  id: string;
  name: string;
  /** Цвет участника на экране (#RRGGBB) */
  accent?: string;
}

export interface Team {
  id: string;
  name: string;
  /** HEX цвет команды (#RRGGBB); если нет в сохранении — берётся из палитры */
  accent?: string;
  players: Player[];
  activePlayerIndex: number;
  bankTotal: number;
  /** Количество подряд верных ответов в текущей цепочке (без банка) */
  chainLevel: number;
}

export interface Question {
  id: string;
  text: string;
  correctAnswer: string;
}

export interface GameSettings {
  roundTimeSec: number;
  ladder: number[];
  /** Тема пульта ведущего */
  theme: ThemeId;
  /** Тема сценического экрана (проектор) */
  displayTheme: ThemeId;
  /** Звук и музыка на экране проектора */
  screenAudioEnabled: boolean;
  /** Громкость фоновой музыки во время вопроса (0…1) */
  screenMusicVolume: number;
  /** Громкость коротких эффектов (0…1) */
  screenSfxVolume: number;
  /** Случайные мемы справа на проекторе */
  screenMemesEnabled: boolean;
  /** Вероятность показа мема после верно / ошибка / банк (0…1) */
  memeTriggerChance: number;
  /** Минимум секунд между мемами */
  memeCooldownSec: number;
}

export interface GameSnapshot {
  settings: GameSettings;
  teams: Team[];
  activeTeamIndex: number;
  questions: Question[];
  currentQuestionIndex: number;
  timerSeconds: number;
  timerRunning: boolean;
  /** Абсолютное время окончания таймера (ms); все вкладки считают остаток от него — без «двойной секунды» */
  timerDeadlineMs: number | null;
  /** Голоса «слабое звено»: playerId → число голосов */
  voteCounts: Record<string, number>;
  /** Кого объявили слабым звеном (для экрана) */
  weakestPlayerId: string | null;
  /** Показывать ли на проекторе плашку «слабое звено» */
  showWeakestOnScreen: boolean;
  /** После неверного ответа перейти к следующей команде (иначе — следующий игрок в той же) */
  wrongPassesToNextTeam: boolean;
  /** Верные ответы в текущей «сессии» таблицы лидеров (ошибки не увеличивают счётчик) */
  playerCorrectCounts: Record<string, number>;
  /** На проекторе только таблица лидеров (остальной интерфейс скрыт) */
  showLeaderboardOnScreen: boolean;
  /** Полноэкранное голосование «кто слабое звено» */
  showKickVotingOnScreen: boolean;
  /** Вспышка белого при банке (timestamp ms) */
  bankFlashAt: number;
  /** Режим пенальти на весь экран (кружки зелёный / красный) */
  duelPresentationActive: boolean;
  /** Попадания в серии пенальти (0–5) */
  penaltyGreen: number;
  penaltyRed: number;
  showQuestionOnScreen: boolean;
  screenFocus: ScreenFocus;
  lastPulse: { kind: PulseKind; at: number };
  /** Текущий этап сценария */
  formatPhase: GameFormatPhase;
  /** Победитель на экране награждения */
  championPlayerId: string | null;
  /** Два финалиста для дуэли (пенальти) */
  duelPlayerIds: [string | null, string | null];
  /** Счёт дуэли [игрок A, игрок B] — +1 за верный ответ отвечающего */
  duelScores: [number, number];
  /** Таймер дошёл до нуля — на проекторе «раунд закончен» до сброса/старта */
  roundTimeExpired: boolean;
}
