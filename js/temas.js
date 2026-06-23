/**
 * NIHONCHECK — Taxonomía de temas y mapeo pregunta → subtema
 */
(function () {
  'use strict';

  var AREAS = ['hiragana', 'katakana', 'kanji', 'gramatica'];

  /** Claves de detalle por área (perfil.detalle). */
  var CLAVES_DETALLE = {
    hiragana: ['vocales', 'filaK', 'filaS', 'filaT', 'combinaciones', 'dakuten'],
    katakana: ['vocales', 'filaK', 'filaS', 'filaT', 'combinaciones', 'dakuten'],
    kanji: ['numeros', 'tiempo', 'familia', 'naturaleza', 'verbos'],
    gramatica: ['particulas', 'verbos', 'adjetivos', 'negacion', 'preguntas'],
  };

  var ETIQUETAS_TEMA = {
    vocales: 'Grupo A',
    filaK: 'Grupo KA',
    filaS: 'Grupo SA',
    filaT: 'Grupo TA',
    combinaciones: 'Grupo combinaciones',
    dakuten: 'Grupo dakuten',
    numeros: 'Números',
    tiempo: 'Tiempo y días',
    familia: 'Kanji básicos N5',
    naturaleza: 'Naturaleza',
    verbos: 'Verbos',
    particulas: 'Partículas',
    adjetivos: 'Adjetivos',
    negacion: 'Negación',
    preguntas: 'Preguntas',
  };

  var ETIQUETAS_AREA = {
    hiragana: 'Hiragana',
    katakana: 'Katakana',
    kanji: 'Kanji',
    gramatica: 'Gramática',
  };

  /** Mapeo id de tema en lecciones.js → clave detalle. */
  var TEMA_ID_A_DETALLE = {
    'hira-vocales': 'vocales',
    'hira-fila-k': 'filaK',
    'hira-fila-s': 'filaS',
    'hira-fila-t': 'filaT',
    'hira-combinaciones': 'combinaciones',
    'hira-dakuten': 'dakuten',
    'kata-vocales': 'vocales',
    'kata-fila-k': 'filaK',
    'kata-fila-s': 'filaS',
    'kata-fila-t': 'filaT',
    'kata-combinaciones': 'combinaciones',
    'kata-dakuten': 'dakuten',
    'kanji-numeros': 'numeros',
    'kanji-dias': 'tiempo',
    'kanji-n5': 'familia',
    'kanji-naturaleza': 'naturaleza',
    'kanji-verbos': 'verbos',
    'gram-particles-wa': 'particulas',
    'gram-desu': 'verbos',
    'gram-negacion': 'negacion',
    'gram-adjetivos': 'adjetivos',
  };

  var SETS_CARACTER = {
    hiragana: {
      vocales: 'あいうえお',
      filaK: 'かきくけこ',
      filaS: 'さしすせそ',
      filaT: 'たちつてと',
      dakuten: 'がぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽ',
      combinaciones: 'ゃゅょっゎ',
    },
    katakana: {
      vocales: 'アイウエオ',
      filaK: 'カキクケコ',
      filaS: 'サシスセソ',
      filaT: 'タチツテト',
      dakuten: 'ガギグゲゴザジズゼゾダヂヅデドバビブベボパピプペポ',
      combinaciones: 'ャュョッヮ',
    },
    kanji: {
      numeros: '一二三四五六七八九十',
      tiempo: '日月火水木金土年時',
      familia: '人男女子父母',
      naturaleza: '山水火木金土',
      verbos: '行来見食飲言',
    },
  };

  function crearDetalleVacio() {
    var detalle = {};
    AREAS.forEach(function (area) {
      detalle[area] = {};
      CLAVES_DETALLE[area].forEach(function (clave) {
        detalle[area][clave] = 'por_reforzar';
      });
    });
    return detalle;
  }

  function porcentajeANivelArea(pct) {
    if (pct >= 85) return 'avanzado';
    if (pct >= 50) return 'intermedio';
    return 'principiante';
  }

  function porcentajeAEstadoTema(pct, total) {
    if (total === 0) return 'por_reforzar';
    if (pct >= 85) return 'dominado';
    if (pct >= 50) return 'en_progreso';
    return 'por_reforzar';
  }

  function inferirTemaDesdeCaracter(area, caracter) {
    if (!caracter || !area) return null;
    var sets = SETS_CARACTER[area];
    if (!sets) return null;

    var ch = caracter.charAt(0);
    var claves = CLAVES_DETALLE[area] || [];
    for (var i = 0; i < claves.length; i++) {
      var clave = claves[i];
      if (sets[clave] && sets[clave].indexOf(ch) >= 0) return clave;
    }

    if (area === 'hiragana' || area === 'katakana') {
      if (/[ゃゅょっゎャュョッヮ]/.test(caracter)) return 'combinaciones';
      var code = ch.charCodeAt(0);
      if (area === 'hiragana' && code >= 0x3041 && code <= 0x309f) return 'filaT';
      if (area === 'katakana' && code >= 0x30a1 && code <= 0x30ff) return 'filaT';
    }

    if (area === 'kanji') return 'familia';
    return null;
  }

  function inferirTemaDesdePregunta(pregunta) {
    if (!pregunta) return null;
    if (pregunta.tema) return pregunta.tema;
    if (pregunta.categoria === 'gramatica') return 'particulas';
    return inferirTemaDesdeCaracter(pregunta.categoria, pregunta.caracter);
  }

  function claveDetalleDesdeTemaId(temaId) {
    return TEMA_ID_A_DETALLE[temaId] || null;
  }

  function construirPerfilDesdeHistorial(historial) {
    var acum = {};
    AREAS.forEach(function (area) {
      acum[area] = {};
      CLAVES_DETALLE[area].forEach(function (clave) {
        acum[area][clave] = { aciertos: 0, total: 0 };
      });
    });

    for (var i = 0; i < historial.length; i++) {
      var r = historial[i];
      var area = r.categoria;
      if (AREAS.indexOf(area) < 0) continue;
      var tema = r.tema || inferirTemaDesdePregunta(r);
      if (!tema || !acum[area][tema]) {
        var fallback = CLAVES_DETALLE[area][0];
        tema = fallback;
      }
      acum[area][tema].total++;
      if (r.acerto) acum[area][tema].aciertos++;
    }

    var porcentajesPorArea = {};
    var nivelesArea = {};
    var detalle = crearDetalleVacio();

    AREAS.forEach(function (area) {
      var totalArea = 0;
      var aciertosArea = 0;
      CLAVES_DETALLE[area].forEach(function (clave) {
        var datos = acum[area][clave];
        var pct = datos.total > 0 ? Math.round((datos.aciertos / datos.total) * 100) : 0;
        detalle[area][clave] = porcentajeAEstadoTema(pct, datos.total);
        totalArea += datos.total;
        aciertosArea += datos.aciertos;
      });
      var pctArea = totalArea > 0 ? Math.round((aciertosArea / totalArea) * 100) : 0;
      if (area === 'gramatica' && totalArea === 0) pctArea = 0;
      porcentajesPorArea[area] = pctArea;
      nivelesArea[area] = porcentajeANivelArea(pctArea);
    });

    var recomendaciones = [];
    if (typeof generarRutaPersonalizada === 'function') {
      var perfilTmp = {
        porcentajesPorArea: porcentajesPorArea,
        nivelesArea: nivelesArea,
        detalle: detalle,
      };
      var ruta = generarRutaPersonalizada(perfilTmp);
      recomendaciones = ruta.map(function (bloque) {
        return bloque.area + '-' + (bloque.nivel === 'principiante' ? 'basico' : bloque.nivel);
      });
    }

    return {
      diagnosticoCompletado: true,
      fechaDiagnostico: new Date().toISOString(),
      porcentajesPorArea: porcentajesPorArea,
      porcentajes: porcentajesPorArea,
      nivelesArea: nivelesArea,
      niveles: nivelesArea,
      detalle: detalle,
      estadisticasTema: {},
      recomendaciones: recomendaciones,
    };
  }

  window.NihonCheck = window.NihonCheck || {};
  window.NihonCheck.construirPerfilDesdeHistorial = construirPerfilDesdeHistorial;

  function iconoEstado(estado) {
    if (estado === 'dominado') return '✅';
    if (estado === 'en_progreso_lento') return '🟡';
    if (estado === 'en_progreso') return '🟡';
    return '🔴';
  }

  function etiquetaEstado(estado) {
    if (estado === 'dominado') return 'Dominado';
    if (estado === 'en_progreso_lento') return 'En progreso (Lento)';
    if (estado === 'en_progreso') return 'En progreso';
    return 'Por reforzar';
  }

  function inferirTemaDesdeItemBiblioteca(carpeta, item) {
    if (!item) return null;
    if (item.tema) return item.tema;
    if (carpeta === 'gramatica') {
      var titulo = (item.titulo || '').toLowerCase();
      if (titulo.indexOf('neg') >= 0) return 'negacion';
      if (titulo.indexOf('です') >= 0 || titulo.indexOf('desu') >= 0) return 'verbos';
      return 'particulas';
    }
    return inferirTemaDesdeCaracter(carpeta, item.caracter);
  }

  window.NihonCheckTemas = {
    AREAS: AREAS,
    CLAVES_DETALLE: CLAVES_DETALLE,
    ETIQUETAS_TEMA: ETIQUETAS_TEMA,
    ETIQUETAS_AREA: ETIQUETAS_AREA,
    TEMA_ID_A_DETALLE: TEMA_ID_A_DETALLE,
    crearDetalleVacio: crearDetalleVacio,
    porcentajeANivelArea: porcentajeANivelArea,
    porcentajeAEstadoTema: porcentajeAEstadoTema,
    inferirTemaDesdeCaracter: inferirTemaDesdeCaracter,
    inferirTemaDesdePregunta: inferirTemaDesdePregunta,
    inferirTemaDesdeItemBiblioteca: inferirTemaDesdeItemBiblioteca,
    claveDetalleDesdeTemaId: claveDetalleDesdeTemaId,
    construirPerfilDesdeHistorial: construirPerfilDesdeHistorial,
    iconoEstado: iconoEstado,
    etiquetaEstado: etiquetaEstado,
  };
})();
