import { newId, type CaptionDoc, type Emotion, type Word } from "@capseasy/shared";

/** All operations are immutable and id-based (never array-index based). */

const MIN_WORD_MS = 40;

const touch = (doc: CaptionDoc, patch: Partial<CaptionDoc>): CaptionDoc => ({
  ...doc,
  ...patch,
  meta: { ...doc.meta, userEdited: true },
});

const mapWord = (doc: CaptionDoc, id: string, fn: (w: Word) => Word): CaptionDoc => {
  let hit = false;
  const words = doc.words.map((w) => {
    if (w.id !== id) return w;
    hit = true;
    return fn(w);
  });
  return hit ? touch(doc, { words }) : doc;
};

const indexOfWord = (doc: CaptionDoc, id: string) => doc.words.findIndex((w) => w.id === id);

/** Editing a word to empty deletes it from view (timing stays so neighbours don't shift). */
export function setWordText(doc: CaptionDoc, id: string, text: string): CaptionDoc {
  const t = text.trim();
  return mapWord(doc, id, (w) => ({
    ...w,
    text: t || w.text,
    hidden: t ? w.hidden : true,
    source: { ...w.source, text: "user" },
  }));
}

export function setHidden(doc: CaptionDoc, id: string, hidden: boolean): CaptionDoc {
  return mapWord(doc, id, (w) => ({ ...w, hidden }));
}

export function setEmphasis(doc: CaptionDoc, id: string, emphasis: "none" | "strong" | "hero"): CaptionDoc {
  // only one hero per card: clear other heroes in the same card is done by the caller via card words;
  // here we simply record the user's choice.
  return mapWord(doc, id, (w) => ({ ...w, emphasis, source: { ...w.source, emphasis: "user" } }));
}

export function setWordColor(doc: CaptionDoc, id: string, color: string | undefined): CaptionDoc {
  return mapWord(doc, id, (w) => ({ ...w, color }));
}

export function setWordEmoji(doc: CaptionDoc, id: string, emoji: Word["emoji"]): CaptionDoc {
  return mapWord(doc, id, (w) => ({ ...w, emoji, source: { ...w.source, emoji: "user" } }));
}

/** Move a word's edges. Neighbours give way (their touching edge moves) but never below the minimum duration. */
export function retimeWord(doc: CaptionDoc, id: string, startMs: number, endMs: number): CaptionDoc {
  const i = indexOfWord(doc, id);
  if (i < 0) return doc;
  const prev = doc.words[i - 1];
  const next = doc.words[i + 1];
  const lo = prev ? prev.startMs + MIN_WORD_MS : 0;
  const hi = next ? next.endMs - MIN_WORD_MS : Number.POSITIVE_INFINITY;
  const s = Math.round(Math.max(lo, Math.min(startMs, hi - MIN_WORD_MS)));
  const e = Math.round(Math.min(hi, Math.max(endMs, s + MIN_WORD_MS)));
  const words = doc.words.map((w, k) => {
    if (k === i) return { ...w, startMs: s, endMs: e };
    if (k === i - 1 && w.endMs > s) return { ...w, endMs: Math.max(w.startMs + MIN_WORD_MS, s) };
    if (k === i + 1 && w.startMs < e) return { ...w, startMs: Math.min(w.endMs - MIN_WORD_MS, e) };
    return w;
  });
  return touch(doc, { words });
}

/** "Split here": the word starts a new card. */
export function splitCardAt(doc: CaptionDoc, wordId: string): CaptionDoc {
  const i = indexOfWord(doc, wordId);
  if (i <= 0) return doc;
  const prev = doc.words[i - 1]!;
  return touch(doc, {
    manualBreaks: doc.manualBreaks.includes(wordId) ? doc.manualBreaks : [...doc.manualBreaks, wordId],
    noBreakAfter: doc.noBreakAfter.filter((x) => x !== prev.id),
  });
}

