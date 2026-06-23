/**
 * Renderizado de tarjeta de palabra con furigana y badge de confianza.
 */

import { confidenceLevel } from '../confidence.js';
import { buildFurigana, renderTokensBreakdown } from '../analysis/furigana.js';
import { renderKanjiStrokeViewersHtml } from './kanjiStrokeViewer.js';

const LEVEL_LABELS = {
  alta: 'Alta',
  medio: 'Media',
  baja: 'Baja',
};

const SOURCE_LABELS = {
  jisho: 'Jisho',
  tatoeba: 'Tatoeba',
  jmdict: 'JMdict',
  kuromoji: 'Kuromoji',
  deepl: 'DeepL',
  google: 'Google',
};

/**
 * Normaliza respuesta del API o JSON simplificado de lookup.
 * @param {object} data
 * @returns {object|null}
 */
export function normalizeLookupData(data) {
  if (!data) return null;

  const term = data.term || data.word || data.kanji || '';
  const ok = data.ok !== false && !!term;
  if (!ok) {
    return { ok: false, error: data.error, term };
  }

  const word = data.word || data.kanji || term;
  const readings = data.readings?.length
    ? data.readings
    : data.reading
      ? [data.reading]
      : [];

  const level =
    data.confidenceLevel ||
    data.confidenceLabel ||
    confidenceLevel(data.confidence ?? 0);

  const meanings = Array.isArray(data.meanings) ? data.meanings : [];
  const examples = (data.examples || []).map((ex) => ({
    japanese: ex.japanese || '',
    translation: ex.translation || ex.english || '',
    source: ex.source || '',
    url: ex.url || '',
  }));

  let kanjiSvgs = data.kanjiSvgs || [];
  if (!kanjiSvgs.length && data.kanjiSvgUrl) {
    const urls = Array.isArray(data.kanjiSvgUrl) ? data.kanjiSvgUrl : [data.kanjiSvgUrl];
    const chars = [...word].filter((c) => /[\u4e00-\u9fff]/.test(c));
    kanjiSvgs = urls.map((url, i) => ({
      char: chars[i] || word[i] || '',
      url,
    }));
  }

  const sources = data.sources || [];
  const jishoUrl =
    data.jisho?.url ||
    (sources.includes('jisho')
      ? `https://jisho.org/search/${encodeURIComponent(term)}`
      : '');

  let furiganaHtml = data.furigana || '';
  if (!furiganaHtml || !furiganaHtml.includes('<ruby>')) {
    furiganaHtml = buildFurigana(word, readings[0]);
  }

  return {
    ok: true,
    term,
    word,
    readings,
    meanings,
    examples,
    kanjiSvgs,
    sources,
    level,
    confidence: data.confidence ?? 0,
    jishoUrl,
    furiganaHtml,
    translationEs: data.translationEs || null,
    jlpt: data.jlpt || null,
    tokens: Array.isArray(data.tokens) ? data.tokens : [],
    error: data.error,
  };
}

/**
 * @param {object} data — resultado de lookupTerm o JSON simplificado
 * @returns {string} HTML
 */
