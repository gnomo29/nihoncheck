/**
 * MOTOR ADAPTATIVO
 * Bloques: 10 hiragana → 10 katakana → 10 kanji (30 total).
 * Adaptativo dentro de cada bloque; kanji siempre nivel avanzado.
 * Examen personalizado: recorre bancoPersonalizado sin lógica de bloques.
 */

var NihonCheck = window.NihonCheck || {};
const CUOTA_POR_CATEGORIA = { hiragana: 10, katakana: 10, kanji: 10 };
const TOTAL_PREGUNTAS = 30;

/** Puntos por acierto y penalización por fallo (puntuación asimétrica). */
const PUNTOS_ACIERTO = 10;
const PUNTOS_FALLO = 25;

NihonCheck.normalizarRespuesta = function (texto) {
  return (texto || '').trim().toLowerCase();
};

/**
 * Puntuación ponderada: cada acierto suma +10, cada fallo resta -25.
 * Fórmula: puntos = (aciertos × 10) − (fallos × 25)
 * Porcentaje = clamp( puntos / (total × 10) × 100 , 0, 100 )
 * Así un fallo pesa más que un acierto (dominancia asimétrica).
 */
NihonCheck.calcularPuntuacionPonderada = function (historial) {
  if (!historial || historial.length === 0) {
    return { puntos: 0, porcentaje: 0, aciertos: 0, fallos: 0, total: 0 };
  }

  var aciertos = 0;
  var fallos = 0;
  for (var i = 0; i < historial.length; i++) {
    if (historial[i].acerto) aciertos++;
    else fallos++;
  }

  var total = historial.length;
  var puntos = aciertos * PUNTOS_ACIERTO - fallos * PUNTOS_FALLO;
  var maxPosible = total * PUNTOS_ACIERTO;
  var porcentaje = Math.round(Math.max(0, Math.min(100, (puntos / maxPosible) * 100)));

  return { puntos: puntos, porcentaje: porcentaje, aciertos: aciertos, fallos: fallos, total: total };
};

/** Busca una pregunta del banco general por carácter exacto. */
NihonCheck.buscarPreguntaPorCaracter = function (caracter) {
  var todas = NihonCheck.obtenerTodasLasPreguntas
    ? NihonCheck.obtenerTodasLasPreguntas()
    : [];
  for (var i = 0; i < todas.length; i++) {
    if (todas[i].caracter === caracter) return todas[i];
  }
  return null;
};

/**
 * Construye bancoPersonalizado a partir de caracteres detectados en el análisis.
 * items: strings (caracteres) o { caracter, categoria }.
 */
NihonCheck.construirBancoPersonalizado = function (items) {
  var banco = [];
  var vistos = {};
  var ordenCategoria = { hiragana: 0, katakana: 1, kanji: 2 };

  for (var i = 0; i < items.length; i++) {
    var caracter;
    var categoria;

    if (typeof items[i] === 'string') {
      caracter = items[i];
      categoria = NihonCheck.clasificarCaracter
        ? NihonCheck.clasificarCaracter(caracter)
        : null;
    } else {
      caracter = items[i].caracter;
      categoria = items[i].categoria || (NihonCheck.clasificarCaracter
        ? NihonCheck.clasificarCaracter(caracter)
        : null);
    }

    if (!caracter || !categoria || vistos[caracter]) continue;
    vistos[caracter] = true;

    var encontrada = NihonCheck.buscarPreguntaPorCaracter(caracter);
    if (encontrada) {
      banco.push(encontrada);
    } else {
      var textoPregunta = categoria === 'kanji'
        ? '¿Cuál es la lectura en romaji de este kanji?'
        : '¿Qué sonido representa este carácter? (escribe en romaji)';
      banco.push({
        id: 'custom-' + caracter,
        categoria: categoria,
        nivel: 'basico',
        caracter: caracter,
        pregunta: textoPregunta,
        respuestaCorrecta: '?',
      });
    }
  }

  banco.sort(function (a, b) {
    var diff = ordenCategoria[a.categoria] - ordenCategoria[b.categoria];
    if (diff !== 0) return diff;
    return a.caracter < b.caracter ? -1 : a.caracter > b.caracter ? 1 : 0;
  });

  return banco;
};

