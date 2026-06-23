/**
 * Visor KanjiVG con animación de trazos — navegador (vanilla JS).
 */
(function () {
  'use strict';

  var STROKE_DURATION = 0.55;
  var STROKE_GAP = 0.35;

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function resolveKanjiSvgFetchUrl(char, directUrl) {
    if (typeof location !== 'undefined' && location.protocol !== 'file:') {
      return '/api/kanji-svg?char=' + encodeURIComponent(char);
    }
    return directUrl;
  }

  function renderKanjiStrokeViewerHtml(char, url) {
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

  function renderKanjiStrokeViewersHtml(kanjiSvgs) {
    if (!kanjiSvgs || !kanjiSvgs.length) return '';
    var html = '<div class="word-card__kanji-svgs" aria-label="Trazos de kanji">';
    kanjiSvgs.forEach(function (k) {
      html += renderKanjiStrokeViewerHtml(k.char, k.url);
    });
    html += '</div>';
    return html;
  }

  function strokeNumberFromId(id) {
    var match = String(id || '').match(/-s(\d+)$/);
    return match ? parseInt(match[1], 10) : 0;
  }

  function collectStrokePaths(svg) {
    var strokeRoot = svg.querySelector('[id^="kvg:StrokePaths"]');
    if (!strokeRoot) return [];

    var paths = Array.prototype.slice.call(strokeRoot.querySelectorAll('path[id*="-s"]'));
    paths.sort(function (a, b) {
      return strokeNumberFromId(a.id) - strokeNumberFromId(b.id);
    });
    return paths;
  }

  function prepareStrokePaths(paths) {
    paths.forEach(function (path, index) {
      var length = path.getTotalLength();
      path.classList.add('kanji-stroke');
      path.style.strokeDasharray = String(length);
      path.style.strokeDashoffset = String(length);
      path.style.setProperty('--kanji-stroke-delay', index * STROKE_GAP + 's');
      path.style.setProperty('--kanji-stroke-duration', STROKE_DURATION + 's');
    });
  }

  function restartAnimation(viewer) {
    var paths = viewer.querySelectorAll('.kanji-stroke');
    paths.forEach(function (path) {
      path.style.animation = 'none';
      void path.offsetWidth;
      path.style.animation = '';
    });
    viewer.classList.add('kanji-stroke-viewer--playing');
  }

  function showLoadError(viewer) {
    var stage = viewer.querySelector('.kanji-stroke-viewer__stage');
    var toggle = viewer.querySelector('.kanji-stroke-viewer__toggle');
    var errorEl = viewer.querySelector('.kanji-stroke-viewer__error');
    if (stage) stage.setAttribute('hidden', '');
    if (toggle) toggle.setAttribute('hidden', '');
    if (errorEl) errorEl.removeAttribute('hidden');
  }

  function initKanjiStrokeViewer(viewer) {
    var char = viewer.getAttribute('data-kanji');
    var directUrl = viewer.getAttribute('data-svg-url');
    var stage = viewer.querySelector('.kanji-stroke-viewer__stage');
    var toggle = viewer.querySelector('.kanji-stroke-viewer__toggle');
    if (!char || !stage || !toggle) return Promise.resolve();

    var fetchUrl = resolveKanjiSvgFetchUrl(char, directUrl);

    return fetch(fetchUrl)
      .then(function (res) {
        if (!res.ok) throw new Error('SVG ' + res.status);
        return res.text();
      })
      .then(function (svgText) {
        var doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
        var svg = doc.querySelector('svg');
        if (!svg || doc.querySelector('parsererror')) throw new Error('SVG inválido');

        var numbers = svg.querySelector('[id^="kvg:StrokeNumbers"]');
        if (numbers) numbers.setAttribute('hidden', '');

        var paths = collectStrokePaths(svg);
        if (!paths.length) throw new Error('Sin trazos');

        prepareStrokePaths(paths);

        svg.classList.add('kanji-stroke-viewer__svg');
        svg.removeAttribute('width');
        svg.removeAttribute('height');
        stage.appendChild(svg);

        toggle.addEventListener('click', function () {
          var playing = viewer.classList.contains('kanji-stroke-viewer--playing');
          if (playing) {
            viewer.classList.remove('kanji-stroke-viewer--playing');
            toggle.setAttribute('data-playing', 'false');
            toggle.textContent = 'Reproducir';
            return;
          }
          restartAnimation(viewer);
          toggle.setAttribute('data-playing', 'true');
          toggle.textContent = 'Pausar';
        });
      })
      .catch(function () {
        showLoadError(viewer);
      });
  }

  function mountKanjiStrokeViewers(root) {
    if (!root) return Promise.resolve();
    var viewers = root.querySelectorAll('.kanji-stroke-viewer');
    var tasks = Array.prototype.map.call(viewers, initKanjiStrokeViewer);
    return Promise.all(tasks);
  }

  window.KanjiStrokeViewer = {
    renderKanjiStrokeViewerHtml: renderKanjiStrokeViewerHtml,
    renderKanjiStrokeViewersHtml: renderKanjiStrokeViewersHtml,
    mountKanjiStrokeViewers: mountKanjiStrokeViewers,
  };
})();
