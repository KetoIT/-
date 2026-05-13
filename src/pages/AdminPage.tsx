import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  BarChart3,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardPaste,
  Eye,
  EyeOff,
  FastForward,
  GripVertical,
  Pause,
  PiggyBank,
  Play,
  Plus,
  RotateCcw,
  Shuffle,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import type { Player, Question } from '../types/game';
import { TEAM_ACCENTS, playerColor, teamAccent } from '../lib/teamColors';
import { questionsFromUnknownJson } from '../lib/questionsImport';
import { useGameStore } from '../store/gameStore';

function formatMoney(n: number): string {
  return new Intl.NumberFormat('ru-RU').format(n);
}

function SortablePlayerRow({
  player,
  dark,
  activeMic,
  colorHex,
  paletteOpen,
  onTogglePalette,
  onPickAccent,
  onNameChange,
  onMic,
  onRemove,
}: {
  player: Player;
  dark: boolean;
  activeMic: boolean;
  colorHex: string;
  paletteOpen: boolean;
  onTogglePalette: () => void;
  onPickAccent: (hex: string) => void;
  onNameChange: (name: string) => void;
  onMic: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: player.id,
  });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.88 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`overflow-hidden rounded-2xl border transition-colors ${
        dark ? 'border-white/[0.06] bg-zinc-900/35' : 'border-zinc-200/90 bg-white'
      }`}
    >
      <div className="flex items-center gap-2 p-3 sm:gap-3 sm:p-4">
        <button
          type="button"
          className={`cursor-grab touch-none rounded-lg p-1.5 ${dark ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-400 hover:text-zinc-600'}`}
          {...attributes}
          {...listeners}
          aria-label="Перетащить"
        >
          <GripVertical size={18} />
        </button>
        <button
          type="button"
          title="Цвет"
          onClick={onTogglePalette}
          className="h-10 w-10 shrink-0 rounded-full border-2 border-black/10 shadow-inner dark:border-white/15"
          style={{ backgroundColor: colorHex }}
        />
        <input
          value={player.name}
          onChange={(e) => onNameChange(e.target.value)}
          className={`min-w-0 flex-1 border-none bg-transparent text-base font-medium outline-none ${
            dark ? 'text-zinc-100 placeholder:text-zinc-600' : 'text-zinc-900'
          }`}
          placeholder="Имя"
        />
        <button
          type="button"
          onClick={onMic}
          className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider ${
            activeMic ? 'bg-sky-600 text-white' : dark ? 'bg-zinc-800 text-zinc-400 hover:text-zinc-200' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
          }`}
        >
          Мик
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 rounded-lg p-2 text-zinc-500 transition-colors hover:bg-rose-500/10 hover:text-rose-500"
          title="Убрать"
        >
          <Trash2 size={18} />
        </button>
      </div>
      {paletteOpen ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-black/[0.06] px-3 py-3 dark:border-white/[0.06] sm:px-4">
          {TEAM_ACCENTS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onPickAccent(c)}
              className="h-9 w-9 rounded-full border border-black/10 transition-transform hover:scale-105 dark:border-white/10"
              style={{ backgroundColor: c }}
            />
          ))}
          <label className="ml-1 flex cursor-pointer items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            свой
            <input
              type="color"
              value={colorHex}
              onChange={(e) => onPickAccent(e.target.value)}
              className="h-9 w-14 cursor-pointer rounded-md border-0 bg-transparent p-0"
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}

function SortableQuestionRow({
  q,
  active,
  dark,
  onChangeText,
  onChangeAnswer,
  onRemove,
}: {
  q: Question;
  active: boolean;
  dark: boolean;
  onChangeText: (v: string) => void;
  onChangeAnswer: (v: string) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: q.id,
  });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-start gap-4 rounded-2xl border p-4 transition-colors ${
        dark ? 'border-zinc-700 bg-zinc-800' : 'border-zinc-100 bg-zinc-50'
      } ${active ? 'ring-2 ring-emerald-500/40' : ''}`}
    >
      <button
        type="button"
        className={`cursor-grab touch-none rounded p-2 pt-3 ${dark ? 'text-zinc-500 hover:text-zinc-400' : 'text-zinc-400 hover:text-zinc-500'}`}
        {...attributes}
        {...listeners}
        aria-label="Перетащить вопрос"
      >
        <GripVertical size={20} />
      </button>
      <div className="flex-1 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Текст вопроса</label>
          <textarea
            value={q.text}
            onChange={(e) => onChangeText(e.target.value)}
            className={`h-20 w-full resize-none rounded-xl border p-3 text-sm outline-none transition-colors focus:border-sky-500 ${
              dark ? 'border-zinc-700 bg-zinc-900 text-white' : 'border-zinc-200 bg-white'
            }`}
            placeholder="Введите вопрос..."
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Правильный ответ</label>
          <input
            type="text"
            value={q.correctAnswer}
            onChange={(e) => onChangeAnswer(e.target.value)}
            className={`w-full rounded-xl border p-3 text-sm font-bold outline-none transition-colors focus:border-sky-500 ${
              dark ? 'border-zinc-700 bg-zinc-900 text-white' : 'border-zinc-200 bg-white'
            }`}
            placeholder="Введите ответ..."
          />
        </div>
      </div>
      <button type="button" onClick={onRemove} className="pt-2 text-zinc-400 transition-colors hover:text-red-500">
        <Trash2 size={20} />
      </button>
    </div>
  );
}

type AdminTab = 'game' | 'players' | 'questions' | 'voting' | 'settings';