NihonCheck.crearEstadoInicial = function () {
  return {
    numeroPregunta: 0,
    totalPreguntas: TOTAL_PREGUNTAS,
    cuotaPorCategoria: { hiragana: 10, katakana: 10, kanji: 10 },
    respondidasPorCategoria: { hiragana: 0, katakana: 0, kanji: 0 },
    categoriaActual: 'hiragana',
    nivelActual: 'basico',
    idsUsados: [],
    colaPrioridad: NihonCheck.construirColaPrioridadDebil
      ? NihonCheck.construirColaPrioridadDebil()
      : [],
    indicePrioridad: 0,
    historial: [],
    errores: [],
    tiemposRespuesta: [],
    tiempoInicioPregunta: null,
    terminado: false,
    esPersonalizado: false,
  };
};

/** Estado para examen de contenido analizado (sin bloques 10+10+10). */
NihonCheck.crearEstadoInicialPersonalizado = function (banco) {
  return {
    numeroPregunta: 0,
    totalPreguntas: banco.length,
    banco: banco,
    indiceActual: 0,
    historial: [],
    errores: [],
    tiemposRespuesta: [],
    tiempoInicioPregunta: null,
    terminado: false,
    esPersonalizado: true,
  };
};

NihonCheck.decidirSiguienteNivel = function (
  acerto,
  categoria,
  nivel,
  respondidasPorCategoria,
  cuotaPorCategoria
) {
  var siguienteNivel;

  if (categoria === 'kanji') {
    siguienteNivel = 'avanzado';
  } else if (acerto) {
    siguienteNivel = 'avanzado';
  } else {
    siguienteNivel = 'basico';
  }

  if (respondidasPorCategoria[categoria] >= cuotaPorCategoria[categoria]) {
    if (categoria === 'hiragana') {
      return { categoria: 'katakana', nivel: 'basico' };
    }
    if (categoria === 'katakana') {
      return { categoria: 'kanji', nivel: 'avanzado' };
    }
    return { categoria: 'kanji', nivel: 'avanzado' };
  }

  return { categoria: categoria, nivel: siguienteNivel };
};

NihonCheck.seleccionarPregunta = function (categoria, nivel, idsUsados) {
  var todas = NihonCheck.PREGUNTAS[categoria];
  if (!todas) return null;

  function filtrar(niv) {
    return todas.filter(function (p) {
      return p.nivel === niv && idsUsados.indexOf(p.id) === -1;
    });
  }

  var candidatas = filtrar(nivel);

  if (candidatas.length === 0) {
    candidatas = filtrar(nivel === 'basico' ? 'avanzado' : 'basico');
  }
  if (candidatas.length === 0) {
    candidatas = todas.filter(function (p) {
      return idsUsados.indexOf(p.id) === -1;
    });
  }
  if (candidatas.length === 0) return null;

  return candidatas[Math.floor(Math.random() * candidatas.length)];
};

NihonCheck.construirColaPrioridadDebil = function () {
  if (!NihonCheck.obtenerPuntosDebiles) return [];
  var debiles = NihonCheck.obtenerPuntosDebiles();
  if (debiles.length === 0) return [];

  debiles.sort(function (a, b) {
    if (b.fallos !== a.fallos) return b.fallos - a.fallos;
    return (b.ultimoFallo || '') > (a.ultimoFallo || '') ? 1 : -1;
  });

  var cola = [];
  var idsVistos = {};
  for (var i = 0; i < debiles.length; i++) {
    var pregunta = NihonCheck.buscarPreguntaPorCaracter(debiles[i].caracter);
    if (pregunta && !idsVistos[pregunta.id]) {
      cola.push(pregunta);
      idsVistos[pregunta.id] = true;
    }
  }
  return cola;
};

NihonCheck.priorizarBancoPorDebiles = function (banco) {
  if (!NihonCheck.obtenerPuntosDebiles) return banco;
  var mapaFallos = {};
  var debiles = NihonCheck.obtenerPuntosDebiles();
  for (var i = 0; i < debiles.length; i++) {
    mapaFallos[debiles[i].caracter] = debiles[i].fallos;
  }
  return banco.slice().sort(function (a, b) {
    var fa = mapaFallos[a.caracter] || 0;
    var fb = mapaFallos[b.caracter] || 0;
    if (fb !== fa) return fb - fa;
    return 0;
  });
};