export function renderWordCard(data) {
  const n = normalizeLookupData(data);

  if (!n || !n.ok) {
    return (
      '<div class="word-card word-card--error">' +
      '<p>No se encontró información para este término.</p>' +
      (n?.error || data?.error
        ? `<p class="word-card__error-detail">${escapeHtml(n?.error || data?.error)}</p>`
        : '') +
      '</div>'
    );
  }

  const meanings = n.meanings.slice(0, 5);
  const readings = n.readings.join(', ');

  let examplesHtml = '';
  if (n.examples.length) {
    examplesHtml =
      '<section class="word-card__examples-block" aria-label="Ejemplos">' +
      '<h4 class="word-card__examples-title">Ejemplos</h4>' +
      '<ul class="word-card__examples">' +
      n.examples
        .map((ex) => {
          let item =
            '<li><span class="word-card__ex-jp">' + escapeHtml(ex.japanese) + '</span>';
          if (ex.translation) {
            item += '<span class="word-card__ex-tr">' + escapeHtml(ex.translation) + '</span>';
          }
          if (ex.url) {
            const label = SOURCE_LABELS[ex.source] || ex.source || 'Fuente';
            item +=
              '<a class="word-card__ex-link" href="' +
              escapeHtml(ex.url) +
              '" target="_blank" rel="noopener">' +
              escapeHtml(label) +
              '</a>';
          } else if (ex.source) {
            item +=
              '<span class="word-card__ex-source">' + escapeHtml(ex.source) + '</span>';
          }
          item += '</li>';
          return item;
        })
        .join('') +
      '</ul></section>';
  }

  let kanjiHtml = '';
  if (n.kanjiSvgs.length) {
    kanjiHtml = renderKanjiStrokeViewersHtml(n.kanjiSvgs);
  }

  let sourcesHtml = '';
  if (n.sources.length) {
    sourcesHtml =
      '<div class="word-card__row"><dt>Fuentes</dt><dd class="word-card__sources">' +
      n.sources
        .map(
          (s) =>
            `<span class="word-card__source-tag">${escapeHtml(SOURCE_LABELS[s] || s)}</span>`
        )
        .join('') +
      '</dd></div>';
  }

  const jishoBtn = n.jishoUrl
    ? `<a class="word-card__btn word-card__btn--jisho" href="${escapeHtml(n.jishoUrl)}" ` +
      'target="_blank" rel="noopener">Ver en Jisho</a>'
    : '';

  return (
    `<article class="word-card" data-term="${escapeHtml(n.term)}">` +
    '<header class="word-card__header">' +
    `<h3 class="word-card__term word-card__ruby">${n.furiganaHtml}</h3>` +
    `<span class="confidence-badge confidence-badge--${n.level}" ` +
    `title="Confianza: ${Math.round(n.confidence * 100)}%">` +
    `${LEVEL_LABELS[n.level] || n.level}</span>` +
    '</header>' +
    kanjiHtml +
    '<dl class="word-card__meta">' +
    (readings
      ? `<div class="word-card__row"><dt>Lecturas</dt><dd>${escapeHtml(readings)}</dd></div>`
      : '') +
    (meanings.length
      ? `<div class="word-card__row"><dt>Significados</dt><dd>${escapeHtml(meanings.join('; '))}</dd></div>`
      : '') +
    (n.translationEs
      ? `<div class="word-card__row"><dt>ES</dt><dd>${escapeHtml(n.translationEs)}</dd></div>`
      : '') +
    (n.jlpt
      ? `<div class="word-card__row"><dt>JLPT</dt><dd>${escapeHtml(n.jlpt)}</dd></div>`
      : '') +
    sourcesHtml +
    '</dl>' +
    (n.tokens.length ? renderTokensBreakdown(n.tokens) : '') +
    examplesHtml +
    '<footer class="word-card__actions">' +
    jishoBtn +
    '<button type="button" class="word-card__btn word-card__btn--report" ' +
    'data-action="reportar-lookup">Reportar error</button>' +
    '</footer>' +
    '</article>'
  );
}

/**
 * Inserta tarjeta en contenedor DOM.
 * @param {HTMLElement|string} container — elemento o id
 * @param {object} data
 * @returns {HTMLElement|null}
 */
export function mountWordCard(container, data) {
  const el =
    typeof container === 'string'
      ? document.getElementById(container)
      : container;
  if (!el) return null;
  el.innerHTML = renderWordCard(data);
  if (typeof window !== 'undefined' && window.KanjiStrokeViewer) {
    window.KanjiStrokeViewer.mountKanjiStrokeViewers(el);
  }
  return el.querySelector('.word-card, .word-card--error');
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
