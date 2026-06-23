/**
 * Cliente de lookup para navegador — vanilla JS, compatible con app estática.
 * Expone window.lookupTerm, window.renderWordCard, window.mountWordCard.
 */
(function () {
  'use strict';

  var API_BASE = '';
  var lastLookupData = null;
  var reportApi = null;

  var LEVEL_LABELS = { alta: 'Alta', medio: 'Media', baja: 'Baja' };

  var SOURCE_LABELS = {
    jisho: 'Jisho',
    tatoeba: 'Tatoeba',
    jmdict: 'JMdict',
    kuromoji: 'Kuromoji',
    deepl: 'DeepL',
    google: 'Google',
  };

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function confidenceLevel(score) {
    if (score >= 0.75) return 'alta';
    if (score >= 0.45) return 'medio';
    return 'baja';
  }

  function buildFuriganaHtml(word, reading) {
    if (!word) return '';
    if (!reading || word === reading) return escapeHtml(word);
    return '<ruby>' + escapeHtml(word) + '<rt>' + escapeHtml(reading) + '</rt></ruby>';
  }

  function renderTokensHtml(tokens) {
    if (!tokens || !tokens.length) return '';
    var items = tokens
      .map(function (t) {
        var surface = t.surface || '';
        var reading = t.reading || '';
        var pos = t.pos || '';
        return (
          '<li class="word-card__token">' +
          '<span class="word-card__token-surface">' + escapeHtml(surface) + '</span>' +
          (reading
            ? '<span class="word-card__token-reading">' + escapeHtml(reading) + '</span>'
            : '') +
          (pos ? '<span class="word-card__token-pos">' + escapeHtml(pos) + '</span>' : '') +
          '</li>'
        );
      })
      .join('');
    return (
      '<section class="word-card__tokens" aria-label="Análisis morfológico">' +
      '<h4 class="word-card__tokens-title">Análisis (kuromoji)</h4>' +
      '<ul class="word-card__token-list">' + items + '</ul>' +
      '</section>'
    );
  }

  /**
   * Normaliza respuesta del API o JSON simplificado de lookup.
   * @param {object} data
   * @returns {object|null}
   */
  function normalizeLookupData(data) {
    if (!data) return null;

    var term = data.term || data.word || data.kanji || '';
    var ok = data.ok !== false && !!term;
    if (!ok) {
      return { ok: false, error: data.error, term: term };
    }

    var word = data.word || data.kanji || term;
    var readings = data.readings && data.readings.length
      ? data.readings
      : data.reading
        ? [data.reading]
        : [];

    var level =
      data.confidenceLevel ||
      data.confidenceLabel ||
      confidenceLevel(data.confidence || 0);

    var meanings = Array.isArray(data.meanings) ? data.meanings : [];
    var examples = (data.examples || []).map(function (ex) {
      return {
        japanese: ex.japanese || '',
        translation: ex.translation || ex.english || '',
        source: ex.source || '',
        url: ex.url || '',
      };
    });

    var kanjiSvgs = data.kanjiSvgs || [];
    if (!kanjiSvgs.length && data.kanjiSvgUrl) {
      var urls = Array.isArray(data.kanjiSvgUrl) ? data.kanjiSvgUrl : [data.kanjiSvgUrl];
      var chars = word.split('').filter(function (c) {
        return /[\u4e00-\u9fff]/.test(c);
      });
      kanjiSvgs = urls.map(function (url, i) {
        return { char: chars[i] || word[i] || '', url: url };
      });
    }

    var sources = data.sources || [];
    var jishoUrl =
      (data.jisho && data.jisho.url) ||
      (sources.indexOf('jisho') !== -1
        ? 'https://jisho.org/search/' + encodeURIComponent(term)
        : '');

    var furiganaHtml = data.furigana || '';
    if (!furiganaHtml || furiganaHtml.indexOf('<ruby>') === -1) {
      furiganaHtml = buildFuriganaHtml(word, readings[0]);
    }

    return {
      ok: true,
      term: term,
      word: word,
      readings: readings,
      meanings: meanings,
      examples: examples,
      kanjiSvgs: kanjiSvgs,
      sources: sources,
      level: level,
      confidence: data.confidence || 0,
      jishoUrl: jishoUrl,
      furiganaHtml: furiganaHtml,
      translationEs: data.translationEs || null,
      jlpt: data.jlpt || null,
      tokens: Array.isArray(data.tokens) ? data.tokens : [],
      error: data.error,
    };
  }

  function renderWordCard(data) {
    var n = normalizeLookupData(data);

    if (!n || !n.ok) {
      return (
        '<div class="word-card word-card--error">' +
        '<p>No se encontró información para este término.</p>' +
        ((n && n.error) || (data && data.error)
          ? '<p class="word-card__error-detail">' + escapeHtml((n && n.error) || data.error) + '</p>'
          : '') +
        '</div>'
      );
    }

    var meanings = n.meanings.slice(0, 5);
    var readings = n.readings.join(', ');

    var examplesHtml = '';
    if (n.examples.length) {
      examplesHtml =
        '<section class="word-card__examples-block" aria-label="Ejemplos">' +
        '<h4 class="word-card__examples-title">Ejemplos</h4>' +
        '<ul class="word-card__examples">';
      n.examples.forEach(function (ex) {
        examplesHtml += '<li><span class="word-card__ex-jp">' + escapeHtml(ex.japanese) + '</span>';
        if (ex.translation) {
          examplesHtml += '<span class="word-card__ex-tr">' + escapeHtml(ex.translation) + '</span>';
        }
        if (ex.url) {
          var label = SOURCE_LABELS[ex.source] || ex.source || 'Fuente';
          examplesHtml +=
            '<a class="word-card__ex-link" href="' + escapeHtml(ex.url) + '" ' +
            'target="_blank" rel="noopener">' + escapeHtml(label) + '</a>';
        } else if (ex.source) {
          examplesHtml += '<span class="word-card__ex-source">' + escapeHtml(ex.source) + '</span>';
        }
        examplesHtml += '</li>';
      });
      examplesHtml += '</ul></section>';
    }

    var kanjiHtml = '';
    if (n.kanjiSvgs.length && window.KanjiStrokeViewer) {
      kanjiHtml = window.KanjiStrokeViewer.renderKanjiStrokeViewersHtml(n.kanjiSvgs);
    }

    var sourcesHtml = '';
    if (n.sources.length) {
      sourcesHtml =
        '<div class="word-card__row"><dt>Fuentes</dt><dd class="word-card__sources">';
      n.sources.forEach(function (s) {
        sourcesHtml +=
          '<span class="word-card__source-tag">' + escapeHtml(SOURCE_LABELS[s] || s) + '</span>';
      });
      sourcesHtml += '</dd></div>';
    }

    var jishoBtn = n.jishoUrl
      ? '<a class="word-card__btn word-card__btn--jisho" href="' + escapeHtml(n.jishoUrl) + '" ' +
        'target="_blank" rel="noopener">Ver en Jisho</a>'
      : '';

    return (
      '<article class="word-card" data-term="' + escapeHtml(n.term) + '">' +
      '<header class="word-card__header">' +
      '<h3 class="word-card__term word-card__ruby">' + n.furiganaHtml + '</h3>' +
      '<span class="confidence-badge confidence-badge--' + n.level + '" ' +
      'title="Confianza: ' + Math.round(n.confidence * 100) + '%">' +
      (LEVEL_LABELS[n.level] || n.level) + '</span>' +
      '</header>' +
      kanjiHtml +
      '<dl class="word-card__meta">' +
      (readings ? '<div class="word-card__row"><dt>Lecturas</dt><dd>' + escapeHtml(readings) + '</dd></div>' : '') +
      (meanings.length
        ? '<div class="word-card__row"><dt>Significados</dt><dd>' + escapeHtml(meanings.join('; ')) + '</dd></div>'
        : '') +
      (n.translationEs
        ? '<div class="word-card__row"><dt>ES</dt><dd>' + escapeHtml(n.translationEs) + '</dd></div>'
        : '') +
      (n.jlpt
        ? '<div class="word-card__row"><dt>JLPT</dt><dd>' + escapeHtml(n.jlpt) + '</dd></div>'
        : '') +
      sourcesHtml +
      '</dl>' +
      renderTokensHtml(n.tokens) +
      examplesHtml +
      '<footer class="word-card__actions">' +
      jishoBtn +
      '<button type="button" class="word-card__btn word-card__btn--report" data-action="reportar-lookup">Reportar error</button>' +
      '</footer>' +
      '</article>'
    );
  }

  function mountWordCard(container, data) {
    var el = typeof container === 'string' ? $(container) : container;
    if (!el) return null;
    el.innerHTML = renderWordCard(data);
    if (window.KanjiStrokeViewer) {
      window.KanjiStrokeViewer.mountKanjiStrokeViewers(el);
    }
    return el.querySelector('.word-card, .word-card--error');
  }

  function showLookupStatus(msg, isError) {
    var status = $('lookup-status');
    if (!status) return;
    status.textContent = msg;
    status.className = 'lookup-status' + (isError ? ' lookup-status--error' : '');
    status.removeAttribute('hidden');
  }

  function hideLookupStatus() {
    var status = $('lookup-status');
    if (status) status.setAttribute('hidden', '');
  }

  function setLookupLoading(loading) {
    var btn = $('btn-lookup-buscar');
    if (btn) {
      btn.disabled = loading;
      btn.textContent = loading ? 'Buscando…' : 'Buscar';
    }
  }

  function detectApiBase() {
    if (location.protocol === 'file:') return null;
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
      return '';
    }
    return '';
  }

  /**
   * Busca un término vía API local.
   * @param {string} term
   * @returns {Promise<object>}
   */
  function lookupTerm(term) {
    var query = String(term || '').trim();
    if (!query) {
      return Promise.resolve({ ok: false, error: 'Escribe un término' });
    }

    var base = detectApiBase();
    if (base === null) {
      return Promise.resolve({
        ok: false,
        error: 'offline',
        message:
          'Lookup requiere el servidor de desarrollo. Ejecuta npm run dev y abre http://localhost:3000',
      });
    }

    var url = (base || '') + '/api/lookup?term=' + encodeURIComponent(query);

    return fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error('API respondió ' + res.status);
        return res.json();
      })
      .catch(function (err) {
        if (window.NihonCheckSentry && err && err.message) {
          window.NihonCheckSentry.captureException(err, { scope: 'lookupClient.lookupTerm' });
        }
        return {
          ok: false,
          error: 'server',
          message:
            'No se pudo conectar al API de lookup. ¿Está corriendo npm run dev? (' + err.message + ')',
        };
      });
  }

  function renderLookupResult(data) {
    var container = $('lookup-resultado');
    if (!container) return;

    lastLookupData = data;

    if (!data.ok && (data.error === 'offline' || data.error === 'server')) {
      container.innerHTML =
        '<div class="lookup-fallback">' +
        '<p>' + escapeHtml(data.message) + '</p>' +
        '<p class="lookup-fallback__hint">La biblioteca y el resto de NihonCheck siguen funcionando sin servidor.</p>' +
        '</div>';
      showLookupStatus(data.message, true);
      return;
    }

    hideLookupStatus();
    mountWordCard(container, data);
  }

  var STORAGE_KEY_REPORTS = 'reports_nihoncheck';

  function getStoredReports() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY_REPORTS);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function buildReportEntry(payload) {
    return {
      id: payload.id || 'r_' + Date.now(),
      date: payload.date || new Date().toISOString(),
      term: String(payload.term || '').trim(),
      report: payload.report || 'lookup_error',
      comment: String(payload.comment || payload.message || '').trim(),
      userAgent: navigator.userAgent || '',
      sourceUrl: location.href || '',
      lookupData: payload.lookupData || null,
    };
  }

  function saveReportLocal(payload) {
    var entry = buildReportEntry(payload);
    var list = getStoredReports();
    list.push(entry);
    try {
      localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(list));
    } catch (err) {
      console.warn('No se pudo guardar reporte', err);
    }
    return entry;
  }

  function csvCell(val) {
    var s = String(val == null ? '' : val).replace(/"/g, '""');
    return '"' + s + '"';
  }

  function exportReportsCsv() {
    var rows = getStoredReports();
    var header = ['id', 'date', 'term', 'report', 'comment', 'userAgent', 'sourceUrl', 'lookupData'];
    var lines = [header.join(',')];
    rows.forEach(function (r) {
      lines.push([
        csvCell(r.id),
        csvCell(r.date || r.createdAt),
        csvCell(r.term),
        csvCell(r.report),
        csvCell(r.comment || r.message),
        csvCell(r.userAgent),
        csvCell(r.sourceUrl),
        csvCell(JSON.stringify(r.lookupData || {})),
      ].join(','));
    });
    return lines.join('\n');
  }

  function exportCSV(filename) {
    var csv = '\uFEFF' + exportReportsCsv();
    var name = filename || 'nihoncheck-reportes-' + new Date().toISOString().slice(0, 10) + '.csv';
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
  }

  function postReportToApi(entry) {
    if (location.protocol === 'file:') {
      return Promise.resolve({ sent: false, reason: 'file://' });
    }
    return fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          return { sent: res.ok, status: res.status, data: data };
        });
      })
      .catch(function (err) {
        return { sent: false, error: err.message };
      });
  }

  function initReportModal() {
    var modal = $('modal-reporte-lookup');
    var form = $('form-reporte-lookup');
    if (!modal || !form) return;

    var pendingTerm = '';

    function closeReport() {
      modal.setAttribute('hidden', '');
      document.body.classList.remove('modal-abierto');
    }

    function openReport(term) {
      pendingTerm = term || '';
      var termInput = form.querySelector('[name="report-term"]');
      var termVisible = form.querySelector('[name="report-term-visible"]');
      var dataInput = form.querySelector('[name="report-data"]');
      if (termInput) termInput.value = pendingTerm;
      if (termVisible) termVisible.value = pendingTerm;
      if (dataInput) dataInput.value = JSON.stringify(lastLookupData || {});
      modal.removeAttribute('hidden');
      document.body.classList.add('modal-abierto');
      var commentEl = form.querySelector('[name="report-comment"]');
      if (commentEl) commentEl.focus();
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var reportType = (form.querySelector('[name="report-type"]') || {}).value || 'lookup_error';
      var comment = ((form.querySelector('[name="report-comment"]') || {}).value || '').trim();
      if (!comment) return;

      var entry = saveReportLocal({
        term: pendingTerm,
        report: reportType,
        comment: comment,
        lookupData: lastLookupData,
      });

      postReportToApi(entry).catch(function () { /* solo localStorage si falla */ });

      if (window.NihonCheckSentry && window.NihonCheckSentry.trackEvent) {
        window.NihonCheckSentry.trackEvent('reporte_enviado', {
          term: pendingTerm,
          report: reportType,
        });
      }

      closeReport();
      form.reset();

      var toast = $('toast');
      if (toast) {
        toast.textContent = 'Reporte guardado. Gracias.';
        toast.removeAttribute('hidden');
        setTimeout(function () { toast.setAttribute('hidden', ''); }, 3000);
      }
    });

    modal.querySelectorAll('[data-action="cerrar-reporte"]').forEach(function (btn) {
      btn.addEventListener('click', closeReport);
    });

    modal.addEventListener('click', function (ev) {
      if (ev.target === modal) closeReport();
    });

    reportApi = { openReport: openReport, closeReport: closeReport };
  }

  function handleLookupSubmit(e) {
    if (e) e.preventDefault();
    var input = $('input-lookup-term');
    var term = input ? input.value.trim() : '';
    if (!term) {
      showLookupStatus('Escribe una palabra en japonés o romaji.', true);
      return;
    }

    setLookupLoading(true);
    lookupTerm(term)
      .then(function (data) {
        renderLookupResult(data);
      })
      .finally(function () {
        setLookupLoading(false);
      });
  }

  function initLookupUI() {
    API_BASE = detectApiBase();

    var form = $('form-lookup');
    if (form) {
      form.addEventListener('submit', handleLookupSubmit);
    }

    initReportModal();

    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action="reportar-lookup"]');
      if (!btn || !reportApi) return;
      var card = btn.closest('[data-term]');
      var term = card ? card.getAttribute('data-term') : '';
      reportApi.openReport(term);
    });

    if (API_BASE === null) {
      showLookupStatus(
        'Lookup disponible con npm run dev → http://localhost:3000',
        false
      );
    }
  }

  window.lookupTerm = lookupTerm;
  window.exportCSV = exportCSV;
  window.getReports = getStoredReports;
  window.renderWordCard = renderWordCard;
  window.mountWordCard = mountWordCard;
  window.normalizeLookupData = normalizeLookupData;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLookupUI);
  } else {
    initLookupUI();
  }
})();
