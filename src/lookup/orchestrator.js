/**
 * Orquestador de lookup â€” combina Jisho, kuromoji, Tatoeba, traducciones opcionales.
 */

import { isKana } from 'wanakana';
import { searchJisho, parseJishoEntry } from './jisho.js';
import { searchJmdict } from './jmdict.js';
import { searchTatoeba } from './tatoeba.js';
import { init as initKuromoji, tokenize } from '../analysis/kuromojiWrapper.js';
import { buildFurigana, buildFuriganaFromTokens } from '../analysis/furigana.js';
import { getKanjiSvgUrls } from '../kanji/kanjivg.js';
import { computeConfidence } from '../confidence.js';

/**
 * Stub DeepL â€” requiere DEEPL_KEY en .env
 * @param {string} text
 * @param {string} [apiKey]
 */
async function translateDeepL(text, apiKey) {
  if (!apiKey || !text) return null;
  try {
    const res = await fetch('https://api-free.deepl.com/v2/translate', {
      method: 'POST',
      headers: {
        Authorization: `DeepL-Auth-Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: [text],
        target_lang: 'ES',
        source_lang: 'JA',
      }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.translations?.[0]?.text || null;
  } catch {
    return null;
  }
}

/**
 * Stub Google Translate â€” requiere GOOGLE_KEY en .env
 * @param {string} text
 * @param {string} [apiKey]
 */
async function translateGoogle(text, apiKey) {
  if (!apiKey || !text) return null;
  try {
    const url =
      `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text, source: 'ja', target: 'es', format: 'text' }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data?.translations?.[0]?.translatedText || null;
  } catch {
    return null;
  }
}

/**
 * Prioriza lectura Jisho; fallback kuromoji/wanakana.
 */
function resolveReadings(jishoParsed, tokens, term) {
  const readings = [...(jishoParsed.readings || [])];

  if (!readings.length && tokens.length) {
    for (const t of tokens) {
      if (t.reading) readings.push(t.reading);
      else if (t.surface && isKana(t.surface)) readings.push(t.surface);
    }
  }

  if (!readings.length && isKana(term)) {
    readings.push(term);
  }

  return [...new Set(readings)];
}

/**
 * Lookup completo de un tÃ©rmino.
 * @param {string} term
 * @param {object} [options]
 * @param {string} [options.deeplKey]
 * @param {string} [options.googleKey]
 * @returns {Promise<object>}
 */
export async function lookupTerm(term, options = {}) {
  const query = String(term || '').trim();
  if (!query) {
    return { ok: false, error: 'TÃ©rmino vacÃ­o', term: '' };
  }

  const sources = [];

  await initKuromoji().catch(() => {});

  const [jishoResult, jmdictResult, tatoebaResult, tokens] = await Promise.all([
    searchJisho(query),
    searchJmdict(query),
    searchTatoeba(query, 3),
    tokenize(query).catch(() => []),
  ]);

  if (jishoResult.data?.length) sources.push('jisho');
  if (tokens.length) sources.push('kuromoji');
  if (tatoebaResult.examples?.length) sources.push('tatoeba');
  if (jmdictResult.entries?.length) sources.push('jmdict');

  const jishoParsed = parseJishoEntry(jishoResult.data);
  const readings = resolveReadings(jishoParsed, tokens, query);
  const meanings = [...new Set(jishoParsed.meanings || [])];
  const word = jishoParsed.word || query;
  const kanjiSvgs = getKanjiSvgUrls(word);

  const meaningText = meanings.slice(0, 3).join('; ');
  let translationEs = null;
  const deeplKey = options.deeplKey || process.env.DEEPL_KEY;
  const googleKey = options.googleKey || process.env.GOOGLE_KEY;

  if (deeplKey && meaningText) {
    translationEs = await translateDeepL(meaningText, deeplKey);
    if (translationEs) sources.push('deepl');
  }
  if (!translationEs && googleKey && meaningText) {
    translationEs = await translateGoogle(meaningText, googleKey);
    if (translationEs) sources.push('google');
  }

  const confidenceResult = computeConfidence({
    jisho: { readings, senses: meanings },
    deepL: translationEs,
    kuromojiTokens: tokens,
    otherSources: {
      jmdict: Boolean(jmdictResult.entries?.length),
      tatoeba: Boolean(tatoebaResult.examples?.length),
    },
  });

  return {
    ok: true,
    term: query,
    word,
    readings,
    meanings,
    translationEs,
    jlpt: jishoParsed.jlpt,
    tags: jishoParsed.tags,
    confidence: confidenceResult.score,
    confidenceLevel: confidenceResult.label,
    sources: [...new Set(sources)],
    tokens,
    examples: tatoebaResult.examples || [],
    kanjiSvgs,
    jisho: {
      slug: jishoParsed.slug,
      url: jishoParsed.slug
        ? `https://jisho.org/word/${jishoParsed.slug}`
        : `https://jisho.org/search/${encodeURIComponent(query)}`,
      rawCount: jishoResult.data?.length || 0,
      status: jishoResult.meta?.status ?? null,
      error: jishoResult.error || null,
    },
    jmdict: jmdictResult,
    tatoebaNote: tatoebaResult.note || tatoebaResult.error || null,
    furigana: tokens.length
      ? buildFuriganaFromTokens(tokens)
      : buildFurigana(word, readings[0]),
  };
}

export { buildFurigana, buildFuriganaFromTokens } from '../analysis/furigana.js';