/** "Merge with previous card": the word continues the previous card. */
export function mergeWithPrevious(doc: CaptionDoc, wordId: string): CaptionDoc {
  const i = indexOfWord(doc, wordId);
  if (i <= 0) return doc;
  const prev = doc.words[i - 1]!;
  return touch(doc, {
    manualBreaks: doc.manualBreaks.filter((x) => x !== wordId),
    noBreakAfter: doc.noBreakAfter.includes(prev.id) ? doc.noBreakAfter : [...doc.noBreakAfter, prev.id],
  });
}

export function setCardEmotion(doc: CaptionDoc, firstWordId: string, emotion: Emotion | undefined, source: "user" | "ai" | "heuristic" = "user"): CaptionDoc {
  const cards = { ...doc.cards };
  const cur = { ...cards[firstWordId] };
  if (emotion) {
    cur.emotion = emotion;
    cur.emotionSource = source;
  } else {
    delete cur.emotion;
    delete cur.emotionSource;
  }
  cards[firstWordId] = cur;
  return touch(doc, { cards });
}

export function setCardPosition(doc: CaptionDoc, firstWordId: string, position: { x: number; y: number } | null): CaptionDoc {
  return touch(doc, { cards: { ...doc.cards, [firstWordId]: { ...doc.cards[firstWordId], position } } });
}

/** Insert a new word after `afterId` (or at the start when null), timed inside the available gap. */
export function insertWordAfter(doc: CaptionDoc, afterId: string | null, text: string): CaptionDoc {
  const i = afterId ? indexOfWord(doc, afterId) : -1;
  const prev = doc.words[i];
  const next = doc.words[i + 1];
  const start = prev ? prev.endMs : 0;
  const end = next ? Math.max(start + MIN_WORD_MS, Math.min(next.startMs, start + 400)) : start + 400;
  const word: Word = { id: newId(), text: text.trim(), startMs: start, endMs: end, source: { text: "user" } };
  const words = [...doc.words.slice(0, i + 1), word, ...doc.words.slice(i + 1)];
  return touch(doc, { words });
}

/** Hard delete (use setHidden for reversible removal). Cleans up break bookkeeping. */
export function deleteWord(doc: CaptionDoc, id: string): CaptionDoc {
  const cards = { ...doc.cards };
  delete cards[id];
  return touch(doc, {
    words: doc.words.filter((w) => w.id !== id),
    manualBreaks: doc.manualBreaks.filter((x) => x !== id),
    noBreakAfter: doc.noBreakAfter.filter((x) => x !== id),
    cards,
  });
}

export interface FindReplaceOptions {
  matchCase?: boolean;
  wholeWord?: boolean;
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function findMatches(doc: CaptionDoc, find: string, o: FindReplaceOptions = {}): string[] {
  if (!find) return [];
  const re = new RegExp(o.wholeWord ? `^${esc(find)}$` : esc(find), o.matchCase ? "" : "i");
  const core = (t: string) => (o.wholeWord ? t.replace(/[^\p{L}\p{N}'-]/gu, "") : t);
  return doc.words.filter((w) => re.test(core(w.text))).map((w) => w.id);
}

export function findReplace(doc: CaptionDoc, find: string, replace: string, o: FindReplaceOptions = {}): { doc: CaptionDoc; count: number } {
  const ids = new Set(findMatches(doc, find, o));
  if (ids.size === 0) return { doc, count: 0 };
  const re = new RegExp(esc(find), o.matchCase ? "g" : "gi");
  const words = doc.words.map((w) => (ids.has(w.id) ? { ...w, text: w.text.replace(re, replace), source: { ...w.source, text: "user" as const } } : w));
  return { doc: touch(doc, { words }), count: ids.size };
}

/** Drop bookkeeping that points at words that no longer exist. */
export function pruneDoc(doc: CaptionDoc): CaptionDoc {
  const ids = new Set(doc.words.map((w) => w.id));
  const cards = Object.fromEntries(Object.entries(doc.cards).filter(([k]) => ids.has(k)));
  return {
    ...doc,
    manualBreaks: doc.manualBreaks.filter((x) => ids.has(x)),
    noBreakAfter: doc.noBreakAfter.filter((x) => ids.has(x)),
    cards,
  };
}