NihonCheck.seleccionarConPrioridadDebil = function (estado, categoria, nivel) {
  if (estado.colaPrioridad && estado.indicePrioridad < estado.colaPrioridad.length) {
    while (estado.indicePrioridad < estado.colaPrioridad.length) {
      var prioritaria = estado.colaPrioridad[estado.indicePrioridad];
      estado.indicePrioridad += 1;
      if (estado.idsUsados.indexOf(prioritaria.id) === -1) {
        return prioritaria;
      }
    }
  }
  return NihonCheck.seleccionarPregunta(categoria, nivel, estado.idsUsados);
};

NihonCheck.obtenerPrimeraPregunta = function (estado) {
  if (estado && NihonCheck.seleccionarConPrioridadDebil) {
    return NihonCheck.seleccionarConPrioridadDebil(estado, 'hiragana', 'basico');
  }
  return NihonCheck.seleccionarPregunta('hiragana', 'basico', estado ? estado.idsUsados : []);
};

/**
 * Registra la respuesta del alumno.
 * tiempoMs: milisegundos desde que se mostró la pregunta (opcional).
 */
NihonCheck.procesarRespuesta = function (estado, pregunta, respuestaUsuario, tiempoMs) {
  var respuestaNormalizada = NihonCheck.normalizarRespuesta(respuestaUsuario);
  var correctaNormalizada = NihonCheck.normalizarRespuesta(pregunta.respuestaCorrecta);
  var acerto = respuestaNormalizada === correctaNormalizada;
  var ms = typeof tiempoMs === 'number' ? tiempoMs : 0;

  estado.historial.push({
    id: pregunta.id,
    categoria: pregunta.categoria,
    nivel: pregunta.nivel,
    caracter: pregunta.caracter,
    tema: pregunta.tema || (window.NihonCheckTemas
      ? NihonCheckTemas.inferirTemaDesdePregunta(pregunta)
      : null),
    acerto: acerto,
    respuestaUsuario: respuestaUsuario.trim(),
    respuestaCorrecta: pregunta.respuestaCorrecta,
    tiempoMs: ms,
  });

  if (!acerto) {
    estado.errores.push({
      caracter: pregunta.caracter,
      respuestaCorrecta: pregunta.respuestaCorrecta,
      respuestaUsuario: respuestaUsuario.trim(),
      categoria: pregunta.categoria,
      tiempoMs: ms,
    });
  }

  estado.numeroPregunta += 1;

  if (estado.esPersonalizado) {
    estado.indiceActual += 1;

    if (estado.numeroPregunta >= estado.totalPreguntas) {
      estado.terminado = true;
      return { estado: estado, siguientePregunta: null };
    }

    return {
      estado: estado,
      siguientePregunta: estado.banco[estado.indiceActual],
    };
  }

  estado.idsUsados.push(pregunta.id);

  if (estado.respondidasPorCategoria[pregunta.categoria] !== undefined) {
    estado.respondidasPorCategoria[pregunta.categoria] += 1;
  }

  if (estado.numeroPregunta >= estado.totalPreguntas) {
    estado.terminado = true;
    return { estado: estado, siguientePregunta: null };
  }

  var siguiente = NihonCheck.decidirSiguienteNivel(
    acerto,
    pregunta.categoria,
    pregunta.nivel,
    estado.respondidasPorCategoria,
    estado.cuotaPorCategoria
  );
  estado.categoriaActual = siguiente.categoria;
  estado.nivelActual = siguiente.nivel;

  return {
    estado: estado,
    siguientePregunta: NihonCheck.seleccionarConPrioridadDebil
      ? NihonCheck.seleccionarConPrioridadDebil(
          estado,
          siguiente.categoria,
          siguiente.nivel
        )
      : NihonCheck.seleccionarPregunta(
          siguiente.categoria,
          siguiente.nivel,
          estado.idsUsados
        ),
  };
};

/** Calcula el tiempo promedio en segundos a partir de tiemposRespuesta (ms). */
NihonCheck.calcularTiempoPromedio = function (tiemposRespuesta) {
  if (!tiemposRespuesta || tiemposRespuesta.length === 0) return 0;
  var suma = 0;
  for (var i = 0; i < tiemposRespuesta.length; i++) {
    suma += tiemposRespuesta[i];
  }
  return suma / tiemposRespuesta.length / 1000;
};

window.NihonCheck = NihonCheck;


