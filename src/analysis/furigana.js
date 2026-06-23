/**
 * Furigana y ruby — helpers wanakana para NihonCheck.
 */

import { isKana, isKanji, toHiragana } from 'wanakana';

/**
 * Construye HTML ruby para una palabra con lectura opcional.
 * @param {string} surface
 * @param {string} [reading]
 * @returns {string}
 */
export function buildFurigana(surface, reading) {
  if (!surface) return '';
  const rt = reading ? toHiragana(reading) : '';
  if (!rt || surface === rt || isKana(surface)) {
    return escapeHtml(surface);
  }

  if (isKana(rt) && !isKanji(surface)) {
    return `<ruby>${escapeHtml(surface)}<rt>${escapeHtml(rt)}</rt></ruby>`;
  }

  if (/[\u4e00-\u9fff]/.test(surface)) {
    return `<ruby>${escapeHtml(surface)}<rt>${escapeHtml(rt)}</rt></ruby>`;
  }

  return escapeHtml(surface);
}

/**
 * Furigana morfema a morfema a partir de tokens kuromoji.
 * @param {Array<{ surface?: string, reading?: string }>} tokens
 * @returns {string}
 */
export function buildFuriganaFromTokens(tokens) {
  if (!tokens?.length) return '';
  return tokens
    .map((t) => buildFurigana(t.surface || '', t.reading || ''))
    .join('');
}

/**
 * HTML de desglose morfológico para la tarjeta de palabra.
 * @param {Array<{ surface?: string, reading?: string, pos?: string, basic?: string }>} tokens
 * @returns {string}
 */
export function renderTokensBreakdown(tokens) {
  if (!tokens?.length) return '';

  const items = tokens
    .map((t) => {
      const surface = t.surface || '';
      const reading = t.reading ? toHiragana(t.reading) : '';
      const pos = t.pos || '';
      return (
        '<li class="word-card__token">' +
        `<span class="word-card__token-surface">${escapeHtml(surface)}</span>` +
        (reading
          ? `<span class="word-card__token-reading">${escapeHtml(reading)}</span>`
          : '') +
        (pos ? `<span class="word-card__token-pos">${escapeHtml(pos)}</span>` : '') +
        '</li>'
      );
    })
    .join('');

  return (
    '<section class="word-card__tokens" aria-label="Análisis morfológico">' +
    '<h4 class="word-card__tokens-title">Análisis (kuromoji)</h4>' +
    `<ul class="word-card__token-list">${items}</ul>` +
    '</section>'
  );
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
