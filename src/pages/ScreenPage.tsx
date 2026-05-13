import { AnimatePresence, motion } from 'framer-motion';
import { useMemo } from 'react';
import type { GameFormatPhase } from '../types/game';
import { useProjectorScreenMedia, type ProjectorLayout } from '../hooks/useProjectorScreenMedia';
import { playerColor, teamAccent } from '../lib/teamColors';
import { useGameStore } from '../store/gameStore';

function PenaltyDots({ count, variant, light = false }: { count: number; variant: 'green' | 'red'; light?: boolean }) {
  const empty = light ? 'border-zinc-300/90 bg-transparent opacity-45' : 'border-white/15 bg-transparent opacity-30';
  return (
    <div className="flex flex-wrap justify-center gap-2 sm:gap-4">
      {Array.from({ length: 5 }, (_, i) => (
        <div
          key={i}
          className={`h-11 w-11 rounded-full border-[3px] sm:h-14 sm:w-14 sm:border-4 ${
            i < count
              ? variant === 'green'
                ? 'border-emerald-200 bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                : 'border-red-200 bg-red-600 shadow-[0_0_20px_rgba(239,68,68,0.4)]'
              : empty
          }`}
        />
      ))}
    </div>
  );
}

const PHASE_LABELS: Record<GameFormatPhase, string> = {
  team_rounds: 'Команды',
  merged_queue: 'Слияние',
  pre_final: 'Предфинал',
  final_duel: 'Финал',
  award: 'Награждение',
};

function formatMoney(n: number): string {
  return new Intl.NumberFormat('ru-RU').format(n);
}

