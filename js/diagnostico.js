/**
 * NIHONCHECK — Diagnóstico rápido (10 preguntas MC)
 * Requiere: temas.js, nihoncheck.js
 */
(function () {
  'use strict';

  // Sentry opcional (misma config que index.html)
  (function initSentryDiagnostico() {
    var sentry = window.NihonCheckSentry;
    if (!sentry || sentry.isEnabled()) return;
    var cfg = window.NIHONCHECK_SENTRY_CONFIG || {};
    if (cfg.dsn) sentry.initSentry(cfg.dsn, { environment: cfg.environment });
  })();

  var CLAVE_THEME = 'nihoncheck_theme';

  function $(id) { return document.getElementById(id); }

  function obtenerTemaGuardado() {
    try {
      return localStorage.getItem(CLAVE_THEME) === 'dark' ? 'dark' : 'light';
    } catch (e) {
      return 'light';
    }
  }

  function aplicarTema(tema) {
    var esOscuro = tema === 'dark';
    if (esOscuro) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    var btn = $('theme-toggle');
    if (btn) {
      btn.setAttribute('aria-label', esOscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
      btn.setAttribute('aria-pressed', esOscuro ? 'true' : 'false');
      btn.title = esOscuro ? 'Modo claro' : 'Modo oscuro';
      btn.textContent = esOscuro ? '☀️' : '🌙';
    }
  }

  function alternarTema() {
    var nuevo = obtenerTemaGuardado() === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(CLAVE_THEME, nuevo); } catch (e) { /* ignore */ }
    aplicarTema(nuevo);
  }

  function initTema() {
    aplicarTema(obtenerTemaGuardado());
    var btn = $('theme-toggle');
    if (btn) btn.addEventListener('click', alternarTema);
  }

  var NC = (typeof window !== 'undefined' && window.NihonCheck) || null;

  var PREGUNTAS = [
    {
      id: 'h1',
      categoria: 'hiragana',
      enunciado: '¿Qué sonido representa あ?',
      opciones: ['a', 'i', 'u', 'e'],
      correcta: 0,
    },
    {
      id: 'h2',
      categoria: 'hiragana',
      enunciado: '¿Qué sonido representa き?',
      opciones: ['ka', 'ki', 'ku', 'ke'],
      correcta: 1,
    },
    {
      id: 'h3',
      categoria: 'hiragana',
      enunciado: '¿Qué sonido representa す?',
      opciones: ['sa', 'shi', 'su', 'so'],
      correcta: 2,
    },
    {
      id: 'h4',
      categoria: 'hiragana',
      enunciado: '¿Qué sonido representa て?',
      opciones: ['ta', 'te', 'to', 'chi'],
      correcta: 1,
    },
    {
      id: 'v1',
      categoria: 'vocab',
      enunciado: '¿Qué significa 水 (mizu)?',
      opciones: ['Agua', 'Fuego', 'Árbol', 'Sol'],
      correcta: 0,
    },
    {
      id: 'v2',
      categoria: 'vocab',
      enunciado: '¿Qué significa 猫 (neko)?',
      opciones: ['Perro', 'Gato', 'Pájaro', 'Pez'],
      correcta: 1,
    },
    {
      id: 'v3',
      categoria: 'vocab',
      enunciado: '¿Cuándo se usa おはよう?',
      opciones: ['Por la mañana', 'Por la noche', 'Al comer', 'Al despedirse'],
      correcta: 0,
    },
    {
      id: 'g1',
      categoria: 'gramatica',
      enunciado: '¿Qué función tiene です al final de una frase?',
      opciones: ['Indica estado o identidad (copula)', 'Marca pasado', 'Indica negación', 'Forma pregunta'],
      correcta: 0,
    },
    {
      id: 'g2',
      categoria: 'gramatica',
      enunciado: '¿Qué significa 私は学生です?',
      opciones: ['Soy estudiante', 'Fui estudiante', 'No soy estudiante', '¿Eres estudiante?'],
      correcta: 0,
    },
    {
      id: 'g3',
      categoria: 'gramatica',
      enunciado: 'En 学校で勉強します, ¿qué indica で?',
      opciones: ['Lugar donde ocurre la acción', 'Sujeto', 'Objeto directo', 'Posesión'],
      correcta: 0,
    },
  ];

  var UMBRAL_NIVEL = 0.8;

  /** Subtemas iniciales de kana marcados al sugerir Nivel 3. */
  var SUBTEMAS_NIVEL_3 = {
    hiragana: { vocales: 'dominado', filaK: 'dominado', filaS: 'dominado', filaT: 'en_progreso' },
    katakana: { vocales: 'dominado', filaK: 'dominado', filaS: 'en_progreso' },
  };

  /** Subtemas adicionales al sugerir Nivel 5 (vocab/kanji básico). */
  var SUBTEMAS_NIVEL_5 = {
    kanji: { numeros: 'dominado', familia: 'dominado', tiempo: 'en_progreso' },
    gramatica: { particulas: 'en_progreso', verbos: 'en_progreso' },
  };

  var estado = {
    indice: 0,
    respuestas: [],
    fase: 'intro',
  };

  function crearPerfilBase() {
    var perfil = NC && NC.obtenerPerfil ? NC.obtenerPerfil() : null;
    if (perfil) return perfil;

    var detalle = window.NihonCheckTemas
      ? NihonCheckTemas.crearDetalleVacio()
      : {};

    return {
      diagnosticoCompletado: false,
      fechaInicio: new Date().toISOString(),
      porcentajesPorArea: { hiragana: 0, katakana: 0, kanji: 0, gramatica: 0 },
      porcentajes: { hiragana: 0, katakana: 0, kanji: 0, gramatica: 0 },
      nivelesArea: {
        hiragana: 'principiante',
        katakana: 'principiante',
        kanji: 'principiante',
        gramatica: 'principiante',
      },
      niveles: {
        hiragana: 'principiante',
        katakana: 'principiante',
        kanji: 'principiante',
        gramatica: 'principiante',
      },
      detalle: detalle,
      estadisticasTema: {},
      recomendaciones: [],
      nivelActual: 1,
    };
  }

  function aplicarSubtemas(detalle, mapaPorArea) {
    Object.keys(mapaPorArea).forEach(function (area) {
      if (!detalle[area]) detalle[area] = {};
      var subtemas = mapaPorArea[area];
      Object.keys(subtemas).forEach(function (clave) {
        detalle[area][clave] = subtemas[clave];
      });
    });
  }

  function pctCategoria(respuestas, categoria) {
    var total = 0;
    var aciertos = 0;
    for (var i = 0; i < respuestas.length; i++) {
      var p = PREGUNTAS[i];
      if (p.categoria !== categoria) continue;
      total++;
      if (respuestas[i] === p.correcta) aciertos++;
    }
    return total > 0 ? aciertos / total : 0;
  }

  function calcularNivel(respuestas) {
    respuestas = respuestas || estado.respuestas;
    var pctHira = pctCategoria(respuestas, 'hiragana');
    var pctVocab = pctCategoria(respuestas, 'vocab');
    var pctGram = pctCategoria(respuestas, 'gramatica');

    var nivel = 1;
    var sugerencias = [];

    if (pctHira > UMBRAL_NIVEL) {
      nivel = Math.max(nivel, 3);
      sugerencias.push({
        nivel: 3,
        motivo: 'Dominas hiragana básico (' + Math.round(pctHira * 100) + '%)',
      });
    }

    if (pctVocab > UMBRAL_NIVEL) {
      nivel = Math.max(nivel, 5);
      sugerencias.push({
        nivel: 5,
        motivo: 'Vocabulario N5 sólido (' + Math.round(pctVocab * 100) + '%)',
      });
    }

    return {
      nivelActual: nivel,
      sugerencias: sugerencias,
      porcentajes: {
        hiragana: Math.round(pctHira * 100),
        vocab: Math.round(pctVocab * 100),
        gramatica: Math.round(pctGram * 100),
      },
      aciertosTotales: respuestas.filter(function (r, idx) {
        return r === PREGUNTAS[idx].correcta;
      }).length,
    };
  }

  function guardarProgreso(resultado) {
    if (!NC) return null;

    resultado = resultado || calcularNivel();
    var perfil = crearPerfilBase();

    if (!perfil.detalle && window.NihonCheckTemas) {
      perfil.detalle = NihonCheckTemas.crearDetalleVacio();
    }

    if (resultado.nivelActual >= 3) {
      aplicarSubtemas(perfil.detalle, SUBTEMAS_NIVEL_3);
      perfil.nivelesArea = perfil.nivelesArea || {};
      perfil.niveles = perfil.niveles || {};
      perfil.nivelesArea.hiragana = 'intermedio';
      perfil.nivelesArea.katakana = 'intermedio';
      perfil.niveles.hiragana = 'intermedio';
      perfil.niveles.katakana = 'intermedio';
      perfil.porcentajesPorArea = perfil.porcentajesPorArea || {};
      perfil.porcentajes = perfil.porcentajes || {};
      perfil.porcentajesPorArea.hiragana = Math.max(perfil.porcentajesPorArea.hiragana || 0, resultado.porcentajes.hiragana);
      perfil.porcentajesPorArea.katakana = Math.max(perfil.porcentajesPorArea.katakana || 0, 50);
      perfil.porcentajes.hiragana = perfil.porcentajesPorArea.hiragana;
      perfil.porcentajes.katakana = perfil.porcentajesPorArea.katakana;
    }

    if (resultado.nivelActual >= 5) {
      aplicarSubtemas(perfil.detalle, SUBTEMAS_NIVEL_5);
      perfil.nivelesArea.kanji = 'intermedio';
      perfil.nivelesArea.gramatica = 'intermedio';
      perfil.niveles.kanji = 'intermedio';
      perfil.niveles.gramatica = 'intermedio';
      perfil.porcentajesPorArea.kanji = Math.max(perfil.porcentajesPorArea.kanji || 0, resultado.porcentajes.vocab);
      perfil.porcentajes.kanji = perfil.porcentajesPorArea.kanji;
      perfil.porcentajesPorArea.gramatica = Math.max(perfil.porcentajesPorArea.gramatica || 0, resultado.porcentajes.gramatica);
      perfil.porcentajes.gramatica = perfil.porcentajesPorArea.gramatica;
    }

    perfil.nivelActual = resultado.nivelActual;
    perfil.diagnosticoCompletado = true;
    perfil.diagnosticoRapido = true;
    perfil.fechaDiagnostico = new Date().toISOString();

    NC.guardarPerfil(perfil);

    if (NC.inicializarDominioDesdePerfil) {
      NC.inicializarDominioDesdePerfil(perfil);
    }
    if (NC.actualizarRutaRecomendada) {
      NC.actualizarRutaRecomendada();
    }

    var usuario = NC.obtenerUsuario ? NC.obtenerUsuario() : {};
    usuario.diagnosticoCompletado = true;
    usuario.testDiagnosticoCompletado = true;
    usuario.primeraVisitaCompletada = true;
    if (perfil.recomendaciones && perfil.recomendaciones[0]) {
      var rec = perfil.recomendaciones[0];
      usuario.areaElegida = typeof rec === 'string' ? rec.split('-')[0] : rec.area;
    } else if (resultado.nivelActual >= 5) {
      usuario.areaElegida = 'kanji';
    } else if (resultado.nivelActual >= 3) {
      usuario.areaElegida = 'katakana';
    }

    NC.marcarDiagnosticoRealizado(true);
    if (NC.guardarUsuario) {
      NC.guardarUsuario(usuario);
    }

    if (window.NihonCheckSentry && window.NihonCheckSentry.trackEvent) {
      window.NihonCheckSentry.trackEvent('diagnostico_completado', {
        nivelActual: resultado.nivelActual,
        aciertosTotales: resultado.aciertosTotales,
        porcentajes: resultado.porcentajes,
      });
    }

    return perfil;
  }

  function etiquetaNivel(n) {
    if (n >= 5) return 'Nivel 5 — vocabulario y kanji básico';
    if (n >= 3) return 'Nivel 3 — kana avanzado';
    return 'Nivel 1 — desde hiragana';
  }

  function renderIntro() {
    var root = $('diagnostico-app');
    if (!root) return;

    root.innerHTML =
      '<div class="diagnostico-card diagnostico-card--fade">' +
        '<p class="diagnostico-kicker">NihonCheck</p>' +
        '<h1 class="diagnostico-titulo">Diagnóstico rápido</h1>' +
        '<p class="diagnostico-desc">10 preguntas para ubicar tu punto de partida. Opcional: puedes saltarlo y empezar desde cero en cualquier momento.</p>' +
        '<ul class="diagnostico-meta">' +
          '<li>4 hiragana</li><li>3 vocabulario N5</li><li>3 gramática básica</li>' +
        '</ul>' +
        '<div class="diagnostico-acciones">' +
          '<button type="button" class="btn-submit diagnostico-btn" id="diag-btn-iniciar">Comenzar</button>' +
          '<a href="index.html" class="btn-secondary diagnostico-btn diagnostico-btn--link">Saltar e ir al inicio</a>' +
        '</div>' +
      '</div>';

    var btn = $('diag-btn-iniciar');
    if (btn) {
      btn.addEventListener('click', function () {
        estado.fase = 'pregunta';
        estado.indice = 0;
        estado.respuestas = [];
        renderPregunta();
      });
    }
  }

  function renderPregunta() {
    var root = $('diagnostico-app');
    var pregunta = PREGUNTAS[estado.indice];
    if (!root || !pregunta) return;

    var num = estado.indice + 1;
    var total = PREGUNTAS.length;
    var pct = Math.round((num / total) * 100);

    var opcionesHtml = pregunta.opciones.map(function (op, idx) {
      return '<button type="button" class="diagnostico-opcion" data-opcion="' + idx + '">' +
        '<span class="diagnostico-opcion__texto">' + op + '</span>' +
      '</button>';
    }).join('');

    root.innerHTML =
      '<div class="diagnostico-card diagnostico-card--fade">' +
        '<div class="diagnostico-progreso">' +
          '<span class="diagnostico-progreso__label">' + num + ' / ' + total + '</span>' +
          '<div class="diagnostico-progreso__bar" role="progressbar" aria-valuenow="' + num + '" aria-valuemin="1" aria-valuemax="' + total + '">' +
            '<div class="diagnostico-progreso__fill" style="width:' + pct + '%"></div>' +
          '</div>' +
        '</div>' +
        '<p class="diagnostico-categoria">' + pregunta.categoria + '</p>' +
        '<h2 class="diagnostico-pregunta">' + pregunta.enunciado + '</h2>' +
        '<div class="diagnostico-opciones">' + opcionesHtml + '</div>' +
      '</div>';

    root.querySelectorAll('[data-opcion]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var elegida = parseInt(btn.getAttribute('data-opcion'), 10);
        estado.respuestas[estado.indice] = elegida;

        btn.classList.add('diagnostico-opcion--elegida');
        var esCorrecta = elegida === pregunta.correcta;
        btn.classList.add(esCorrecta ? 'diagnostico-opcion--ok' : 'diagnostico-opcion--fail');

        setTimeout(function () {
          estado.indice++;
          if (estado.indice >= PREGUNTAS.length) {
            estado.fase = 'resultado';
            renderResultado();
          } else {
            renderPregunta();
          }
        }, esCorrecta ? 350 : 550);
      });
    });
  }

  function renderResultado() {
    var root = $('diagnostico-app');
    if (!root) return;

    var resultado = calcularNivel();
    guardarProgreso(resultado);

    var sugerenciasHtml = '';
    if (resultado.sugerencias.length) {
      sugerenciasHtml = '<ul class="diagnostico-resumen__lista">' +
        resultado.sugerencias.map(function (s) {
          return '<li>' + s.motivo + '</li>';
        }).join('') +
      '</ul>';
    } else {
      sugerenciasHtml = '<p class="diagnostico-resumen__nota">Empezarás desde hiragana y vocabulario básico. Sin prisa: la ruta se adapta contigo.</p>';
    }

    root.innerHTML =
      '<div class="diagnostico-card diagnostico-card--fade">' +
        '<p class="diagnostico-kicker">Resultado</p>' +
        '<h2 class="diagnostico-titulo">' + resultado.aciertosTotales + ' / ' + PREGUNTAS.length + ' aciertos</h2>' +
        '<p class="diagnostico-resumen__nivel">Punto sugerido: <strong>' + etiquetaNivel(resultado.nivelActual) + '</strong></p>' +
        sugerenciasHtml +
        '<div class="diagnostico-resumen__stats">' +
          '<span>Hiragana ' + resultado.porcentajes.hiragana + '%</span>' +
          '<span>Vocab ' + resultado.porcentajes.vocab + '%</span>' +
          '<span>Gramática ' + resultado.porcentajes.gramatica + '%</span>' +
        '</div>' +
        '<div class="diagnostico-acciones">' +
          '<a href="index.html" class="btn-submit diagnostico-btn diagnostico-btn--link">Comenzar mi ruta personalizada</a>' +
        '</div>' +
      '</div>';
  }

  function iniciar() {
    initTema();
    estado.fase = 'intro';
    renderIntro();
  }

  var api = {
    PREGUNTAS: PREGUNTAS,
    calcularNivel: calcularNivel,
    /** Alias de calcularNivel para tests y consumidores externos */
    calcularResultados: calcularNivel,
    guardarProgreso: guardarProgreso,
    iniciar: iniciar,
  };

  if (typeof window !== 'undefined') {
    window.NihonCheckDiagnostico = api;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', iniciar);
    } else {
      iniciar();
    }
  }
})();
