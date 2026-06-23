/**
 * Plantilla HTML del visor de trazos KanjiVG (montaje en navegador vía js/kanjiStrokeViewer.js).
 */

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param {string} char — un kanji
 * @param {string} url — URL directa KanjiVG (fallback)
 * @returns {string}
 */
export function renderKanjiStrokeViewerHtml(char, url) {
  return (
    '<div class="kanji-stroke-viewer" data-kanji="' +
    escapeHtml(char) +
    '" data-svg-url="' +
    escapeHtml(url) +
    '">' +
    '<span class="kanji-stroke-viewer__label" aria-hidden="true">' +
    escapeHtml(char) +
    '</span>' +
    '<div class="kanji-stroke-viewer__stage" role="img" aria-label="Orden de trazos de ' +
    escapeHtml(char) +
    '"></div>' +
    '<button type="button" class="kanji-stroke-viewer__toggle" data-playing="false">Reproducir</button>' +
    '<p class="kanji-stroke-viewer__error" hidden>Sin orden de trazos</p>' +
    '</div>'
  );
}

/**
 * @param {{ char: string, url: string }[]} kanjiSvgs
 * @returns {string}
 */
export function renderKanjiStrokeViewersHtml(kanjiSvgs) {
  if (!kanjiSvgs?.length) return '';
  return (
    '<div class="word-card__kanji-svgs" aria-label="Trazos de kanji">' +
    kanjiSvgs.map((k) => renderKanjiStrokeViewerHtml(k.char, k.url)).join('') +
    '</div>'
  );
}