export function ScreenPage() {
  const settings = useGameStore((s) => s.settings);
  const teams = useGameStore((s) => s.teams);
  const activeTeamIndex = useGameStore((s) => s.activeTeamIndex);
  const questions = useGameStore((s) => s.questions);
  const currentQuestionIndex = useGameStore((s) => s.currentQuestionIndex);
  const timerSeconds = useGameStore((s) => s.timerSeconds);
  const timerRunning = useGameStore((s) => s.timerRunning);
  const showQuestionOnScreen = useGameStore((s) => s.showQuestionOnScreen);
  const screenFocus = useGameStore((s) => s.screenFocus);
  const lastPulse = useGameStore((s) => s.lastPulse);
  const weakestPlayerId = useGameStore((s) => s.weakestPlayerId);
  const showWeakestOnScreen = useGameStore((s) => s.showWeakestOnScreen);
  const showLeaderboardOnScreen = useGameStore((s) => s.showLeaderboardOnScreen);
  const showKickVotingOnScreen = useGameStore((s) => s.showKickVotingOnScreen);
  const voteCounts = useGameStore((s) => s.voteCounts);
  const duelPresentationActive = useGameStore((s) => s.duelPresentationActive);
  const penaltyGreen = useGameStore((s) => s.penaltyGreen);
  const penaltyRed = useGameStore((s) => s.penaltyRed);
  const bankFlashAt = useGameStore((s) => s.bankFlashAt);
  const roundTimeExpired = useGameStore((s) => s.roundTimeExpired);
  const playerCorrectCounts = useGameStore((s) => s.playerCorrectCounts);
  const formatPhase = useGameStore((s) => s.formatPhase);
  const championPlayerId = useGameStore((s) => s.championPlayerId);
  const duelPlayerIds = useGameStore((s) => s.duelPlayerIds);
  const duelScores = useGameStore((s) => s.duelScores);

  const displayTheme = settings.displayTheme ?? settings.theme;
  const light = displayTheme === 'light';

  const team = teams[activeTeamIndex];
  const activePlayer = team?.players?.[team.activePlayerIndex];
  const accent = activePlayer
    ? playerColor(activePlayer, team.activePlayerIndex)
    : team
      ? teamAccent(team, activeTeamIndex)
      : '#a1a1aa';
  const q = questions[currentQuestionIndex];

  const ladder = settings.ladder;
  const ladderVisual = useMemo(
    () => ladder.map((amount, idx) => ({ amount, idx })).reverse(),
    [ladder],
  );

  const totalBank = useMemo(() => teams.reduce((s, t) => s + t.bankTotal, 0), [teams]);

  const weakestName = useMemo(() => {
    if (!weakestPlayerId) return null;
    for (const t of teams) {
      const p = t.players.find((pl) => pl.id === weakestPlayerId);
      if (p) return p.name;
    }
    return null;
  }, [teams, weakestPlayerId]);

  const showWeakestBanner = Boolean(
    weakestPlayerId && showWeakestOnScreen && weakestName && !showLeaderboardOnScreen && !showKickVotingOnScreen,
  );

  const championName = useMemo(() => {
    if (!championPlayerId) return null;
    for (const t of teams) {
      const p = t.players.find((pl) => pl.id === championPlayerId);
      if (p) return p.name;
    }
    return null;
  }, [teams, championPlayerId]);

  const duelNames = useMemo(() => {
    const find = (id: string | null) => {
      if (!id) return '—';
      for (const t of teams) {
        const p = t.players.find((pl) => pl.id === id);
        if (p) return p.name;
      }
      return '—';
    };
    return [find(duelPlayerIds[0]), find(duelPlayerIds[1])] as const;
  }, [teams, duelPlayerIds]);

  const leaderboardRows = useMemo(() => {
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

  const kickVotingRows = useMemo(() => {
    let gi = 0;
    const rows = teams.flatMap((t) =>
      t.players.map((p) => ({
        id: p.id,
        name: p.name,
        accent: playerColor(p, gi++),
        votes: voteCounts[p.id] ?? 0,
        correct: playerCorrectCounts[p.id] ?? 0,
      })),
    );
    rows.sort((a, b) => b.votes - a.votes || b.correct - a.correct || a.name.localeCompare(b.name, 'ru'));
    return rows;
  }, [teams, voteCounts, playerCorrectCounts]);

  const footerPlayers = useMemo(() => {
    let gi = 0;
    return teams.flatMap((t, ti) =>
      t.players.map((p, pi) => ({
        id: p.id,
        name: p.name,
        color: playerColor(p, gi++),
        onMic: ti === activeTeamIndex && pi === t.activePlayerIndex,
      })),
    );
  }, [teams, activeTeamIndex]);

  const currentLadderIdx =
    team && team.chainLevel > 0 ? Math.min(team.chainLevel - 1, ladder.length - 1) : -1;

  const urgent = timerSeconds <= 10 && timerRunning;
  const critical = timerSeconds <= 5 && timerRunning;

  const pulseTint =
    lastPulse.kind === 'correct'
      ? light
        ? 'rgba(16,185,129,0.12)'
        : 'rgba(52,211,153,0.14)'
      : lastPulse.kind === 'wrong'
        ? light
          ? 'rgba(244,63,94,0.08)'
          : 'rgba(251,113,133,0.12)'
        : lastPulse.kind === 'bank'
          ? light
            ? 'rgba(245,158,11,0.1)'
            : 'rgba(251,191,36,0.1)'
          : 'transparent';

  const statusHint = useMemo(() => {
    if (!lastPulse.kind) return null;
    if (lastPulse.kind === 'correct') {
      const atPeak = team && team.chainLevel >= ladder.length;
      return { key: String(lastPulse.at), text: atPeak ? 'максимум' : 'цепочка', className: 'text-emerald-600/90' };
    }
    if (lastPulse.kind === 'wrong') return { key: String(lastPulse.at), text: 'с нуля', className: 'text-rose-500/90' };
    if (lastPulse.kind === 'bank') return { key: String(lastPulse.at), text: 'зачислено', className: 'text-amber-600/90' };
    return null;
  }, [lastPulse.at, lastPulse.kind, team, ladder.length]);

  const showQuestionHero =
    showQuestionOnScreen && screenFocus === 'question' && Boolean(q?.text);

  const shell = light
    ? 'bg-[#fafafa] text-zinc-900 antialiased'
    : 'bg-[#09090b] text-zinc-100 antialiased';

  const hairline = light ? 'border-zinc-200/80' : 'border-white/[0.06]';
  const muted = light ? 'text-zinc-400' : 'text-zinc-500';
  const timerClass = critical
    ? 'text-rose-500'
    : urgent
      ? light
        ? 'text-amber-600'
        : 'text-amber-400'
      : light
        ? 'text-zinc-800'
        : 'text-zinc-100';

  const tickScale =
    formatPhase !== 'final_duel' && timerRunning && !roundTimeExpired && timerSeconds <= 5 && timerSeconds >= 1
      ? 1 + (5 - timerSeconds) * 0.13
      : 1;

  const projectorLayout: ProjectorLayout = showKickVotingOnScreen
    ? 'kick'
    : duelPresentationActive
      ? 'duel'
      : showLeaderboardOnScreen
        ? 'leaderboard'
        : formatPhase === 'award'
          ? 'award'
          : 'main';

  const { memeUrl } = useProjectorScreenMedia({
    layout: projectorLayout,
    settings,
    showQuestionOnScreen,
    timerRunning,
    timerSeconds,
    lastPulse,
    duelPresentationActive,
    formatPhase,
    roundTimeExpired,
  });

  if (showKickVotingOnScreen) {
    return (
      <div className="flex min-h-screen flex-col bg-[#1f0505] text-red-50 antialiased">
        <header className="shrink-0 px-4 py-10 text-center sm:px-8 sm:py-14">
          <div className="text-[10px] font-medium uppercase tracking-[0.5em] text-red-400/80">Голосование</div>
          <h1 className="mt-4 text-balance text-4xl font-black uppercase leading-none tracking-tight text-red-500 drop-shadow-[0_0_40px_rgba(220,38,38,0.55)] sm:text-6xl md:text-7xl lg:text-8xl">
            КТО СЛАБОЕ ЗВЕНО?
          </h1>
        </header>
        <main className="flex flex-1 flex-col justify-center px-3 pb-12 sm:px-8">
          <div className="mx-auto w-full max-w-4xl divide-y divide-red-950/60 rounded-2xl border border-red-900/40 bg-black/30 sm:rounded-3xl">
            {kickVotingRows.length === 0 ? (
              <div className="px-6 py-20 text-center text-lg text-red-300/70">Нет участников</div>
            ) : (
              kickVotingRows.map((row, rank) => (
                <motion.div
                  key={row.id}
                  layout
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(rank * 0.03, 0.45), duration: 0.3 }}
                  className={`flex flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-8 sm:py-6 ${
                    rank === 0 ? 'bg-red-950/35' : ''
                  }`}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <span className="w-8 shrink-0 font-mono text-xl tabular-nums text-red-400/60 sm:w-10 sm:text-2xl">{rank + 1}</span>
                    <span className="h-3 w-3 shrink-0 rounded-full ring-2 ring-red-500/30" style={{ backgroundColor: row.accent }} />
                    <span className="min-w-0 truncate text-xl font-semibold tracking-tight sm:text-2xl">{row.name}</span>
                  </div>
                  <div className="flex shrink-0 items-baseline gap-8 sm:gap-12">
                    <div className="text-right">
                      <div className="text-[9px] font-semibold uppercase tracking-widest text-red-400/70">голоса</div>
                      <div className="font-mono text-3xl font-bold tabular-nums text-red-100 sm:text-4xl">{row.votes}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[9px] font-semibold uppercase tracking-widest text-red-400/70">верно</div>
                      <div className="font-mono text-2xl font-light tabular-nums text-zinc-300 sm:text-3xl">{row.correct}</div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </main>
      </div>
    );
  }

  if (duelPresentationActive) {
    const timerClassDuel = critical
      ? 'text-rose-400'
      : urgent
        ? 'text-amber-400'
        : light
          ? 'text-zinc-800'
          : 'text-zinc-100';
    return (
      <div className={`relative flex min-h-screen flex-col ${shell}`}>
        <div className={`shrink-0 border-b px-4 py-5 text-center sm:px-10 ${hairline}`}>
          {showQuestionOnScreen && q?.text ? (
            <p className={`mx-auto max-w-4xl text-balance text-lg font-light leading-snug sm:text-2xl ${light ? 'text-zinc-800' : 'text-zinc-100'}`}>
              {q.text}
            </p>
          ) : (
            <div className={`text-xs uppercase tracking-[0.25em] ${muted}`}>Дуэль</div>
          )}
          <div className={`mt-4 font-mono text-4xl font-semibold tabular-nums sm:text-5xl ${timerClassDuel}`}>
            {String(Math.floor(timerSeconds / 60)).padStart(2, '0')}
            <span className="mx-1 opacity-30">:</span>
            {String(timerSeconds % 60).padStart(2, '0')}
          </div>
          <div className={`mt-1 text-[10px] font-medium uppercase tracking-[0.2em] ${muted}`}>{timerRunning ? 'идёт' : 'пауза'}</div>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center gap-10 px-4 py-10 sm:gap-14 sm:py-16">
          <div className={`font-mono text-6xl font-black tabular-nums tracking-tight sm:text-8xl md:text-9xl ${light ? 'text-zinc-900' : 'text-white'}`}>
            {penaltyGreen}
            <span className="mx-3 font-light opacity-40 sm:mx-6">:</span>
            {penaltyRed}
          </div>

          <div className="grid w-full max-w-3xl grid-cols-1 gap-12 sm:grid-cols-2 sm:gap-8">
            <div className="text-center">
              <div className="mb-4 text-xs font-semibold uppercase tracking-[0.35em] text-emerald-500">Зелёные</div>
              <PenaltyDots count={penaltyGreen} variant="green" light={light} />
            </div>
            <div className="text-center">
              <div className="mb-4 text-xs font-semibold uppercase tracking-[0.35em] text-red-500">Красные</div>
              <PenaltyDots count={penaltyRed} variant="red" light={light} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showLeaderboardOnScreen) {
    return (
      <div className={`relative flex min-h-screen flex-col ${shell}`}>
        <header className={`relative z-20 flex shrink-0 items-center justify-between border-b px-6 py-6 sm:px-12 ${hairline}`}>
          <div>
            <div className={`text-[10px] font-medium uppercase tracking-[0.45em] ${muted}`}>Слабое звено</div>
            <h1 className={`mt-2 text-3xl font-light tracking-tight sm:text-4xl ${light ? 'text-zinc-900' : 'text-white'}`}>Таблица лидеров</h1>
            <p className={`mt-2 max-w-xl text-sm ${muted}`}>Учитываются только верные ответы (кнопка «верно» / Space). Ошибки счёт не меняют.</p>
          </div>
        </header>
        <main className="relative z-20 flex flex-1 flex-col justify-center px-4 py-10 sm:px-12 sm:py-14">
          <div className="mx-auto w-full max-w-4xl">
            <div
              className={`overflow-hidden rounded-2xl border sm:rounded-3xl ${light ? 'border-zinc-200 bg-white shadow-xl' : 'border-white/10 bg-white/[0.03]'}`}
            >
              <div
                className={`flex border-b px-4 py-4 text-xs font-semibold uppercase tracking-wider sm:px-6 sm:py-5 sm:text-sm ${hairline} ${muted}`}
              >
                <span className="w-12 shrink-0 tabular-nums sm:w-14">#</span>
                <span className="min-w-0 flex-1">Игрок</span>
                <span className="w-20 shrink-0 text-right sm:w-24">Верно</span>
              </div>
              <div className="divide-y divide-zinc-200/80 dark:divide-white/[0.06]">
                {leaderboardRows.length === 0 ? (
                  <div className={`px-6 py-16 text-center text-lg ${muted}`}>Пока нет данных — начните игру и отмечайте верные ответы.</div>
                ) : (
                  leaderboardRows.map((row, rank) => (
                    <motion.div
                      key={row.id}
                      layout
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(rank * 0.04, 0.5), duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                      className={`flex items-center gap-3 px-4 py-4 sm:px-6 sm:py-5 ${
                        rank === 0 ? (light ? 'bg-amber-50/80' : 'bg-amber-500/[0.07]') : ''
                      }`}
                    >
                      <span className={`w-12 shrink-0 font-mono text-lg tabular-nums sm:w-14 sm:text-xl ${muted}`}>{rank + 1}</span>
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: row.accent }} />
                        <div className="min-w-0">
                          <div className={`truncate text-lg font-semibold sm:text-xl ${light ? 'text-zinc-900' : 'text-zinc-50'}`}>{row.name}</div>
                        </div>
                      </div>
                      <span className={`w-20 shrink-0 text-right font-mono text-2xl font-bold tabular-nums sm:w-24 sm:text-3xl ${light ? 'text-emerald-700' : 'text-emerald-400'}`}>
                        {row.correct}
                      </span>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (formatPhase === 'award') {
    return (
      <div className={`relative flex min-h-screen flex-col items-center justify-center px-6 py-16 ${shell}`}>
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 22 }}
          className="max-w-3xl text-center"
        >
          <div className={`text-[10px] font-medium uppercase tracking-[0.45em] ${muted}`}>Награждение</div>
          <h1 className={`mt-4 text-4xl font-light tracking-tight sm:text-5xl md:text-6xl ${light ? 'text-zinc-900' : 'text-white'}`}>
            Победитель забирает всё
          </h1>
          {championName ? (
            <p className={`mt-8 text-5xl font-black tracking-tight sm:text-6xl md:text-7xl ${light ? 'text-emerald-700' : 'text-emerald-400'}`}>{championName}</p>
          ) : (
            <p className={`mt-8 text-xl ${muted}`}>На пульте выберите победителя в настройках сценария.</p>
          )}
          <div className={`mt-10 rounded-2xl border px-8 py-6 ${light ? 'border-zinc-200 bg-white' : 'border-white/10 bg-white/[0.04]'}`}>
            <div className={`text-xs font-semibold uppercase tracking-widest ${muted}`}>Сумма в банках команд</div>
            <div className={`mt-2 font-mono text-4xl font-light tabular-nums sm:text-5xl ${light ? 'text-zinc-900' : 'text-white'}`}>{formatMoney(totalBank)}</div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`relative flex min-h-screen flex-col ${shell}`}>
      <AnimatePresence>
        {bankFlashAt > 0 ? (
          <motion.div
            key={bankFlashAt}
            initial={{ opacity: 0.92 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="pointer-events-none fixed inset-0 z-[100] bg-white"
          />
        ) : null}
      </AnimatePresence>
      <AnimatePresence>
        {lastPulse.kind ? (
          <motion.div
            key={lastPulse.at}
            initial={{ opacity: 0.45 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
            className="pointer-events-none absolute inset-0 z-10"
            style={{ background: `radial-gradient(ellipse 70% 45% at 50% 42%, ${pulseTint}, transparent)` }}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showWeakestBanner ? (
          <motion.div
            key={weakestPlayerId ?? 'w'}
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -12 }}
            transition={{ type: 'spring', stiffness: 280, damping: 26 }}
            className="pointer-events-none absolute inset-x-0 top-[18%] z-30 flex justify-center px-4 sm:top-[20%]"
          >
            <div
              className={`max-w-[min(96vw,920px)] rounded-3xl border px-8 py-6 text-center shadow-2xl backdrop-blur-md sm:px-12 sm:py-8 ${
                light
                  ? 'border-rose-300/80 bg-rose-50/95 text-rose-950'
                  : 'border-rose-500/40 bg-[#18100f]/95 text-rose-100'
              }`}
            >
              <div className={`text-sm font-semibold uppercase tracking-[0.35em] sm:text-base ${light ? 'text-rose-700' : 'text-rose-300'}`}>
                Вы — слабое звено
              </div>
              <div className="mt-3 text-4xl font-black tracking-tight sm:text-5xl md:text-6xl">{weakestName}</div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <header className={`relative z-20 flex shrink-0 items-end justify-between border-b px-6 py-5 sm:px-10 ${hairline}`}>
        <div>
          <div className={`text-[10px] font-medium uppercase tracking-[0.45em] ${muted}`}>Слабое звено</div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className="text-lg font-light tracking-[-0.02em] sm:text-xl">шоу</span>
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                light ? 'border-zinc-300 bg-zinc-100 text-zinc-700' : 'border-white/15 bg-white/[0.06] text-zinc-300'
              }`}
            >
              {PHASE_LABELS[formatPhase]}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-[10px] font-medium uppercase tracking-[0.35em] ${muted}`}>всего в банках</div>
          <div className="mt-1 font-mono text-xl font-light tabular-nums tracking-tight sm:text-2xl">{formatMoney(totalBank)}</div>
        </div>
      </header>

      <div className="relative z-20 flex min-h-0 flex-1 flex-col gap-8 px-6 py-8 sm:flex-row sm:px-10 sm:py-10">
        <aside className="flex shrink-0 flex-row gap-2 sm:w-52 md:w-64 sm:flex-col sm:justify-center sm:gap-2 md:gap-2.5">
          {ladderVisual.map(({ amount, idx }) => {
            const lit = team ? team.chainLevel > idx : false;
            const stepActive = currentLadderIdx === idx;
            return (
              <div
                key={idx}
                className={`flex min-w-0 flex-1 items-center justify-center rounded-xl border px-2 py-3 font-mono text-sm font-black tabular-nums tracking-tight transition-all sm:flex-initial sm:px-4 sm:py-3.5 md:text-2xl md:py-4 ${
                  lit || stepActive
                    ? light
                      ? 'border-zinc-900/20 bg-white shadow-md'
                      : 'border-white/15 bg-white/[0.06]'
                    : light
                      ? 'border-transparent text-zinc-400'
                      : 'border-transparent text-zinc-600'
                }`}
                style={
                  lit || stepActive
                    ? { borderLeftWidth: 5, borderLeftColor: accent, borderLeftStyle: 'solid' as const }
                    : undefined
                }
              >
                <span className={lit || stepActive ? 'opacity-100' : 'opacity-40'}>{formatMoney(amount)}</span>
              </div>
            );
          })}
        </aside>

        <main className="flex flex-1 flex-col items-center justify-center text-center">
          <AnimatePresence mode="wait">
            {roundTimeExpired ? (
              <motion.div
                key="round-ended"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 220, damping: 20 }}
                className="max-w-3xl px-4"
              >
                <p
                  className={`text-balance text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl ${
                    light ? 'text-zinc-900' : 'text-zinc-50'
                  }`}
                >
                  Раунд закончен
                </p>
                <p className={`mt-4 text-sm font-medium uppercase tracking-[0.25em] ${muted}`}>Сбросьте или запустите таймер с пульта</p>
              </motion.div>
            ) : showQuestionHero ? (
              <motion.div
                key={q?.id ?? 'q'}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="max-w-4xl px-2"
              >
                <p
                  className={`text-balance text-3xl font-light leading-[1.2] tracking-[-0.02em] sm:text-4xl md:text-5xl lg:text-6xl ${
                    light ? 'text-zinc-800' : 'text-zinc-50'
                  }`}
                >
                  {q?.text}
                </p>
              </motion.div>
            ) : showQuestionOnScreen && q?.text ? (
              <motion.p
                key="q-compact"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.45 }}
                className={`max-w-3xl text-balance text-xl font-light sm:text-2xl ${muted}`}
              >
                {q.text}
              </motion.p>
            ) : (
              <div className={`h-px w-16 ${light ? 'bg-zinc-200' : 'bg-zinc-800'}`} aria-hidden />
            )}
          </AnimatePresence>

          <motion.div
            animate={
              formatPhase === 'final_duel'
                ? { opacity: 1 }
                : critical && timerRunning && !roundTimeExpired
                  ? { opacity: [1, 0.88, 1], x: [0, -3, 3, -2, 2, 0], rotate: [0, -0.4, 0.4, 0] }
                  : urgent && timerRunning && !roundTimeExpired
                    ? { opacity: [1, 0.92, 1] }
                    : { opacity: 1, x: 0, rotate: 0 }
            }
            transition={{
              repeat:
                formatPhase === 'final_duel'
                  ? 0
                  : (critical || urgent) && timerRunning && !roundTimeExpired
                    ? Infinity
                    : 0,
              duration: critical ? 0.45 : urgent ? 1.05 : 0.3,
              ease: 'easeInOut',
            }}
            className={`mt-8 sm:mt-12 ${formatPhase === 'final_duel' ? 'max-w-2xl' : ''}`}
          >
            {formatPhase === 'final_duel' ? (
              <div className="space-y-6">
                <p className={`text-sm font-semibold uppercase tracking-[0.2em] ${muted}`}>Финал · пенальти · без таймера</p>
                <p className={`text-xs ${muted}`}>По 5 удачных ответов с каждой стороны ведите вручную; счёт ниже растёт при «верно» у финалиста на микрофоне.</p>
                <div className="grid grid-cols-2 gap-4 sm:gap-8">
                  <div className={`rounded-2xl border px-4 py-6 sm:px-6 ${light ? 'border-zinc-200 bg-white' : 'border-white/10 bg-white/[0.04]'}`}>
                    <div className={`truncate text-sm font-medium ${muted}`}>{duelNames[0]}</div>
                    <div className={`mt-2 font-mono text-5xl font-bold tabular-nums sm:text-6xl ${light ? 'text-zinc-900' : 'text-white'}`}>{duelScores[0]}</div>
                  </div>
                  <div className={`rounded-2xl border px-4 py-6 sm:px-6 ${light ? 'border-zinc-200 bg-white' : 'border-white/10 bg-white/[0.04]'}`}>
                    <div className={`truncate text-sm font-medium ${muted}`}>{duelNames[1]}</div>
                    <div className={`mt-2 font-mono text-5xl font-bold tabular-nums sm:text-6xl ${light ? 'text-zinc-900' : 'text-white'}`}>{duelScores[1]}</div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <motion.div
                  animate={
                    roundTimeExpired
                      ? { scale: [1.15, 1], opacity: [1, 0.85, 1] }
                      : { scale: tickScale }
                  }
                  transition={
                    roundTimeExpired
                      ? { duration: 0.45, ease: 'easeOut' }
                      : { type: 'spring', stiffness: 260, damping: 22 }
                  }
                  className="origin-center"
                >
                  <div className={`font-mono text-6xl font-semibold tabular-nums tracking-[-0.06em] sm:text-7xl md:text-8xl lg:text-9xl ${timerClass}`}>
                    {String(Math.floor(timerSeconds / 60)).padStart(2, '0')}
                    <span className="mx-1 opacity-30">:</span>
                    {String(timerSeconds % 60).padStart(2, '0')}
                  </div>
                </motion.div>
                <div className={`mt-3 text-[11px] font-medium uppercase tracking-[0.25em] ${muted}`}>
                  {roundTimeExpired ? 'время' : timerRunning ? 'идёт' : 'пауза'}
                </div>
              </>
            )}
          </motion.div>
        </main>

        <AnimatePresence>
          {memeUrl ? (
            <motion.div
              key={memeUrl}
              initial={{ x: 140, opacity: 0, rotate: 5 }}
              animate={{ x: 0, opacity: 1, rotate: 0 }}
              exit={{ x: 200, opacity: 0, rotate: -4 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              className="pointer-events-none absolute right-3 top-1/2 z-40 max-h-[48vh] w-[min(42vw,380px)] -translate-y-1/2 sm:right-8"
            >
              <img
                src={memeUrl}
                alt=""
                className="h-auto w-full rounded-2xl border border-white/10 object-contain shadow-2xl dark:border-white/10"
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <footer className={`relative z-20 shrink-0 border-t px-3 py-3 sm:px-6 ${hairline}`}>
        <div className="mx-auto flex max-w-[1600px] flex-nowrap items-center justify-center gap-x-0.5 gap-y-1 overflow-x-auto pb-0.5 sm:gap-x-1">
          {footerPlayers.map((fp) => {
            const n = footerPlayers.length;
            const size =
              n > 18
                ? 'max-w-[min(72px,14vw)] px-1 py-0.5 text-[7px] sm:text-[8px]'
                : n > 12
                  ? 'max-w-[min(100px,16vw)] px-1 py-0.5 text-[8px] sm:text-[9px]'
                  : n > 8
                    ? 'max-w-[min(120px,18vw)] px-1.5 py-0.5 text-[9px] sm:text-[10px]'
                    : 'max-w-[min(160px,22vw)] px-2 py-1 text-[10px] sm:text-xs';
            return (
              <span
                key={fp.id}
                className={`inline-flex shrink-0 items-center gap-0.5 rounded-full font-medium sm:gap-1 ${
                  fp.onMic
                    ? light
                      ? 'bg-zinc-900 text-white'
                      : 'bg-white text-zinc-900'
                    : light
                      ? 'bg-zinc-200/70 text-zinc-700'
                      : 'bg-zinc-800/90 text-zinc-300'
                } ${size}`}
              >
                <span className="h-1 w-1 shrink-0 rounded-full sm:h-1.5 sm:w-1.5" style={{ backgroundColor: fp.color }} />
                <span className="min-w-0 truncate">{fp.name}</span>
              </span>
            );
          })}
        </div>

        <AnimatePresence>
          {statusHint ? (
            <motion.div
              key={statusHint.key}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className={`mt-4 text-center text-xs font-medium tracking-[0.2em] ${statusHint.className}`}
            >
              {statusHint.text}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </footer>
    </div>
  );
}
