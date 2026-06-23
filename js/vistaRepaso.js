/* ============================================================
   FASE 2 — Vista de Repaso SRS (UI del flujo de repetición)
   ------------------------------------------------------------
   Módulo standalone. Depende de que ya existan:
     - NihonCheck.srs.obtenerRepasosPendientesHoy()
     - NihonCheck.srs.procesarRepasoSRS(carpeta, caracter, acerto)
     - NihonCheck.comprobarRespuestaRomaji(resp, esperada)
     - NihonCheck.obtenerLecturaTarjeta(item)  (fallback)

   NO modifica nihoncheck.js ni srs.js. Reutiliza las clases CSS
   existentes (biblioteca-practica__*) para no inventar estilos.

   API:  NihonCheck.vistaRepaso = { iniciar, renderizar }
   ============================================================ */

(function () {
  'use strict';

  var NihonCheck = (typeof window !== 'undefined' && window.NihonCheck) || {};

  var ETIQUETAS_CARPETA = {
    hiragana: 'Hiragana',
    katakana: 'Katakana',
    kanji: 'Kanji',
    gramatica: 'Gramática',
  };

  // Estado interno de la sesión de repaso en curso.
  var _estado = null;

  /* ---------- Helpers ---------- */

  /** Lectura esperada de un ítem (romaji). Defensivo. */
  function lecturaDe(item) {
    if (!item) return '';
    if (item.lectura) return item.lectura;
    if (NihonCheck.obtenerLecturaTarjeta) {
      return NihonCheck.obtenerLecturaTarjeta(item) || '';
    }
    return '';
  }

  /** Texto grande que se muestra de la tarjeta. */
  function displayDe(item) {
    if (!item) return '—';
    return item.caracter || item.titulo || '—';
  }

  /** Comprobación de romaji reutilizando la función del core. */
  function esCorrecto(respuesta, esperada) {
    if (NihonCheck.comprobarRespuestaRomaji) {
      return NihonCheck.comprobarRespuestaRomaji(respuesta, esperada);
    }
    return String(respuesta || '').trim().toLowerCase() ===
      String(esperada || '').trim().toLowerCase();
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ---------- Render: tarjeta actual ---------- */

  function renderTarjeta(contenedor) {
    var item = _estado.items[_estado.indice];
    var total = _estado.items.length;
    var display = displayDe(item);
    var carpeta = item.carpeta || 'hiragana';

    contenedor.innerHTML =
      '<div class="biblioteca-practica__panel repaso-panel">' +
        '<div class="biblioteca-practica__header">' +
          '<span class="biblioteca-practica__titulo">Repaso · ' +
            escapeHtml(ETIQUETAS_CARPETA[carpeta] || carpeta) + '</span>' +
          '<span class="biblioteca-practica__cerrar" aria-hidden="true">' +
            (_estado.indice + 1) + ' / ' + total + '</span>' +
        '</div>' +
        '<p class="biblioteca-practica__aviso">' +
          'Escribe la lectura en romaji. Es práctica de refuerzo — puedes salir cuando quieras.' +
        '</p>' +
        '<p class="biblioteca-practica__caracter">' + escapeHtml(display) + '</p>' +
        '<form class="biblioteca-practica__form" id="form-repaso">' +
          '<input class="biblioteca-practica__input" id="input-repaso" type="text" ' +
            'autocomplete="off" autocapitalize="off" spellcheck="false" ' +
            'placeholder="Escribe el romaji…">' +
          '<p class="biblioteca-practica__feedback" id="feedback-repaso" aria-live="polite"></p>' +
        '</form>' +
        '<button type="button" class="btn-agregar" id="btn-repaso-accion" data-repaso-accion="enviar">' +
          'Comprobar' +
        '</button>' +
      '</div>';

    var input = contenedor.querySelector('#input-repaso');
    if (input) {
      setTimeout(function () { input.focus(); }, 50);
    }
  }

  /* ---------- Render: resumen final ---------- */

  function renderResumen(contenedor) {
    var total = _estado.correctas + _estado.incorrectas;
    contenedor.innerHTML =
      '<div class="biblioteca-practica__panel repaso-panel repaso-resumen">' +
        '<div class="biblioteca-practica__header">' +
          '<span class="biblioteca-practica__titulo">Repaso completado</span>' +
        '</div>' +
        '<p class="biblioteca-practica__caracter" aria-hidden="true">🎌</p>' +
        '<p class="repaso-resumen__texto">' +
          'Revisaste <strong>' + total + '</strong> ' +
          (total === 1 ? 'elemento' : 'elementos') + '.' +
        '</p>' +
        '<div class="repaso-resumen__stats">' +
          '<div class="repaso-resumen__stat repaso-resumen__stat--ok">' +
            '<span class="repaso-resumen__num">' + _estado.correctas + '</span>' +
            '<span class="repaso-resumen__label">correctas</span>' +
          '</div>' +
          '<div class="repaso-resumen__stat repaso-resumen__stat--fail">' +
            '<span class="repaso-resumen__num">' + _estado.incorrectas + '</span>' +
            '<span class="repaso-resumen__label">por reforzar</span>' +
          '</div>' +
        '</div>' +
        '<button type="button" class="btn-agregar" id="btn-repaso-accion" data-repaso-accion="terminar">' +
          'Volver al inicio' +
        '</button>' +
      '</div>';
  }

  /* ---------- Lógica de interacción ---------- */

  /** Procesa el envío de la respuesta de la tarjeta actual. */
  function enviarRespuesta(contenedor) {
    var input = contenedor.querySelector('#input-repaso');
    var feedback = contenedor.querySelector('#feedback-repaso');
    var btn = contenedor.querySelector('#btn-repaso-accion');
    if (!input || _estado.respondida) return;

    var item = _estado.items[_estado.indice];
    var esperada = lecturaDe(item);
    var acerto = esCorrecto(input.value, esperada);

    _estado.respondida = true;
    input.setAttribute('disabled', '');

    // FASE FINAL (UX): un repaso también cuenta como actividad diaria,
    // para que la racha refleje los días en que el usuario repasa.
    if (NihonCheck.registrarActividadDiaria) {
      NihonCheck.registrarActividadDiaria();
    }

    // Persistir el resultado en el SRS.
    if (NihonCheck.srs && NihonCheck.srs.procesarRepasoSRS) {
      NihonCheck.srs.procesarRepasoSRS(
        item.carpeta || 'hiragana',
        item.caracter || item.titulo,
        acerto
      );
    }

    if (acerto) {
      _estado.correctas += 1;
      if (feedback) {
        feedback.textContent = '✅ ¡Correcto! (' + esperada + ')';
        feedback.className = 'biblioteca-practica__feedback biblioteca-practica__feedback--ok';
      }
    } else {
      _estado.incorrectas += 1;
      if (feedback) {
        feedback.textContent = '❌ Era: ' + esperada;
        feedback.className = 'biblioteca-practica__feedback biblioteca-practica__feedback--fail';
      }
    }

    if (btn) {
      var esUltima = _estado.indice >= _estado.items.length - 1;
      btn.textContent = esUltima ? 'Ver resumen' : 'Siguiente';
      btn.setAttribute('data-repaso-accion', 'siguiente');
      btn.focus();
    }
  }

  /** Avanza a la siguiente tarjeta o al resumen. */
  function siguiente(contenedor) {
    _estado.indice += 1;
    _estado.respondida = false;
    if (_estado.indice >= _estado.items.length) {
      renderResumen(contenedor);
    } else {
      renderTarjeta(contenedor);
    }
  }

  /** Maneja clicks dentro del contenedor (delegación). */
  function manejarClick(e) {
    if (!_estado) return;
    var contenedor = _estado.contenedor;
    var accionBtn = e.target.closest('[data-repaso-accion]');
    if (!accionBtn) return;
    var accion = accionBtn.getAttribute('data-repaso-accion');

    if (accion === 'enviar') {
      enviarRespuesta(contenedor);
    } else if (accion === 'siguiente') {
      siguiente(contenedor);
    } else if (accion === 'terminar') {
      terminar();
    }
  }

  /** Maneja Enter dentro del input/formulario. */
  function manejarSubmit(e) {
    if (!_estado) return;
    if (e.target && e.target.id === 'form-repaso') {
      e.preventDefault();
      if (_estado.respondida) {
        siguiente(_estado.contenedor);
      } else {
        enviarRespuesta(_estado.contenedor);
      }
    }
  }

  /** Limpia listeners y estado, e invoca el callback de salida. */
  function terminar() {
    var cb = _estado && _estado.onTerminar;
    desmontar();
    if (typeof cb === 'function') cb();
  }

  function desmontar() {
    if (_estado && _estado.contenedor) {
      _estado.contenedor.removeEventListener('click', manejarClick);
      _estado.contenedor.removeEventListener('submit', manejarSubmit);
    }
    _estado = null;
  }

  /* ---------- API pública ---------- */

  /**
   * Renderiza el estado actual de la sesión en el contenedor.
   * (Tarjeta o resumen según el progreso). Pública para reusos.
   */
  function renderizar(contenedor) {
    if (!contenedor || !_estado) return;
    if (_estado.indice >= _estado.items.length) {
      renderResumen(contenedor);
    } else {
      renderTarjeta(contenedor);
    }
  }

  /**
   * Inicia una sesión de repaso en el contenedor dado.
   * @param {HTMLElement} contenedor  donde se inyecta la vista
   * @param {Function} onTerminar     callback al volver (ej. irHome)
   * @returns {number} nº de items a repasar (0 si no hay)
   */
  function iniciar(contenedor, onTerminar) {
    if (!contenedor) return 0;

    // Limpiar sesión previa si la hubiera.
    if (_estado) desmontar();

    var items = [];
    if (NihonCheck.srs && NihonCheck.srs.obtenerRepasosPendientesHoy) {
      items = NihonCheck.srs.obtenerRepasosPendientesHoy() || [];
    }

    if (!items.length) {
      contenedor.innerHTML =
        '<div class="biblioteca-practica__panel repaso-panel repaso-resumen">' +
          '<p class="biblioteca-practica__caracter" aria-hidden="true">✅</p>' +
          '<p class="repaso-resumen__texto">No tienes repasos pendientes hoy.<br>' +
            '¡Vuelve mañana o sigue aprendiendo!</p>' +
          '<button type="button" class="btn-agregar" data-repaso-accion="terminar">' +
            'Volver al inicio' +
          '</button>' +
        '</div>';
      // Estado mínimo para que el botón "terminar" funcione.
      _estado = {
        contenedor: contenedor, items: [], indice: 0,
        correctas: 0, incorrectas: 0, respondida: false,
        onTerminar: onTerminar,
      };
      contenedor.addEventListener('click', manejarClick);
      return 0;
    }

    _estado = {
      contenedor: contenedor,
      items: items,
      indice: 0,
      correctas: 0,
      incorrectas: 0,
      respondida: false,
      onTerminar: onTerminar,
    };

    contenedor.addEventListener('click', manejarClick);
    contenedor.addEventListener('submit', manejarSubmit);

    renderTarjeta(contenedor);
    return items.length;
  }

  /* ---------- Exposición ---------- */

  NihonCheck.vistaRepaso = {
    iniciar: iniciar,
    renderizar: renderizar,
  };

  if (typeof window !== 'undefined') {
    window.NihonCheck = NihonCheck;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = NihonCheck;
  }
})();
