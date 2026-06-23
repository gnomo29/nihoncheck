/**
 * Algoritmo de confianza para resultados de lookup (NihonCheck).
 * Pesos: 0.5 lectura + 0.4 significado + 0.1 fuentes
 */

import { toHiragana, isKana } from 'wanakana';

/**
 * Calcula confianza agregada a partir de fuentes de lookup.
 * @param {object} opts
 * @param {{ readings?: string[], senses?: string[] }} [opts.jisho]
 * @param {string|null} [opts.deepL]
 * @param {Array<{ surface?: string, reading?: string }>} [opts.kuromojiTokens]
 * @param {{ jmdict?: boolean, tatoeba?: boolean }|string[]} [opts.otherSources]
 * @returns {{ score: number, label: 'alta'|'medio'|'baja' }}
 */
export function computeConfidence({
  jisho = {},
  deepL = null,
  kuromojiTokens = [],
  otherSources = {},
} = {}) {
  const readingMatch = computeReadingMatch(jisho, kuromojiTokens);
  const meaningOverlap = computeMeaningOverlap(jisho.senses, deepL);
  const sourcesCount = countWordSources({ jisho, deepL, otherSources });
  const sourceFactor = Math.min(1, sourcesCount / 2);

  const score = round(
    0.5 * readingMatch + 0.4 * meaningOverlap + 0.1 * sourceFactor,
  );

  return {
    score: clamp01(score),
    label: getConfidenceLabel(score),
  };
}

/**
 * Etiqueta según umbrales del producto (>0.8 alta, >0.5 medio).
 * @param {number} score
 * @returns {'alta'|'medio'|'baja'}
 */
export function getConfidenceLabel(score) {
  const s = Number(score) || 0;
  if (s > 0.8) return 'alta';
  if (s > 0.5) return 'medio';
  return 'baja';
}

/** @deprecated Usar getConfidenceLabel */
export const confidenceLevel = getConfidenceLabel;

/**
 * Adaptador para datos ya agregados en el orquestador.
 * @param {object} data
 */
export function deriveScores(data) {
  const result = computeConfidence({
    jisho: {
      readings: data.readings || [],
      senses: data.meanings || data.senses || [],
    },
    deepL: data.deepL ?? data.translationEs ?? null,
    kuromojiTokens: data.tokens || [],
    otherSources: buildOtherSourcesFromList(data.sources, data.otherSources),
  });

  return {
    readingScore: computeReadingMatch(
      { readings: data.readings || [] },
      data.tokens || [],
    ),
    meaningScore: computeMeaningOverlap(
      data.meanings || data.senses || [],
      data.deepL ?? data.translationEs ?? null,
    ),
    sources: data.sources || [],
    confidence: result.score,
    confidenceLevel: result.label,
  };
}

/**
 * 1 si alguna lectura Jisho coincide con kuromoji/wanakana; si no, 0.
 */
function computeReadingMatch(jisho, kuromojiTokens) {
  const jishoReadings = normalizeReadings(jisho.readings || []);
  const tokenReadings = tokenReadingsFromKuromoji(kuromojiTokens);

  if (!jishoReadings.length || !tokenReadings.length) {
    return 0;
  }

  const tokenSet = new Set(tokenReadings);
  return jishoReadings.some((r) => tokenSet.has(r)) ? 1 : 0;
}

/**
 * Porcentaje de palabras clave compartidas (0..1); 0 si no hay DeepL.
 */
function computeMeaningOverlap(senses, deepL) {
  const deepText = String(deepL || '').trim();
  if (!deepText) return 0;

  const senseKeywords = keywordsFromText(
    (senses || []).join(' '),
  );
  const deepKeywords = keywordsFromText(deepText);

  if (!senseKeywords.size || !deepKeywords.size) return 0;

  let shared = 0;
  for (const w of senseKeywords) {
    if (deepKeywords.has(w)) shared += 1;
  }

  const union = new Set([...senseKeywords, ...deepKeywords]);
  return union.size ? shared / union.size : 0;
}

/** Cuenta fuentes que contienen la palabra: Jisho, JMdict, Tatoeba, DeepL. */
function countWordSources({ jisho, deepL, otherSources }) {
  let count = 0;

  if (hasJishoHit(jisho)) count += 1;
  if (String(deepL || '').trim()) count += 1;

  const flags = normalizeOtherSources(otherSources);
  if (flags.jmdict) count += 1;
  if (flags.tatoeba) count += 1;

  return count;
}

function hasJishoHit(jisho) {
  const readings = jisho?.readings || [];
  const senses = jisho?.senses || [];
  return readings.length > 0 || senses.length > 0;
}

function normalizeOtherSources(otherSources) {
  if (Array.isArray(otherSources)) {
    const set = new Set(otherSources.map((s) => String(s).toLowerCase()));
    return {
      jmdict: set.has('jmdict'),
      tatoeba: set.has('tatoeba'),
    };
  }

  return {
    jmdict: Boolean(otherSources?.jmdict),
    tatoeba: Boolean(otherSources?.tatoeba),
  };
}

function buildOtherSourcesFromList(sources, explicit) {
  if (explicit) return explicit;
  const list = Array.isArray(sources) ? sources : [];
  return {
    jmdict: list.includes('jmdict'),
    tatoeba: list.includes('tatoeba'),
  };
}

function tokenReadingsFromKuromoji(tokens) {
  const out = [];
  for (const t of tokens || []) {
    if (t.reading) out.push(...normalizeReadings([t.reading]));
    if (t.surface && isKana(t.surface)) {
      out.push(...normalizeReadings([t.surface]));
    }
  }
  return [...new Set(out)];
}

function normalizeReadings(readings) {
  return readings
    .map((r) => {
      try {
        return toHiragana(String(r).trim());
      } catch {
        return String(r).trim();
      }
    })
    .filter(Boolean);
}

/** Palabras clave simples para comparar significados. */
function keywordsFromText(text) {
  const words = String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\u00c0-\u024f\u3040-\u30ff\u4e00-\u9fff\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2);

  return new Set(words);
}

function clamp01(n) {
  return Math.max(0, Math.min(1, Number(n) || 0));
}

function round(n) {
  return Math.round(n * 1000) / 1000;
}
