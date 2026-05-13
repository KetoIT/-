import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GameFormatPhase, GameSettings, GameSnapshot, PulseKind, Question, Team } from '../types/game';
import { normalizeGameSettings } from '../lib/gameSettingsDefaults';
import { accentForIndex } from '../lib/teamColors';
import { openSyncChannel, postSnapshot } from '../lib/sync';

const defaultLadder = [20, 50, 100, 200, 300, 450, 600, 800, 1000];

function uid(): string {
  return crypto.randomUUID();
}

function initialTeams(): Team[] {
  const teamId = uid();
  return [
    {
      id: teamId,
      name: 'Участники',
      accent: '#52525b',
      players: [
        { id: uid(), name: 'Игрок 1', accent: accentForIndex(0) },
        { id: uid(), name: 'Игрок 2', accent: accentForIndex(1) },
        { id: uid(), name: 'Игрок 3', accent: accentForIndex(2) },
      ],
      activePlayerIndex: 0,
      bankTotal: 0,
      chainLevel: 0,
    },
  ];
}

function initialQuestions(): Question[] {
  return [
    {
      id: uid(),
      text: 'Столица Франции?',
      correctAnswer: 'Париж',
    },
    {
      id: uid(),
      text: '2 + 2 × 2 = ?',
      correctAnswer: '6',
    },
  ];
}

const initialSnapshot: GameSnapshot = {
  settings: {
    roundTimeSec: 120,
    ladder: [...defaultLadder],
    theme: 'dark',
    displayTheme: 'light',
    screenAudioEnabled: true,
    screenMusicVolume: 0.22,
    screenSfxVolume: 0.55,
    screenMemesEnabled: true,
    memeTriggerChance: 0.065,
    memeCooldownSec: 48,
  },
  teams: initialTeams(),
  activeTeamIndex: 0,
  questions: initialQuestions(),
  currentQuestionIndex: 0,
  timerSeconds: 120,
  timerRunning: false,
  timerDeadlineMs: null,
  voteCounts: {},
  weakestPlayerId: null,
  showWeakestOnScreen: true,
  wrongPassesToNextTeam: false,
  playerCorrectCounts: {},
  showLeaderboardOnScreen: false,
  showKickVotingOnScreen: false,
  bankFlashAt: 0,
  duelPresentationActive: false,
  penaltyGreen: 0,
  penaltyRed: 0,
  showQuestionOnScreen: true,
  screenFocus: 'question',
  lastPulse: { kind: null, at: 0 },
  formatPhase: 'team_rounds',
  championPlayerId: null,
  duelPlayerIds: [null, null],
  duelScores: [0, 0],
  roundTimeExpired: false,
};

const bc = openSyncChannel();
let applyingRemote = false;
let broadcastScheduled = false;

function scheduleBroadcast(get: () => GameStore) {
  if (applyingRemote) return;
  if (broadcastScheduled) return;
  broadcastScheduled = true;
  queueMicrotask(() => {
    broadcastScheduled = false;
    const snap = get().toSnapshot();
    postSnapshot(bc, snap);
  });
}

