/* ============================================================
   FASE 3 — Estadísticas del dashboard (cálculo + render)
   ------------------------------------------------------------
   Módulo standalone. Depende de que ya existan en NihonCheck:
     - obtenerEstadisticasGlobales()  -> { dominado, progreso, reforzar, neutro, total }
     - obtenerActividadDiaria()        -> ['YYYY-MM-DD', ...]
     - obtenerPerfil()                 -> { porcentajesPorArea: {...}, ... }
     - obtenerItemsBibliotecaUnificados() (fallback por área)
     - calcularEstadoVisualTarjeta(item)  (fallback por área)

   NO modifica nihoncheck.js ni srs.js. Reutiliza las clases CSS
   existentes (progreso-historico, progreso-stat, lecciones-progreso-bar).

   API:  NihonCheck.estadisticas = {
            renderizar, calcularRacha, calcularPorcentajesPorArea
         }
   ============================================================ */

(function () {
  'use strict';

  var NihonCheck = (typeof window !== 'undefined' && window.NihonCheck) || {};

  var AREAS = [
    { clave: 'hiragana', etiqueta: 'Hiragana' },
    { clave: 'katakana', etiqueta: 'Katakana' },
    { clave: 'kanji', etiqueta: 'Kanji' },
    { clave: 'gramatica', etiqueta: 'Gramática' },
  ];

  /* ---------- Helpers ---------- */

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function clampPct(n) {
    n = Number(n);
    if (!isFinite(n) || n < 0) return 0;
    if (n > 100) return 100;
    return Math.round(n);
  }

  /** Convierte 'YYYY-MM-DD' a un entero de día (días desde época). */
  function aDiaEntero(iso) {
    if (typeof iso !== 'string') return null;
    var partes = iso.split('-');
    if (partes.length !== 3) return null;
    var y = parseInt(partes[0], 10);
    var m = parseInt(partes[1], 10);
    var d = parseInt(partes[2], 10);
    if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
    // Date.UTC evita problemas de zona horaria/DST en la resta.
    return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
  }

  /** Fecha local de hoy en 'YYYY-MM-DD'. */
  function hoyISO() {
    var d = new Date();
    var mes = ('0' + (d.getMonth() + 1)).slice(-2);
    var dia = ('0' + d.getDate()).slice(-2);
    return d.getFullYear() + '-' + mes + '-' + dia;
  }

  /* ---------- Cálculo: racha (streak) ---------- */

  /**
   * Calcula la racha actual y la mejor racha a partir del array de días
   * con actividad. La racha actual cuenta días consecutivos que terminan
   * hoy o ayer (para no romperse antes de que el usuario practique hoy).
   *
   * @param {string[]} [dias] lista 'YYYY-MM-DD' (si se omite, la lee del core)
   * @returns {{actual:number, mejor:number}}
   */
  function calcularRacha(dias) {
    if (!dias && NihonCheck.obtenerActividadDiaria) {
      dias = NihonCheck.obtenerActividadDiaria();
    }
    if (!Array.isArray(dias) || !dias.length) return { actual: 0, mejor: 0 };

    // Normalizar a enteros de día únicos y ordenados ascendente.
    var set = {};
    var enteros = [];
    for (var i = 0; i < dias.length; i++) {
      var n = aDiaEntero(dias[i]);
      if (n === null || set[n]) continue;
      set[n] = true;
      enteros.push(n);
    }
    if (!enteros.length) return { actual: 0, mejor: 0 };
    enteros.sort(function (a, b) { return a - b; });

    // Mejor racha: secuencia consecutiva más larga.
    var mejor = 1;
    var corrida = 1;
    for (var j = 1; j < enteros.length; j++) {
      if (enteros[j] === enteros[j - 1] + 1) {
        corrida += 1;
      } else {
        corrida = 1;
      }
      if (corrida > mejor) mejor = corrida;
    }

    // Racha actual: hacia atrás desde hoy/ayer.
    var hoy = aDiaEntero(hoyISO());
    var ultimo = enteros[enteros.length - 1];
    var actual = 0;
    if (ultimo === hoy || ultimo === hoy - 1) {
      actual = 1;
      for (var k = enteros.length - 2; k >= 0; k--) {
        if (enteros[k] === enteros[k + 1] - 1) {
          actual += 1;
        } else {
          break;
        }
      }
    }

    return { actual: actual, mejor: mejor };
  }

  /* ---------- Cálculo: porcentajes por área ---------- */

  /**
   * Obtiene los porcentajes de dominio por área. Usa el perfil
   * (porcentajesPorArea) como fuente principal; si no hay datos,
   * los calcula desde la biblioteca (dominados / total por área).
   *
   * @returns {{hiragana:number, katakana:number, kanji:number, gramatica:number}}
   */
  function calcularPorcentajesPorArea() {
    var resultado = { hiragana: 0, katakana: 0, kanji: 0, gramatica: 0 };

    // 1) Fuente principal: perfil.porcentajesPorArea
    var perfil = NihonCheck.obtenerPerfil ? NihonCheck.obtenerPerfil() : null;
    var pct = perfil && (perfil.porcentajesPorArea || perfil.porcentajes);
    var tieneDatosPerfil = false;
    if (pct && typeof pct === 'object') {
      for (var a = 0; a < AREAS.length; a++) {
        var clave = AREAS[a].clave;
        if (typeof pct[clave] === 'number') {
          resultado[clave] = clampPct(pct[clave]);
          if (pct[clave] > 0) tieneDatosPerfil = true;
        }
      }
    }
    if (tieneDatosPerfil) return resultado;

    // 2) Fallback: calcular desde la biblioteca (dominados / total por área)
    var items = [];
    if (NihonCheck.obtenerItemsBibliotecaUnificados) {
      items = NihonCheck.obtenerItemsBibliotecaUnificados() || [];
    }
    var totales = { hiragana: 0, katakana: 0, kanji: 0, gramatica: 0 };
    var dominados = { hiragana: 0, katakana: 0, kanji: 0, gramatica: 0 };
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (!it) continue;
      var carpeta = it.carpeta || it.tipo || it.area;
      if (totales[carpeta] === undefined) continue;
      totales[carpeta] += 1;
      var estado = NihonCheck.calcularEstadoVisualTarjeta
        ? NihonCheck.calcularEstadoVisualTarjeta(it)
        : 'neutro';
      if (estado === 'dominado') dominados[carpeta] += 1;
    }
    for (var b = 0; b < AREAS.length; b++) {
      var c = AREAS[b].clave;
      resultado[c] = totales[c] > 0 ? clampPct((dominados[c] / totales[c]) * 100) : 0;
    }
    return resultado;
  }

  /* ---------- Render ---------- */

  function htmlResumenDominio(stats) {
    return '' +
      '<div class="progreso-historico estadisticas-bloque">' +
        '<h3 class="progreso-historico__titulo">Resumen de dominio</h3>' +
        '<div class="progreso-historico__stats">' +
          '<div class="progreso-stat">' +
            '<span class="progreso-stat__valor">' + (stats.dominado || 0) + '</span>' +
            '<span class="progreso-stat__label">Dominados</span>' +
          '</div>' +
          '<div class="progreso-stat">' +
            '<span class="progreso-stat__valor">' + (stats.progreso || 0) + '</span>' +
            '<span class="progreso-stat__label">En progreso</span>' +
          '</div>' +
          '<div class="progreso-stat">' +
            '<span class="progreso-stat__valor">' + (stats.reforzar || 0) + '</span>' +
            '<span class="progreso-stat__label">Por reforzar</span>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function htmlBarrasArea(pct) {
    var barras = '';
    for (var i = 0; i < AREAS.length; i++) {
      var area = AREAS[i];
      var valor = clampPct(pct[area.clave]);
      barras += '' +
        '<div class="lecciones-progreso-bar estadisticas-barra">' +
          '<div class="lecciones-progreso-bar__label">' +
            '<span>' + escapeHtml(area.etiqueta) + '</span>' +
            '<span>' + valor + '%</span>' +
          '</div>' +
          '<div class="lecciones-progreso-bar__track">' +
            '<div class="lecciones-progreso-bar__fill" style="width:' + valor + '%"></div>' +
          '</div>' +
        '</div>';
    }
    return '' +
      '<div class="progreso-historico estadisticas-bloque">' +
        '<h3 class="progreso-historico__titulo">Progreso por área</h3>' +
        barras +
      '</div>';
  }

  function htmlRacha(racha) {
    return '' +
      '<div class="progreso-historico estadisticas-bloque estadisticas-racha">' +
        '<h3 class="progreso-historico__titulo">Racha de estudio</h3>' +
        '<div class="estadisticas-racha__cuerpo">' +
          '<div class="estadisticas-racha__actual">' +
            '<span class="estadisticas-racha__fuego" aria-hidden="true">🔥</span>' +
            '<span class="estadisticas-racha__num">' + (racha.actual || 0) + '</span>' +
            '<span class="estadisticas-racha__label">' +
              (racha.actual === 1 ? 'día seguido' : 'días seguidos') + '</span>' +
          '</div>' +
          '<div class="estadisticas-racha__mejor">' +
            'Mejor racha: <strong>' + (racha.mejor || 0) + '</strong> ' +
            (racha.mejor === 1 ? 'día' : 'días') +
          '</div>' +
        '</div>' +
      '</div>';
  }

  /**
   * Renderiza el panel de estadísticas en el contenedor dado (o en
   * #seccion-estadisticas si no se pasa ninguno).
   * @param {HTMLElement} [contenedor]
   */
  function renderizar(contenedor) {
    if (!contenedor && typeof document !== 'undefined') {
      contenedor = document.getElementById('seccion-estadisticas');
    }
    if (!contenedor) return;

    var stats = NihonCheck.obtenerEstadisticasGlobales
      ? NihonCheck.obtenerEstadisticasGlobales()
      : { dominado: 0, progreso: 0, reforzar: 0, neutro: 0, total: 0 };

    // Si no hay nada en la biblioteca, no mostrar el panel (dashboard limpio).
    if (!stats.total) {
      contenedor.innerHTML = '';
      contenedor.hidden = true;
      return;
    }
    contenedor.hidden = false;

    var pct = calcularPorcentajesPorArea();
    var racha = calcularRacha();

    contenedor.innerHTML =
      '<h2 class="estadisticas-titulo">Tus estadísticas</h2>' +
      '<div class="estadisticas-grid">' +
        htmlResumenDominio(stats) +
        htmlBarrasArea(pct) +
        htmlRacha(racha) +
      '</div>';
  }

  /* ---------- Exposición ---------- */

  NihonCheck.estadisticas = {
    renderizar: renderizar,
    calcularRacha: calcularRacha,
    calcularPorcentajesPorArea: calcularPorcentajesPorArea,
  };

  if (typeof window !== 'undefined') {
    window.NihonCheck = NihonCheck;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = NihonCheck;
  }
})();