export function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('game');
  const [accentPickerPlayerId, setAccentPickerPlayerId] = useState<string | null>(null);
  const settings = useGameStore((s) => s.settings);
  const setSettings = useGameStore((s) => s.setSettings);
  const teams = useGameStore((s) => s.teams);
  const activeTeamIndex = useGameStore((s) => s.activeTeamIndex);
  const setActiveTeam = useGameStore((s) => s.setActiveTeam);
  const reorderPlayersInTeam = useGameStore((s) => s.reorderPlayersInTeam);
  const updatePlayerAccent = useGameStore((s) => s.updatePlayerAccent);
  const addPlayer = useGameStore((s) => s.addPlayer);
  const removePlayer = useGameStore((s) => s.removePlayer);
  const updatePlayerName = useGameStore((s) => s.updatePlayerName);
  const setActivePlayer = useGameStore((s) => s.setActivePlayer);
  const nextPlayerInCircle = useGameStore((s) => s.nextPlayerInCircle);
  const questions = useGameStore((s) => s.questions);
  const currentQuestionIndex = useGameStore((s) => s.currentQuestionIndex);
  const setCurrentQuestionIndex = useGameStore((s) => s.setCurrentQuestionIndex);
  const reorderQuestions = useGameStore((s) => s.reorderQuestions);
  const shuffleQuestions = useGameStore((s) => s.shuffleQuestions);
  const addQuestion = useGameStore((s) => s.addQuestion);
  const updateQuestion = useGameStore((s) => s.updateQuestion);
  const removeQuestion = useGameStore((s) => s.removeQuestion);
  const setShowQuestionOnScreen = useGameStore((s) => s.setShowQuestionOnScreen);
  const showQuestionOnScreen = useGameStore((s) => s.showQuestionOnScreen);
  const setShowWeakestOnScreen = useGameStore((s) => s.setShowWeakestOnScreen);
  const showWeakestOnScreen = useGameStore((s) => s.showWeakestOnScreen);
  const wrongPassesToNextTeam = useGameStore((s) => s.wrongPassesToNextTeam);
  const setWrongPassesToNextTeam = useGameStore((s) => s.setWrongPassesToNextTeam);
  const voteCounts = useGameStore((s) => s.voteCounts);
  const weakestPlayerId = useGameStore((s) => s.weakestPlayerId);
  const addVoteForPlayer = useGameStore((s) => s.addVoteForPlayer);
  const resetVotes = useGameStore((s) => s.resetVotes);
  const declareWeakestFromVotes = useGameStore((s) => s.declareWeakestFromVotes);
  const setWeakestPlayer = useGameStore((s) => s.setWeakestPlayer);
  const timerRunning = useGameStore((s) => s.timerRunning);
  const timerSeconds = useGameStore((s) => s.timerSeconds);
  const startTimer = useGameStore((s) => s.startTimer);
  const pauseTimer = useGameStore((s) => s.pauseTimer);
  const resetTimer = useGameStore((s) => s.resetTimer);
  const markCorrect = useGameStore((s) => s.markCorrect);
  const markWrong = useGameStore((s) => s.markWrong);
  const markBank = useGameStore((s) => s.markBank);
  const playerCorrectCounts = useGameStore((s) => s.playerCorrectCounts);
  const showLeaderboardOnScreen = useGameStore((s) => s.showLeaderboardOnScreen);
  const setShowLeaderboardOnScreen = useGameStore((s) => s.setShowLeaderboardOnScreen);
  const dismissLeaderboard = useGameStore((s) => s.dismissLeaderboard);
  const completeKickRound = useGameStore((s) => s.completeKickRound);
  const setShowKickVotingOnScreen = useGameStore((s) => s.setShowKickVotingOnScreen);
  const showKickVotingOnScreen = useGameStore((s) => s.showKickVotingOnScreen);
  const setDuelPresentationActive = useGameStore((s) => s.setDuelPresentationActive);
  const duelPresentationActive = useGameStore((s) => s.duelPresentationActive);
  const penaltyGreenHit = useGameStore((s) => s.penaltyGreenHit);
  const penaltyRedHit = useGameStore((s) => s.penaltyRedHit);
  const resetPenaltyScores = useGameStore((s) => s.resetPenaltyScores);
  const penaltyGreen = useGameStore((s) => s.penaltyGreen);
  const penaltyRed = useGameStore((s) => s.penaltyRed);
  const replaceQuestions = useGameStore((s) => s.replaceQuestions);
  const appendQuestions = useGameStore((s) => s.appendQuestions);
  const clearAllQuestions = useGameStore((s) => s.clearAllQuestions);

  const [ladderText, setLadderText] = useState(() => settings.ladder.join(', '));
  const [revealAnswer, setRevealAnswer] = useState(false);
  const [questionsJsonDraft, setQuestionsJsonDraft] = useState('');
  const [questionsImportError, setQuestionsImportError] = useState<string | null>(null);
  const questionsFileInputRef = useRef<HTMLInputElement>(null);

  const dark = settings.theme === 'dark';
  const team = teams[activeTeamIndex];
  const q = questions[currentQuestionIndex];

  const allPlayersFlat = useMemo(() => {
    let gi = 0;
    return teams.flatMap((t) =>
      t.players.map((p) => ({
        ...p,
        teamId: t.id,
        listColor: playerColor(p, gi++),
      })),
    );
  }, [teams]);

  const leaderboardPreview = useMemo(() => {
    let gi = 0;
    const rows = teams.flatMap((t) =>
      t.players.map((p) => ({
        id: p.id,
        name: p.name,
        accent: playerColor(p, gi++),
        correct: playerCorrectCounts[p.id] ?? 0,
      })),
    );
    rows.sort((a, b) => b.correct - a.correct || a.name.localeCompare(b.name, 'ru'));
    return rows;
  }, [teams, playerCorrectCounts]);

  const ladder = settings.ladder;

  const currentLadderIdx =
    team && team.chainLevel > 0 ? Math.min(team.chainLevel - 1, ladder.length - 1) : -1;

  const bankSlotValue =
    team && team.chainLevel > 0 && team.chainLevel <= ladder.length
      ? ladder[team.chainLevel - 1]
      : team && team.chainLevel > ladder.length
        ? ladder[ladder.length - 1]
        : 0;

  const totalBank = useMemo(() => teams.reduce((s, t) => s + t.bankTotal, 0), [teams]);
  useEffect(() => {
    setLadderText(settings.ladder.join(', '));
  }, [settings.ladder]);

  useEffect(() => {
    setRevealAnswer(false);
  }, [currentQuestionIndex]);

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
    return () => {
      delete document.documentElement.dataset.theme;
    };
  }, [settings.theme]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onPlayerDragEnd = (event: DragEndEvent) => {
    const main = teams[0];
    if (!main) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = main.players.findIndex((p) => p.id === active.id);
    const to = main.players.findIndex((p) => p.id === over.id);
    if (from < 0 || to < 0) return;
    reorderPlayersInTeam(main.id, from, to);
  };

  const onQuestionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = questions.findIndex((x) => x.id === active.id);
    const to = questions.findIndex((x) => x.id === over.id);
    if (from < 0 || to < 0) return;
    reorderQuestions(from, to);
  };

  const applyLadder = () => {
    const parts = ladderText
      .split(/[,;\s]+/)
      .map((x) => x.trim())
      .filter(Boolean)
      .map((x) => Number(x))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (parts.length === 0) return;
    setSettings({ ladder: parts });
  };

  const applyQuestionsJson = (mode: 'replace' | 'append') => {
    setQuestionsImportError(null);
    try {
      const raw = JSON.parse(questionsJsonDraft) as unknown;
      const list = questionsFromUnknownJson(raw);
      if (list.length === 0) {
        setQuestionsImportError(
          'Пустой список. Нужен JSON-массив объектов с полями text и correctAnswer (или question / answer). Можно обернуть в { "questions": [...] }.',
        );
        return;
      }
      if (mode === 'replace') replaceQuestions(list);
      else appendQuestions(list);
      setQuestionsJsonDraft('');
    } catch (e) {
      setQuestionsImportError(e instanceof Error ? e.message : 'Ошибка разбора JSON');
    }
  };

  const shortcuts = useMemo(
    () => ({
      correct: markCorrect,
      wrong: markWrong,
      bank: markBank,
      nextQ: () => setCurrentQuestionIndex(currentQuestionIndex + 1),
      prevQ: () => setCurrentQuestionIndex(currentQuestionIndex - 1),
      nextPlayer: () => nextPlayerInCircle(),
    }),
    [markBank, markCorrect, markWrong, nextPlayerInCircle, currentQuestionIndex, setCurrentQuestionIndex],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        shortcuts.correct();
        return;
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        shortcuts.bank();
        return;
      }
      if (e.key === 'Backspace') {
        e.preventDefault();
        shortcuts.wrong();
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        shortcuts.nextQ();
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        shortcuts.prevQ();
        return;
      }
      if (e.key === 'n' || e.key === 'N') {
        if (!e.ctrlKey && !e.metaKey) shortcuts.nextPlayer();
        return;
      }
      if (/^[1-9]$/.test(e.key)) {
        const main = teams[0];
        if (!main) return;
        const n = Number(e.key) - 1;
        if (n < main.players.length) {
          setActiveTeam(0);
          setActivePlayer(main.id, n);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shortcuts, setActiveTeam, setActivePlayer, teams]);

  const tabBtn = (id: AdminTab, label: string) => (
    <button
      type="button"
      onClick={() => setActiveTab(id)}
      className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
        activeTab === id
          ? dark
            ? 'bg-white/10 text-white'
            : 'bg-zinc-900 text-white'
          : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div
      className={`flex min-h-screen flex-col font-sans transition-colors duration-300 ${
        dark ? 'bg-[#09090b] text-zinc-100' : 'bg-[#fafafa] text-zinc-900'
      }`}
    >
      <nav
        className={`sticky top-0 z-50 flex flex-wrap items-center justify-between gap-4 border-b px-6 py-4 backdrop-blur-md sm:px-8 ${
          dark ? 'border-white/[0.06] bg-[#09090b]/80' : 'border-zinc-200/80 bg-[#fafafa]/85'
        }`}
      >
        <div className="flex flex-wrap items-center gap-5 lg:gap-8">
          <div className="flex flex-col">
            <span className="text-[10px] font-medium uppercase tracking-[0.35em] text-zinc-500">Слабое звено</span>
            <span className="mt-0.5 text-lg font-light tracking-tight">пульт</span>
          </div>
          <div className={`flex flex-wrap items-center gap-1 rounded-full p-1 ${dark ? 'bg-white/[0.04]' : 'bg-zinc-200/50'}`}>
            {tabBtn('game', 'Игра')}
            {tabBtn('players', 'Игроки')}
            {tabBtn('questions', 'Вопросы')}
            {tabBtn('voting', 'Голосование')}
            {tabBtn('settings', 'Настройки')}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <div className="text-right">
            <div className="text-[10px] font-medium uppercase tracking-[0.25em] text-zinc-500">всего в банках</div>
            <div className="font-mono text-lg font-light tabular-nums">{formatMoney(totalBank)}</div>
          </div>
          <Link
            to="/screen"
            target="_blank"
            rel="noreferrer"
            title="Экран проектора"
            className={`flex h-11 w-11 items-center justify-center rounded-full border transition-all ${
              dark
                ? 'border-white/10 text-zinc-200 hover:border-white/20 hover:bg-white/[0.04]'
                : 'border-zinc-200 text-zinc-700 hover:border-zinc-300 hover:bg-white'
            }`}
          >
            <Eye size={18} strokeWidth={1.5} />
          </Link>
        </div>
      </nav>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 sm:px-8">
        {activeTab === 'game' && (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-8">
              <div
                className={`rounded-2xl border p-6 sm:p-8 ${dark ? 'border-white/[0.06] bg-white/[0.02]' : 'border-zinc-200/80 bg-white'}`}
              >
                <div className="mb-8 flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
                  <div>
                    <h2 className={`mb-2 text-[10px] font-medium uppercase tracking-[0.3em] ${dark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                      Сейчас
                    </h2>
                    {team ? (
                      <div className="flex items-center gap-4">
                        {(() => {
                          const ap = team.players[team.activePlayerIndex];
                          const bar = ap ? playerColor(ap, team.activePlayerIndex) : teamAccent(team, activeTeamIndex);
                          return <div className="h-10 w-1 rounded-full" style={{ backgroundColor: bar }} />;
                        })()}
                        <div>
                          <div className={`text-3xl font-light tracking-tight sm:text-4xl ${dark ? 'text-white' : 'text-zinc-900'}`}>
                            {team.players[team.activePlayerIndex]?.name ?? 'нет игроков'}
                          </div>
                          <div className="mt-1 text-sm font-normal text-zinc-500">очередь</div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-zinc-500">Добавьте игроков во вкладке «Игроки»</div>
                    )}
                  </div>
                  <div className="flex flex-col items-end text-right">
                    <div
                      className={`font-mono text-5xl font-extralight tabular-nums tracking-tight sm:text-6xl md:text-7xl ${
                        timerRunning && timerSeconds <= 5
                          ? 'text-red-500'
                          : timerRunning && timerSeconds <= 10
                            ? 'text-amber-500'
                            : dark
                              ? 'text-white'
                              : 'text-zinc-900'
                      }`}
                    >
                      {String(Math.floor(timerSeconds / 60)).padStart(2, '0')}
                      <span className="mx-0.5 opacity-30">:</span>
                      {String(timerSeconds % 60).padStart(2, '0')}
                    </div>
                    <div className={`mt-2 text-[10px] font-medium uppercase tracking-[0.25em] ${dark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                      время
                    </div>
                  </div>
                </div>

                <div className="mb-8 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    title={timerRunning ? 'Пауза' : 'Старт'}
                    onClick={() => (timerRunning ? pauseTimer() : startTimer())}
                    className={`flex flex-1 items-center justify-center rounded-xl border py-5 transition-all ${
                      timerRunning
                        ? dark
                          ? 'border-white/10 text-zinc-300 hover:bg-white/[0.04]'
                          : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                        : dark
                          ? 'border-white/15 bg-white text-zinc-900 hover:bg-zinc-100'
                          : 'border-zinc-900 bg-zinc-900 text-white hover:bg-zinc-800'
                    }`}
                  >
                    {timerRunning ? <Pause size={32} strokeWidth={1.5} /> : <Play size={32} strokeWidth={1.5} />}
                  </button>
                  <button
                    type="button"
                    title="Сброс таймера"
                    onClick={() => resetTimer()}
                    className={`flex items-center justify-center rounded-xl border px-5 py-5 text-sm font-medium transition-all ${
                      dark ? 'border-white/10 text-zinc-400 hover:bg-white/[0.04]' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                    }`}
                  >
                    <RotateCcw size={26} strokeWidth={1.5} />
                  </button>
                  <button
                    type="button"
                    title="Следующий в очереди"
                    onClick={() => nextPlayerInCircle()}
                    className={`flex flex-1 items-center justify-center rounded-xl border py-5 transition-all ${
                      dark ? 'border-white/10 text-zinc-200 hover:bg-white/[0.04]' : 'border-zinc-200 text-zinc-800 hover:bg-zinc-50'
                    }`}
                  >
                    <FastForward size={32} strokeWidth={1.5} />
                  </button>
                </div>

                <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <button
                    type="button"
                    title="Верно (Space)"
                    onClick={markCorrect}
                    className={`flex flex-col items-center justify-center gap-1 rounded-xl border py-12 transition-all sm:py-14 ${
                      dark
                        ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15'
                        : 'border-emerald-200/80 bg-emerald-50/80 text-emerald-900 hover:bg-emerald-50'
                    }`}
                  >
                    <Check size={44} strokeWidth={1.5} />
                  </button>
                  <button
                    type="button"
                    title="Сброс цепочки (Backspace)"
                    onClick={markWrong}
                    className={`flex flex-col items-center justify-center gap-1 rounded-xl border py-12 transition-all sm:py-14 ${
                      dark
                        ? 'border-rose-500/25 bg-rose-500/10 text-rose-200 hover:bg-rose-500/15'
                        : 'border-rose-200/80 bg-rose-50/80 text-rose-900 hover:bg-rose-50'
                    }`}
                  >
                    <X size={44} strokeWidth={1.5} />
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <button
                    type="button"
                    title="В банк (Enter)"
                    onClick={markBank}
                    className={`flex flex-col items-center justify-center gap-2 rounded-xl border py-8 transition-all ${
                      dark ? 'border-amber-500/20 text-zinc-100 hover:bg-amber-500/10' : 'border-amber-200 text-zinc-800 hover:bg-amber-50/80'
                    }`}
                  >
                    <PiggyBank size={28} strokeWidth={1.5} className="opacity-80" />
                    <span className="font-mono text-2xl font-light tabular-nums">{formatMoney(bankSlotValue)}</span>
                  </button>
                  <button
                    type="button"
                    title={showQuestionOnScreen ? 'Вопрос на проекторе' : 'Вопрос скрыт'}
                    onClick={() => setShowQuestionOnScreen(!showQuestionOnScreen)}
                    className={`flex items-center justify-center rounded-xl border py-8 transition-all ${
                      showQuestionOnScreen
                        ? dark
                          ? 'border-sky-500/30 bg-sky-500/10 text-sky-100'
                          : 'border-sky-200 bg-sky-50 text-sky-900'
                        : dark
                          ? 'border-white/10 text-zinc-500 hover:bg-white/[0.04]'
                          : 'border-zinc-200 text-zinc-500 hover:bg-zinc-50'
                    }`}
                  >
                    <Eye size={28} strokeWidth={1.5} />
                  </button>
                </div>
              </div>

              <div className={`rounded-2xl border p-6 ${dark ? 'border-white/[0.06] bg-white/[0.02]' : 'border-zinc-200/80 bg-white'}`}>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className={`text-[10px] font-medium uppercase tracking-[0.3em] ${dark ? 'text-zinc-500' : 'text-zinc-400'}`}>Вопрос</h3>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      title="Показать ответ ведущему"
                      onClick={() => setRevealAnswer((v) => !v)}
                      className={`flex h-11 w-11 items-center justify-center rounded-full border transition-all ${
                        revealAnswer
                          ? dark
                            ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200'
                            : 'border-emerald-300 bg-emerald-50 text-emerald-800'
                          : dark
                            ? 'border-white/10 text-zinc-400 hover:bg-white/[0.06]'
                            : 'border-zinc-200 text-zinc-500 hover:bg-zinc-100'
                      }`}
                    >
                      {revealAnswer ? <EyeOff size={20} strokeWidth={1.5} /> : <Eye size={20} strokeWidth={1.5} />}
                    </button>
                    <button
                      type="button"
                      title="Предыдущий вопрос"
                      onClick={() => setCurrentQuestionIndex(currentQuestionIndex - 1)}
                      className={`flex h-11 w-11 items-center justify-center rounded-full border transition-all ${dark ? 'border-white/10 hover:bg-white/[0.06]' : 'border-zinc-200 hover:bg-zinc-100'}`}
                    >
                      <ChevronLeft size={22} strokeWidth={1.5} />
                    </button>
                    <button
                      type="button"
                      title="Следующий вопрос"
                      onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
                      className={`flex h-11 w-11 items-center justify-center rounded-full border transition-all ${dark ? 'bg-white text-zinc-900' : 'bg-zinc-900 text-white'}`}
                    >
                      <ChevronRight size={22} strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className={`text-xl font-light leading-snug sm:text-2xl ${dark ? 'text-zinc-100' : 'text-zinc-900'}`}>{q?.text ?? 'Нет вопросов'}</div>
                  <div
                    className={`rounded-xl border px-4 py-3 font-mono text-sm ${
                      dark ? 'border-white/10 bg-white/[0.03]' : 'border-zinc-200 bg-zinc-50'
                    }`}
                  >
                    {revealAnswer ? (
                      <span className={dark ? 'text-emerald-200' : 'text-emerald-800'}>{q?.correctAnswer ?? '—'}</span>
                    ) : (
                      <span className="tracking-widest text-zinc-500">•••••••</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4">
              <div
                className={`flex flex-col-reverse gap-1 rounded-2xl border p-5 ${dark ? 'border-white/[0.06] bg-white/[0.02]' : 'border-zinc-200/80 bg-white'}`}
              >
                <h3 className={`mb-3 text-center text-[10px] font-medium uppercase tracking-[0.3em] ${dark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  Лестница
                </h3>
                {ladder.map((val, idx) => {
                  const activeStep = currentLadderIdx === idx;
                  return (
                    <div
                      key={idx}
                      className={`flex items-center justify-between rounded-lg px-4 py-3 font-mono text-sm tabular-nums transition-all ${
                        activeStep
                          ? dark
                            ? 'bg-white text-zinc-900'
                            : 'bg-zinc-900 text-white'
                          : dark
                            ? 'text-zinc-600'
                            : 'text-zinc-300'
                      }`}
                    >
                      <span className="text-[10px] font-medium opacity-40">{idx + 1}</span>
                      <span>{val.toLocaleString('ru-RU')}</span>
                    </div>
                  );
                })}
              </div>

              <div className={`mt-4 rounded-2xl border p-4 text-xs ${dark ? 'border-white/[0.06] text-zinc-500' : 'border-zinc-200 text-zinc-500'}`}>
                <div className="mb-2 font-medium uppercase tracking-widest text-[10px] opacity-70">Банк</div>
                <div className="flex justify-between gap-2 font-mono text-sm tabular-nums text-zinc-700 dark:text-zinc-300">
                  <span>Всего</span>
                  <span>{formatMoney(totalBank)}</span>
                </div>
              </div>

              <div className={`mt-4 rounded-2xl border p-4 ${dark ? 'border-white/[0.06]' : 'border-zinc-200'}`}>
                <div className={`mb-3 flex items-center gap-2 text-[10px] font-medium uppercase tracking-widest ${dark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  <BarChart3 size={14} strokeWidth={1.5} />
                  Верных ответов
                </div>
                <ul className="max-h-52 space-y-2 overflow-y-auto text-xs">
                  {leaderboardPreview.length === 0 ? (
                    <li className={dark ? 'text-zinc-600' : 'text-zinc-400'}>Пока нет — жмите «верно» в игре.</li>
                  ) : (
                    leaderboardPreview.map((r, idx) => (
                      <li key={r.id} className="flex items-baseline justify-between gap-2 font-mono tabular-nums">
                        <span className={`flex min-w-0 items-center gap-2 ${dark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                          <span className="opacity-50">{idx + 1}.</span>
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: r.accent }} />
                          <span className="break-words font-sans font-medium">{r.name}</span>
                        </span>
                        <span className="shrink-0 text-emerald-600 dark:text-emerald-400">{r.correct}</span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'questions' && (
          <div
            className={`rounded-2xl border p-8 transition-colors ${
              dark ? 'border-white/[0.06] bg-white/[0.02]' : 'border-zinc-200/80 bg-white'
            }`}
          >
            <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className={`text-xl font-light tracking-tight ${dark ? 'text-white' : 'text-zinc-900'}`}>Вопросы</h2>
                <p className="mt-1 text-sm text-zinc-400">Порядок — перетаскиванием. Импорт из JSON для генерации в ИИ.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={addQuestion}
                  className="flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-sky-900/20 transition-all hover:bg-sky-500"
                >
                  <Plus size={18} /> Добавить
                </button>
                <button
                  type="button"
                  onClick={() => questionsFileInputRef.current?.click()}
                  className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all ${
                    dark ? 'border-white/10 text-zinc-200 hover:bg-white/[0.04]' : 'border-zinc-200 text-zinc-800 hover:bg-zinc-50'
                  }`}
                >
                  <Upload size={18} strokeWidth={1.5} /> JSON из файла
                </button>
                <input
                  ref={questionsFileInputRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    setQuestionsImportError(null);
                    if (!f) return;
                    try {
                      const text = await f.text();
                      const raw = JSON.parse(text) as unknown;
                      const list = questionsFromUnknownJson(raw);
                      if (list.length === 0) {
                        setQuestionsImportError('В файле нет валидных вопросов.');
                      } else if (window.confirm(`Загрузить ${list.length} вопросов из файла? Текущий список будет заменён.`)) {
                        replaceQuestions(list);
                      }
                    } catch (err) {
                      setQuestionsImportError(err instanceof Error ? err.message : 'Ошибка чтения файла');
                    }
                    e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  disabled={questions.length < 2}
                  onClick={() => shuffleQuestions()}
                  title="Случайный порядок вопросов"
                  className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                    dark ? 'border-white/10 text-zinc-200 hover:bg-white/[0.04]' : 'border-zinc-200 text-zinc-800 hover:bg-zinc-50'
                  }`}
                >
                  <Shuffle size={18} strokeWidth={1.5} /> Перемешать
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Удалить все вопросы?')) clearAllQuestions();
                  }}
                  className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all ${
                    dark ? 'border-rose-500/30 text-rose-200 hover:bg-rose-500/10' : 'border-rose-200 text-rose-800 hover:bg-rose-50'
                  }`}
                >
                  <Trash2 size={18} strokeWidth={1.5} /> Очистить всё
                </button>
              </div>
            </div>

            <div className={`mb-8 rounded-2xl border p-5 ${dark ? 'border-white/10 bg-black/20' : 'border-zinc-100 bg-zinc-50'}`}>
              <div className="mb-3 flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                <ClipboardPaste size={14} strokeWidth={1.5} />
                Вставить JSON
              </div>
              <textarea
                value={questionsJsonDraft}
                onChange={(e) => {
                  setQuestionsJsonDraft(e.target.value);
                  setQuestionsImportError(null);
                }}
                placeholder={`[\n  { "text": "Вопрос?", "correctAnswer": "Ответ" },\n  { "question": "…", "answer": "…" }\n]`}
                rows={5}
                className={`mb-3 w-full resize-y rounded-xl border p-3 font-mono text-xs outline-none focus:border-sky-500 sm:text-sm ${
                  dark ? 'border-zinc-700 bg-zinc-900 text-zinc-100' : 'border-zinc-200 bg-white text-zinc-900'
                }`}
              />
              {questionsImportError ? <p className="mb-3 text-sm text-rose-500">{questionsImportError}</p> : null}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => applyQuestionsJson('replace')}
                  className={`rounded-lg px-4 py-2 text-sm font-bold ${dark ? 'bg-white text-zinc-900 hover:bg-zinc-200' : 'bg-zinc-900 text-white hover:bg-zinc-800'}`}
                >
                  Заменить всеми
                </button>
                <button
                  type="button"
                  onClick={() => applyQuestionsJson('append')}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold ${dark ? 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-800 hover:bg-zinc-200'}`}
                >
                  Добавить к списку
                </button>
              </div>
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onQuestionDragEnd}>
              <SortableContext items={questions.map((x) => x.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {questions.map((item, i) => (
                    <SortableQuestionRow
                      key={item.id}
                      q={item}
                      active={i === currentQuestionIndex}
                      dark={dark}
                      onChangeText={(v) => updateQuestion(item.id, { text: v })}
                      onChangeAnswer={(v) => updateQuestion(item.id, { correctAnswer: v })}
                      onRemove={() => removeQuestion(item.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        )}

        {activeTab === 'voting' && (
          <div
            className={`rounded-2xl border p-6 sm:p-8 ${dark ? 'border-white/[0.06] bg-white/[0.02]' : 'border-zinc-200/80 bg-white'}`}
          >
            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setShowLeaderboardOnScreen(!showLeaderboardOnScreen)}
                className={`rounded-2xl border py-10 text-lg font-semibold transition-all sm:py-14 ${
                  showLeaderboardOnScreen
                    ? dark
                      ? 'border-amber-500/50 bg-amber-500/15 text-amber-100'
                      : 'border-amber-400 bg-amber-50 text-amber-950'
                    : dark
                      ? 'border-white/10 text-zinc-200 hover:bg-white/[0.04]'
                      : 'border-zinc-200 text-zinc-800 hover:bg-zinc-50'
                }`}
              >
                Таблица лидеров
              </button>
              <button
                type="button"
                onClick={() => dismissLeaderboard()}
                className={`rounded-2xl border py-10 text-lg font-semibold transition-all sm:py-14 ${
                  dark ? 'border-white/10 text-zinc-200 hover:bg-white/[0.04]' : 'border-zinc-200 text-zinc-800 hover:bg-zinc-50'
                }`}
              >
                Сброс верных
              </button>
              <button
                type="button"
                onClick={() => setShowKickVotingOnScreen(!showKickVotingOnScreen)}
                className={`rounded-2xl border py-10 text-lg font-semibold transition-all sm:py-14 ${
                  showKickVotingOnScreen
                    ? dark
                      ? 'border-rose-500/50 bg-rose-600/20 text-rose-100'
                      : 'border-rose-400 bg-rose-50 text-rose-950'
                    : dark
                      ? 'border-white/10 text-zinc-200 hover:bg-white/[0.04]'
                      : 'border-zinc-200 text-zinc-800 hover:bg-zinc-50'
                }`}
              >
                Кик на экран
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Убрать слабое звено из списка, сбросить голоса и счётчики?')) {
                    completeKickRound();
                  }
                }}
                className={`rounded-2xl border py-10 text-lg font-semibold transition-all sm:py-14 ${
                  dark ? 'border-rose-500/40 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20' : 'border-rose-300 bg-rose-50 text-rose-900 hover:bg-rose-100'
                }`}
              >
                Завершить кик
              </button>
            </div>

            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => setDuelPresentationActive(!duelPresentationActive)}
                className={`rounded-2xl border py-8 text-base font-semibold transition-all sm:py-10 ${
                  duelPresentationActive
                    ? dark
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100'
                      : 'border-emerald-500 bg-emerald-50 text-emerald-950'
                    : dark
                      ? 'border-white/10 text-zinc-200 hover:bg-white/[0.04]'
                      : 'border-zinc-200 text-zinc-800 hover:bg-zinc-50'
                }`}
              >
                Дуэль на экране
              </button>
              <button
                type="button"
                onClick={() => penaltyGreenHit()}
                className={`rounded-2xl border py-8 text-base font-semibold transition-all sm:py-10 ${
                  dark ? 'border-emerald-500/30 bg-emerald-950/30 text-emerald-200 hover:bg-emerald-900/40' : 'border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
                }`}
              >
                Зелёный +1
              </button>
              <button
                type="button"
                onClick={() => penaltyRedHit()}
                className={`rounded-2xl border py-8 text-base font-semibold transition-all sm:py-10 ${
                  dark ? 'border-red-500/30 bg-red-950/30 text-red-200 hover:bg-red-900/40' : 'border-red-200 bg-red-50 text-red-900 hover:bg-red-100'
                }`}
              >
                Красный +1
              </button>
            </div>
            <div className="mb-10 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => resetPenaltyScores()}
                className={`rounded-xl border px-5 py-3 text-sm font-semibold ${
                  dark ? 'border-white/10 text-zinc-300 hover:bg-white/[0.04]' : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                }`}
              >
                Сброс пенальти
              </button>
              <span className={`font-mono text-sm tabular-nums ${dark ? 'text-zinc-500' : 'text-zinc-500'}`}>
                {penaltyGreen} : {penaltyRed}
              </span>
            </div>

            <div className="mb-6 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => resetVotes()}
                className={`rounded-lg px-3 py-2 text-xs font-bold ${dark ? 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'}`}
              >
                Сбросить голоса
              </button>
              <button
                type="button"
                onClick={() => declareWeakestFromVotes()}
                className={`rounded-lg px-3 py-2 text-xs font-bold ${dark ? 'bg-rose-600 text-white hover:bg-rose-500' : 'bg-rose-600 text-white hover:bg-rose-500'}`}
              >
                Кик по голосам
              </button>
              <button
                type="button"
                onClick={() => setWeakestPlayer(null)}
                className={`rounded-lg px-3 py-2 text-xs font-bold ${dark ? 'bg-zinc-700 text-zinc-100 hover:bg-zinc-600' : 'bg-zinc-200 text-zinc-800 hover:bg-zinc-300'}`}
              >
                Снять звено
              </button>
            </div>
            <label className={`mb-8 flex cursor-pointer items-center gap-3 text-sm ${dark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              <input
                type="checkbox"
                checked={showWeakestOnScreen}
                onChange={(e) => setShowWeakestOnScreen(e.target.checked)}
                className="h-4 w-4 accent-rose-600"
              />
              Баннер «вы — слабое звено»
            </label>

            {allPlayersFlat.length === 0 ? (
              <p className="text-sm text-zinc-500">Добавьте игроков во вкладке «Игроки».</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {allPlayersFlat.map((p) => {
                  const votes = voteCounts[p.id] ?? 0;
                  const isWeakest = weakestPlayerId === p.id;
                  return (
                    <div
                      key={p.id}
                      className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-4 ${
                        isWeakest
                          ? dark
                            ? 'border-rose-500/40 bg-rose-500/10'
                            : 'border-rose-300 bg-rose-50'
                          : dark
                            ? 'border-white/[0.06] bg-white/[0.02]'
                            : 'border-zinc-100 bg-zinc-50'
                      }`}
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <span className="h-3 w-3 shrink-0 rounded-full ring-1 ring-black/10 dark:ring-white/10" style={{ backgroundColor: p.listColor }} />
                        <div className={`min-w-0 text-lg font-semibold ${dark ? 'text-zinc-100' : 'text-zinc-900'}`}>{p.name}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`font-mono text-xl tabular-nums ${dark ? 'text-zinc-200' : 'text-zinc-800'}`}>{votes}</span>
                        <button
                          type="button"
                          title="Голос"
                          onClick={() => addVoteForPlayer(p.id)}
                          className={`flex h-11 w-11 items-center justify-center rounded-full border transition-all ${
                            dark ? 'border-white/15 text-zinc-200 hover:bg-white/[0.08]' : 'border-zinc-300 text-zinc-700 hover:bg-white'
                          }`}
                        >
                          <Plus size={22} strokeWidth={2} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setWeakestPlayer(p.id)}
                          className={`rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wide ${
                            isWeakest ? 'bg-rose-600 text-white' : dark ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300'
                          }`}
                        >
                          Звено
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'players' && (
          <div
            className={`rounded-2xl border p-6 sm:p-8 transition-colors ${
              dark ? 'border-white/[0.06] bg-white/[0.02]' : 'border-zinc-200/80 bg-white'
            }`}
          >
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className={`text-xl font-light tracking-tight ${dark ? 'text-white' : 'text-zinc-900'}`}>Игроки</h2>
                <p className="mt-1 text-sm text-zinc-500">Очередь на микрофоне — сверху вниз. Цвет по кружку.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const m = teams[0];
                  if (m) addPlayer(m.id);
                }}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition-all ${
                  dark ? 'bg-white text-zinc-900 hover:bg-zinc-200' : 'bg-zinc-900 text-white hover:bg-zinc-800'
                }`}
              >
                <Plus size={18} /> Игрок
              </button>
            </div>

            {!teams[0] ? (
              <p className="text-sm text-zinc-500">Нет списка участников.</p>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onPlayerDragEnd}>
                <SortableContext items={teams[0].players.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3">
                    {teams[0].players.map((p, pi) => {
                      const tid = teams[0].id;
                      return (
                        <SortablePlayerRow
                          key={p.id}
                          player={p}
                          dark={dark}
                          activeMic={activeTeamIndex === 0 && teams[0].activePlayerIndex === pi}
                          colorHex={playerColor(p, pi)}
                          paletteOpen={accentPickerPlayerId === p.id}
                          onTogglePalette={() => setAccentPickerPlayerId((id) => (id === p.id ? null : p.id))}
                          onPickAccent={(hex) => {
                            updatePlayerAccent(tid, p.id, hex);
                            setAccentPickerPlayerId(null);
                          }}
                          onNameChange={(name) => updatePlayerName(tid, p.id, name)}
                          onMic={() => {
                            setActiveTeam(0);
                            setActivePlayer(tid, pi);
                          }}
                          onRemove={() => removePlayer(tid, p.id)}
                        />
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div
            className={`max-w-4xl rounded-2xl border p-8 transition-colors ${
              dark ? 'border-white/[0.06] bg-white/[0.02] text-white' : 'border-zinc-200/80 bg-white text-zinc-900'
            }`}
          >
            <h2 className="mb-8 text-xl font-light tracking-tight">Настройки</h2>
            <div className="space-y-10">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <div className="text-sm font-medium">Тема пульта</div>
                  <div className="mt-1 text-xs text-zinc-500">Только эта панель</div>
                </div>
                <div className={`flex rounded-full p-1 ${dark ? 'bg-white/[0.06]' : 'bg-zinc-100'}`}>
                  <button
                    type="button"
                    onClick={() => setSettings({ theme: 'light' })}
                    className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                      settings.theme === 'light' ? (dark ? 'bg-white text-zinc-900' : 'bg-zinc-900 text-white') : 'text-zinc-500'
                    }`}
                  >
                    Светлая
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettings({ theme: 'dark' })}
                    className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                      settings.theme === 'dark' ? (dark ? 'bg-white text-zinc-900' : 'bg-zinc-900 text-white') : 'text-zinc-500'
                    }`}
                  >
                    Тёмная
                  </button>
                </div>
              </div>

              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <div className="text-sm font-medium">Тема проектора</div>
                  <div className="mt-1 text-xs text-zinc-500">Сценический экран</div>
                </div>
                <div className={`flex rounded-full p-1 ${dark ? 'bg-white/[0.06]' : 'bg-zinc-100'}`}>
                  <button
                    type="button"
                    onClick={() => setSettings({ displayTheme: 'light' })}
                    className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                      (settings.displayTheme ?? settings.theme) === 'light'
                        ? dark
                          ? 'bg-white text-zinc-900'
                          : 'bg-zinc-900 text-white'
                        : 'text-zinc-500'
                    }`}
                  >
                    Светлая
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettings({ displayTheme: 'dark' })}
                    className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                      (settings.displayTheme ?? settings.theme) === 'dark'
                        ? dark
                          ? 'bg-white text-zinc-900'
                          : 'bg-zinc-900 text-white'
                        : 'text-zinc-500'
                    }`}
                  >
                    Тёмная
                  </button>
                </div>
              </div>

              <label className="block space-y-2">
                <span className="text-xs font-black uppercase tracking-widest text-zinc-400">Длительность раунда (сек)</span>
                <input
                  type="number"
                  min={10}
                  max={3600}
                  value={settings.roundTimeSec}
                  onChange={(e) => setSettings({ roundTimeSec: Number(e.target.value) })}
                  className={`w-full rounded-xl border px-4 py-3 font-bold outline-none focus:border-sky-500 ${
                    dark ? 'border-zinc-700 bg-zinc-800 text-white' : 'border-zinc-200 bg-zinc-50'
                  }`}
                />
              </label>

              <label className="flex items-center gap-3 text-sm text-zinc-400">
                <input type="checkbox" checked={showQuestionOnScreen} onChange={(e) => setShowQuestionOnScreen(e.target.checked)} className="h-4 w-4 accent-sky-600" />
                Показывать текст вопроса на проекторе
              </label>

              <label className="flex items-center gap-3 text-sm text-zinc-400">
                <input
                  type="checkbox"
                  checked={wrongPassesToNextTeam}
                  onChange={(e) => setWrongPassesToNextTeam(e.target.checked)}
                  className="h-4 w-4 accent-amber-600"
                />
                После ошибки сразу передавать ход следующей команде (иначе — следующий игрок в той же команде)
              </label>

              <div className={`space-y-6 border-t pt-8 ${dark ? 'border-zinc-800' : 'border-zinc-100'}`}>
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Проектор: звук и мемы</h3>
                <label className="flex items-center gap-3 text-sm text-zinc-400">
                  <input
                    type="checkbox"
                    checked={settings.screenAudioEnabled}
                    onChange={(e) => setSettings({ screenAudioEnabled: e.target.checked })}
                    className="h-4 w-4 accent-sky-600"
                  />
                  Звук на экране (эффекты и фон во время вопроса)
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block space-y-2">
                    <span className="text-xs text-zinc-500">Громкость фона (вопрос + таймер)</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={Math.round(settings.screenMusicVolume * 100)}
                      onChange={(e) => setSettings({ screenMusicVolume: Number(e.target.value) / 100 })}
                      disabled={!settings.screenAudioEnabled}
                      className="w-full accent-sky-600 disabled:opacity-40"
                    />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-xs text-zinc-500">Громкость эффектов (верно / ошибка / банк / дуэль)</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={Math.round(settings.screenSfxVolume * 100)}
                      onChange={(e) => setSettings({ screenSfxVolume: Number(e.target.value) / 100 })}
                      disabled={!settings.screenAudioEnabled}
                      className="w-full accent-sky-600 disabled:opacity-40"
                    />
                  </label>
                </div>
                <label className="flex items-center gap-3 text-sm text-zinc-400">
                  <input
                    type="checkbox"
                    checked={settings.screenMemesEnabled}
                    onChange={(e) => setSettings({ screenMemesEnabled: e.target.checked })}
                    className="h-4 w-4 accent-violet-600"
                  />
                  Случайные мемы справа (редко, после верно / ошибка / банк)
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block space-y-2">
                    <span className="text-xs text-zinc-500">Шанс мема за событие (%)</span>
                    <input
                      type="range"
                      min={1}
                      max={25}
                      value={Math.round(settings.memeTriggerChance * 100)}
                      onChange={(e) => setSettings({ memeTriggerChance: Number(e.target.value) / 100 })}
                      disabled={!settings.screenMemesEnabled}
                      className="w-full accent-violet-600 disabled:opacity-40"
                    />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-xs text-zinc-500">Пауза между мемами (сек)</span>
                    <input
                      type="number"
                      min={12}
                      max={600}
                      value={settings.memeCooldownSec}
                      onChange={(e) => setSettings({ memeCooldownSec: Number(e.target.value) })}
                      disabled={!settings.screenMemesEnabled}
                      className={`w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-sky-500 disabled:opacity-40 ${
                        dark ? 'border-zinc-700 bg-zinc-800 text-white' : 'border-zinc-200 bg-white'
                      }`}
                    />
                  </label>
                </div>
              </div>

              <div className={`space-y-3 border-t pt-8 ${dark ? 'border-zinc-800' : 'border-zinc-100'}`}>
                <h3 className="mb-2 text-xs font-black uppercase tracking-widest text-zinc-400">Денежная лестница</h3>
                <p className="text-sm text-zinc-400">Суммы через запятую (от меньшей к большей в цепочке).</p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    value={ladderText}
                    onChange={(e) => setLadderText(e.target.value)}
                    className={`min-w-0 flex-1 rounded-xl border px-4 py-3 outline-none focus:border-sky-500 ${
                      dark ? 'border-zinc-700 bg-zinc-800 text-white' : 'border-zinc-200 bg-white'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={applyLadder}
                    className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-sky-600 px-6 py-3 font-bold text-white hover:bg-sky-500"
                  >
                    <RotateCcw size={18} /> Применить
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer
        className={`flex flex-col items-center gap-2 border-t px-6 py-3 text-[10px] font-medium tracking-wide text-zinc-500 ${
          dark ? 'border-white/[0.06]' : 'border-zinc-200/80'
        }`}
      >
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-1">
          <span>space — верно</span>
          <span>enter — банк</span>
          <span>backspace — сброс</span>
          <span>← → — вопрос</span>
          <span>n — игрок</span>
          <span>1–9 — игрок</span>
        </div>
        <div className="text-[11px] font-normal tracking-wide text-zinc-600 dark:text-zinc-500">//keto design & develop</div>
      </footer>
    </div>
  );
}