export type GameStore = GameSnapshot & {
  toSnapshot: () => GameSnapshot;
  applySnapshot: (s: GameSnapshot) => void;
  setSettings: (p: Partial<GameSettings>) => void;
  setActiveTeam: (index: number) => void;
  addTeam: () => void;
  removeTeam: (id: string) => void;
  updateTeamName: (id: string, name: string) => void;
  updateTeamAccent: (id: string, accent: string) => void;
  reorderTeams: (from: number, to: number) => void;
  reorderPlayersInTeam: (teamId: string, from: number, to: number) => void;
  updatePlayerAccent: (teamId: string, playerId: string, accent: string) => void;
  addPlayer: (teamId: string) => void;
  removePlayer: (teamId: string, playerId: string) => void;
  updatePlayerName: (teamId: string, playerId: string, name: string) => void;
  setActivePlayer: (teamId: string, index: number) => void;
  nextPlayerInCircle: () => void;
  setQuestions: (q: Question[]) => void;
  reorderQuestions: (from: number, to: number) => void;
  shuffleQuestions: () => void;
  addQuestion: () => void;
  updateQuestion: (id: string, patch: Partial<Pick<Question, 'text' | 'correctAnswer'>>) => void;
  removeQuestion: (id: string) => void;
  setCurrentQuestionIndex: (i: number) => void;
  setShowQuestionOnScreen: (v: boolean) => void;
  setShowWeakestOnScreen: (v: boolean) => void;
  setWrongPassesToNextTeam: (v: boolean) => void;
  setScreenFocus: (f: GameSnapshot['screenFocus']) => void;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  tickTimer: () => void;
  markCorrect: () => void;
  markWrong: () => void;
  markBank: () => void;
  addVoteForPlayer: (playerId: string) => void;
  resetVotes: () => void;
  declareWeakestFromVotes: () => void;
  setWeakestPlayer: (playerId: string | null) => void;
  setShowLeaderboardOnScreen: (v: boolean) => void;
  resetAnswerStats: () => void;
  /** Скрыть таблицу на экране и обнулить счётчики (без удаления игрока) */
  dismissLeaderboard: () => void;
  /** Удалить слабое звено из состава, сбросить голоса/счётчики/плашки и скрыть таблицу */
  completeKickRound: () => void;
  replaceQuestions: (questions: Question[]) => void;
  appendQuestions: (questions: Question[]) => void;
  clearAllQuestions: () => void;
  setFormatPhase: (phase: GameSnapshot['formatPhase']) => void;
  mergeIntoSingleQueue: () => void;
  setDuelPlayer: (slot: 0 | 1, playerId: string | null) => void;
  resetDuelScores: () => void;
  setChampionPlayerId: (playerId: string | null) => void;
  setShowKickVotingOnScreen: (v: boolean) => void;
  setDuelPresentationActive: (v: boolean) => void;
  penaltyGreenHit: () => void;
  penaltyRedHit: () => void;
  resetPenaltyScores: () => void;
};

function clampTeamIndex(teams: Team[], i: number): number {
  if (teams.length === 0) return 0;
  return Math.max(0, Math.min(i, teams.length - 1));
}

function nextQuestionIndex(s: GameSnapshot): number {
  if (s.questions.length === 0) return 0;
  return (s.currentQuestionIndex + 1) % s.questions.length;
}

