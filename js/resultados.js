/**
 * RESULTADOS Y MAPA DE CALOR
 * Incluye puntuación ponderada, tiempo promedio y detección de puntuación sospechosa.
 */

var NihonCheck = window.NihonCheck || {};

function calcularPorcentajeSimple(respuestas) {
  if (respuestas.length === 0) return 0;
  var aciertos = 0;
  for (var i = 0; i < respuestas.length; i++) {
    if (respuestas[i].acerto) aciertos++;
  }
  return Math.round((aciertos / respuestas.length) * 100);
}

function colorSegunPorcentaje(porcentaje) {
  if (porcentaje >= 70) return 'alto';
  if (porcentaje >= 40) return 'medio';
  return 'bajo';
}

NihonCheck.calcularEstadisticas = function (historial) {
  var hiragana = historial.filter(function (r) { return r.categoria === 'hiragana'; });
  var katakana = historial.filter(function (r) { return r.categoria === 'katakana'; });
  var kanji = historial.filter(function (r) { return r.categoria === 'kanji'; });

  function contarAciertos(arr) {
    var n = 0;
    for (var i = 0; i < arr.length; i++) if (arr[i].acerto) n++;
    return n;
  }

  var ponderada = NihonCheck.calcularPuntuacionPonderada
    ? NihonCheck.calcularPuntuacionPonderada(historial)
    : { porcentaje: calcularPorcentajeSimple(historial), aciertos: 0, total: historial.length };

  return {
    global: {
      total: historial.length,
      aciertos: ponderada.aciertos != null ? ponderada.aciertos : contarAciertos(historial),
      porcentajeSimple: calcularPorcentajeSimple(historial),
      porcentaje: ponderada.porcentaje,
      puntos: ponderada.puntos,
    },
    hiragana: {
      total: hiragana.length,
      aciertos: contarAciertos(hiragana),
      porcentaje: calcularPorcentajeSimple(hiragana),
    },
    katakana: {
      total: katakana.length,
      aciertos: contarAciertos(katakana),
      porcentaje: calcularPorcentajeSimple(katakana),
    },
    kanji: {
      total: kanji.length,
      aciertos: contarAciertos(kanji),
      porcentaje: calcularPorcentajeSimple(kanji),
    },
  };
};

NihonCheck.generarMensajeResumen = function (stats) {
  var partes = [];

  if (stats.hiragana.total > 0) {
    partes.push(
      (stats.hiragana.porcentaje >= 70 ? 'Dominas' : 'Tienes') +
      ' Hiragana al ' + stats.hiragana.porcentaje + '%'
    );
  }
  if (stats.katakana.total > 0) {
    if (stats.katakana.porcentaje < 50) {
      partes.push('necesitas reforzar Katakana (actualmente ' + stats.katakana.porcentaje + '%)');
    } else {
      partes.push('Katakana al ' + stats.katakana.porcentaje + '%');
    }
  }
  if (stats.kanji.total > 0) {
    if (stats.kanji.porcentaje < 50) {
      partes.push('Kanji necesita refuerzo (' + stats.kanji.porcentaje + '%)');
    } else {
      partes.push('Kanji al ' + stats.kanji.porcentaje + '%');
    }
  }

  if (partes.length === 0) return 'No hay datos suficientes para el resumen.';
  return partes.join(', ') + '.';
};

NihonCheck.generarHTMLResultados = function (historial, errores, tiemposRespuesta) {
  var stats = NihonCheck.calcularEstadisticas(historial);
  var mensaje = NihonCheck.generarMensajeResumen(stats);
  var listaErrores = errores || historial.filter(function (r) { return !r.acerto; });

  var tiempos = tiemposRespuesta || historial.map(function (r) { return r.tiempoMs || 0; });
  var promedioSeg = NihonCheck.calcularTiempoPromedio
    ? NihonCheck.calcularTiempoPromedio(tiempos)
    : 0;
  var promedioTexto = promedioSeg.toFixed(1);
  var esSospechosa = promedioSeg > 0 && promedioSeg < 1.5;

  function celda(nombre, datos) {
    var pct = datos.total > 0 ? datos.porcentaje : 0;
    return (
      '<div class="heatmap__celda heatmap__celda--' + colorSegunPorcentaje(pct) + '">' +
        '<span class="heatmap__nombre">' + nombre + '</span>' +
        '<span class="heatmap__porcentaje">' + (datos.total > 0 ? pct + '%' : '—') + '</span>' +
        '<span class="heatmap__detalle">' + datos.aciertos + '/' + datos.total + ' aciertos</span>' +
        '<div class="heatmap__barra"><div class="heatmap__relleno" style="width:' + pct + '%"></div></div>' +
      '</div>'
    );
  }

  var filas = '';
  for (var i = 0; i < historial.length; i++) {
    var r = historial[i];
    filas +=
      '<li class="historial__item historial__item--' + (r.acerto ? 'ok' : 'fail') + '">' +
        '<span class="historial__char">' + r.caracter + '</span>' +
        '<span class="historial__cat">' + r.categoria + '</span>' +
        '<span class="historial__resultado">' + (r.acerto ? '✓' : '✗') + '</span>' +
      '</li>';
  }

  var htmlErrores = '';
  if (listaErrores.length > 0) {
    var itemsError = '';
    for (var j = 0; j < listaErrores.length; j++) {
      var e = listaErrores[j];
      var tuRespuesta = e.respuestaUsuario
        ? ' (escribiste: "' + e.respuestaUsuario + '")'
        : '';
      itemsError +=
        '<li class="errores-examen__item">' +
          '<span class="errores-examen__char">' + e.caracter + '</span>' +
          '<span class="errores-examen__detalle">Correcto: <strong>' + e.respuestaCorrecta + '</strong>' + tuRespuesta + '</span>' +
          '<span class="errores-examen__cat">' + e.categoria + '</span>' +
        '</li>';
    }
    htmlErrores =
      '<section class="errores-examen" aria-label="Caracteres con error">' +
        '<h4 class="errores-examen__titulo">Caracteres con error (' + listaErrores.length + ')</h4>' +
        '<ul class="errores-examen__lista">' + itemsError + '</ul>' +
      '</section>';
  }

  var badgeSospechosa = esSospechosa
    ? '<span class="resultados__badge-sospechosa" title="Tiempo promedio inferior a 1,5 s por respuesta">Sospechosa</span>'
    : '';

  return (
    '<div class="resultados">' +
      '<h3 class="resultados__titulo">Resultados del examen ' + badgeSospechosa + '</h3>' +
      '<p class="resultados__global">Puntuación ponderada: <strong>' + stats.global.porcentaje + '%</strong> (' +
        stats.global.aciertos + '/' + stats.global.total + ' aciertos, simple: ' + stats.global.porcentajeSimple + '%)</p>' +
      '<p class="resultados__tiempo">Tiempo promedio por respuesta: <strong>' + promedioTexto + 's</strong></p>' +
      '<div class="heatmap">' +
        celda('Hiragana', stats.hiragana) +
        celda('Katakana', stats.katakana) +
        celda('Kanji', stats.kanji) +
      '</div>' +
      '<p class="resultados__mensaje">' + mensaje + '</p>' +
      htmlErrores +
      '<details class="historial"><summary>Ver detalle pregunta por pregunta</summary>' +
        '<ul class="historial__lista">' + filas + '</ul></details>' +
      '<button id="btn-reintentar" class="btn-submit" type="button" data-action="reintentar">Hacer otro test</button>' +
    '</div>'
  );
};

window.NihonCheck = NihonCheck;
