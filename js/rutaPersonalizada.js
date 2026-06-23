/**
 * NIHONCHECK — Ruta de estudio personalizada según perfil de dominio
 * Sin bloqueos: incluye por_reforzar, en_progreso y en_progreso_lento; excluye dominado.
 */
(function () {
  'use strict';

  var ESTADOS_EN_RUTA = {
    por_reforzar: 0,
    en_progreso_lento: 1,
    en_progreso: 2,
  };

  var TITULOS_AREA = {
    hiragana: 'Hiragana',
    katakana: 'Katakana',
    kanji: 'Kanji',
    gramatica: 'Gramática',
  };

  function estadoEnRuta(estado) {
    return estado !== 'dominado' && Object.prototype.hasOwnProperty.call(ESTADOS_EN_RUTA, estado);
  }

  function temasParaArea(area, detalle) {
    var claves = (window.NihonCheckTemas && NihonCheckTemas.CLAVES_DETALLE[area]) || [];
    var det = (detalle && detalle[area]) || {};
    var temas = [];

    claves.forEach(function (clave) {
      var estado = det[clave] || 'por_reforzar';
      if (!estadoEnRuta(estado)) return;
      temas.push({
        clave: clave,
        nombre: (NihonCheckTemas && NihonCheckTemas.ETIQUETAS_TEMA[clave]) || clave,
        estado: estado,
      });
    });

    temas.sort(function (a, b) {
      return (ESTADOS_EN_RUTA[a.estado] || 99) - (ESTADOS_EN_RUTA[b.estado] || 99);
    });

    return temas;
  }

  /**
   * Genera ruta: subtemas no dominados, ordenados por prioridad (reforzar primero).
   * @param {object} perfil — nihoncheck_perfil
   * @returns {Array<{area, titulo, temas: Array, porcentaje, nivel}>}
   */
  window.generarRutaPersonalizada = function (perfil) {
    if (!perfil) return [];

    var pct = perfil.porcentajesPorArea || perfil.porcentajes || {};
    var niveles = perfil.nivelesArea || perfil.niveles || {};
    var detalle = perfil.detalle || {};
    var areas = ['hiragana', 'katakana', 'kanji', 'gramatica'];
    var ruta = [];

    areas.forEach(function (area) {
      var temas = temasParaArea(area, detalle);
      if (temas.length === 0) return;
      ruta.push({
        area: area,
        nivel: niveles[area] || 'principiante',
        titulo: TITULOS_AREA[area] || area,
        porcentaje: typeof pct[area] === 'number' ? pct[area] : 0,
        temas: temas,
      });
    });

    ruta.sort(function (a, b) {
      var minA = a.temas.length ? (ESTADOS_EN_RUTA[a.temas[0].estado] || 99) : 99;
      var minB = b.temas.length ? (ESTADOS_EN_RUTA[b.temas[0].estado] || 99) : 99;
      if (minA !== minB) return minA - minB;
      return a.porcentaje - b.porcentaje;
    });

    return ruta;
  };

  /** Próximos N temas sugeridos a partir de la ruta (excluye dominado). */
  window.obtenerObjetivosSugeridos = function (perfil, limite) {
    limite = limite || 3;
    var ruta = generarRutaPersonalizada(perfil);
    var objetivos = [];

    for (var i = 0; i < ruta.length && objetivos.length < limite; i++) {
      var bloque = ruta[i];
      for (var j = 0; j < bloque.temas.length && objetivos.length < limite; j++) {
        var t = bloque.temas[j];
        if (!estadoEnRuta(t.estado)) continue;
        objetivos.push({
          area: bloque.area,
          clave: t.clave,
          nombre: t.nombre,
          estado: t.estado,
          tituloArea: bloque.titulo,
        });
      }
    }
    return objetivos;
  };

  /** Resuelve id de lección/tema en lecciones.js a partir de área + clave detalle. */
  window.resolverTemaId = function (area, claveDetalle) {
    var tema = typeof obtenerTemaPorClave === 'function'
      ? obtenerTemaPorClave(area, claveDetalle)
      : null;
    return tema ? tema.id : null;
  };
})();