function removePlayerIdFromTeams(teams: Team[], kickId: string): Team[] {
  return teams.map((t) => {
    const players = t.players.filter((p) => p.id !== kickId);
    const activePlayerIndex = Math.min(t.activePlayerIndex, Math.max(0, players.length - 1));
    return { ...t, players, activePlayerIndex };
  });
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...initialSnapshot,

      toSnapshot: (): GameSnapshot => {
        const s = get();
        return {
          settings: normalizeGameSettings(s.settings),
          teams: s.teams,
          activeTeamIndex: s.activeTeamIndex,
          questions: s.questions,
          currentQuestionIndex: s.currentQuestionIndex,
          timerSeconds: s.timerSeconds,
          timerRunning: s.timerRunning,
          timerDeadlineMs: s.timerDeadlineMs,
          voteCounts: s.voteCounts,
          weakestPlayerId: s.weakestPlayerId,
          showWeakestOnScreen: s.showWeakestOnScreen,
          wrongPassesToNextTeam: s.wrongPassesToNextTeam,
          playerCorrectCounts: s.playerCorrectCounts,
          showLeaderboardOnScreen: s.showLeaderboardOnScreen,
          showKickVotingOnScreen: s.showKickVotingOnScreen,
          bankFlashAt: s.bankFlashAt,
          duelPresentationActive: s.duelPresentationActive,
          penaltyGreen: s.penaltyGreen,
          penaltyRed: s.penaltyRed,
          showQuestionOnScreen: s.showQuestionOnScreen,
          screenFocus: s.screenFocus,
          lastPulse: s.lastPulse,
          formatPhase: s.formatPhase,
          championPlayerId: s.championPlayerId,
          duelPlayerIds: s.duelPlayerIds,
          duelScores: s.duelScores,
          roundTimeExpired: s.roundTimeExpired,
        };
      },

      applySnapshot: (snap) => {
        applyingRemote = true;
        const displayTheme = snap.settings.displayTheme ?? snap.settings.theme ?? 'light';
        set({
          ...snap,
          settings: normalizeGameSettings({ ...snap.settings, displayTheme } as GameSettings),
          timerDeadlineMs: snap.timerDeadlineMs ?? null,
          voteCounts: snap.voteCounts ?? {},
          weakestPlayerId: snap.weakestPlayerId ?? null,
          showWeakestOnScreen: snap.showWeakestOnScreen ?? true,
          wrongPassesToNextTeam: snap.wrongPassesToNextTeam ?? false,
          playerCorrectCounts: snap.playerCorrectCounts ?? {},
          showLeaderboardOnScreen: snap.showLeaderboardOnScreen ?? false,
          showKickVotingOnScreen: snap.showKickVotingOnScreen ?? false,
          bankFlashAt: snap.bankFlashAt ?? 0,
          duelPresentationActive: snap.duelPresentationActive ?? false,
          penaltyGreen: snap.penaltyGreen ?? 0,
          penaltyRed: snap.penaltyRed ?? 0,
          formatPhase: snap.formatPhase ?? 'team_rounds',
          championPlayerId: snap.championPlayerId ?? null,
          duelPlayerIds: snap.duelPlayerIds ?? [null, null],
          duelScores: snap.duelScores ?? [0, 0],
          roundTimeExpired: snap.roundTimeExpired ?? false,
        });
        applyingRemote = false;
      },

      setSettings: (p) => {
        set((s) => ({
          settings: normalizeGameSettings({ ...s.settings, ...p } as GameSettings),
          timerSeconds:
            p.roundTimeSec !== undefined && !s.timerRunning ? p.roundTimeSec : s.timerSeconds,
        }));
        scheduleBroadcast(get);
      },

      setActiveTeam: (index) => {
        set((s) => ({ activeTeamIndex: clampTeamIndex(s.teams, index) }));
        scheduleBroadcast(get);
      },

      addTeam: () => {
        set((s) => ({
          teams: [
            ...s.teams,
            {
              id: uid(),
              name: `Команда ${String.fromCharCode(65 + s.teams.length)}`,
              accent: accentForIndex(s.teams.length),
              players: [{ id: uid(), name: 'Игрок 1', accent: accentForIndex(0) }],
              activePlayerIndex: 0,
              bankTotal: 0,
              chainLevel: 0,
            },
          ],
        }));
        scheduleBroadcast(get);
      },

      removeTeam: (id) => {
        set((s) => {
          const teams = s.teams.filter((t) => t.id !== id);
          return {
            teams,
            activeTeamIndex: clampTeamIndex(teams, s.activeTeamIndex),
          };
        });
        scheduleBroadcast(get);
      },

      updateTeamName: (id, name) => {
        set((s) => ({
          teams: s.teams.map((t) => (t.id === id ? { ...t, name } : t)),
        }));
        scheduleBroadcast(get);
      },

      updateTeamAccent: (id, accent) => {
        const hex = accent.trim();
        if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return;
        set((s) => ({
          teams: s.teams.map((t) => (t.id === id ? { ...t, accent: hex } : t)),
        }));
        scheduleBroadcast(get);
      },

      reorderTeams: (from, to) => {
        set((s) => {
          const arr = [...s.teams];
          const [item] = arr.splice(from, 1);
          arr.splice(to, 0, item);
          let activeTeamIndex = s.activeTeamIndex;
          if (from === s.activeTeamIndex) activeTeamIndex = to;
          else if (from < s.activeTeamIndex && to >= s.activeTeamIndex) activeTeamIndex--;
          else if (from > s.activeTeamIndex && to <= s.activeTeamIndex) activeTeamIndex++;
          return { teams: arr, activeTeamIndex: clampTeamIndex(arr, activeTeamIndex) };
        });
        scheduleBroadcast(get);
      },

      reorderPlayersInTeam: (teamId, from, to) => {
        set((s) => ({
          teams: s.teams.map((t) => {
            if (t.id !== teamId) return t;
            const arr = [...t.players];
            const [item] = arr.splice(from, 1);
            arr.splice(to, 0, item);
            let activePlayerIndex = t.activePlayerIndex;
            if (from === t.activePlayerIndex) activePlayerIndex = to;
            else if (from < t.activePlayerIndex && to >= t.activePlayerIndex) activePlayerIndex--;
            else if (from > t.activePlayerIndex && to <= t.activePlayerIndex) activePlayerIndex++;
            return {
              ...t,
              players: arr,
              activePlayerIndex: Math.max(0, Math.min(activePlayerIndex, arr.length - 1)),
            };
          }),
        }));
        scheduleBroadcast(get);
      },

      updatePlayerAccent: (teamId, playerId, accent) => {
        const hex = accent.trim();
        if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return;
        set((s) => ({
          teams: s.teams.map((t) =>
            t.id !== teamId
              ? t
              : {
                  ...t,
                  players: t.players.map((p) => (p.id === playerId ? { ...p, accent: hex } : p)),
                },
          ),
        }));
        scheduleBroadcast(get);
      },

      addPlayer: (teamId) => {
        set((s) => ({
          teams: s.teams.map((t) =>
            t.id === teamId
              ? {
                  ...t,
                  players: [
                    ...t.players,
                    { id: uid(), name: `Игрок ${t.players.length + 1}`, accent: accentForIndex(t.players.length) },
                  ],
                }
              : t,
          ),
        }));
        scheduleBroadcast(get);
      },

      removePlayer: (teamId, playerId) => {
        set((s) => {
          const teams = s.teams.map((t) => {
            if (t.id !== teamId) return t;
            const players = t.players.filter((p) => p.id !== playerId);
            const activePlayerIndex = Math.min(t.activePlayerIndex, Math.max(0, players.length - 1));
            return { ...t, players, activePlayerIndex };
          });
          let duelPlayerIds = s.duelPlayerIds;
          let duelScores = s.duelScores;
          if (duelPlayerIds[0] === playerId || duelPlayerIds[1] === playerId) {
            duelPlayerIds = [
              duelPlayerIds[0] === playerId ? null : duelPlayerIds[0],
              duelPlayerIds[1] === playerId ? null : duelPlayerIds[1],
            ];
            duelScores = [0, 0];
          }
          return {
            teams,
            duelPlayerIds,
            duelScores,
            championPlayerId: s.championPlayerId === playerId ? null : s.championPlayerId,
            weakestPlayerId: s.weakestPlayerId === playerId ? null : s.weakestPlayerId,
          };
        });
        scheduleBroadcast(get);
      },

      updatePlayerName: (teamId, playerId, name) => {
        set((s) => ({
          teams: s.teams.map((t) =>
            t.id !== teamId
              ? t
              : {
                  ...t,
                  players: t.players.map((p) => (p.id === playerId ? { ...p, name } : p)),
                },
          ),
        }));
        scheduleBroadcast(get);
      },

      setActivePlayer: (teamId, index) => {
        set((s) => ({
          teams: s.teams.map((t) => {
            if (t.id !== teamId) return t;
            const i = Math.max(0, Math.min(index, t.players.length - 1));
            return { ...t, activePlayerIndex: i };
          }),
        }));
        scheduleBroadcast(get);
      },

      nextPlayerInCircle: () => {
        set((s) => {
          const t = s.teams[s.activeTeamIndex];
          if (!t || t.players.length === 0) return s;
          const next = (t.activePlayerIndex + 1) % t.players.length;
          return {
            teams: s.teams.map((x) => (x.id === t.id ? { ...x, activePlayerIndex: next } : x)),
          };
        });
        scheduleBroadcast(get);
      },

      setQuestions: (questions) => {
        set({ questions });
        scheduleBroadcast(get);
      },

      reorderQuestions: (from, to) => {
        set((s) => {
          const arr = [...s.questions];
          const [item] = arr.splice(from, 1);
          arr.splice(to, 0, item);
          let currentQuestionIndex = s.currentQuestionIndex;
          if (from === s.currentQuestionIndex) currentQuestionIndex = to;
          else if (from < s.currentQuestionIndex && to >= s.currentQuestionIndex) currentQuestionIndex--;
          else if (from > s.currentQuestionIndex && to <= s.currentQuestionIndex) currentQuestionIndex++;
          return { questions: arr, currentQuestionIndex };
        });
        scheduleBroadcast(get);
      },

      shuffleQuestions: () => {
        set((s) => {
          if (s.questions.length < 2) return s;
          const arr = [...s.questions];
          for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j]!, arr[i]!];
          }
          const curId = s.questions[s.currentQuestionIndex]?.id;
          const newIdx = curId ? arr.findIndex((q) => q.id === curId) : 0;
          return {
            questions: arr,
            currentQuestionIndex: Math.max(0, newIdx),
          };
        });
        scheduleBroadcast(get);
      },

      addQuestion: () => {
        set((s) => ({
          questions: [...s.questions, { id: uid(), text: 'Новый вопрос', correctAnswer: '' }],
          currentQuestionIndex: s.questions.length,
        }));
        scheduleBroadcast(get);
      },

      updateQuestion: (id, patch) => {
        set((s) => ({
          questions: s.questions.map((q) => (q.id === id ? { ...q, ...patch } : q)),
        }));
        scheduleBroadcast(get);
      },

      removeQuestion: (id) => {
        set((s) => {
          const questions = s.questions.filter((q) => q.id !== id);
          const currentQuestionIndex = Math.min(s.currentQuestionIndex, Math.max(0, questions.length - 1));
          return { questions, currentQuestionIndex };
        });
        scheduleBroadcast(get);
      },

      setCurrentQuestionIndex: (i) => {
        set((s) => ({
          currentQuestionIndex: Math.max(0, Math.min(i, Math.max(0, s.questions.length - 1))),
        }));
        scheduleBroadcast(get);
      },

      setShowQuestionOnScreen: (v) => {
        set({ showQuestionOnScreen: v });
        scheduleBroadcast(get);
      },

      setShowWeakestOnScreen: (v) => {
        set({ showWeakestOnScreen: v });
        scheduleBroadcast(get);
      },

      setWrongPassesToNextTeam: (v) => {
        set({ wrongPassesToNextTeam: v });
        scheduleBroadcast(get);
      },

      setShowLeaderboardOnScreen: (v) => {
        set(() => ({
          showLeaderboardOnScreen: v,
          ...(v ? { showKickVotingOnScreen: false, duelPresentationActive: false } : {}),
        }));
        scheduleBroadcast(get);
      },

      setShowKickVotingOnScreen: (v) => {
        set(() => ({
          showKickVotingOnScreen: v,
          ...(v ? { showLeaderboardOnScreen: false, duelPresentationActive: false } : {}),
        }));
        scheduleBroadcast(get);
      },

      setDuelPresentationActive: (v) => {
        set(() => ({
          duelPresentationActive: v,
          ...(v
            ? {
                showLeaderboardOnScreen: false,
                showKickVotingOnScreen: false,
                penaltyGreen: 0,
                penaltyRed: 0,
              }
            : {}),
        }));
        scheduleBroadcast(get);
      },

      penaltyGreenHit: () => {
        set((s) => ({ penaltyGreen: Math.min(5, s.penaltyGreen + 1) }));
        scheduleBroadcast(get);
      },

      penaltyRedHit: () => {
        set((s) => ({ penaltyRed: Math.min(5, s.penaltyRed + 1) }));
        scheduleBroadcast(get);
      },

      resetPenaltyScores: () => {
        set({ penaltyGreen: 0, penaltyRed: 0 });
        scheduleBroadcast(get);
      },

      resetAnswerStats: () => {
        set({ playerCorrectCounts: {} });
        scheduleBroadcast(get);
      },

      dismissLeaderboard: () => {
        set({ showLeaderboardOnScreen: false, playerCorrectCounts: {} });
        scheduleBroadcast(get);
      },

      completeKickRound: () => {
        const s = get();
        const kickId = s.weakestPlayerId;
        let teams = s.teams.map((t) => ({ ...t, players: [...t.players] }));
        if (kickId) teams = removePlayerIdFromTeams(teams, kickId);
        let duelPlayerIds = s.duelPlayerIds;
        let duelScores = s.duelScores;
        if (kickId && (duelPlayerIds[0] === kickId || duelPlayerIds[1] === kickId)) {
          duelPlayerIds = [
            duelPlayerIds[0] === kickId ? null : duelPlayerIds[0],
            duelPlayerIds[1] === kickId ? null : duelPlayerIds[1],
          ];
          duelScores = [0, 0];
        }
        set({
          teams,
          activeTeamIndex: clampTeamIndex(teams, s.activeTeamIndex),
          voteCounts: {},
          weakestPlayerId: null,
          showWeakestOnScreen: false,
          playerCorrectCounts: {},
          showLeaderboardOnScreen: false,
          showKickVotingOnScreen: false,
          duelPresentationActive: false,
          championPlayerId: kickId && s.championPlayerId === kickId ? null : s.championPlayerId,
          duelPlayerIds,
          duelScores,
        });
        scheduleBroadcast(get);
      },

      replaceQuestions: (questions) => {
        set({
          questions,
          currentQuestionIndex: questions.length ? 0 : 0,
        });
        scheduleBroadcast(get);
      },

      appendQuestions: (questions) => {
        set((st) => ({
          questions: [...st.questions, ...questions],
        }));
        scheduleBroadcast(get);
      },

      clearAllQuestions: () => {
        set({ questions: [], currentQuestionIndex: 0 });
        scheduleBroadcast(get);
      },

      setFormatPhase: (formatPhase) => {
        set(() => {
          const pauseTimer = formatPhase === 'final_duel' || formatPhase === 'award';
          return {
            formatPhase,
            ...(pauseTimer
              ? { timerRunning: false, timerDeadlineMs: null as number | null }
              : {}),
          };
        });
        scheduleBroadcast(get);
      },

      mergeIntoSingleQueue: () => {
        set((s) => {
          const allPlayers = s.teams.flatMap((t) => t.players);
          if (allPlayers.length === 0) return s;
          const totalBank = s.teams.reduce((acc, t) => acc + t.bankTotal, 0);
          const merged: Team = {
            id: uid(),
            name: 'Общая очередь',
            accent: s.teams[0]?.accent ?? accentForIndex(0),
            players: allPlayers,
            activePlayerIndex: 0,
            bankTotal: totalBank,
            chainLevel: 0,
          };
          return {
            teams: [merged],
            activeTeamIndex: 0,
            formatPhase: 'merged_queue' as GameFormatPhase,
            voteCounts: {},
            weakestPlayerId: null,
            showWeakestOnScreen: false,
          };
        });
        scheduleBroadcast(get);
      },

      setDuelPlayer: (slot, playerId) => {
        set((s) => {
          const next: [string | null, string | null] = [...s.duelPlayerIds] as [string | null, string | null];
          next[slot] = playerId;
          return { duelPlayerIds: next };
        });
        scheduleBroadcast(get);
      },

      resetDuelScores: () => {
        set({ duelScores: [0, 0] });
        scheduleBroadcast(get);
      },

      setChampionPlayerId: (playerId) => {
        set({ championPlayerId: playerId });
        scheduleBroadcast(get);
      },

      setScreenFocus: (f) => {
        set({ screenFocus: f });
        scheduleBroadcast(get);
      },

      startTimer: () => {
        const s = get();
        if (s.formatPhase === 'final_duel' || s.formatPhase === 'award') return;
        set((st) => ({
          timerRunning: true,
          timerDeadlineMs: Date.now() + Math.max(0, st.timerSeconds) * 1000,
          roundTimeExpired: false,
        }));
        scheduleBroadcast(get);
      },

      pauseTimer: () => {
        set((s) => {
          let sec = s.timerSeconds;
          if (s.timerRunning && s.timerDeadlineMs != null) {
            sec = Math.max(0, Math.ceil((s.timerDeadlineMs - Date.now()) / 1000));
          }
          return { timerRunning: false, timerSeconds: sec, timerDeadlineMs: null };
        });
        scheduleBroadcast(get);
      },

      resetTimer: () => {
        set((s) => ({
          timerSeconds: s.settings.roundTimeSec,
          timerRunning: false,
          timerDeadlineMs: null,
          roundTimeExpired: false,
        }));
        scheduleBroadcast(get);
      },

      tickTimer: () => {
        set((s) => {
          if (s.formatPhase === 'final_duel' || s.formatPhase === 'award') return s;
          if (!s.timerRunning) return s;
          let deadline = s.timerDeadlineMs;
          if (deadline == null) {
            deadline = Date.now() + Math.max(0, s.timerSeconds) * 1000;
          }
          const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
          const still = left > 0;
          const justExpired = s.timerRunning && !still;
          return {
            timerSeconds: left,
            timerRunning: still,
            timerDeadlineMs: still ? deadline : null,
            roundTimeExpired: justExpired ? true : s.roundTimeExpired,
          };
        });
        scheduleBroadcast(get);
      },

      markCorrect: () => {
        const pulseAt = Date.now();
        const kind: PulseKind = 'correct';
        set((s) => {
          const teams = [...s.teams];
          const ti = clampTeamIndex(teams, s.activeTeamIndex);
          const t = teams[ti];
          if (!t) return s;
          const answererId = t.players[t.activePlayerIndex]?.id;
          const playerCorrectCounts = { ...s.playerCorrectCounts };
          if (answererId) {
            playerCorrectCounts[answererId] = (playerCorrectCounts[answererId] ?? 0) + 1;
          }
          let duelScores = s.duelScores;
          if (s.formatPhase === 'final_duel' && answererId) {
            const [a, b] = s.duelPlayerIds;
            if (answererId === a) duelScores = [duelScores[0] + 1, duelScores[1]];
            else if (answererId === b) duelScores = [duelScores[0], duelScores[1] + 1];
          }
          const maxChain = s.settings.ladder.length;
          const chainLevel = Math.min(t.chainLevel + 1, maxChain);
          const nextPi = t.players.length ? (t.activePlayerIndex + 1) % t.players.length : 0;
          teams[ti] = { ...t, chainLevel, activePlayerIndex: nextPi };
          return {
            teams,
            currentQuestionIndex: nextQuestionIndex(s),
            lastPulse: { kind, at: pulseAt },
            screenFocus: 'money',
            playerCorrectCounts,
            duelScores,
          };
        });
        scheduleBroadcast(get);
        window.setTimeout(() => {
          if (get().lastPulse.at !== pulseAt) return;
          get().setScreenFocus('question');
        }, 2200);
      },

      markWrong: () => {
        const pulseAt = Date.now();
        set((s) => {
          const teams = [...s.teams];
          const ti = clampTeamIndex(teams, s.activeTeamIndex);
          const t = teams[ti];
          if (!t) return s;
          const nq = nextQuestionIndex(s);
          if (s.wrongPassesToNextTeam && s.teams.length > 1) {
            teams[ti] = { ...t, chainLevel: 0 };
            const nti = (ti + 1) % teams.length;
            return {
              teams,
              activeTeamIndex: nti,
              currentQuestionIndex: nq,
              lastPulse: { kind: 'wrong', at: pulseAt },
              screenFocus: 'money',
            };
          }
          const nextPi = t.players.length ? (t.activePlayerIndex + 1) % t.players.length : 0;
          teams[ti] = { ...t, chainLevel: 0, activePlayerIndex: nextPi };
          return {
            teams,
            currentQuestionIndex: nq,
            lastPulse: { kind: 'wrong', at: pulseAt },
            screenFocus: 'money',
          };
        });
        scheduleBroadcast(get);
        window.setTimeout(() => {
          if (get().lastPulse.at !== pulseAt) return;
          get().setScreenFocus('question');
        }, 2200);
      },

      markBank: () => {
        const pulseAt = Date.now();
        set((s) => {
          const teams = [...s.teams];
          const ti = clampTeamIndex(teams, s.activeTeamIndex);
          const t = teams[ti];
          if (!t) return s;
          const ladder = s.settings.ladder;
          const add =
            t.chainLevel > 0 && t.chainLevel <= ladder.length ? ladder[t.chainLevel - 1] : 0;
          teams[ti] = { ...t, bankTotal: t.bankTotal + add, chainLevel: 0 };
          return {
            teams,
            bankFlashAt: Date.now(),
            lastPulse: { kind: 'bank', at: pulseAt },
            screenFocus: 'money',
          };
        });
        scheduleBroadcast(get);
        window.setTimeout(() => {
          if (get().lastPulse.at !== pulseAt) return;
          get().setScreenFocus('question');
        }, 2200);
      },

      addVoteForPlayer: (playerId) => {
        set((s) => ({
          voteCounts: { ...s.voteCounts, [playerId]: (s.voteCounts[playerId] ?? 0) + 1 },
        }));
        scheduleBroadcast(get);
      },

      resetVotes: () => {
        set({ voteCounts: {} });
        scheduleBroadcast(get);
      },

      declareWeakestFromVotes: () => {
        set((s) => {
          let bestId: string | null = null;
          let best = -1;
          for (const [pid, c] of Object.entries(s.voteCounts)) {
            if (c > best) {
              best = c;
              bestId = pid;
            }
          }
          if (!bestId) {
            return { voteCounts: {} };
          }
          let teams = s.teams.map((t) => ({ ...t, players: [...t.players] }));
          teams = removePlayerIdFromTeams(teams, bestId);
          let duelPlayerIds = s.duelPlayerIds;
          let duelScores = s.duelScores;
          if (duelPlayerIds[0] === bestId || duelPlayerIds[1] === bestId) {
            duelPlayerIds = [
              duelPlayerIds[0] === bestId ? null : duelPlayerIds[0],
              duelPlayerIds[1] === bestId ? null : duelPlayerIds[1],
            ];
            duelScores = [0, 0];
          }
          return {
            teams,
            activeTeamIndex: clampTeamIndex(teams, s.activeTeamIndex),
            voteCounts: {},
            weakestPlayerId: null,
            showWeakestOnScreen: false,
            showKickVotingOnScreen: false,
            championPlayerId: s.championPlayerId === bestId ? null : s.championPlayerId,
            duelPlayerIds,
            duelScores,
          };
        });
        scheduleBroadcast(get);
      },

      setWeakestPlayer: (playerId) => {
        set({ weakestPlayerId: playerId });
        scheduleBroadcast(get);
      },
    }),
    {
      name: 'slaboe-zveno-game-v1',
      partialize: (s) => ({
        settings: s.settings,
        teams: s.teams,
        activeTeamIndex: s.activeTeamIndex,
        questions: s.questions,
        currentQuestionIndex: s.currentQuestionIndex,
        timerSeconds: s.timerSeconds,
        timerRunning: s.timerRunning,
        timerDeadlineMs: s.timerDeadlineMs,
        voteCounts: s.voteCounts,
        weakestPlayerId: s.weakestPlayerId,
        showWeakestOnScreen: s.showWeakestOnScreen,
        wrongPassesToNextTeam: s.wrongPassesToNextTeam,
        playerCorrectCounts: s.playerCorrectCounts,
        showLeaderboardOnScreen: s.showLeaderboardOnScreen,
        showQuestionOnScreen: s.showQuestionOnScreen,
        screenFocus: s.screenFocus,
        lastPulse: s.lastPulse,
        formatPhase: s.formatPhase,
        championPlayerId: s.championPlayerId,
        duelPlayerIds: s.duelPlayerIds,
        duelScores: s.duelScores,
        showKickVotingOnScreen: s.showKickVotingOnScreen,
        bankFlashAt: s.bankFlashAt,
        duelPresentationActive: s.duelPresentationActive,
        penaltyGreen: s.penaltyGreen,
        penaltyRed: s.penaltyRed,
        roundTimeExpired: s.roundTimeExpired,
      }),
      merge: (persisted, current) => {
        const c = current as GameStore;
        const p = persisted as Partial<GameSnapshot> | undefined;
        if (!p?.settings) return c;
        const displayTheme = p.settings.displayTheme ?? p.settings.theme ?? 'light';
        return {
          ...c,
          settings: normalizeGameSettings({ ...c.settings, ...p.settings, displayTheme } as GameSettings),
          teams: p.teams ?? c.teams,
          activeTeamIndex: p.activeTeamIndex ?? c.activeTeamIndex,
          questions: p.questions ?? c.questions,
          currentQuestionIndex: p.currentQuestionIndex ?? c.currentQuestionIndex,
          timerSeconds: p.timerSeconds ?? c.timerSeconds,
          timerRunning: p.timerRunning ?? c.timerRunning,
          timerDeadlineMs: p.timerDeadlineMs ?? null,
          voteCounts: p.voteCounts ?? {},
          weakestPlayerId: p.weakestPlayerId ?? null,
          showWeakestOnScreen: p.showWeakestOnScreen ?? true,
          wrongPassesToNextTeam: p.wrongPassesToNextTeam ?? false,
          playerCorrectCounts: p.playerCorrectCounts ?? {},
          showLeaderboardOnScreen: p.showLeaderboardOnScreen ?? false,
          showQuestionOnScreen: p.showQuestionOnScreen ?? c.showQuestionOnScreen,
          screenFocus: p.screenFocus ?? c.screenFocus,
          lastPulse: p.lastPulse ?? c.lastPulse,
          formatPhase: p.formatPhase ?? 'team_rounds',
          championPlayerId: p.championPlayerId ?? null,
          duelPlayerIds: p.duelPlayerIds ?? [null, null],
          duelScores: p.duelScores ?? [0, 0],
          showKickVotingOnScreen: p.showKickVotingOnScreen ?? false,
          bankFlashAt: p.bankFlashAt ?? 0,
          duelPresentationActive: p.duelPresentationActive ?? false,
          penaltyGreen: p.penaltyGreen ?? 0,
          penaltyRed: p.penaltyRed ?? 0,
          roundTimeExpired: p.roundTimeExpired ?? false,
        };
      },
    },
  ),
);

bc.onmessage = (ev: MessageEvent<unknown>) => {
  const data = ev.data as { type?: string; snapshot?: string };
  if (data?.type !== 'snapshot' || typeof data.snapshot !== 'string') return;
  try {
    const snap = JSON.parse(data.snapshot) as GameSnapshot;
    useGameStore.getState().applySnapshot(snap);
  } catch {
    /* ignore */
  }
};

let tickId: number | null = null;
export function ensureTimerLoop(): void {
  if (tickId !== null) return;
  tickId = window.setInterval(() => {
    useGameStore.getState().tickTimer();
  }, 1000);
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    if (tickId != null) {
      window.clearInterval(tickId);
      tickId = null;
    }
  });
}
