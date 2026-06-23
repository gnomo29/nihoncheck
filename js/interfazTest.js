/**
 * INTERFAZ DEL TEST
 * Conecta el motor adaptativo con el HTML.
 * Respuesta libre en romaji, detección de velocidad y feedback asimétrico.
 */

var NihonCheck = window.NihonCheck || {};

var ETIQUETAS_CATEGORIA = {
  hiragana: 'Hiragana',
  katakana: 'Katakana',
  kanji: 'Kanji',
};

var examenEnCurso = false;
var respondiendo = false;

/** Retraso de feedback: acierto 0,6 s; fallo 1,5 s (muestra respuesta correcta). */
var DELAY_ACIERTO_MS = 600;
var DELAY_FALLO_MS = 1500;
var UMBRAL_VELOCIDAD_MS = 500;

function limpiarExamen(contenedor) {
  if (!contenedor) return;
  if (contenedor._examenHandler) {
    contenedor.removeEventListener('submit', contenedor._examenHandler);
    contenedor._examenHandler = null;
  }
  examenEnCurso = false;
  respondiendo = false;
}

function renderizarPregunta(contenedor, pregunta, estado) {
  if (!pregunta) {
    contenedor.innerHTML = '<p class="test-placeholder">No hay más preguntas disponibles.</p>';
    return false;
  }

  var cat = pregunta.categoria;
  var etiquetaCat = ETIQUETAS_CATEGORIA[cat] || cat;
  var metaExtra = '';

  if (estado.esPersonalizado) {
    metaExtra = etiquetaCat + ' · ' + pregunta.nivel;
  } else {
    var numEnBloque = (estado.respondidasPorCategoria[cat] || 0) + 1;
    var cuota = (estado.cuotaPorCategoria && estado.cuotaPorCategoria[cat]) || 10;
    metaExtra = etiquetaCat + ' (' + numEnBloque + '/' + cuota + ') · ' + pregunta.nivel;
  }

  contenedor.innerHTML =
    '<div class="pregunta">' +
      '<div class="pregunta__progreso">Pregunta ' + (estado.numeroPregunta + 1) + ' de ' + estado.totalPreguntas +
        '<span class="pregunta__meta">' + metaExtra + '</span></div>' +
      '<p class="pregunta__texto">' + pregunta.pregunta + '</p>' +
      '<p class="pregunta__caracter">' + pregunta.caracter + '</p>' +
      '<form class="pregunta__form" id="form-respuesta">' +
        '<label class="pregunta__label" for="input-respuesta">Escribe la respuesta en romaji</label>' +
        '<input class="pregunta__input" id="input-respuesta" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="ej. ka, shi, ichi…">' +
        '<button class="pregunta__submit" type="submit">Comprobar</button>' +
      '</form>' +
    '</div>';

  // Marcar inicio para medir velocidad de respuesta
  estado.tiempoInicioPregunta = Date.now();

  // Auto-enfoque del input tras pintar el DOM
  setTimeout(function () {
    var input = contenedor.querySelector('#input-respuesta');
    if (input) input.focus();
  }, 50);

  return true;
}

function mostrarFeedback(contenedor, acerto, respuestaCorrecta) {
  var overlay = document.createElement('div');
  overlay.className = 'feedback feedback--' + (acerto ? 'ok' : 'fail');
  if (acerto) {
    overlay.textContent = '✓ Correcto';
  } else {
    overlay.innerHTML =
      '✗ Incorrecto' +
      '<span class="feedback__correcta">Respuesta correcta: ' + respuestaCorrecta + '</span>';
  }
  contenedor.appendChild(overlay);
}

/** Aviso si respondió demasiado rápido (posible traductor). */
function mostrarAvisoVelocidad(contenedor) {
  var aviso = document.createElement('div');
  aviso.className = 'velocidad-aviso';
  aviso.setAttribute('role', 'alert');
  aviso.textContent = '¿Demasiado rápido? Asegúrate de no estar usando un traductor';
  contenedor.appendChild(aviso);

  setTimeout(function () {
    if (aviso.parentNode) aviso.parentNode.removeChild(aviso);
  }, 2500);
}

NihonCheck.reiniciarVistaTest = function (contenedor, btnStart) {
  limpiarExamen(contenedor);
  NihonCheck.bancoPersonalizado = null;
  if (btnStart) {
    btnStart.hidden = false;
    btnStart.disabled = false;
  }
  if (contenedor) {
    contenedor.innerHTML = '<p class="test-placeholder">Preparando test…</p>';
  }
};

function mostrarResultados(contenedor, historial, btnStart, errores, tiemposRespuesta, opcionesExamen) {
  var stats = NihonCheck.calcularEstadisticas(historial);

  if (NihonCheck.guardarUltimoExamen) {
    NihonCheck.guardarUltimoExamen({
      porcentaje: stats.global.porcentaje,
      aciertos: stats.global.aciertos,
      total: stats.global.total,
      tipo: opcionesExamen && opcionesExamen.modoDiagnostico
        ? 'test de nivel'
        : 'test inteligente',
      fecha: new Date().toISOString(),
    });
  }

  if (opcionesExamen && typeof opcionesExamen.onCompletado === 'function') {
    limpiarExamen(contenedor);
    NihonCheck.bancoPersonalizado = null;
    if (btnStart) btnStart.hidden = true;
    opcionesExamen.onCompletado(historial, stats, contenedor);
    return;
  }

  contenedor.innerHTML = NihonCheck.generarHTMLResultados(
    historial,
    errores,
    tiemposRespuesta
  );
  limpiarExamen(contenedor);
  NihonCheck.bancoPersonalizado = null;
  if (btnStart) btnStart.hidden = true;
}

