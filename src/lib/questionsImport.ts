import type { Question } from '../types/game';

function newId(): string {
  return crypto.randomUUID();
}

/** Разбор JSON из ИИ/файла: массив объектов с полями text/question и correctAnswer/answer */
export function questionsFromUnknownJson(raw: unknown): Question[] {
  const arr = Array.isArray(raw) ? raw : raw && typeof raw === 'object' && 'questions' in (raw as object) ? (raw as { questions: unknown }).questions : null;
  if (!Array.isArray(arr)) return [];

  const out: Question[] = [];
  for (const item of arr) {
    if (typeof item !== 'object' || item === null) continue;
    const o = item as Record<string, unknown>;
    const text = String(o.text ?? o.question ?? o.q ?? '').trim();
    const correctAnswer = String(o.correctAnswer ?? o.answer ?? o.a ?? '').trim();
    if (!text) continue;
    out.push({ id: newId(), text, correctAnswer });
  }
  return out;
}