/**
 * Inicia el examen adaptativo o personalizado.
 * opciones.bancoPersonalizado: array de preguntas (modo contenido analizado).
 */
NihonCheck.iniciarExamen = function (contenedor, btnStart, opciones) {
  if (!contenedor) {
    console.error('No se encontró el contenedor del test.');
    return;
  }

  if (!NihonCheck.crearEstadoInicial || !NihonCheck.obtenerPrimeraPregunta) {
    contenedor.innerHTML =
      '<p class="test-placeholder">Error: no se cargaron las preguntas. Recarga la página.</p>';
    return;
  }

  limpiarExamen(contenedor);

  if (NihonCheck.iniciarCacheMemoria) {
    NihonCheck.iniciarCacheMemoria();
  }

  NihonCheck._opcionesExamenActual = opciones || null;

  var banco = (opciones && opciones.bancoPersonalizado) || NihonCheck.bancoPersonalizado;
  var estado;
  var preguntaActual;

  if (banco && banco.length > 0) {
    NihonCheck.bancoPersonalizado = banco;
    estado = NihonCheck.crearEstadoInicialPersonalizado(banco);
    preguntaActual = banco[0];
  } else {
    NihonCheck.bancoPersonalizado = null;
    estado = NihonCheck.crearEstadoInicial();
    preguntaActual = NihonCheck.obtenerPrimeraPregunta(estado);
  }

  if (!renderizarPregunta(contenedor, preguntaActual, estado)) {
    contenedor.innerHTML =
      '<p class="test-placeholder">Error al cargar la primera pregunta.</p>';
    return;
  }

  if (btnStart) btnStart.hidden = true;
  examenEnCurso = true;
  respondiendo = false;

  function manejarEnvio(evento) {
    if (respondiendo) return;

    var form = evento.target.closest('#form-respuesta');
    if (!form || estado.terminado) return;

    evento.preventDefault();

    var input = form.querySelector('#input-respuesta');
    var respuestaUsuario = input ? input.value : '';
    if (!respuestaUsuario.trim()) {
      if (input) input.focus();
      return;
    }

    // Medir tiempo de respuesta en milisegundos
    var tiempoMs = estado.tiempoInicioPregunta
      ? Date.now() - estado.tiempoInicioPregunta
      : 0;
    estado.tiemposRespuesta.push(tiempoMs);

    if (tiempoMs < UMBRAL_VELOCIDAD_MS) {
      mostrarAvisoVelocidad(contenedor);
    }

    respondiendo = true;
    if (input) input.disabled = true;

    var resultado = NihonCheck.procesarRespuesta(
      estado,
      preguntaActual,
      respuestaUsuario,
      tiempoMs
    );
    estado = resultado.estado;

    var acerto =
      NihonCheck.normalizarRespuesta(respuestaUsuario) ===
      NihonCheck.normalizarRespuesta(preguntaActual.respuestaCorrecta);

    if (NihonCheck.registrarResultadoMemoria) {
      NihonCheck.registrarResultadoMemoria(preguntaActual, acerto, tiempoMs);
    }

    // FASE 0 — Hook aditivo: registrar actividad diaria tras cada respuesta.
    // No altera la lógica del examen; solo marca el día como activo.
    if (NihonCheck.registrarActividadDiaria) {
      NihonCheck.registrarActividadDiaria();
    }

    mostrarFeedback(contenedor, acerto, preguntaActual.respuestaCorrecta);

    setTimeout(function () {
      respondiendo = false;
      if (estado.terminado) {
        mostrarResultados(
          contenedor,
          estado.historial,
          btnStart,
          estado.errores,
          estado.tiemposRespuesta,
          NihonCheck._opcionesExamenActual
        );
      } else {
        preguntaActual = resultado.siguientePregunta;
        renderizarPregunta(contenedor, preguntaActual, estado);
      }
    }, acerto ? DELAY_ACIERTO_MS : DELAY_FALLO_MS);
  }

  contenedor._examenHandler = manejarEnvio;
  contenedor.addEventListener('submit', manejarEnvio);
};

/** Examen desde la vista de contenido analizado (mínimo 3 caracteres). */
NihonCheck.iniciarExamenDeContenido = function (contenedor, btnStart, uploadFeedback) {
  var items;
  if (NihonCheck.caracteresUltimoAnalisis && NihonCheck.caracteresUltimoAnalisis.length > 0) {
    items = NihonCheck.caracteresUltimoAnalisis.slice();
  } else if (NihonCheck.obtenerEstudioPendiente) {
    items = NihonCheck.obtenerEstudioPendiente().map(function (item) {
      return item;
    });
  } else {
    items = [];
  }

  if (items.length < 3) {
    if (uploadFeedback) {
      uploadFeedback.textContent =
        'Se necesitan al menos 3 caracteres para un examen personalizado.';
      uploadFeedback.className = 'upload-feedback';
      uploadFeedback.hidden = false;
    }
    return false;
  }

  var banco = NihonCheck.construirBancoPersonalizado(items);
  if (NihonCheck.priorizarBancoPorDebiles) {
    banco = NihonCheck.priorizarBancoPorDebiles(banco);
  }
  if (banco.length < 3) {
    if (uploadFeedback) {
      uploadFeedback.textContent =
        'Se necesitan al menos 3 caracteres para un examen personalizado.';
      uploadFeedback.className = 'upload-feedback';
      uploadFeedback.hidden = false;
    }
    return false;
  }

  NihonCheck.bancoPersonalizado = banco;
  NihonCheck.iniciarExamen(contenedor, btnStart, { bancoPersonalizado: banco });
  return true;
};

window.NihonCheck = NihonCheck;


