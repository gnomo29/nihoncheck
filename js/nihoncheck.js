/**
 * NIHONCHECK — Nucleo: biblioteca, memoria, vistas
 * Requiere: preguntas.js, motorAdaptativo.js, resultados.js, interfazTest.js
 */
(function () {
  'use strict';

  var NihonCheck = window.NihonCheck || {};

  /** Obtiene romaji de un carácter (banco PREGUNTAS o puntos débiles). */
  NihonCheck.obtenerRomajiPorCaracter = function (caracter) {
    if (NihonCheck.buscarPreguntaPorCaracter) {
      var pregunta = NihonCheck.buscarPreguntaPorCaracter(caracter);
      if (pregunta && pregunta.respuestaCorrecta && pregunta.respuestaCorrecta !== '?') {
        return pregunta.respuestaCorrecta;
      }
    }
    var debiles = NihonCheck.obtenerPuntosDebiles ? NihonCheck.obtenerPuntosDebiles() : [];
    for (var i = 0; i < debiles.length; i++) {
      if (debiles[i].caracter === caracter && debiles[i].respuestaCorrecta) {
        return debiles[i].respuestaCorrecta;
      }
    }
    return '?';
  };

  NihonCheck.bancoPersonalizado = null;
  NihonCheck.caracteresUltimoAnalisis = [];
  NihonCheck.caracteresNuevosBiblioteca = [];

  /* ============================================================
     4. ANÃLISIS DE CONTENIDO â€” Estudio Pendiente
     ============================================================ */

  // Clave Ãºnica en localStorage para guardar la lista entre sesiones
  var CLAVE_ESTUDIO_PENDIENTE = 'nihoncheck_estudio_pendiente';

  /*
   * RegExp que busca UN carÃ¡cter japonÃ©s por coincidencia.
   * Los rangos Unicode (bloques) son:
   *   \u3040-\u309F â†’ Hiragana (ã‚, ã„, ã‚› dakuten, ã‚œ handakutenâ€¦)
   *   \u30A0-\u30FF â†’ Katakana (ã‚¢, ã‚¤, ã‚«â€¦)
   *   \u4E00-\u9FFF â†’ Kanji CJK Unified (æ¼¢å­— comunes)
   *   \u3400-\u4DBF â†’ Kanji CJK Extension A (menos frecuentes)
   * La bandera "g" (global) encuentra todas las apariciones en el texto.
   */
  var REGEX_CARACTER_JAPONES = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\u3400-\u4DBF]/g;

  /**
   * Devuelve la categorÃ­a de un solo carÃ¡cter: hiragana, katakana, kanji o null.
   * Comprobamos en orden: primero kana (mÃ¡s especÃ­fico), luego kanji.
   */
  NihonCheck.clasificarCaracter = function (caracter) {
    var codigo = caracter.charCodeAt(0);

    // Hiragana: bloque Unicode U+3040 a U+309F
    if (codigo >= 0x3040 && codigo <= 0x309F) {
      return 'hiragana';
    }
    // Katakana: bloque Unicode U+30A0 a U+30FF
    if (codigo >= 0x30A0 && codigo <= 0x30FF) {
      return 'katakana';
    }
    // Kanji: CJK Unified (U+4E00â€“U+9FFF) o Extension A (U+3400â€“U+4DBF)
    if ((codigo >= 0x4E00 && codigo <= 0x9FFF) ||
        (codigo >= 0x3400 && codigo <= 0x4DBF)) {
      return 'kanji';
    }

    return null;
  };

  /**
   * Extrae caracteres japoneses Ãºnicos del texto usando RegExp.
   * Ignora latinos, nÃºmeros, puntuaciÃ³n y espacios.
   */
  NihonCheck.extraerCaracteresJaponeses = function (texto) {
    var coincidencias = texto.match(REGEX_CARACTER_JAPONES);
    if (!coincidencias) return [];

    // Set elimina duplicados: si "ã‚" aparece 5 veces, solo guardamos uno
    var unicos = [];
    var vistos = {};

    for (var i = 0; i < coincidencias.length; i++) {
      var c = coincidencias[i];
      if (!vistos[c]) {
        vistos[c] = true;
        unicos.push(c);
      }
    }

    return unicos;
  };

  /** Lee la lista guardada en localStorage (array vacÃ­o si no hay nada). */
  NihonCheck.obtenerEstudioPendiente = function () {
    try {
      var datos = localStorage.getItem(CLAVE_ESTUDIO_PENDIENTE);
      if (!datos) return [];
      var lista = JSON.parse(datos);
      return Array.isArray(lista) ? lista : [];
    } catch (e) {
      return [];
    }
  };

  /** Guarda la lista completa en localStorage. */
  NihonCheck.guardarEstudioPendiente = function (lista) {
    try {
      localStorage.setItem(CLAVE_ESTUDIO_PENDIENTE, JSON.stringify(lista));
    } catch (e) {
      // localStorage puede fallar en modo privado o con cuota llena
    }
  };

  /** Clave Ãºnica para Ã­tems de estudio (carÃ¡cter suelto o palabra con lectura). */
  NihonCheck.claveItemEstudio = function (item) {
    if (item.tipo === 'palabra' && item.lectura) {
      return 'palabra:' + item.caracter + '|' + item.lectura;
    }
    return item.caracter;
  };

  /**
   * FunciÃ³n principal: detecta tipo, convierte romaji si aplica, fusiona con la lista
   * y devuelve un resumen con conteos por categorÃ­a.
   */
  NihonCheck.analizarTextoUsuario = function (texto) {
    var RC = window.RomajiConverter;
    var deteccion = RC
      ? RC.detectarTipoTexto(texto)
      : { tipo: 'otro', esMayormenteRomaji: false };
    var textoProcesado = texto;
    var palabrasVocab = [];
    var fueRomaji = false;

    // 1. Detectar y convertir romaji â†’ kana antes del anÃ¡lisis
    if (RC && (deteccion.tipo === 'romaji' || deteccion.esMayormenteRomaji)) {
      fueRomaji = true;
      var palabrasOrig = texto.split(/[\s,ã€.ï¼Ž!ï¼?ï¼Ÿ;ï¼›:ï¼š\n]+/).filter(function (w) {
        return w.trim();
      });

      for (var w = 0; w < palabrasOrig.length; w++) {
        var palabraOrig = palabrasOrig[w].trim();
        if (!/[a-zA-ZÄÄ«Å«Ä“Å]/.test(palabraOrig)) continue;

        var esKatakana = palabraOrig === palabraOrig.toUpperCase() && /[A-Z]/.test(palabraOrig);
        var kana = RC.convertirRomajiAKana(palabraOrig, esKatakana ? 'katakana' : 'hiragana');
        if (!kana || !NihonCheck.extraerCaracteresJaponeses(kana).length) continue;

        palabrasVocab.push({
          caracter: kana,
          lectura: palabraOrig.toLowerCase(),
          categoria: 'vocabulario',
          tipo: kana.length > 1 ? 'palabra' : 'caracter',
        });
      }

      textoProcesado = RC.convertirTextoRomaji(texto);
    }

    var caracteres = NihonCheck.extraerCaracteresJaponeses(textoProcesado);
    var listaActual = NihonCheck.obtenerEstudioPendiente();
    var mapa = {};

    // Indexar lo que ya tenÃ­amos guardado (clave compuesta para palabras)
    for (var i = 0; i < listaActual.length; i++) {
      var existente = listaActual[i];
      mapa[NihonCheck.claveItemEstudio(existente)] = existente;
    }

    var conteos = { hiragana: 0, katakana: 0, kanji: 0, vocabulario: 0, palabras: 0, nuevos: 0 };
    NihonCheck.caracteresNuevosBiblioteca = [];

    // 2. Guardar palabras de vocabulario (nivel palabra)
    for (var v = 0; v < palabrasVocab.length; v++) {
      var vocab = palabrasVocab[v];
      if (vocab.tipo !== 'palabra') continue;

      var claveV = NihonCheck.claveItemEstudio(vocab);
      conteos.vocabulario += 1;
      conteos.palabras += 1;

      if (mapa[claveV]) {
        mapa[claveV].veces = (mapa[claveV].veces || 1) + 1;
        mapa[claveV].lectura = vocab.lectura;
      } else {
        mapa[claveV] = {
          caracter: vocab.caracter,
          lectura: vocab.lectura,
          categoria: 'vocabulario',
          tipo: 'palabra',
          veces: 1,
          agregado: new Date().toISOString(),
          esNuevo: true,
        };
        conteos.nuevos += 1;
        NihonCheck.caracteresNuevosBiblioteca.push(claveV);
      }
    }

    // 3. Extraer caracteres individuales para flashcards
    for (var j = 0; j < caracteres.length; j++) {
      var caracter = caracteres[j];
      var categoria = NihonCheck.clasificarCaracter(caracter);
      if (!categoria) continue;

      conteos[categoria] += 1;

      if (mapa[caracter]) {
        mapa[caracter].veces += 1;
      } else {
        mapa[caracter] = {
          caracter: caracter,
          categoria: categoria,
          tipo: 'caracter',
          veces: 1,
          agregado: new Date().toISOString(),
          esNuevo: true,
        };
        conteos.nuevos += 1;
        NihonCheck.caracteresNuevosBiblioteca.push(caracter);
      }
    }

    // Convertir el mapa de vuelta a array y guardar
    var listaFinal = [];
    for (var clave in mapa) {
      if (Object.prototype.hasOwnProperty.call(mapa, clave)) {
        listaFinal.push(mapa[clave]);
      }
    }

    // Ordenar: vocabulario â†’ hiragana â†’ katakana â†’ kanji
    var ordenCategoria = { vocabulario: -1, hiragana: 0, katakana: 1, kanji: 2 };
    listaFinal.sort(function (a, b) {
      var diff = (ordenCategoria[a.categoria] || 9) - (ordenCategoria[b.categoria] || 9);
      if (diff !== 0) return diff;
      return a.caracter < b.caracter ? -1 : a.caracter > b.caracter ? 1 : 0;
    });

    NihonCheck.guardarEstudioPendiente(listaFinal);

    // Ãtems para examen personalizado: caracteres + palabras de vocabulario
    var itemsAnalisis = caracteres.slice();
    for (var pv = 0; pv < palabrasVocab.length; pv++) {
      if (palabrasVocab[pv].tipo === 'palabra') {
        itemsAnalisis.push(palabrasVocab[pv]);
      }
    }
    NihonCheck.caracteresUltimoAnalisis = itemsAnalisis;

    return {
      lista: listaFinal,
      conteos: conteos,
      totalUnicos: caracteres.length + conteos.palabras,
      deteccion: deteccion,
      textoConvertido: fueRomaji ? textoProcesado : null,
      textoOriginal: texto,
      caracteresNuevos: NihonCheck.caracteresNuevosBiblioteca.slice(),
    };
  };

  /** Limpia por completo la lista de estudio pendiente. */
  NihonCheck.limpiarEstudioPendiente = function () {
    NihonCheck.guardarEstudioPendiente([]);
  };

  /**
   * Pinta la lista de estudio pendiente dentro del contenedor HTML.
   * Si se pasa resumenAnalisis, muestra el mensaje de la Ãºltima lectura.
   */
  NihonCheck.renderizarEstudioPendiente = function (contenedor, resumenAnalisis) {
    if (!contenedor) return;

    var lista = NihonCheck.obtenerEstudioPendiente();

    if (lista.length === 0) {
      contenedor.hidden = true;
      contenedor.innerHTML = '';
      return;
    }

    // Contar por categorÃ­a en toda la lista guardada
    var totales = { hiragana: 0, katakana: 0, kanji: 0 };
    for (var i = 0; i < lista.length; i++) {
      if (totales[lista[i].categoria] !== undefined) {
        totales[lista[i].categoria] += 1;
      }
    }

    var mensajeResumen = totales.hiragana + ' hiragana, ' +
      totales.katakana + ' katakana, ' +
      totales.kanji + ' kanji en tu lista';

    if (resumenAnalisis && resumenAnalisis.conteos) {
      var c = resumenAnalisis.conteos;
      mensajeResumen = c.hiragana + ' hiragana, ' +
        c.katakana + ' katakana, ' +
        c.kanji + ' kanji encontrados en este texto';
    }

    // Agrupar chips por categorÃ­a
    var grupos = { hiragana: [], katakana: [], kanji: [] };
    for (var j = 0; j < lista.length; j++) {
      var item = lista[j];
      var chip =
        '<span class="estudio-chip estudio-chip--' + item.categoria + '">' +
          '<span class="estudio-chip__char">' + item.caracter + '</span>' +
          (item.veces > 1
            ? '<span class="estudio-chip__veces">Ã—' + item.veces + '</span>'
            : '') +
        '</span>';
      if (grupos[item.categoria]) {
        grupos[item.categoria].push(chip);
      }
    }

    var etiquetas = {
      hiragana: 'Hiragana',
      katakana: 'Katakana',
      kanji: 'Kanji',
    };

    var htmlGrupos = '';
    ['hiragana', 'katakana', 'kanji'].forEach(function (cat) {
      if (grupos[cat].length === 0) return;
      htmlGrupos +=
        '<div class="estudio-pendiente__grupo">' +
          '<h4 class="estudio-pendiente__grupo-titulo">' + etiquetas[cat] + '</h4>' +
          '<div class="estudio-pendiente__chips">' + grupos[cat].join('') + '</div>' +
        '</div>';
    });

    contenedor.innerHTML =
      '<div class="estudio-pendiente__header">' +
        '<h3 class="estudio-pendiente__titulo">Estudio pendiente</h3>' +
        '<button type="button" class="btn-limpiar" data-action="limpiar-estudio">Limpiar lista</button>' +
      '</div>' +
      '<p class="estudio-pendiente__resumen"><strong>' + mensajeResumen + '</strong></p>' +
      '<div class="estudio-pendiente__grupos">' + htmlGrupos + '</div>';

    contenedor.hidden = false;
  };

  /* ============================================================
     4b. MEMORIA PERSISTENTE â€” Puntos dÃ©biles y progreso histÃ³rico
     Consola: NihonCheck.obtenerPuntosDebiles()
              NihonCheck.obtenerProgresoHistorico()
              NihonCheck.limpiarPuntosDebiles()
     ============================================================ */
  var CLAVE_PUNTOS_DEBILES = 'nihoncheck_puntos_debiles';
  var CLAVE_CARACTERES_APRENDIDOS = 'nihoncheck_caracteres_aprendidos';
  var CLAVE_ULTIMO_EXAMEN = 'nihoncheck_ultimo_examen';
  var CLAVE_USUARIO = 'nihoncheck_usuario';
  var CLAVE_PERFIL = 'nihoncheck_perfil';
  var CLAVE_DOMINIO = 'nihoncheck_dominio';
  var CLAVE_GRAMATICA = 'nihoncheck_gramatica';
  var CLAVE_DIAGNOSTICO_REALIZADO = 'diagnosticoRealizado';
  var ACIERTOS_DOMINIO = 3;
  var TIEMPO_DOMINIO_MS = 2000;
  var TIEMPO_RAPIDO_MEMORIA_MS = 500;
  var INTENTOS_RECIENTES_MAX = 5;

  var _memoriaCache = { puntosDebiles: null, aprendidos: null };

  NihonCheck._leerJSON = function (clave, defecto) {
    try {
      var datos = localStorage.getItem(clave);
      if (!datos) return defecto;
      var parsed = JSON.parse(datos);
      return parsed == null ? defecto : parsed;
    } catch (e) {
      return defecto;
    }
  };

  NihonCheck._escribirJSON = function (clave, valor) {
    try {
      localStorage.setItem(clave, JSON.stringify(valor));
    } catch (e) {
      // localStorage puede fallar en modo privado o con cuota llena
    }
  };

  /** Carga localStorage una vez al iniciar examen (eficiencia). */
  NihonCheck.iniciarCacheMemoria = function () {
    _memoriaCache.puntosDebiles = NihonCheck._leerJSON(CLAVE_PUNTOS_DEBILES, []);
    _memoriaCache.aprendidos = NihonCheck._leerJSON(CLAVE_CARACTERES_APRENDIDOS, []);
  };

  NihonCheck.obtenerPuntosDebiles = function () {
    if (_memoriaCache.puntosDebiles !== null) {
      return _memoriaCache.puntosDebiles.slice();
    }
    return NihonCheck._leerJSON(CLAVE_PUNTOS_DEBILES, []);
  };

  NihonCheck.guardarPuntosDebiles = function (lista) {
    _memoriaCache.puntosDebiles = lista;
    NihonCheck._escribirJSON(CLAVE_PUNTOS_DEBILES, lista);
  };

  NihonCheck.obtenerCaracteresAprendidos = function () {
    if (_memoriaCache.aprendidos !== null) {
      return _memoriaCache.aprendidos.slice();
    }
    return NihonCheck._leerJSON(CLAVE_CARACTERES_APRENDIDOS, []);
  };

  NihonCheck.guardarCaracteresAprendidos = function (lista) {
    _memoriaCache.aprendidos = lista;
    NihonCheck._escribirJSON(CLAVE_CARACTERES_APRENDIDOS, lista);
  };

  NihonCheck.limpiarPuntosDebiles = function () {
    NihonCheck.guardarPuntosDebiles([]);
  };

  NihonCheck.registrarFalloMemoria = function (caracter, categoria, respuestaCorrecta) {
    var lista = NihonCheck.obtenerPuntosDebiles();
    var ahora = new Date().toISOString();
    var idx = -1;

    for (var i = 0; i < lista.length; i++) {
      if (lista[i].caracter === caracter) {
        idx = i;
        break;
      }
    }

    if (idx >= 0) {
      lista[idx].fallos += 1;
      lista[idx].aciertosSeguidos = 0;
      lista[idx].ultimoFallo = ahora;
      if (respuestaCorrecta) lista[idx].respuestaCorrecta = respuestaCorrecta;
    } else {
      lista.push({
        caracter: caracter,
        categoria: categoria,
        respuestaCorrecta: respuestaCorrecta,
        fallos: 1,
        aciertosSeguidos: 0,
        ultimoFallo: ahora,
        agregado: ahora,
      });
    }

    NihonCheck.guardarPuntosDebiles(lista);
  };

  NihonCheck.registrarAciertoMemoria = function (caracter, categoria, tiempoMs) {
    var aprendidos = NihonCheck.obtenerCaracteresAprendidos();
    var yaAprendido = false;

    for (var j = 0; j < aprendidos.length; j++) {
      if (aprendidos[j].caracter === caracter) {
        yaAprendido = true;
        break;
      }
    }

    if (!yaAprendido) {
      aprendidos.push({
        caracter: caracter,
        categoria: categoria,
        primeraVez: new Date().toISOString(),
      });
      NihonCheck.guardarCaracteresAprendidos(aprendidos);
    }

    var lista = NihonCheck.obtenerPuntosDebiles();
    var idx = -1;

    for (var i = 0; i < lista.length; i++) {
      if (lista[i].caracter === caracter) {
        idx = i;
        break;
      }
    }

    if (idx < 0) return;

    var rapido = typeof tiempoMs === 'number' && tiempoMs < TIEMPO_RAPIDO_MEMORIA_MS;
    if (rapido) {
      lista.splice(idx, 1);
    } else {
      lista[idx].aciertosSeguidos += 1;
      if (lista[idx].aciertosSeguidos >= ACIERTOS_DOMINIO) {
        lista.splice(idx, 1);
      }
    }

    NihonCheck.guardarPuntosDebiles(lista);
  };

  NihonCheck.registrarResultadoMemoria = function (pregunta, acerto, tiempoMs) {
    if (!pregunta || !pregunta.caracter) return;
    if (acerto) {
      NihonCheck.registrarAciertoMemoria(pregunta.caracter, pregunta.categoria, tiempoMs);
    } else {
      NihonCheck.registrarFalloMemoria(
        pregunta.caracter,
        pregunta.categoria,
        pregunta.respuestaCorrecta
      );
    }
  };

  NihonCheck.obtenerProgresoHistorico = function () {
    var aprendidos = NihonCheck.obtenerCaracteresAprendidos();
    var debiles = NihonCheck.obtenerPuntosDebiles();
    return {
      totalAprendidos: aprendidos.length,
      puntosDebilesPendientes: debiles.length,
      aprendidos: aprendidos,
      puntosDebiles: debiles,
    };
  };

  NihonCheck.guardarUltimoExamen = function (datos) {
    try {
      localStorage.setItem(CLAVE_ULTIMO_EXAMEN, JSON.stringify(datos));
    } catch (e) {
      // localStorage puede fallar en modo privado
    }
  };

  NihonCheck.obtenerUltimoExamen = function () {
    try {
      var datos = localStorage.getItem(CLAVE_ULTIMO_EXAMEN);
      return datos ? JSON.parse(datos) : null;
    } catch (e) {
      return null;
    }
  };

  /** Pinta el panel de progreso (vista dedicada o resumen). */
  NihonCheck.renderizarProgresoHistorico = function (contenedor, opciones) {
    if (!contenedor) return;

    var progreso = NihonCheck.obtenerProgresoHistorico();
    var estudio = NihonCheck.obtenerEstudioPendiente();
    var ultimo = NihonCheck.obtenerUltimoExamen();
    var esVistaCompleta = opciones && opciones.completo;

    if (!esVistaCompleta &&
        progreso.totalAprendidos === 0 &&
        progreso.puntosDebilesPendientes === 0) {
      contenedor.hidden = true;
      contenedor.innerHTML = '';
      return;
    }

    function chipsDeLista(lista, maxChips, claseExtra) {
      var html = '';
      var limite = maxChips || 12;
      for (var i = 0; i < lista.length && i < limite; i++) {
        var d = lista[i];
        var titulo = d.fallos
          ? d.fallos + ' fallo' + (d.fallos !== 1 ? 's' : '')
          : 'Aprendido';
        html +=
          '<span class="progreso-chip progreso-chip--' + d.categoria +
          (claseExtra ? ' ' + claseExtra : '') + '" title="' + titulo + '">' +
          d.caracter + '</span>';
      }
      if (lista.length > limite) {
        html += '<span class="progreso-chip progreso-chip--mas">+' + (lista.length - limite) + '</span>';
      }
      return html;
    }

    var chipsDebiles = chipsDeLista(progreso.puntosDebiles, 12);
    var chipsAprendidos = chipsDeLista(progreso.aprendidos, 12);

    var htmlUltimo = '';
    if (ultimo && ultimo.porcentaje !== undefined) {
      var fecha = ultimo.fecha ? new Date(ultimo.fecha).toLocaleDateString('es-ES') : '';
      htmlUltimo =
        '<div class="progreso-historico__ultimo-examen">' +
          'Ãšltimo examen: <strong>' + ultimo.porcentaje + '%</strong>' +
          (ultimo.tipo ? ' (' + ultimo.tipo + ')' : '') +
          (fecha ? ' Â· ' + fecha : '') +
        '</div>';
    }

    var htmlDebiles = progreso.puntosDebilesPendientes > 0
      ? '<div class="progreso-historico__seccion">' +
          '<h4 class="progreso-historico__seccion-titulo">Puntos dÃ©biles</h4>' +
          '<div class="progreso-historico__chips">' + chipsDebiles + '</div>' +
        '</div>'
      : '<p class="progreso-historico__vacio">Sin puntos dÃ©biles pendientes. Â¡Sigue asÃ­!</p>';

    var htmlAprendidos = progreso.totalAprendidos > 0
      ? '<div class="progreso-historico__seccion">' +
          '<h4 class="progreso-historico__seccion-titulo">Caracteres aprendidos</h4>' +
          '<div class="progreso-historico__chips">' + chipsAprendidos + '</div>' +
        '</div>'
      : '';

    contenedor.className = 'progreso-historico' + (esVistaCompleta ? ' progreso-historico--full' : '');
    contenedor.innerHTML =
      '<h3 class="progreso-historico__titulo">Tu Progreso HistÃ³rico</h3>' +
      '<div class="progreso-historico__stats">' +
        '<div class="progreso-stat">' +
          '<span class="progreso-stat__valor">' + progreso.totalAprendidos + '</span>' +
          '<span class="progreso-stat__label">Aprendidos</span>' +
        '</div>' +
        '<div class="progreso-stat">' +
          '<span class="progreso-stat__valor">' + progreso.puntosDebilesPendientes + '</span>' +
          '<span class="progreso-stat__label">Por reforzar</span>' +
        '</div>' +
        '<div class="progreso-stat">' +
          '<span class="progreso-stat__valor">' + estudio.length + '</span>' +
          '<span class="progreso-stat__label">En biblioteca</span>' +
        '</div>' +
      '</div>' +
      htmlUltimo +
      htmlDebiles +
      htmlAprendidos;

    contenedor.hidden = false;
  };

  /* ============================================================
     4c. MODO ESTUDIO â€” Biblioteca, Aprender y PrÃ¡ctica libre
     Sin temporizador ni impacto en puntos dÃ©biles / progreso.
     ============================================================ */
  var ETIQUETAS_ESTUDIO = {
    hiragana: 'Hiragana',
    katakana: 'Katakana',
    kanji: 'Kanji',
    vocabulario: 'Vocabulario',
  };
  var CATEGORIAS_ESTUDIO = ['hiragana', 'katakana', 'kanji', 'vocabulario'];

  /** Estado ligero de prÃ¡ctica libre (no persiste en localStorage). */
  var practicaLibreEstado = {
    activa: false,
    items: [],
    indice: 0,
  };

  /** Fusiona estudio pendiente, puntos dÃ©biles y aprendidos en items Ãºnicos. */
  NihonCheck.obtenerItemsBiblioteca = function () {
    var mapa = {};
    var nuevos = {};
    var i;

    for (i = 0; i < NihonCheck.caracteresNuevosBiblioteca.length; i++) {
      nuevos[NihonCheck.caracteresNuevosBiblioteca[i]] = true;
    }

    var estudio = NihonCheck.obtenerEstudioPendiente();
    for (i = 0; i < estudio.length; i++) {
      var e = estudio[i];
      var claveEstudio = NihonCheck.claveItemEstudio(e);
      var esVocabPalabra = e.categoria === 'vocabulario' && e.tipo === 'palabra';
      mapa[claveEstudio] = {
        caracter: e.caracter,
        categoria: e.categoria,
        tipo: e.tipo || 'caracter',
        lectura: e.lectura || null,
        romaji: e.lectura || NihonCheck.obtenerRomajiPorCaracter(e.caracter),
        fuente: 'estudio',
        esNuevo: !!nuevos[claveEstudio] || !!nuevos[e.caracter],
        esDebil: false,
        esAprendido: false,
        esVocab: esVocabPalabra,
      };
    }

    var debiles = NihonCheck.obtenerPuntosDebiles();
    for (i = 0; i < debiles.length; i++) {
      var d = debiles[i];
      if (mapa[d.caracter]) {
        mapa[d.caracter].esDebil = true;
        mapa[d.caracter].fallos = d.fallos;
        if (d.respuestaCorrecta) mapa[d.caracter].romaji = d.respuestaCorrecta;
      } else {
        mapa[d.caracter] = {
          caracter: d.caracter,
          categoria: d.categoria,
          romaji: d.respuestaCorrecta || NihonCheck.obtenerRomajiPorCaracter(d.caracter),
          fuente: 'debil',
          esNuevo: !!nuevos[d.caracter],
          esDebil: true,
          fallos: d.fallos,
          esAprendido: false,
        };
      }
    }

    var aprendidos = NihonCheck.obtenerCaracteresAprendidos();
    for (i = 0; i < aprendidos.length; i++) {
      var a = aprendidos[i];
      if (mapa[a.caracter]) {
        mapa[a.caracter].esAprendido = true;
      } else {
        mapa[a.caracter] = {
          caracter: a.caracter,
          categoria: a.categoria,
          romaji: NihonCheck.obtenerRomajiPorCaracter(a.caracter),
          fuente: 'aprendido',
          esNuevo: false,
          esDebil: false,
          esAprendido: true,
        };
      }
    }

    var lista = [];
    for (var clave in mapa) {
      if (Object.prototype.hasOwnProperty.call(mapa, clave)) {
        lista.push(mapa[clave]);
      }
    }

    var ordenCategoria = { hiragana: 0, katakana: 1, kanji: 2, vocabulario: 3, gramatica: 4 };
    lista.sort(function (x, y) {
      var diff = ordenCategoria[x.categoria] - ordenCategoria[y.categoria];
      if (diff !== 0) return diff;
      var ax = x.caracter || '';
      var ay = y.caracter || '';
      return ax < ay ? -1 : ax > ay ? 1 : 0;
    });

    return lista;
  };

  /** Genera HTML de una flashcard para estudio (carÃ¡cter individual). */
  function htmlFlashcard(item) {
    var clases = 'flashcard flashcard--' + (item.categoria === 'vocabulario' ? 'hiragana' : item.categoria);
    if (item.esNuevo) clases += ' flashcard--nuevo';
    if (item.esDebil) clases += ' flashcard--debil';

    var badge = item.esNuevo
      ? '<span class="flashcard__badge">Nuevo</span>'
      : '';

    return (
      '<button type="button" class="' + clases + '" data-caracter="' + item.caracter + '" aria-label="Tarjeta ' + item.caracter + '">' +
        '<div class="flashcard__inner">' +
          '<div class="flashcard__front">' + badge +
            '<span class="flashcard__char">' + item.caracter + '</span>' +
            '<span class="flashcard__meta">' + (ETIQUETAS_ESTUDIO[item.categoria] || item.categoria) + '</span>' +
          '</div>' +
          '<div class="flashcard__back">' +
            '<span class="flashcard__romaji">' + item.romaji + '</span>' +
            '<span class="flashcard__meta">romaji</span>' +
          '</div>' +
        '</div>' +
      '</button>'
    );
  }

  /** Tarjeta ancha de vocabulario (palabra + lectura romaji). */
  function htmlVocabCard(item) {
    var clases = 'flashcard vocab-card flashcard--vocabulario';
    if (item.esNuevo) clases += ' flashcard--nuevo';
    if (item.esDebil) clases += ' flashcard--debil';

    var badge = item.esNuevo
      ? '<span class="flashcard__badge">Nuevo</span>'
      : '';

    return (
      '<button type="button" class="' + clases + '" data-caracter="' + item.caracter + '" aria-label="Palabra ' + item.caracter + '">' +
        '<div class="flashcard__inner">' +
          '<div class="flashcard__front">' + badge +
            '<span class="flashcard__char vocab-card__word">' + item.caracter + '</span>' +
            '<span class="flashcard__meta">vocabulario</span>' +
          '</div>' +
          '<div class="flashcard__back">' +
            '<span class="flashcard__romaji">' + (item.lectura || item.romaji) + '</span>' +
            '<span class="flashcard__meta">lectura</span>' +
          '</div>' +
        '</div>' +
      '</button>'
    );
  }

  /** Enlaza clic para voltear flashcards en un contenedor. */
  function enlazarFlipFlashcards(contenedor) {
    if (!contenedor || contenedor._flipHandler) return;
    contenedor._flipHandler = function (evento) {
      var tarjeta = evento.target.closest('.flashcard');
      if (!tarjeta) return;
      tarjeta.classList.toggle('flashcard--flipped');
    };
    contenedor.addEventListener('click', contenedor._flipHandler);
  }

  /** Pinta pestaÃ±as de categorÃ­a reutilizables. */
  function pintarPestanasCategoria(contenedor, categoriaActiva, prefijo) {
    if (!contenedor) return;
    var html = '';
    CATEGORIAS_ESTUDIO.forEach(function (cat) {
      var activa = cat === categoriaActiva;
      html +=
        '<button type="button" class="study-tab' + (activa ? ' study-tab--active' : '') + '" ' +
        'data-' + prefijo + '-tab="' + cat + '" role="tab" aria-selected="' + activa + '">' +
        ETIQUETAS_ESTUDIO[cat] +
        '</button>';
    });
    contenedor.innerHTML = html;
  }

  /** Vista Aprender: banco PREGUNTAS como flashcards por categorÃ­a. */
  NihonCheck.renderizarAprender = function (contenedorTabs, contenedorGrid, categoria) {
    var cat = categoria || 'hiragana';
    pintarPestanasCategoria(contenedorTabs, cat, 'aprender');

    if (!contenedorGrid) return;

    var preguntas = NihonCheck.PREGUNTAS[cat] || [];
    if (preguntas.length === 0) {
      contenedorGrid.innerHTML = '<p class="flashcard-grid__vacio">No hay contenido en esta categorÃ­a.</p>';
      return;
    }

    var html = '';
    for (var i = 0; i < preguntas.length; i++) {
      var p = preguntas[i];
      html += htmlFlashcard({
        caracter: p.caracter,
        categoria: p.categoria,
        romaji: p.respuestaCorrecta,
        esNuevo: false,
        esDebil: false,
      });
    }
    contenedorGrid.innerHTML = html;
    enlazarFlipFlashcards(contenedorGrid);
  };

  /** HTML de tarjeta en Mi Biblioteca (estado + badge automático). */
  function htmlTarjetaBiblioteca(item) {
    var carpeta = item.carpeta;
    var estado = NihonCheck.calcularEstadoVisualTarjeta(item);
    var clave = NihonCheck.claveBibliotecaItem(item, carpeta);
    var lectura = NihonCheck.obtenerLecturaTarjeta(item);

    if (carpeta === 'gramatica') {
      return (
        '<article class="gramatica-card biblioteca-gramatica" data-biblioteca-carpeta="' + carpeta + '" ' +
          'data-biblioteca-clave="' + clave + '">' +
          '<span class="card-state card-state--' + estado + '" title="' + estado + '" aria-hidden="true"></span>' +
          (item.fuente === 'automatica'
            ? '<span class="card-badge card-badge--auto">Aprendido con NihonCheck</span>'
            : '<span class="card-badge card-badge--manual">Agregado por el usuario</span>') +
          '<h3 class="gramatica-card__titulo">' + item.titulo + '</h3>' +
          '<p class="gramatica-card__texto">' + item.explicacion + '</p>' +
          (item.ejemplo ? '<p class="gramatica-card__ejemplo">' + item.ejemplo + '</p>' : '') +
          '<button type="button" class="btn-gramatica-aprendido" data-action="marcar-gramatica">Marcar como repasado</button>' +
        '</article>'
      );
    }

    var catVisual = item.categoria || carpeta;
    var clases = 'flashcard biblioteca-card flashcard--' + catVisual + ' biblioteca-card--' + estado;
    if (item.tipo === 'palabra') clases += ' vocab-card flashcard--vocabulario';

    var displayChar = item.caracter;
    var charClass = item.tipo === 'palabra' ? ' vocab-card__word' : '';

    return (
      '<button type="button" class="' + clases + '" ' +
        'data-biblioteca-carpeta="' + carpeta + '" data-biblioteca-clave="' + clave + '" ' +
        'data-lectura="' + lectura + '" data-caracter="' + displayChar + '" ' +
        'aria-label="Practicar ' + displayChar + '">' +
        '<span class="card-state card-state--' + estado + '" title="' + estado + '" aria-hidden="true"></span>' +
        (item.fuente === 'automatica'
          ? '<span class="card-badge card-badge--auto">Aprendido con NihonCheck</span>'
          : '<span class="card-badge card-badge--manual">Agregado por el usuario</span>') +
        '<div class="flashcard__inner">' +
          '<div class="flashcard__front">' +
            '<span class="flashcard__char' + charClass + '">' + displayChar + '</span>' +
            '<span class="flashcard__meta">' + (ETIQUETAS_CARPETA[carpeta] || carpeta) + '</span>' +
          '</div>' +
          '<div class="flashcard__back">' +
            '<span class="flashcard__romaji">' + lectura + '</span>' +
            '<span class="flashcard__meta">romaji</span>' +
          '</div>' +
        '</div>' +
      '</button>'
    );
  }

  function pintarTabsBiblioteca(contenedor, carpetaActiva) {
    if (!contenedor) return;
    var html = '';
    CARPETAS_BIBLIOTECA.forEach(function (c) {
      var activa = c === carpetaActiva;
      html +=
        '<button type="button" class="study-tab' + (activa ? ' study-tab--active' : '') + '" ' +
        'data-biblioteca-tab="' + c + '" role="tab" aria-selected="' + activa + '">' +
        ETIQUETAS_CARPETA[c] + '</button>';
    });
    contenedor.innerHTML = html;
  }

  function pintarFiltrosBiblioteca(contenedor, filtroActivo) {
    if (!contenedor) return;
    var filtros = [
      { id: 'todos', label: 'Todos' },
      { id: 'reforzar', label: '🔴 Por reforzar' },
      { id: 'progreso', label: '🟡 En progreso' },
      { id: 'dominado', label: '🟢 Dominados' },
    ];
    var html = '';
    filtros.forEach(function (f) {
      var activo = f.id === filtroActivo;
      html +=
        '<button type="button" class="study-tab biblioteca-filtro' + (activo ? ' study-tab--active' : '') + '" ' +
        'data-biblioteca-filtro="' + f.id + '" role="tab" aria-selected="' + activo + '">' +
        f.label + '</button>';
    });
    contenedor.innerHTML = html;
  }

  /** Vista Mi Biblioteca unificada: tabs, filtros de estado, práctica por tarjeta. */
  NihonCheck.renderizarBiblioteca = function (opciones) {
    opciones = opciones || {};
    var carpeta = opciones.carpeta || 'hiragana';
    var filtroEstado = opciones.filtroEstado || 'todos';

    pintarTabsBiblioteca(opciones.contenedorTabs, carpeta);
    pintarFiltrosBiblioteca(opciones.contenedorFiltros, filtroEstado);

    var contenedorGrid = opciones.contenedorGrid;
    if (!contenedorGrid) return;

    var todos = NihonCheck.obtenerItemsBibliotecaUnificados();
    var filtrados = todos.filter(function (item) {
      if (item.carpeta !== carpeta) return false;
      if (filtroEstado === 'todos') return true;
      return NihonCheck.calcularEstadoVisualTarjeta(item) === filtroEstado;
    });

    if (filtrados.length === 0) {
      contenedorGrid.innerHTML =
        '<p class="flashcard-grid__vacio">No hay tarjetas en esta sección. ' +
        'Agrega material o aprende contenido en el camino guiado.</p>';
      contenedorGrid.classList.remove('flashcard-grid--vocab');
      return;
    }

    var tieneVocab = filtrados.some(function (it) { return it.tipo === 'palabra'; });
    contenedorGrid.classList.toggle('flashcard-grid--vocab', tieneVocab);

    var html = '';
    for (var i = 0; i < filtrados.length; i++) {
      html += htmlTarjetaBiblioteca(filtrados[i]);
    }
    contenedorGrid.innerHTML = html;
  };

  /**
   * Panel de práctica de una sola tarjeta (biblioteca o aprender).
   * modo: 'biblioteca' (solo estado tarjeta) | 'aprender' (global + auto-guardado)
   */
  NihonCheck.renderizarPracticaTarjeta = function (contenedor, item, modo) {
    if (!contenedor || !item) return;

    var lectura = NihonCheck.obtenerLecturaTarjeta(item);
    var display = item.caracter || item.titulo || '—';
    var esAprender = modo === 'aprender';

    contenedor.innerHTML =
      '<div class="biblioteca-practica__panel">' +
        '<div class="biblioteca-practica__header">' +
          '<span class="biblioteca-practica__titulo">' +
            (esAprender ? 'Practicar · Aprender' : 'Práctica libre · Biblioteca') +
          '</span>' +
          '<button type="button" class="biblioteca-practica__cerrar" data-action="cerrar-practica-tarjeta">Cerrar</button>' +
        '</div>' +
        '<p class="biblioteca-practica__aviso">' +
          (esAprender
            ? 'Las respuestas actualizan tu perfil y biblioteca en tiempo real.'
            : 'Actualiza el estado de la tarjeta y tu perfil de dominio por tema.') +
        '</p>' +
        '<p class="biblioteca-practica__caracter">' + display + '</p>' +
        '<form class="biblioteca-practica__form" id="form-practica-tarjeta">' +
          '<input class="biblioteca-practica__input" id="input-practica-tarjeta" type="text" ' +
            'autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Escribe el romaji…">' +
          '<p class="biblioteca-practica__feedback" id="feedback-practica-tarjeta" aria-live="polite"></p>' +
        '</form>' +
        (esAprender
          ? '<button type="button" class="btn-marcar-aprendido" data-action="marcar-aprendido">Marcar como aprendido</button>'
          : '') +
      '</div>';

    contenedor._practicaItem = item;
    contenedor._practicaModo = modo;
    contenedor._practicaLectura = lectura;
    contenedor._practicaTiempoInicio = Date.now();
    contenedor.removeAttribute('hidden');

    setTimeout(function () {
      var input = contenedor.querySelector('#input-practica-tarjeta');
      if (input) input.focus();
    }, 50);
  };

  NihonCheck.procesarPracticaTarjeta = function (contenedor, respuestaUsuario) {
    if (!contenedor || !contenedor._practicaItem) return null;

    var item = contenedor._practicaItem;
    var modo = contenedor._practicaModo;
    var lectura = contenedor._practicaLectura;
    var tiempoMs = contenedor._practicaTiempoInicio
      ? Date.now() - contenedor._practicaTiempoInicio
      : 0;
    contenedor._practicaTiempoInicio = Date.now();
    var acerto = NihonCheck.comprobarRespuestaRomaji(respuestaUsuario, lectura);
    var carpeta = item.carpeta || 'hiragana';
    var clave = NihonCheck.claveBibliotecaItem(item, carpeta);

    // FASE FINAL (UX): la práctica de tarjetas también cuenta como actividad
    // diaria, para que la racha refleje el estudio real (no solo exámenes).
    if (NihonCheck.registrarActividadDiaria) {
      NihonCheck.registrarActividadDiaria();
    }

    if (modo === 'aprender') {
      if (acerto) {
        NihonCheck.agregarABibliotecaAutomatica({
          caracter: item.caracter,
          lectura: lectura,
          carpeta: item.categoria || carpeta,
        });
        NihonCheck.registrarAciertoMemoria(item.caracter, item.categoria || carpeta, tiempoMs);
      } else {
        NihonCheck.registrarFalloMemoria(item.caracter, item.categoria || carpeta, lectura);
      }
    } else {
      NihonCheck.registrarPracticaBiblioteca(carpeta, clave, acerto, {
        tiempoMs: tiempoMs,
        item: item,
        sinRecalibrar: true,
      });
    }

    // FASE 1b: si el ítem ya está en un ciclo SRS activo, registrar este
    // repaso (reprograma el próximo intervalo según acierto/fallo).
    if (item.srs && item.srs.proximoRepaso && NihonCheck.srs &&
        NihonCheck.srs.procesarRepasoSRS) {
      NihonCheck.srs.procesarRepasoSRS(carpeta, item.caracter || item.titulo, acerto);
    }

    NihonCheck.recalibrarPerfil({
      area: item.categoria || carpeta,
      acerto: acerto,
      tiempoMs: tiempoMs,
      caracter: item.caracter || item.titulo,
      item: item,
    });

    return { acerto: acerto, lectura: lectura };
  };

  NihonCheck.cerrarPracticaTarjeta = function (contenedor) {
    if (!contenedor) return;
    contenedor.setAttribute('hidden', '');
    contenedor.innerHTML = '';
    contenedor._practicaItem = null;
  };

  /** Inicia o actualiza el panel de PrÃ¡ctica Libre (sin afectar memoria). */
  NihonCheck.renderizarPracticaLibre = function (contenedor, items, indice) {
    if (!contenedor) return;

    if (!items || items.length === 0) {
      contenedor.hidden = true;
      contenedor.innerHTML = '';
      practicaLibreEstado.activa = false;
      return;
    }

    var idx = typeof indice === 'number' ? indice : 0;
    if (idx < 0) idx = 0;
    if (idx >= items.length) idx = items.length - 1;

    practicaLibreEstado.activa = true;
    practicaLibreEstado.items = items;
    practicaLibreEstado.indice = idx;

    var actual = items[idx];

    contenedor.innerHTML =
      '<div class="practica-libre__header">' +
        '<span class="practica-libre__titulo">PrÃ¡ctica Libre Â· ' + (idx + 1) + '/' + items.length + '</span>' +
        '<button type="button" class="practica-libre__cerrar" data-action="cerrar-practica">Cerrar</button>' +
      '</div>' +
      '<p class="practica-libre__aviso">Modo sin presiÃ³n: no afecta tu progreso ni puntos dÃ©biles.</p>' +
      '<p class="practica-libre__caracter">' + actual.caracter + '</p>' +
      '<form class="practica-libre__form" id="form-practica-libre">' +
        '<input class="practica-libre__input" id="input-practica" type="text" autocomplete="off" ' +
          'autocapitalize="off" spellcheck="false" placeholder="Escribe el romajiâ€¦">' +
        '<p class="practica-libre__feedback" id="feedback-practica" aria-live="polite"></p>' +
      '</form>' +
      '<div class="practica-libre__nav">' +
        '<button type="button" data-action="practica-anterior">â† Anterior</button>' +
        '<button type="button" data-action="practica-aleatorio">Aleatorio</button>' +
        '<button type="button" data-action="practica-siguiente">Siguiente â†’</button>' +
      '</div>';

    contenedor.hidden = false;

    setTimeout(function () {
      var input = contenedor.querySelector('#input-practica');
      if (input) input.focus();
    }, 50);
  };

  NihonCheck.comprobarPracticaLibre = function (respuestaUsuario, item) {
    return NihonCheck.normalizarRespuesta(respuestaUsuario) ===
      NihonCheck.normalizarRespuesta(item.romaji);
  };

  /* ============================================================
     4d. BIBLIOTECA PERSONAL Y USUARIO
     ============================================================ */
  var CLAVE_BIBLIOTECA_PERSONAL = 'nihoncheck_biblioteca_personal';
  var CARPETAS_BIBLIOTECA = ['hiragana', 'katakana', 'kanji', 'gramatica'];
  var ACIERTOS_DOMINADO_BIBLIOTECA = 15;
  var ETIQUETAS_CARPETA = {
    hiragana: 'Hiragana',
    katakana: 'Katakana',
    kanji: 'Kanji',
    gramatica: 'Gramática',
  };

  /** Estado por defecto de una tarjeta en biblioteca (localStorage). */
  function crearEstadoTarjetaDefecto() {
    return {
      aciertosSeguidos: 0,
      fallosRecientes: 0,
      ultimoResultado: null,
      ultimaPractica: null,
    };
  }

  /** Clave única para deduplicar ítems (caracter + carpeta). */
  NihonCheck.claveBibliotecaItem = function (item, carpeta) {
    if (carpeta === 'gramatica') {
      return 'gram:' + (item.titulo || item.caracter || '');
    }
    if (item.tipo === 'palabra' && item.lectura) {
      return 'palabra:' + item.caracter + '|' + item.lectura;
    }
    return item.caracter || '';
  };

  /** Normaliza un ítem al leer/escribir biblioteca_personal. */
  function normalizarItemBiblioteca(item, carpeta) {
    var base = {
      carpeta: carpeta,
      fuente: item.fuente || 'manual',
      tipo: item.tipo || (carpeta === 'gramatica' ? 'gramatica' : 'caracter'),
      agregado: item.agregado || new Date().toISOString(),
      aciertosSeguidos: item.aciertosSeguidos || 0,
      fallosRecientes: item.fallosRecientes || 0,
      ultimoResultado: item.ultimoResultado || null,
      ultimaPractica: item.ultimaPractica || null,
    };
    // FASE 1b: preservar el campo srs (Repetición Espaciada) a través de
    // la normalización. Sin esto, srs se perdería en cada lectura de la
    // biblioteca y los hooks de estado/práctica no podrían verlo.
    if (item.srs && typeof item.srs === 'object') {
      base.srs = item.srs;
    }
    if (carpeta === 'gramatica') {
      return Object.assign(base, {
        titulo: item.titulo || '',
        explicacion: item.explicacion || '',
        ejemplo: item.ejemplo || '',
      });
    }
    return Object.assign(base, {
      caracter: item.caracter,
      lectura: item.lectura || null,
      categoria: item.categoria || carpeta,
    });
  }

  /** Banco estÃ¡tico de gramÃ¡tica N5 para la ruta de aprendizaje. */
  NihonCheck.CONTENIDO_GRAMATICA = [
    { titulo: 'Partícula は (wa)', explicacion: 'Marca el tema de la oración. Se lee "wa" aunque se escriba は.', ejemplo: 'わたしは がくせい です。' },
    { titulo: 'Partícula を (wo)', explicacion: 'Indica el objeto directo del verbo.', ejemplo: 'みず を のみます。' },
    { titulo: 'Partícula の (no)', explicacion: 'Indica posesión o conexión entre sustantivos.', ejemplo: 'わたし の ほん' },
    { titulo: 'です / だ', explicacion: 'Copula formal (です) e informal (だ) al final de oraciones.', ejemplo: 'ねこ です。' },
    { titulo: 'Verbos en ます', explicacion: 'Forma cortés del verbo en presente/futuro.', ejemplo: 'たべます · いきます' },
    { titulo: 'Pregunta か', explicacion: 'La partícula か al final convierte una frase en pregunta.', ejemplo: 'あなた は 学生 です か。' },
    { titulo: 'Negación ません', explicacion: 'Forma negativa cortés de verbos en ます.', ejemplo: 'たべません' },
    { titulo: 'Adjetivos い', explicacion: 'Terminan en い y se conjugan cambiando la い.', ejemplo: 'おおきい · おおきくない' },
  ];

  NihonCheck.crearBibliotecaVacia = function () {
    return { hiragana: [], katakana: [], kanji: [], gramatica: [] };
  };

  NihonCheck.obtenerBibliotecaPersonal = function () {
    try {
      var datos = localStorage.getItem(CLAVE_BIBLIOTECA_PERSONAL);
      if (!datos) return NihonCheck.crearBibliotecaVacia();
      var bib = JSON.parse(datos);
      var vacia = NihonCheck.crearBibliotecaVacia();
      CARPETAS_BIBLIOTECA.forEach(function (c) {
        var lista = Array.isArray(bib[c]) ? bib[c] : [];
        vacia[c] = lista.map(function (item) {
          return normalizarItemBiblioteca(item, c);
        });
      });
      return vacia;
    } catch (e) {
      return NihonCheck.crearBibliotecaVacia();
    }
  };

  NihonCheck.guardarBibliotecaPersonal = function (bib) {
    try {
      localStorage.setItem(CLAVE_BIBLIOTECA_PERSONAL, JSON.stringify(bib));
    } catch (e) {
      // localStorage puede fallar en modo privado
    }
  };

  /** Lista plana unificada: manual + automática, deduplicada por caracter+carpeta (prefiere manual). */
  NihonCheck.obtenerItemsBibliotecaUnificados = function () {
    var bib = NihonCheck.obtenerBibliotecaPersonal();
    var mapa = {};
    var lista = [];

    CARPETAS_BIBLIOTECA.forEach(function (carpeta) {
      var items = bib[carpeta] || [];
      for (var i = 0; i < items.length; i++) {
        var item = normalizarItemBiblioteca(items[i], carpeta);
        var clave = carpeta + ':' + NihonCheck.claveBibliotecaItem(item, carpeta);
        if (mapa[clave]) {
          if (item.fuente === 'manual' && mapa[clave].fuente === 'automatica') {
            var prev = mapa[clave];
            mapa[clave] = Object.assign({}, item, {
              aciertosSeguidos: Math.max(prev.aciertosSeguidos, item.aciertosSeguidos),
              fallosRecientes: Math.max(prev.fallosRecientes, item.fallosRecientes),
              ultimoResultado: prev.ultimoResultado || item.ultimoResultado,
              ultimaPractica: prev.ultimaPractica || item.ultimaPractica,
            });
          }
        } else {
          mapa[clave] = item;
        }
      }
    });

    for (var k in mapa) {
      if (Object.prototype.hasOwnProperty.call(mapa, k)) {
        lista.push(mapa[k]);
      }
    }

    return lista;
  };

  NihonCheck._esCaracterDebilGlobal = function (caracter) {
    if (!caracter) return false;
    var debiles = NihonCheck.obtenerPuntosDebiles();
    for (var i = 0; i < debiles.length; i++) {
      if (debiles[i].caracter === caracter) return true;
    }
    return false;
  };

  /**
   * Estado visual: dominado | progreso | reforzar | neutro
   * 🟢 dominado: aciertosSeguidos >= 15
   * 🟡 progreso: aciertos > 0 y < 15, sin fallo reciente
   * 🔴 reforzar: ultimoResultado === 'fallo' o en puntos_debiles globales
   */
  NihonCheck.calcularEstadoVisualTarjeta = function (item) {
    // FASE 1b: prioridad máxima — si el ítem tiene un repaso SRS vencido
    // (proximoRepaso <= hoy), se marca como 'repaso_pendiente'. Se evalúa
    // antes que cualquier otro estado y para todas las categorías.
    var hoy = new Date().toISOString().split('T')[0];
    if (item.srs && item.srs.proximoRepaso &&
        String(item.srs.proximoRepaso).split('T')[0] <= hoy) {
      return 'repaso_pendiente';
    }
    if (item.carpeta === 'gramatica' || item.tipo === 'gramatica') {
      return item.ultimoResultado === 'fallo' ? 'reforzar' : 'neutro';
    }
    var aciertos = item.aciertosSeguidos || 0;
    if (item.ultimoResultado === 'fallo' || NihonCheck._esCaracterDebilGlobal(item.caracter)) {
      return 'reforzar';
    }
    if (aciertos >= ACIERTOS_DOMINADO_BIBLIOTECA) return 'dominado';
    if (aciertos > 0) return 'progreso';
    return 'neutro';
  };

  /** Auto-guardado desde Aprender con la web (fuente automática). */
  NihonCheck.agregarABibliotecaAutomatica = function (opts) {
    if (!opts || (!opts.caracter && !opts.titulo)) return false;

    var carpeta = opts.carpeta || 'hiragana';
    if (CARPETAS_BIBLIOTECA.indexOf(carpeta) < 0) carpeta = 'hiragana';

    var bib = NihonCheck.obtenerBibliotecaPersonal();
    var items = bib[carpeta];
    var lectura = opts.lectura || (opts.caracter
      ? NihonCheck.obtenerRomajiPorCaracter(opts.caracter)
      : null);
    var nuevo = normalizarItemBiblioteca({
      caracter: opts.caracter,
      lectura: lectura,
      titulo: opts.titulo,
      explicacion: opts.explicacion,
      ejemplo: opts.ejemplo,
      fuente: 'automatica',
      agregado: new Date().toISOString(),
    }, carpeta);

    var claveNueva = NihonCheck.claveBibliotecaItem(nuevo, carpeta);
    var idx = -1;
    for (var i = 0; i < items.length; i++) {
      if (NihonCheck.claveBibliotecaItem(items[i], carpeta) === claveNueva) {
        idx = i;
        break;
      }
    }

    if (idx >= 0) {
      if (items[idx].fuente === 'manual') {
        if (!items[idx].lectura && lectura) items[idx].lectura = lectura;
      } else if (lectura) {
        items[idx].lectura = lectura;
      }
    } else {
      items.push(nuevo);
    }

    NihonCheck.guardarBibliotecaPersonal(bib);
    return true;
  };

  /** Migra nihoncheck_caracteres_aprendidos a biblioteca (fuente automática). */
  NihonCheck.sincronizarCaracteresAprendidosABiblioteca = function () {
    var aprendidos = NihonCheck.obtenerCaracteresAprendidos();
    for (var i = 0; i < aprendidos.length; i++) {
      var a = aprendidos[i];
      NihonCheck.agregarABibliotecaAutomatica({
        caracter: a.caracter,
        lectura: NihonCheck.obtenerRomajiPorCaracter(a.caracter),
        carpeta: a.categoria || NihonCheck.clasificarCaracter(a.caracter) || 'hiragana',
      });
    }
  };

  /**
   * Estado de tarjeta en biblioteca_personal + recalibración de perfil por tema.
   * No modifica puntos_debiles ni puntuación ponderada de exámenes.
   */
  NihonCheck.registrarPracticaBiblioteca = function (carpeta, claveItem, acerto, opts) {
    opts = opts || {};
    var bib = NihonCheck.obtenerBibliotecaPersonal();
    var items = bib[carpeta] || [];
    var ahora = new Date().toISOString();
    var actualizado = false;
    var itemEncontrado = null;

    for (var i = 0; i < items.length; i++) {
      if (NihonCheck.claveBibliotecaItem(items[i], carpeta) !== claveItem) continue;
      itemEncontrado = items[i];

      if (acerto) {
        items[i].aciertosSeguidos = (items[i].aciertosSeguidos || 0) + 1;
        items[i].ultimoResultado = 'acierto';
        items[i].fallosRecientes = 0;
      } else {
        items[i].aciertosSeguidos = 0;
        items[i].fallosRecientes = (items[i].fallosRecientes || 0) + 1;
        items[i].ultimoResultado = 'fallo';
      }
      items[i].ultimaPractica = ahora;
      actualizado = true;
      break;
    }

    if (actualizado) NihonCheck.guardarBibliotecaPersonal(bib);

    // FASE 1b: si el ítem acaba de alcanzar estado 'dominado' y aún no
    // tiene un repaso SRS programado, iniciar su ciclo de repaso.
    if (actualizado && itemEncontrado) {
      var estadoActual = NihonCheck.calcularEstadoVisualTarjeta(itemEncontrado);
      if (estadoActual === 'dominado' &&
          (!itemEncontrado.srs || !itemEncontrado.srs.proximoRepaso)) {
        if (NihonCheck.srs && NihonCheck.srs.programarRepaso) {
          NihonCheck.srs.programarRepaso(itemEncontrado, true);
          // Persistir de nuevo: itemEncontrado ahora tiene .srs y
          // guardarBibliotecaPersonal serializa el objeto bib tal cual.
          NihonCheck.guardarBibliotecaPersonal(bib);
        }
      }
    }

    if (!opts.sinRecalibrar) {
      NihonCheck.recalibrarPerfil({
        area: carpeta,
        acerto: acerto,
        tiempoMs: opts.tiempoMs || 0,
        caracter: itemEncontrado ? (itemEncontrado.caracter || itemEncontrado.titulo) : null,
        item: opts.item || itemEncontrado,
      });
    }

    return actualizado;
  };

  NihonCheck.obtenerLecturaTarjeta = function (item) {
    if (item.lectura) return item.lectura;
    if (item.caracter) return NihonCheck.obtenerRomajiPorCaracter(item.caracter);
    return '';
  };

  NihonCheck.comprobarRespuestaRomaji = function (respuestaUsuario, lecturaEsperada) {
    return NihonCheck.normalizarRespuesta(respuestaUsuario) ===
      NihonCheck.normalizarRespuesta(lecturaEsperada);
  };

  NihonCheck.crearUsuarioPorDefecto = function () {
    return {
      primeraVisitaCompletada: false,
      diagnosticoCompletado: false,
      testDiagnosticoCompletado: false,
      empezoDesdeCero: false,
      inicioDesdeCero: false,
      areaElegida: null,
    };
  };

  NihonCheck.obtenerUsuario = function () {
    try {
      var datos = localStorage.getItem(CLAVE_USUARIO);
      if (!datos) return NihonCheck.crearUsuarioPorDefecto();
      var parsed = JSON.parse(datos);
      var diag = parsed.diagnosticoCompletado !== undefined
        ? !!parsed.diagnosticoCompletado
        : !!parsed.testDiagnosticoCompletado || !!parsed.testNivelCompletado;
      if (NihonCheck.diagnosticoRealizadoEstaMarcado && NihonCheck.diagnosticoRealizadoEstaMarcado()) {
        diag = true;
      }
      if (parsed.primeraVisitaCompletada !== undefined) {
        return {
          primeraVisitaCompletada: !!parsed.primeraVisitaCompletada,
          diagnosticoCompletado: diag,
          testDiagnosticoCompletado: diag,
          empezoDesdeCero: !!parsed.empezoDesdeCero,
          inicioDesdeCero: !!parsed.inicioDesdeCero || !!parsed.empezoDesdeCero,
          areaElegida: parsed.areaElegida || null,
        };
      }
      return {
        primeraVisitaCompletada: diag || !!parsed.areaElegida,
        diagnosticoCompletado: diag,
        testDiagnosticoCompletado: diag,
        empezoDesdeCero: !!parsed.empezoDesdeCero,
        inicioDesdeCero: !!parsed.inicioDesdeCero || !!parsed.empezoDesdeCero,
        areaElegida: parsed.areaElegida || null,
      };
    } catch (e) {
      return NihonCheck.crearUsuarioPorDefecto();
    }
  };

  NihonCheck.guardarUsuario = function (usuario) {
    try {
      localStorage.setItem(CLAVE_USUARIO, JSON.stringify(usuario));
      if (usuario.diagnosticoCompletado) {
        NihonCheck.marcarDiagnosticoRealizado(true);
      }
    } catch (e) {
      // localStorage puede fallar
    }
  };

  NihonCheck.diagnosticoRealizadoEstaMarcado = function () {
    try {
      return localStorage.getItem(CLAVE_DIAGNOSTICO_REALIZADO) === 'true';
    } catch (e) {
      return false;
    }
  };

  NihonCheck.marcarDiagnosticoRealizado = function (realizado) {
    try {
      if (realizado) {
        localStorage.setItem(CLAVE_DIAGNOSTICO_REALIZADO, 'true');
      } else {
        localStorage.removeItem(CLAVE_DIAGNOSTICO_REALIZADO);
      }
    } catch (e) { /* noop */ }
  };

  NihonCheck.sincronizarDiagnosticoRealizado = function () {
    var usuario = NihonCheck.obtenerUsuario();
    if (usuario.diagnosticoCompletado && !NihonCheck.diagnosticoRealizadoEstaMarcado()) {
      NihonCheck.marcarDiagnosticoRealizado(true);
    }
    if (NihonCheck.diagnosticoRealizadoEstaMarcado() && !usuario.diagnosticoCompletado) {
      usuario.diagnosticoCompletado = true;
      usuario.testDiagnosticoCompletado = true;
      usuario.primeraVisitaCompletada = true;
      NihonCheck.guardarUsuario(usuario);
    }
  };

  NihonCheck.inicializarPerfilDesdeCero = function () {
    var perfil = {
      diagnosticoCompletado: false,
      inicioDesdeCero: true,
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
      detalle: window.NihonCheckTemas ? NihonCheckTemas.crearDetalleVacio() : {},
      estadisticasTema: {},
      recomendaciones: ['hiragana-principiante'],
    };

    NihonCheck.guardarPerfil(perfil);
    NihonCheck.inicializarDominioDesdePerfil(perfil);
    NihonCheck.actualizarRutaRecomendada();

    var usuario = NihonCheck.obtenerUsuario();
    usuario.empezoDesdeCero = true;
    usuario.inicioDesdeCero = true;
    usuario.primeraVisitaCompletada = true;
    usuario.diagnosticoCompletado = false;
    usuario.testDiagnosticoCompletado = false;
    NihonCheck.guardarUsuario(usuario);

    return perfil;
  };

  NihonCheck.marcarEmpezoDesdeCero = function () {
    return NihonCheck.inicializarPerfilDesdeCero();
  };

  NihonCheck.marcarDiagnosticoCompletado = function (areaElegida, historial) {
    if (historial && historial.length && NihonCheck.procesarDiagnosticoCompletado) {
      NihonCheck.procesarDiagnosticoCompletado(historial);
      if (areaElegida) {
        var usuario = NihonCheck.obtenerUsuario();
        usuario.areaElegida = areaElegida;
        NihonCheck.guardarUsuario(usuario);
      }
      return;
    }
    var usuario = NihonCheck.obtenerUsuario();
    usuario.diagnosticoCompletado = true;
    usuario.testDiagnosticoCompletado = true;
    usuario.primeraVisitaCompletada = true;
    if (areaElegida) usuario.areaElegida = areaElegida;
    NihonCheck.guardarUsuario(usuario);
  };

  NihonCheck._ultimoEventoRecalibracion = null;

  function crearStatsTemaVacio() {
    return {
      aciertos: 0,
      fallos: 0,
      aciertosSeguidos: 0,
      aciertosSeguidosRapidos: 0,
      fallosRecientes: 0,
      tiempoPromedioMs: 0,
      ultimaPractica: null,
      ultimosIntentos: [],
    };
  }

  function normalizarPerfil(perfil) {
    if (!perfil) return null;
    if (!perfil.detalle && window.NihonCheckTemas) {
      perfil.detalle = NihonCheckTemas.crearDetalleVacio();
    }
    perfil.estadisticasTema = perfil.estadisticasTema || {};
    perfil.recomendaciones = perfil.recomendaciones || [];
    return perfil;
  }

  function claveEstadisticasTema(area, temaClave) {
    if (typeof resolverTemaId === 'function') {
      var temaId = resolverTemaId(area, temaClave);
      if (temaId) return temaId;
    }
    var prefijos = { hiragana: 'hira', katakana: 'kata', kanji: 'kanji', gramatica: 'gram' };
    return (prefijos[area] || area) + '-' + String(temaClave || '').toLowerCase();
  }

  function inferirTemaParaRecalibracion(area, opts) {
    opts = opts || {};
    if (opts.tema) return opts.tema;
    if (opts.temaId && window.NihonCheckTemas) {
      return NihonCheckTemas.claveDetalleDesdeTemaId(opts.temaId);
    }
    if (window.NihonCheckTemas && NihonCheckTemas.inferirTemaDesdeItemBiblioteca && opts.item) {
      return NihonCheckTemas.inferirTemaDesdeItemBiblioteca(area, opts.item);
    }
    if (area === 'gramatica') return 'particulas';
    if (opts.caracter && window.NihonCheckTemas) {
      return NihonCheckTemas.inferirTemaDesdeCaracter(area, opts.caracter);
    }
    return null;
  }

  function sincronizarDominioDesdeDetalle(area, temaClave, estado) {
    if (typeof resolverTemaId !== 'function') return;
    var temaId = resolverTemaId(area, temaClave);
    if (temaId) NihonCheck.actualizarEstadoDominioTema(temaId, estado);
  }

  NihonCheck.obtenerPerfil = function () {
    return normalizarPerfil(NihonCheck._leerJSON(CLAVE_PERFIL, null));
  };

  NihonCheck.guardarPerfil = function (perfil) {
    try {
      localStorage.setItem(CLAVE_PERFIL, JSON.stringify(normalizarPerfil(perfil)));
    } catch (e) { /* noop */ }
    // Sync opcional con Firestore si hay sesión (no bloquea; falla en silencio sin Firebase)
    if (window.NihonCheckFirestore && window.NihonCheckFirestore.syncPerfilIfLoggedIn) {
      window.NihonCheckFirestore.syncPerfilIfLoggedIn();
    }
  };

  NihonCheck.obtenerDominio = function () {
    return NihonCheck._leerJSON(CLAVE_DOMINIO, {});
  };

  NihonCheck.guardarDominio = function (dominio) {
    try {
      localStorage.setItem(CLAVE_DOMINIO, JSON.stringify(dominio));
    } catch (e) { /* noop */ }
  };

  NihonCheck.obtenerEstadoDominioTema = function (temaId) {
    var dominio = NihonCheck.obtenerDominio();
    return dominio[temaId] || null;
  };

  NihonCheck.actualizarEstadoDominioTema = function (temaId, estado) {
    var dominio = NihonCheck.obtenerDominio();
    dominio[temaId] = estado;
    NihonCheck.guardarDominio(dominio);
  };

  NihonCheck.nivelEtiqueta = function (nivel) {
    if (nivel === 'avanzado') return 'Avanzado';
    if (nivel === 'intermedio') return 'Intermedio';
    return 'Principiante';
  };

  NihonCheck.diagnosticoEstaCompletado = function () {
    if (NihonCheck.diagnosticoRealizadoEstaMarcado()) return true;
    var usuario = NihonCheck.obtenerUsuario();
    if (usuario.diagnosticoCompletado || usuario.testDiagnosticoCompletado) return true;
    var perfil = NihonCheck.obtenerPerfil();
    return !!(perfil && perfil.diagnosticoCompletado);
  };

  NihonCheck.puedeAccederAprendizaje = function () {
    var usuario = NihonCheck.obtenerUsuario();
    if (usuario.empezoDesdeCero || usuario.inicioDesdeCero) return true;
    if (NihonCheck.obtenerPerfil()) return true;
    return NihonCheck.diagnosticoEstaCompletado();
  };

  NihonCheck.construirPerfilDesdeDiagnostico = function (historial) {
    var perfil = null;
    if (window.NihonCheckTemas && NihonCheckTemas.construirPerfilDesdeHistorial) {
      perfil = NihonCheckTemas.construirPerfilDesdeHistorial(historial);
    } else if (NihonCheck.construirPerfilDesdeHistorial) {
      perfil = NihonCheck.construirPerfilDesdeHistorial(historial);
    }
    if (!perfil) return null;
    perfil.estadisticasTema = perfil.estadisticasTema || {};
    return normalizarPerfil(perfil);
  };

  NihonCheck.calcularEstadoTema = function (tema, stats, estadoAnterior) {
    stats = stats || crearStatsTemaVacio();
    estadoAnterior = estadoAnterior || 'por_reforzar';

    var ultimos = stats.ultimosIntentos || [];
    var ultimo = ultimos.length ? ultimos[ultimos.length - 1] : null;

    if (ultimo && !ultimo.acerto) return 'por_reforzar';
    if ((stats.aciertosSeguidosRapidos || 0) >= ACIERTOS_DOMINIO) return 'dominado';
    if (ultimo && ultimo.acerto && ultimo.tiempoMs >= TIEMPO_DOMINIO_MS) return 'en_progreso_lento';
    if ((stats.aciertosSeguidos || 0) > 0) return 'en_progreso';
    return 'por_reforzar';
  };

  NihonCheck.recalibrarPerfil = function (opts) {
    opts = opts || {};
    var area = opts.area;
    if (!area) return null;

    var tema = inferirTemaParaRecalibracion(area, opts);
    if (!tema) return null;

    var perfil = NihonCheck.obtenerPerfil();
    if (!perfil) {
      perfil = {
        diagnosticoCompletado: false,
        detalle: window.NihonCheckTemas ? NihonCheckTemas.crearDetalleVacio() : {},
        estadisticasTema: {},
        recomendaciones: [],
      };
    }
    if (!perfil.detalle[area]) perfil.detalle[area] = {};
    var estadoAnterior = perfil.detalle[area][tema] || 'por_reforzar';

    var statsKey = claveEstadisticasTema(area, tema);
    var stats = perfil.estadisticasTema[statsKey] || crearStatsTemaVacio();
    var tiempoMs = typeof opts.tiempoMs === 'number' ? opts.tiempoMs : 0;
    var acerto = !!opts.acerto;
    var ahora = new Date().toISOString();

    if (!stats.ultimosIntentos) stats.ultimosIntentos = [];
    stats.ultimosIntentos.push({ acerto: acerto, tiempoMs: tiempoMs, ts: ahora });
    if (stats.ultimosIntentos.length > INTENTOS_RECIENTES_MAX) {
      stats.ultimosIntentos = stats.ultimosIntentos.slice(-INTENTOS_RECIENTES_MAX);
    }

    if (acerto) {
      stats.aciertos++;
      stats.aciertosSeguidos++;
      if (tiempoMs < TIEMPO_DOMINIO_MS) {
        stats.aciertosSeguidosRapidos = (stats.aciertosSeguidosRapidos || 0) + 1;
      } else {
        stats.aciertosSeguidosRapidos = 0;
      }
    } else {
      stats.fallos++;
      stats.aciertosSeguidos = 0;
      stats.aciertosSeguidosRapidos = 0;
    }

    stats.fallosRecientes = 0;
    for (var i = 0; i < stats.ultimosIntentos.length; i++) {
      if (!stats.ultimosIntentos[i].acerto) stats.fallosRecientes++;
    }

    var totalIntentos = stats.aciertos + stats.fallos;
    stats.tiempoPromedioMs = totalIntentos > 1
      ? Math.round((stats.tiempoPromedioMs * (totalIntentos - 1) + tiempoMs) / totalIntentos)
      : tiempoMs;
    stats.ultimaPractica = ahora;
    perfil.estadisticasTema[statsKey] = stats;

    var nuevoEstado = NihonCheck.calcularEstadoTema(tema, stats, estadoAnterior);
    perfil.detalle[area][tema] = nuevoEstado;
    NihonCheck.guardarPerfil(perfil);
    sincronizarDominioDesdeDetalle(area, tema, nuevoEstado);
    NihonCheck.actualizarRutaRecomendada();

    if (estadoAnterior !== nuevoEstado) {
      var nombre = (window.NihonCheckTemas && NihonCheckTemas.ETIQUETAS_TEMA[tema]) || tema;
      NihonCheck._ultimoEventoRecalibracion = {
        tipo: nuevoEstado === 'dominado' ? 'promocion'
          : (estadoAnterior === 'dominado' && nuevoEstado === 'por_reforzar' ? 'degradacion' : null),
        area: area,
        tema: tema,
        nombre: nombre,
        estadoAnterior: estadoAnterior,
        estadoNuevo: nuevoEstado,
      };
    }

    return { estadoAnterior: estadoAnterior, nuevoEstado: nuevoEstado, stats: stats };
  };

  NihonCheck.actualizarRutaRecomendada = function () {
    var perfil = NihonCheck.obtenerPerfil();
    if (!perfil || typeof generarRutaPersonalizada !== 'function') return perfil;

    var ruta = generarRutaPersonalizada(perfil);
    perfil.recomendaciones = ruta.map(function (bloque) {
      return {
        area: bloque.area,
        nivel: bloque.nivel,
        titulo: bloque.titulo,
        porcentaje: bloque.porcentaje,
        temas: bloque.temas,
      };
    });
    NihonCheck.guardarPerfil(perfil);
    return perfil;
  };

  NihonCheck.obtenerUltimoEventoRecalibracion = function () {
    var ev = NihonCheck._ultimoEventoRecalibracion;
    NihonCheck._ultimoEventoRecalibracion = null;
    return ev;
  };

  NihonCheck.generarRutaPersonalizada = function (perfil) {
    if (typeof window.generarRutaPersonalizada !== 'function') return [];
    return window.generarRutaPersonalizada(perfil);
  };

  NihonCheck.obtenerProximosObjetivos = function (perfil, dominio, limite) {
    limite = limite || 3;
    if (typeof obtenerObjetivosSugeridos !== 'function') return [];
    return obtenerObjetivosSugeridos(perfil, limite).map(function (obj) {
      return {
        area: obj.area,
        temaId: typeof resolverTemaId === 'function' ? resolverTemaId(obj.area, obj.clave) : null,
        clave: obj.clave,
        nombre: obj.nombre,
        estado: obj.estado,
      };
    });
  };

  NihonCheck.inicializarDominioDesdePerfil = function (perfil) {
    if (!perfil) return;
    var dominio = NihonCheck.obtenerDominio();
    var areas = ['hiragana', 'katakana', 'kanji', 'gramatica'];
    var detalle = perfil.detalle || {};

    areas.forEach(function (area) {
      var temas = typeof obtenerTemas === 'function' ? obtenerTemas(area) : [];
      var detArea = detalle[area] || {};
      temas.forEach(function (tema) {
        if (!tema.tema) return;
        var estado = detArea[tema.tema] || 'por_reforzar';
        if (dominio[tema.id] === 'dominado' && estado !== 'dominado') return;
        dominio[tema.id] = estado;
      });
    });

    NihonCheck.guardarDominio(dominio);
  };

  NihonCheck.procesarDiagnosticoCompletado = function (historial) {
    var perfil = NihonCheck.construirPerfilDesdeDiagnostico(historial);
    if (!perfil) return null;

    NihonCheck.guardarPerfil(perfil);
    NihonCheck.inicializarDominioDesdePerfil(perfil);
    NihonCheck.actualizarRutaRecomendada();

    var usuario = NihonCheck.obtenerUsuario();
    usuario.diagnosticoCompletado = true;
    usuario.testDiagnosticoCompletado = true;
    usuario.primeraVisitaCompletada = true;
    if (perfil.recomendaciones && perfil.recomendaciones[0]) {
      var rec = perfil.recomendaciones[0];
      usuario.areaElegida = typeof rec === 'string' ? rec.split('-')[0] : rec.area;
    }
    NihonCheck.marcarDiagnosticoRealizado(true);
    NihonCheck.guardarUsuario(usuario);

    return perfil;
  };

  /** Limpia flags de diagnóstico para repetir el examen sin borrar biblioteca. */
  NihonCheck.resetearDiagnostico = function () {
    NihonCheck.marcarDiagnosticoRealizado(false);
    var usuario = NihonCheck.obtenerUsuario();
    usuario.diagnosticoCompletado = false;
    usuario.testDiagnosticoCompletado = false;
    NihonCheck.guardarUsuario(usuario);
    var perfil = NihonCheck.obtenerPerfil();
    if (perfil) {
      perfil.diagnosticoCompletado = false;
      NihonCheck.guardarPerfil(perfil);
    }
  };

  /** Reinicia onboarding y progreso de examen; conserva biblioteca_personal. */
  NihonCheck.reiniciarProgresoUsuario = function (opciones) {
    opciones = opciones || {};
    NihonCheck.marcarDiagnosticoRealizado(false);
    NihonCheck.guardarUsuario(NihonCheck.crearUsuarioPorDefecto());
    if (opciones.limpiarPerfil !== false) {
      try { localStorage.removeItem(CLAVE_PERFIL); } catch (e) { /* noop */ }
      try { localStorage.removeItem(CLAVE_DOMINIO); } catch (e) { /* noop */ }
    }
    if (opciones.limpiarLecciones !== false) {
      try { localStorage.removeItem(CLAVE_PROGRESO_LECCIONES); } catch (e) { /* noop */ }
    }
    if (opciones.limpiarDebiles !== false) NihonCheck.limpiarPuntosDebiles();
    if (opciones.limpiarAprendidos) NihonCheck.guardarCaracteresAprendidos([]);
    if (opciones.limpiarUltimoExamen) {
      try { localStorage.removeItem(CLAVE_ULTIMO_EXAMEN); } catch (e) { /* noop */ }
    }
  };

  /** Migra estudio_pendiente antiguo a biblioteca_personal (una sola vez). */
  NihonCheck.migrarEstudioPendienteABiblioteca = function () {
    var pendiente = NihonCheck.obtenerEstudioPendiente();
    if (pendiente.length === 0) return;

    var bib = NihonCheck.obtenerBibliotecaPersonal();
    var vistos = {};

    CARPETAS_BIBLIOTECA.forEach(function (c) {
      for (var i = 0; i < bib[c].length; i++) {
        var clave = c === 'gramatica'
          ? bib[c][i].titulo
          : bib[c][i].caracter;
        vistos[c + ':' + clave] = true;
      }
    });

    for (var j = 0; j < pendiente.length; j++) {
      var item = pendiente[j];
      var carpeta = item.categoria || 'hiragana';
      if (CARPETAS_BIBLIOTECA.indexOf(carpeta) < 0) carpeta = 'hiragana';
      var id = carpeta + ':' + item.caracter;
      if (vistos[id]) continue;
      vistos[id] = true;
      bib[carpeta].push(normalizarItemBiblioteca({
        caracter: item.caracter,
        lectura: item.lectura || NihonCheck.obtenerRomajiPorCaracter(item.caracter),
        fuente: 'manual',
        tipo: item.tipo || 'caracter',
        agregado: item.agregado || new Date().toISOString(),
      }, carpeta));
    }

    NihonCheck.guardarBibliotecaPersonal(bib);
    NihonCheck.limpiarEstudioPendiente();
  };

  /** Detecta si el usuario no tiene datos previos en la app. */
  NihonCheck.esUsuarioNuevo = function () {
    var bib = NihonCheck.obtenerBibliotecaPersonal();
    var tieneBiblioteca = CARPETAS_BIBLIOTECA.some(function (c) {
      return bib[c].length > 0;
    });
    if (tieneBiblioteca) return false;

    if (NihonCheck.obtenerPuntosDebiles().length > 0) return false;
    if (NihonCheck.obtenerCaracteresAprendidos().length > 0) return false;
    if (NihonCheck.obtenerUltimoExamen()) return false;

    if (NihonCheck.obtenerPerfil()) return false;

    var usuario = NihonCheck.obtenerUsuario();
    return !NihonCheck.diagnosticoEstaCompletado()
      && !usuario.empezoDesdeCero
      && !usuario.inicioDesdeCero
      && !usuario.areaElegida;
  };

  /** Vista previa japonesa del material (romaji convertido o kana extraído). */
  NihonCheck.obtenerPreviewMaterial = function (texto) {
    var entrada = (texto || '').trim();
    if (!entrada) return '';

    if (window.RomajiConverter) {
      var det = RomajiConverter.detectarTipoTexto(entrada);
      if (det.tieneRomaji && !det.tieneHiragana && !det.tieneKatakana && !det.tieneKanji) {
        return RomajiConverter.convertirRomajiInteligente(entrada);
      }
    }

    var chars = NihonCheck.extraerCaracteresJaponeses(entrada);
    return chars.length ? chars.join(' ') : entrada;
  };

  /** Detecta carpeta destino automáticamente (preview + texto original). */
  NihonCheck.detectarCarpetaDestino = function (texto) {
    var preview = NihonCheck.obtenerPreviewMaterial(texto);
    if (window.RomajiConverter && RomajiConverter.detectarCarpetaDestino) {
      return RomajiConverter.detectarCarpetaDestino(preview, texto);
    }
    var chars = NihonCheck.extraerCaracteresJaponeses(texto);
    if (chars.length > 0) {
      var cat = NihonCheck.clasificarCaracter(chars[0]);
      if (cat) return cat;
    }
    return 'hiragana';
  };

  /** @deprecated Usar detectarCarpetaDestino */
  NihonCheck.detectarCarpetaInteligente = function (texto) {
    return NihonCheck.detectarCarpetaDestino(texto);
  };

  /** Convierte entrada (romaji o japonés) a tarjetas para guardar. */
  NihonCheck.procesarEntradaMaterial = function (texto, carpeta) {
    var entrada = (texto || '').trim();
    if (!entrada) return [];

    var tarjetas = [];
    var ahora = new Date().toISOString();
    var vistosLote = {};

    function agregarTarjeta(t) {
      var clave = t.tipo === 'palabra' && t.lectura
        ? 'palabra:' + t.caracter + '|' + t.lectura
        : t.caracter;
      if (vistosLote[clave]) return;
      vistosLote[clave] = true;
      tarjetas.push(t);
    }

    if (carpeta === 'gramatica') {
      tarjetas.push({
        titulo: entrada.length > 40 ? entrada.slice(0, 40) + '…' : entrada,
        explicacion: entrada,
        ejemplo: '',
        agregado: ahora,
      });
      return tarjetas;
    }

    var tieneJapones = NihonCheck.extraerCaracteresJaponeses(entrada).length > 0;
    var esRomaji = window.RomajiConverter &&
      RomajiConverter.detectarTipoTexto(entrada).esMayormenteRomaji;

    if (tieneJapones && !esRomaji) {
      var unicos = NihonCheck.extraerCaracteresJaponeses(entrada);
      for (var i = 0; i < unicos.length; i++) {
        var ch = unicos[i];
        agregarTarjeta({
          caracter: ch,
          lectura: NihonCheck.obtenerRomajiPorCaracter(ch),
          categoria: NihonCheck.clasificarCaracter(ch) || carpeta,
          tipo: 'caracter',
          agregado: ahora,
          esNuevo: true,
        });
      }
    } else if (window.RomajiConverter) {
      var palabrasOrig = entrada.split(/[\s,、.．!！?？;；:：\n]+/).filter(function (w) {
        return w.trim();
      });

      for (var p = 0; p < palabrasOrig.length; p++) {
        var palabraOrig = palabrasOrig[p].trim();
        if (!/[a-zA-Zāīūēō]/.test(palabraOrig)) continue;

        var destinoKana = RomajiConverter.esPalabraKatakana(palabraOrig) ? 'katakana' : 'hiragana';
        var kana = RomajiConverter.convertirRomajiAKana(palabraOrig, destinoKana);
        if (!kana || !NihonCheck.extraerCaracteresJaponeses(kana).length) continue;

        if (kana.length > 1) {
          agregarTarjeta({
            caracter: kana,
            lectura: palabraOrig.toLowerCase(),
            categoria: 'vocabulario',
            tipo: 'palabra',
            agregado: ahora,
            esNuevo: true,
          });
        }

        var charsKana = NihonCheck.extraerCaracteresJaponeses(kana);
        for (var c = 0; c < charsKana.length; c++) {
          agregarTarjeta({
            caracter: charsKana[c],
            lectura: null,
            categoria: NihonCheck.clasificarCaracter(charsKana[c]) || carpeta,
            tipo: 'caracter',
            agregado: ahora,
            esNuevo: true,
          });
        }
      }
    } else {
      agregarTarjeta({
        caracter: entrada,
        lectura: entrada.toLowerCase(),
        categoria: carpeta,
        tipo: 'caracter',
        agregado: ahora,
        esNuevo: true,
      });
    }

    return tarjetas;
  };

  /** Guarda material; carpeta opcional (auto-detectada si se omite). */
  NihonCheck.agregarMaterial = function (texto, carpeta) {
    if (!carpeta) {
      carpeta = NihonCheck.detectarCarpetaDestino(texto);
    }
    if (CARPETAS_BIBLIOTECA.indexOf(carpeta) < 0) carpeta = 'hiragana';

    var nuevas = NihonCheck.procesarEntradaMaterial(texto, carpeta);
    if (nuevas.length === 0) return 0;

    var bib = NihonCheck.obtenerBibliotecaPersonal();
    var vistos = {};
    for (var i = 0; i < bib[carpeta].length; i++) {
      var existente = bib[carpeta][i];
      var claveExistente = carpeta === 'gramatica'
        ? existente.titulo
        : (existente.tipo === 'palabra' && existente.lectura
          ? 'palabra:' + existente.caracter + '|' + existente.lectura
          : existente.caracter);
      vistos[claveExistente] = true;
    }

    NihonCheck.caracteresNuevosBiblioteca = NihonCheck.caracteresNuevosBiblioteca || [];
    var agregadas = 0;
    for (var j = 0; j < nuevas.length; j++) {
      var tarjeta = nuevas[j];
      var id = carpeta === 'gramatica'
        ? tarjeta.titulo
        : (tarjeta.tipo === 'palabra' && tarjeta.lectura
          ? 'palabra:' + tarjeta.caracter + '|' + tarjeta.lectura
          : tarjeta.caracter);
      if (vistos[id]) continue;
      vistos[id] = true;
      bib[carpeta].push(normalizarItemBiblioteca(
        Object.assign({}, tarjeta, { fuente: 'manual' }),
        carpeta
      ));
      NihonCheck.caracteresNuevosBiblioteca.push(id);
      agregadas++;
    }

    if (agregadas > 0) {
      NihonCheck.guardarBibliotecaPersonal(bib);
    }

    return agregadas;
  };

  /** Alias legacy → biblioteca unificada. */
  NihonCheck.renderizarCarpeta = function (contenedor, carpeta, filtroEstado) {
    NihonCheck.renderizarBiblioteca({
      contenedorGrid: contenedor,
      carpeta: carpeta,
      filtroEstado: filtroEstado || 'todos',
    });
  };

  /** Tarjeta interactiva en vista Aprender (clic → práctica). */
  function htmlFlashcardAprender(p, esDebil) {
    var clases = 'flashcard flashcard--aprender flashcard--' + p.categoria;
    if (esDebil) clases += ' flashcard--debil';

    return (
      '<button type="button" class="' + clases + '" ' +
        'data-aprender-caracter="' + p.caracter + '" ' +
        'data-aprender-lectura="' + p.respuestaCorrecta + '" ' +
        'data-aprender-categoria="' + p.categoria + '" ' +
        'aria-label="Practicar ' + p.caracter + '">' +
        '<div class="flashcard__inner">' +
          '<div class="flashcard__front">' +
            '<span class="flashcard__char">' + p.caracter + '</span>' +
            '<span class="flashcard__meta">Toca para practicar</span>' +
          '</div>' +
          '<div class="flashcard__back">' +
            '<span class="flashcard__romaji">' + p.respuestaCorrecta + '</span>' +
            '<span class="flashcard__meta">romaji</span>' +
          '</div>' +
        '</div>' +
      '</button>'
    );
  }

  /** Aprender: banco filtrado por área; clic abre práctica con auto-guardado en biblioteca. */
  NihonCheck.renderizarAprenderRuta = function (contenedorGrid, area) {
    if (!contenedorGrid) return;

    area = area || 'hiragana';

    if (area === 'gramatica') {
      var contenido = NihonCheck.CONTENIDO_GRAMATICA;
      var htmlGram = '';
      for (var g = 0; g < contenido.length; g++) {
        var t = contenido[g];
        htmlGram +=
          '<article class="gramatica-card gramatica-card--aprender">' +
            '<h3 class="gramatica-card__titulo">' + t.titulo + '</h3>' +
            '<p class="gramatica-card__texto">' + t.explicacion + '</p>' +
            '<p class="gramatica-card__ejemplo">' + t.ejemplo + '</p>' +
            '<button type="button" class="btn-gramatica-aprendido" data-action="gramatica-aprendida" ' +
              'data-gramatica-titulo="' + t.titulo + '" data-gramatica-explicacion="' + t.explicacion + '" ' +
              'data-gramatica-ejemplo="' + t.ejemplo + '">Entendido · Guardar en biblioteca</button>' +
          '</article>';
      }
      contenedorGrid.innerHTML = htmlGram;
      return;
    }

    var debiles = NihonCheck.obtenerPuntosDebiles();
    var mapaDebiles = {};
    for (var d = 0; d < debiles.length; d++) {
      mapaDebiles[debiles[d].caracter] = debiles[d].fallos || 1;
    }

    var preguntas = (NihonCheck.PREGUNTAS[area] || []).slice();
    preguntas.sort(function (a, b) {
      var fa = mapaDebiles[a.caracter] || 0;
      var fb = mapaDebiles[b.caracter] || 0;
      if (fb !== fa) return fb - fa;
      var nivelOrd = { basico: 0, avanzado: 1 };
      return (nivelOrd[a.nivel] || 0) - (nivelOrd[b.nivel] || 0);
    });

    if (preguntas.length === 0) {
      contenedorGrid.innerHTML = '<p class="flashcard-grid__vacio">No hay contenido en esta categoría.</p>';
      return;
    }

    var html = '';
    for (var i = 0; i < preguntas.length; i++) {
      var p = preguntas[i];
      html += htmlFlashcardAprender(p, !!mapaDebiles[p.caracter]);
    }
    contenedorGrid.innerHTML = html;
  };

  /** Marcar ítem de gramática como aprendido (auto-guardado). */
  NihonCheck.marcarGramaticaAprendida = function (titulo, explicacion, ejemplo) {
    return NihonCheck.agregarABibliotecaAutomatica({
      titulo: titulo,
      explicacion: explicacion,
      ejemplo: ejemplo || '',
      carpeta: 'gramatica',
    });
  };

  /** HTML del mapa de calor para resultados de test de nivel. */
  NihonCheck.generarHTMLResultadosRuta = function (historial) {
    var stats = NihonCheck.calcularEstadisticas(historial);
    var mensaje = NihonCheck.generarMensajeResumen(stats);
    var perfil = NihonCheck.construirPerfilDesdeDiagnostico(historial);

    function celda(nombre, pct, nivel) {
      var heat = pct >= 85 ? 'alto' : pct >= 50 ? 'medio' : 'bajo';
      return (
        '<div class="heatmap__celda heatmap__celda--' + heat + '">' +
          '<span class="heatmap__nombre">' + nombre + '</span>' +
          '<span class="heatmap__porcentaje">' + pct + '%</span>' +
          '<span class="mastery-badge mastery-badge--' + (nivel || 'principiante') + '">' +
            NihonCheck.nivelEtiqueta(nivel || 'principiante') +
          '</span>' +
          '<div class="heatmap__barra"><div class="heatmap__relleno" style="width:' + pct + '%"></div></div>' +
        '</div>'
      );
    }

    var pctAreas = perfil && (perfil.porcentajesPorArea || perfil.porcentajes) ? (perfil.porcentajesPorArea || perfil.porcentajes) : {
      hiragana: stats.hiragana.porcentaje || 0,
      katakana: stats.katakana.porcentaje || 0,
      kanji: stats.kanji.porcentaje || 0,
      gramatica: 0,
    };
    var niveles = perfil && (perfil.nivelesArea || perfil.niveles) ? (perfil.nivelesArea || perfil.niveles) : {};

    return (
      '<div class="resultados resultados--ruta">' +
        '<h3 class="resultados__titulo">Tu diagnóstico de nivel</h3>' +
        '<p class="resultados__global">Puntuación global: <strong>' + stats.global.porcentaje + '%</strong></p>' +
        '<div class="heatmap heatmap--4">' +
          celda('Hiragana', pctAreas.hiragana, niveles.hiragana) +
          celda('Katakana', pctAreas.katakana, niveles.katakana) +
          celda('Kanji', pctAreas.kanji, niveles.kanji) +
          celda('Gramática', pctAreas.gramatica, niveles.gramatica) +
        '</div>' +
        '<p class="resultados__mensaje">' + mensaje + '</p>' +
        '<p class="resultados__hint">Tu ruta de estudio se personalizó según lo que ya dominas y lo que te falta.</p>' +
        '<button type="button" class="btn-submit" data-action="ir-dashboard-aprender">Ver mi ruta de estudio</button>' +
      '</div>'
    );
  };

  NihonCheck.contarTarjetasBiblioteca = function () {
    var bib = NihonCheck.obtenerBibliotecaPersonal();
    var total = 0;
    CARPETAS_BIBLIOTECA.forEach(function (c) {
      total += bib[c].length;
    });
    return total;
  };

  /* ============================================================
     4e. SISTEMA DE LECCIONES — Aprender con la web
     ============================================================ */
  var CLAVE_PROGRESO_LECCIONES = 'nihoncheck_progreso_lecciones';
  var AREAS_LECCIONES = ['hiragana', 'katakana', 'kanji', 'gramatica'];
  var ETIQUETAS_AREA_LECCION = {
    hiragana: 'Hiragana',
    katakana: 'Katakana',
    kanji: 'Kanji',
    gramatica: 'Gramática',
  };
  var ICONOS_AREA_LECCION = {
    hiragana: 'あ',
    katakana: 'ア',
    kanji: '漢',
    gramatica: '文',
  };

  var leccionActivaEstado = null;
  var _leccionExamenHandler = null;
  var _leccionPracticaHandler = null;
  var UMBRAL_VELOCIDAD_LECCION_MS = 500;
  var DELAY_ACIERTO_LECCION_MS = 600;
  var DELAY_FALLO_LECCION_MS = 1500;

  function crearProgresoLeccionesVacio() {
    return { hiragana: {}, katakana: {}, kanji: {}, gramatica: {} };
  }

  NihonCheck.obtenerProgresoLecciones = function () {
    try {
      var datos = localStorage.getItem(CLAVE_PROGRESO_LECCIONES);
      if (!datos) return crearProgresoLeccionesVacio();
      var parsed = JSON.parse(datos);
      var base = crearProgresoLeccionesVacio();
      AREAS_LECCIONES.forEach(function (a) {
        if (parsed[a] && typeof parsed[a] === 'object') base[a] = parsed[a];
      });
      return base;
    } catch (e) {
      return crearProgresoLeccionesVacio();
    }
  };

  NihonCheck.guardarProgresoLecciones = function (progreso) {
    try {
      localStorage.setItem(CLAVE_PROGRESO_LECCIONES, JSON.stringify(progreso));
    } catch (e) { /* noop */ }
  };

  NihonCheck.contarLeccionesCompletadas = function (area) {
    var lecciones = typeof obtenerLecciones === 'function' ? obtenerLecciones(area) : [];
    var progreso = NihonCheck.obtenerProgresoLecciones();
    var areaProg = progreso[area] || {};
    var n = 0;
    for (var i = 0; i < lecciones.length; i++) {
      var est = areaProg[lecciones[i].id];
      if (est && est.completada) n++;
    }
    return n;
  };

  NihonCheck.leccionEstaDesbloqueada = function () {
    return true;
  };

  NihonCheck.obtenerEstadoTema = function (area, temaId) {
    var leccion = typeof obtenerLeccion === 'function' ? obtenerLeccion(area, temaId) : null;
    if (leccion && leccion.tema) {
      var perfil = NihonCheck.obtenerPerfil();
      if (perfil && perfil.detalle && perfil.detalle[area] && perfil.detalle[area][leccion.tema]) {
        return perfil.detalle[area][leccion.tema];
      }
    }

    var dominio = NihonCheck.obtenerEstadoDominioTema(temaId);
    if (dominio) return dominio;

    var prog = NihonCheck.obtenerEstadoLeccion(area, temaId);
    if (prog && prog.completada) {
      if (prog.acierto >= 85) return 'dominado';
      if (prog.acierto >= 50) return 'en_progreso';
    }
    return 'por_reforzar';
  };

  NihonCheck.iconoEstadoTema = function (estado) {
    if (window.NihonCheckTemas) return NihonCheckTemas.iconoEstado(estado);
    if (estado === 'dominado') return '✅';
    if (estado === 'en_progreso_lento') return '🟡';
    if (estado === 'en_progreso') return '🟡';
    return '🔴';
  };

  NihonCheck.estadoTemaDesdeLeccion = function (area, leccionId) {
    return NihonCheck.obtenerEstadoTema(area, leccionId);
  };

  NihonCheck.obtenerEstadoLeccion = function (area, leccionId) {
    var progreso = NihonCheck.obtenerProgresoLecciones();
    return (progreso[area] && progreso[area][leccionId]) || null;
  };

  NihonCheck.marcarTemaProgreso = function (area, temaId) {
    var estado = NihonCheck.obtenerEstadoDominioTema(temaId);
    if (estado !== 'dominado') {
      NihonCheck.actualizarEstadoDominioTema(temaId, 'en_progreso');
    }
    var progreso = NihonCheck.obtenerProgresoLecciones();
    if (!progreso[area]) progreso[area] = {};
    if (!progreso[area][temaId]) {
      progreso[area][temaId] = { iniciado: true, fecha: new Date().toISOString() };
      NihonCheck.guardarProgresoLecciones(progreso);
    }
  };

  NihonCheck.marcarLeccionCompletada = function (area, leccionId, acierto) {
    var progreso = NihonCheck.obtenerProgresoLecciones();
    if (!progreso[area]) progreso[area] = {};
    progreso[area][leccionId] = {
      completada: true,
      acierto: acierto,
      fecha: new Date().toISOString(),
    };
    NihonCheck.guardarProgresoLecciones(progreso);

    if (acierto >= 85) {
      NihonCheck.actualizarEstadoDominioTema(leccionId, 'dominado');
    } else if (acierto >= 50) {
      NihonCheck.actualizarEstadoDominioTema(leccionId, 'en_progreso');
    } else {
      NihonCheck.actualizarEstadoDominioTema(leccionId, 'por_reforzar');
    }
  };

  NihonCheck.sincronizarElementosLeccionABiblioteca = function (area, leccion) {
    if (!leccion || !leccion.elementos) return;
    var elementos = leccion.elementos;
    for (var i = 0; i < elementos.length; i++) {
      var el = elementos[i];
      if (area === 'gramatica' || el.tipo === 'gramatica') {
        NihonCheck.agregarABibliotecaAutomatica({
          titulo: el.caracter,
          explicacion: el.explicacion || el.lectura,
          ejemplo: el.ejemplo || '',
          carpeta: 'gramatica',
        });
      } else {
        NihonCheck.agregarABibliotecaAutomatica({
          caracter: el.caracter,
          lectura: el.lectura,
          carpeta: area,
        });
        NihonCheck.registrarAciertoMemoria(el.caracter, area, null);
      }
    }
  };

  NihonCheck.renderizarDashboardAprender = function (contenedor) {
    if (!contenedor) return;

    var perfil = NihonCheck.obtenerPerfil();
    if (!perfil) {
      contenedor.innerHTML =
        '<p class="dashboard-aprender__vacio">Haz el diagnóstico o elige «Saltar examen e iniciar desde 0» para ver tu ruta.</p>';
      return;
    }

    var objetivos = NihonCheck.obtenerProximosObjetivos
      ? NihonCheck.obtenerProximosObjetivos(perfil, null, 6)
      : [];

    function htmlTemaItem(item) {
      if (!item.temaId) return '';
      var icono = NihonCheck.iconoEstadoTema(item.estado);
      var etiqueta = window.NihonCheckTemas
        ? NihonCheckTemas.etiquetaEstado(item.estado)
        : item.estado;
      var claseEstado = item.estado === 'en_progreso_lento' ? ' estado--lento' : '';
      return (
        '<button type="button" class="dashboard-tema dashboard-tema--' + item.estado + '" ' +
          'data-action="iniciar-leccion" data-area="' + item.area + '" data-leccion-id="' + item.temaId + '">' +
          '<span class="dashboard-tema__icon' + claseEstado + '" aria-hidden="true">' + icono + '</span>' +
          '<span class="dashboard-tema__info">' +
            '<span class="dashboard-tema__nombre">' + item.nombre + '</span>' +
            '<span class="dashboard-tema__area">' + (ETIQUETAS_AREA_LECCION[item.area] || item.area) +
              ' · ' + etiqueta + '</span>' +
          '</span>' +
        '</button>'
      );
    }

    var htmlRutaHoy = '';
    if (!objetivos.length) {
      htmlRutaHoy =
        '<p class="dashboard-seccion__vacio">¡No hay temas pendientes en tu ruta! Explora el mapa o repasa en biblioteca.</p>';
    } else {
      htmlRutaHoy = '<div class="dashboard-temas-list dashboard-temas-list--ruta">';
      for (var o = 0; o < objetivos.length; o++) {
        htmlRutaHoy += htmlTemaItem(objetivos[o]);
      }
      htmlRutaHoy += '</div>';
    }

    var htmlMapa = '';
    if (window.NihonCheckTemas) {
      htmlMapa =
        '<section class="dashboard-seccion dashboard-seccion--mapa">' +
          '<h3 class="dashboard-seccion__titulo">Mapa de conocimiento</h3>' +
          '<p class="dashboard-seccion__desc">Cuatro áreas con subtemas — estudia cualquiera sin examen obligatorio.</p>' +
          '<div class="knowledge-map">';
      NihonCheckTemas.AREAS.forEach(function (area) {
        htmlMapa +=
          '<div class="knowledge-map__area">' +
            '<h4 class="knowledge-map__area-titulo">' + (NihonCheckTemas.ETIQUETAS_AREA[area] || area) + '</h4>' +
            '<div class="knowledge-map__temas">';
        (NihonCheckTemas.CLAVES_DETALLE[area] || []).forEach(function (clave) {
          var estMapa = (perfil.detalle && perfil.detalle[area] && perfil.detalle[area][clave]) || 'por_reforzar';
          var temaIdMapa = typeof resolverTemaId === 'function' ? resolverTemaId(area, clave) : null;
          var nombreMapa = NihonCheckTemas.ETIQUETAS_TEMA[clave] || clave;
          var etiquetaMapa = NihonCheckTemas.etiquetaEstado(estMapa);
          htmlMapa +=
            '<button type="button" class="knowledge-map__tema knowledge-map__tema--' + estMapa + '"' +
              (temaIdMapa
                ? ' data-action="iniciar-leccion" data-area="' + area + '" data-leccion-id="' + temaIdMapa + '"'
                : ' disabled') +
              '>' +
              '<span class="knowledge-map__icon" aria-hidden="true">' + NihonCheck.iconoEstadoTema(estMapa) + '</span>' +
              '<span class="knowledge-map__nombre">' + nombreMapa + '</span>' +
              '<span class="knowledge-map__estado">' + etiquetaMapa + '</span>' +
            '</button>';
        });
        htmlMapa += '</div></div>';
      });
      htmlMapa += '</div></section>';
    }

    var pctAreas = perfil.porcentajesPorArea || perfil.porcentajes || {};

    contenedor.innerHTML =
      '<div class="dashboard-aprender">' +
        '<section class="dashboard-seccion dashboard-seccion--ruta-hoy">' +
          '<h3 class="dashboard-seccion__titulo dashboard-seccion__titulo--destacado">Tu ruta para hoy</h3>' +
          '<p class="dashboard-seccion__desc">Temas por reforzar y en progreso — los dominados no aparecen aquí.</p>' +
          htmlRutaHoy +
        '</section>' +
        htmlMapa +
        '<div class="dashboard-areas-nav">' +
          '<p class="dashboard-seccion__desc">Explora todos los temas de cada área o repasa lo dominado en biblioteca.</p>' +
          '<div class="aprender-areas-menu aprender-areas-menu--compact">' +
            AREAS_LECCIONES.map(function (area) {
              var pct = pctAreas[area] != null ? pctAreas[area] : 0;
              var nivel = perfil.niveles && perfil.niveles[area]
                ? NihonCheck.nivelEtiqueta(perfil.niveles[area])
                : '';
              return (
                '<button type="button" class="aprender-area-card aprender-area-card--compact" ' +
                  'data-action="elegir-area-lecciones" data-area="' + area + '">' +
                  '<span class="aprender-area-card__icon" aria-hidden="true">' + ICONOS_AREA_LECCION[area] + '</span>' +
                  '<span class="aprender-area-card__name">' + ETIQUETAS_AREA_LECCION[area] + '</span>' +
                  '<span class="aprender-area-card__progreso">' + pct + '% · ' + nivel + '</span>' +
                '</button>'
              );
            }).join('') +
          '</div>' +
        '</div>' +
      '</div>';
  };

  NihonCheck.renderizarMenuAreasAprender = function (contenedor) {
    NihonCheck.renderizarDashboardAprender(contenedor);
  };

  NihonCheck.renderizarListaLecciones = function (contenedorLista, contenedorBarra, area) {
    if (!contenedorLista) return;
    area = area || 'hiragana';

    var lecciones = typeof obtenerLecciones === 'function' ? obtenerLecciones(area) : [];
    var total = lecciones.length;
    var completadas = NihonCheck.contarLeccionesCompletadas(area);
    var pct = total > 0 ? Math.round((completadas / total) * 100) : 0;

    if (contenedorBarra) {
      contenedorBarra.innerHTML =
        '<div class="lecciones-progreso-bar__label">' +
          '<span>' + completadas + ' de ' + total + ' completadas</span>' +
          '<span>' + pct + '%</span>' +
        '</div>' +
        '<div class="lecciones-progreso-bar__track">' +
          '<div class="lecciones-progreso-bar__fill" style="width:' + pct + '%"></div>' +
        '</div>';
    }

    if (lecciones.length === 0) {
      contenedorLista.innerHTML = '<p class="lecciones-lista__vacio">No hay lecciones en esta área.</p>';
      return;
    }

    var html = '';
    for (var i = 0; i < lecciones.length; i++) {
      var lec = lecciones[i];
      var estadoVisual = NihonCheck.estadoTemaDesdeLeccion(area, lec.id);
      var icono = NihonCheck.iconoEstadoTema(estadoVisual);
      var prog = NihonCheck.obtenerEstadoLeccion(area, lec.id);
      var clases = 'leccion-item leccion-item--' + estadoVisual.replace(/_/g, '-');

      html +=
        '<button type="button" class="' + clases + '" ' +
          'data-action="iniciar-leccion" data-area="' + area + '" data-leccion-id="' + lec.id + '" ' +
          'role="listitem">' +
          '<span class="leccion-item__estado" aria-hidden="true">' + icono + '</span>' +
          '<span class="leccion-item__info">' +
            '<span class="leccion-item__titulo">' + (lec.nombre || lec.titulo) +
              (lec.jlpt ? ' <span class="jlpt-badge">' + lec.jlpt + '</span>' : '') +
            '</span>' +
            '<span class="leccion-item__meta">' +
              (lec.nivel || 'basico') + ' · ' + estadoVisual.replace(/_/g, ' ') +
              (prog && prog.completada && prog.acierto != null ? ' · ' + prog.acierto + '% verificación' : '') +
            '</span>' +
          '</span>' +
        '</button>';
    }
    contenedorLista.innerHTML = html;
  };

  function limpiarHandlerLeccion(contenedor) {
    if (contenedor && _leccionExamenHandler) {
      contenedor.removeEventListener('submit', _leccionExamenHandler);
      _leccionExamenHandler = null;
    }
    if (contenedor && _leccionPracticaHandler) {
      contenedor.removeEventListener('submit', _leccionPracticaHandler);
      _leccionPracticaHandler = null;
    }
  }

  function scrollLeccionAlInicio() {
    window.scrollTo(0, 0);
  }

  function crearEstadoLeccion(area, leccion) {
    return {
      area: area,
      leccion: leccion,
      fase: 'presentacion',
      indicePresentacion: 0,
      indiceExamen: 0,
      respuestasExamen: [],
      tiemposExamen: [],
      tiempoInicioPregunta: null,
      respondiendo: false,
      practicaOk: false,
    };
  }

  function normalizarElementoLeccion(elemento, area) {
    var esKanji = area === 'kanji';
    var esGram = elemento.tipo === 'gramatica';
    var significados = elemento.significados;
    if (!significados && elemento.explicacion) {
      significados = esGram ? [elemento.explicacion] : elemento.explicacion.split(/\s*[\/·]\s*/);
    }
    if (typeof significados === 'string') significados = [significados];
    if (!significados) significados = [];

    var lecturasOn = elemento.lecturasOn ? elemento.lecturasOn.slice() : [];
    var lecturasKun = elemento.lecturasKun ? elemento.lecturasKun.slice() : [];
    var lecturas = elemento.lecturas ? elemento.lecturas.slice() : [];
    if (!lecturas.length && elemento.lectura) {
      lecturas.push({ lectura: elemento.lectura, nota: esGram ? 'expresión' : '' });
    }

    var palabras = elemento.palabras ? elemento.palabras.slice() : [];
    var ejemplosUso = elemento.ejemplosUso ? elemento.ejemplosUso.slice() : [];
    var frases = elemento.frases ? elemento.frases.slice() : [];
    if (!ejemplosUso.length && elemento.ejemplo && !esKanji) {
      ejemplosUso.push({
        japanese: elemento.ejemplo,
        romaji: elemento.lectura || '',
        espanol: elemento.explicacion || '',
      });
    }

    var explicacion = elemento.explicacion || '';
    if (!explicacion && !esGram && !esKanji) {
      explicacion = 'Este carácter se pronuncia «' + (elemento.lectura || '') + '» en romaji.';
    }
    if (!explicacion && esKanji && significados.length) {
      explicacion = 'Kanji con significado: ' + significados.join(', ') + '.';
    }

    var trucoMemoria = elemento.trucoMemoria || '';
    if (!trucoMemoria && esKanji) {
      trucoMemoria = 'Asocia la forma del kanji con su significado y repite las lecturas ON y KUN en una palabra real.';
    } else if (!trucoMemoria && esGram) {
      trucoMemoria = 'Construye una frase corta con este patrón y repítela en voz alta.';
    } else if (!trucoMemoria) {
      trucoMemoria = 'Escríbelo tres veces mientras dices la lectura en voz alta.';
    }

    var practicaPrompt = elemento.practicaPrompt;
    if (!practicaPrompt) {
      if (esKanji && lecturasKun.length) {
        practicaPrompt = 'Escribe en romaji una lectura KUN de este kanji:';
      } else if (esKanji && lecturasOn.length) {
        practicaPrompt = 'Escribe en romaji una lectura ON de este kanji:';
      } else {
        practicaPrompt = 'Escribe en romaji la lectura de «' + elemento.caracter + '»:';
      }
    }

    var practicaRespuestas = elemento.practicaRespuestas || elemento.practicaRespuesta;
    if (!practicaRespuestas) {
      practicaRespuestas = [];
      if (esKanji && lecturasKun.length) practicaRespuestas.push(lecturasKun[0]);
      else if (esKanji && lecturasOn.length) practicaRespuestas.push(lecturasOn[0]);
      else if (elemento.lectura) practicaRespuestas.push(elemento.lectura);
    }
    if (typeof practicaRespuestas === 'string') practicaRespuestas = [practicaRespuestas];

    return {
      caracter: elemento.caracter,
      lectura: elemento.lectura,
      tipo: elemento.tipo,
      significados: significados,
      lecturasOn: lecturasOn,
      lecturasKun: lecturasKun,
      lecturas: lecturas,
      palabras: palabras,
      ejemplosUso: ejemplosUso,
      frases: frases,
      explicacion: explicacion,
      trucoMemoria: trucoMemoria,
      practicaPrompt: practicaPrompt,
      practicaRespuestas: practicaRespuestas,
      esKanji: esKanji,
      esGram: esGram,
    };
  }

  function htmlListaLecturas(lecturas) {
    if (!lecturas.length) return '<p class="leccion-elemento__vacio">—</p>';
    var html = '<ul class="leccion-elemento__lista">';
    for (var i = 0; i < lecturas.length; i++) {
      var l = lecturas[i];
      var texto = typeof l === 'string' ? l : l.lectura;
      var nota = typeof l === 'string' ? '' : (l.nota || '');
      html += '<li><span class="leccion-elemento__lectura-valor">' + texto + '</span>';
      if (nota) html += ' <span class="leccion-elemento__nota">(' + nota + ')</span>';
      html += '</li>';
    }
    html += '</ul>';
    return html;
  }

  function htmlPalabrasKanji(palabras) {
    if (!palabras.length) return '';
    var html = '<div class="leccion-elemento__subseccion">' +
      '<h4 class="leccion-elemento__subtitulo">Palabras reales</h4>' +
      '<ul class="leccion-elemento__palabras">';
    for (var i = 0; i < palabras.length; i++) {
      var p = palabras[i];
      html +=
        '<li class="leccion-elemento__palabra">' +
          '<span class="leccion-elemento__jp">' + p.palabra + '</span> ' +
          '<span class="leccion-elemento__lectura-valor">' + p.lectura + '</span> — ' +
          '<span class="leccion-elemento__significado">' + p.significado + '</span>' +
        '</li>';
    }
    html += '</ul></div>';
    return html;
  }

  function htmlEjemplosFrases(items, titulo) {
    if (!items.length) return '';
    var html = '<div class="leccion-elemento__subseccion">' +
      '<h4 class="leccion-elemento__subtitulo">' + titulo + '</h4>' +
      '<ul class="leccion-elemento__frases">';
    for (var i = 0; i < items.length; i++) {
      var e = items[i];
      html +=
        '<li class="leccion-elemento__frase">' +
          '<p class="leccion-elemento__jp">' + e.japanese + '</p>';
      if (e.romaji) {
        html += '<p class="leccion-elemento__romaji">' + e.romaji + '</p>';
      }
      if (e.espanol) {
        html += '<p class="leccion-elemento__espanol">' + e.espanol + '</p>';
      }
      html += '</li>';
    }
    html += '</ul></div>';
    return html;
  }

  function htmlSeccionLeccion(numero, titulo, contenido, extraClass) {
    return (
      '<section class="leccion-elemento__seccion' + (extraClass ? ' ' + extraClass : '') + '">' +
        '<h3 class="leccion-elemento__seccion-titulo">' +
          '<span class="leccion-elemento__seccion-num">' + numero + '</span> ' + titulo +
        '</h3>' +
        '<div class="leccion-elemento__seccion-cuerpo">' + contenido + '</div>' +
      '</section>'
    );
  }

  function htmlPresentacionElemento(elemento, indice, total, area, practicaOk) {
    var el = normalizarElementoLeccion(elemento, area);
    var esKana = area === 'hiragana' || area === 'katakana';

    var practicaHtml =
      '<p class="leccion-elemento__practica-prompt">' + el.practicaPrompt + '</p>' +
      '<p class="leccion-elemento__practica-caracter">' + el.caracter + '</p>';
    if (practicaOk) {
      practicaHtml +=
        '<p class="leccion-elemento__practica-ok" role="status">✓ Práctica completada</p>';
    } else {
      practicaHtml +=
        '<form class="leccion-elemento__practica-form" id="form-leccion-practica">' +
          '<label class="pregunta__label" for="input-leccion-practica">Respuesta en romaji</label>' +
          '<input class="pregunta__input" id="input-leccion-practica" type="text" ' +
            'autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="ej. ichi, hito…">' +
          '<button class="pregunta__submit" type="submit">Comprobar</button>' +
        '</form>';
    }

    if (esKana) {
      return (
        '<article class="leccion-elemento leccion-elemento--kana">' +
          '<header class="leccion-elemento__cabecera">' +
            '<p class="leccion-elemento__progreso">Elemento ' + (indice + 1) + ' de ' + total + '</p>' +
            '<p class="leccion-elemento__caracter">' + el.caracter + '</p>' +
            (el.lectura
              ? '<p class="leccion-elemento__lectura-principal">' + el.lectura + '</p>'
              : '') +
          '</header>' +
          htmlSeccionLeccion('5', 'Práctica', practicaHtml, 'leccion-elemento__seccion--practica') +
        '</article>'
      );
    }

    var badge = el.esGram
      ? '<span class="leccion-elemento__badge">Gramática</span>'
      : (el.esKanji ? '<span class="leccion-elemento__badge leccion-elemento__badge--kanji">Kanji</span>' : '');

    var explicacionHtml = '<p class="leccion-elemento__texto">' + el.explicacion + '</p>';
    if (el.esKanji && el.significados.length) {
      explicacionHtml +=
        '<p class="leccion-elemento__significados">' +
          '<strong>Significados:</strong> ' + el.significados.join(' · ') +
        '</p>';
    }

    var lecturasHtml = '';
    if (el.esKanji) {
      lecturasHtml +=
        '<div class="leccion-elemento__lecturas-grid">' +
          '<div class="leccion-elemento__lecturas-col">' +
            '<h4 class="leccion-elemento__subtitulo">Lecturas ON</h4>' +
            htmlListaLecturas(el.lecturasOn.length ? el.lecturasOn : ['—']) +
          '</div>' +
          '<div class="leccion-elemento__lecturas-col">' +
            '<h4 class="leccion-elemento__subtitulo">Lecturas KUN</h4>' +
            htmlListaLecturas(el.lecturasKun.length ? el.lecturasKun : ['—']) +
          '</div>' +
        '</div>' +
        htmlPalabrasKanji(el.palabras);
    } else {
      lecturasHtml = htmlListaLecturas(el.lecturas);
    }

    var ejemplosHtml = htmlEjemplosFrases(el.ejemplosUso, 'Ejemplos de uso');
    if (el.esKanji) {
      ejemplosHtml += htmlEjemplosFrases(el.frases, 'Frases');
    } else if (!ejemplosHtml) {
      ejemplosHtml = '<p class="leccion-elemento__vacio">Observa el carácter y su lectura en la sección anterior.</p>';
    }

    var trucoHtml = '<p class="leccion-elemento__truco">' + el.trucoMemoria + '</p>';

    return (
      '<article class="leccion-elemento">' +
        '<header class="leccion-elemento__cabecera">' +
          '<p class="leccion-elemento__progreso">Elemento ' + (indice + 1) + ' de ' + total + '</p>' +
          badge +
          '<p class="leccion-elemento__caracter">' + el.caracter + '</p>' +
          (!el.esKanji && el.lectura
            ? '<p class="leccion-elemento__lectura-principal">' + el.lectura + '</p>'
            : '') +
        '</header>' +
        htmlSeccionLeccion('1', 'Explicación', explicacionHtml, 'leccion-elemento__seccion--explicacion') +
        htmlSeccionLeccion('2', 'Lecturas', lecturasHtml, 'leccion-elemento__seccion--lecturas') +
        htmlSeccionLeccion('3', 'Ejemplos', ejemplosHtml, 'leccion-elemento__seccion--ejemplos') +
        htmlSeccionLeccion('4', 'Truco de memorización', trucoHtml, 'leccion-elemento__seccion--truco') +
        htmlSeccionLeccion('5', 'Práctica', practicaHtml, 'leccion-elemento__seccion--practica') +
      '</article>'
    );
  }

  function comprobarPracticaElemento(respuestaUsuario, practicaRespuestas) {
    for (var i = 0; i < practicaRespuestas.length; i++) {
      if (NihonCheck.comprobarRespuestaRomaji(respuestaUsuario, practicaRespuestas[i])) {
        return true;
      }
    }
    return false;
  }

  function procesarPracticaElemento(contenedor, respuestaUsuario) {
    if (!leccionActivaEstado || leccionActivaEstado.respondiendo) return;
    var estado = leccionActivaEstado;
    if (estado.fase !== 'presentacion' || estado.practicaOk) return;

    var elRaw = estado.leccion.elementos[estado.indicePresentacion];
    var el = normalizarElementoLeccion(elRaw, estado.area);
    var acerto = comprobarPracticaElemento(respuestaUsuario, el.practicaRespuestas);
    var lecturaMostrar = el.practicaRespuestas[0] || el.lectura;

    estado.respondiendo = true;
    mostrarFeedbackLeccion(contenedor, acerto, lecturaMostrar);

    setTimeout(function () {
      var overlays = contenedor.querySelectorAll('.feedback');
      for (var o = 0; o < overlays.length; o++) {
        if (overlays[o].parentNode) overlays[o].parentNode.removeChild(overlays[o]);
      }
      estado.respondiendo = false;

      if (acerto) {
        estado.practicaOk = true;
        NihonCheck.renderizarFaseLeccion(contenedor, { scrollAlInicio: false });
      } else {
        var input = contenedor.querySelector('#input-leccion-practica');
        if (input) input.focus();
      }
    }, acerto ? DELAY_ACIERTO_LECCION_MS : DELAY_FALLO_LECCION_MS);
  }

  function mostrarFeedbackLeccion(contenedor, acerto, lecturaCorrecta) {
    var overlay = document.createElement('div');
    overlay.className = 'feedback feedback--' + (acerto ? 'ok' : 'fail');
    if (acerto) {
      overlay.textContent = '✓ Correcto';
    } else {
      overlay.innerHTML =
        '✗ Incorrecto' +
        '<span class="feedback__correcta">Respuesta correcta: ' + lecturaCorrecta + '</span>';
    }
    contenedor.appendChild(overlay);
  }

  function mostrarAvisoVelocidadLeccion(contenedor) {
    var aviso = document.createElement('div');
    aviso.className = 'velocidad-aviso';
    aviso.setAttribute('role', 'alert');
    aviso.textContent = '¿Demasiado rápido? Asegúrate de no estar usando un traductor';
    contenedor.appendChild(aviso);
    setTimeout(function () {
      if (aviso.parentNode) aviso.parentNode.removeChild(aviso);
    }, 2500);
  }

  function renderizarExamenLeccion(contenedor, estado) {
    var elementos = estado.leccion.elementos;
    var idx = estado.indiceExamen;
    var el = elementos[idx];
    var total = elementos.length;

    contenedor.innerHTML =
      '<div class="leccion-examen">' +
        '<div class="pregunta__progreso">Pregunta ' + (idx + 1) + ' de ' + total +
          '<span class="pregunta__meta">Examen · ' + ETIQUETAS_AREA_LECCION[estado.area] + '</span></div>' +
        '<p class="pregunta__texto">Escribe el romaji de este carácter o expresión:</p>' +
        '<p class="pregunta__caracter">' + el.caracter + '</p>' +
        '<form class="pregunta__form" id="form-leccion-examen">' +
          '<label class="pregunta__label" for="input-leccion-examen">Respuesta en romaji</label>' +
          '<input class="pregunta__input" id="input-leccion-examen" type="text" ' +
            'autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="ej. ka, watashi wa…">' +
          '<button class="pregunta__submit" type="submit">Comprobar</button>' +
        '</form>' +
      '</div>';

    estado.tiempoInicioPregunta = Date.now();
    estado.respondiendo = false;

    scrollLeccionAlInicio();

    setTimeout(function () {
      var input = contenedor.querySelector('#input-leccion-examen');
      if (input) input.focus();
    }, 50);
  }

  function renderizarResultadoLeccion(contenedor, estado) {
    var aciertos = 0;
    var fallos = [];
    var elementos = estado.leccion.elementos;
    var respuestas = estado.respuestasExamen;

    for (var i = 0; i < respuestas.length; i++) {
      if (respuestas[i].acerto) {
        aciertos++;
      } else {
        fallos.push({
          caracter: elementos[i].caracter,
          lectura: elementos[i].lectura,
          respuesta: respuestas[i].respuesta,
        });
      }
    }

    var pct = Math.round((aciertos / elementos.length) * 100);
    var dominado = pct >= 85;

    if (dominado) {
      NihonCheck.marcarLeccionCompletada(estado.area, estado.leccion.id, pct);
      NihonCheck.sincronizarElementosLeccionABiblioteca(estado.area, estado.leccion);

      contenedor.innerHTML =
        '<div class="leccion-resultado leccion-resultado--ok">' +
          '<p class="leccion-resultado__icon" aria-hidden="true">🎉</p>' +
          '<h3 class="leccion-resultado__titulo">¡Tema dominado!</h3>' +
          '<p class="leccion-resultado__puntuacion">' + aciertos + '/' + elementos.length + ' · ' + pct + '%</p>' +
          '<p class="leccion-resultado__mensaje">Los elementos se guardaron en tu biblioteca.</p>' +
          '<button type="button" class="btn-submit" data-action="volver-lista-lecciones" ' +
            'data-area="' + estado.area + '">Volver al dashboard</button>' +
        '</div>';
      return;
    }

    var listaFallos = '';
    for (var f = 0; f < fallos.length; f++) {
      var fo = fallos[f];
      listaFallos +=
        '<li class="leccion-resultado__fallo">' +
          '<strong>' + fo.caracter + '</strong> → ' + fo.lectura +
          (fo.respuesta ? ' <span class="leccion-resultado__tu">(escribiste: ' + fo.respuesta + ')</span>' : '') +
        '</li>';
    }

    contenedor.innerHTML =
      '<div class="leccion-resultado leccion-resultado--fail">' +
        '<h3 class="leccion-resultado__titulo">Sigue practicando</h3>' +
        '<p class="leccion-resultado__puntuacion">' + aciertos + '/' + elementos.length + ' · ' + pct + '%</p>' +
        '<p class="leccion-resultado__mensaje">Necesitas al menos 85% para marcar el tema como dominado.</p>' +
        (fallos.length
          ? '<ul class="leccion-resultado__fallos">' + listaFallos + '</ul>'
          : '') +
        '<div class="leccion-resultado__acciones">' +
          '<button type="button" class="btn-secondary" data-action="repasar-leccion">Repasar lección</button>' +
          '<button type="button" class="btn-submit" data-action="reintentar-examen-leccion">Reintentar verificación</button>' +
        '</div>' +
      '</div>';
  }

  function procesarRespuestaExamen(contenedor, respuestaUsuario) {
    if (!leccionActivaEstado || leccionActivaEstado.respondiendo) return;
    var estado = leccionActivaEstado;
    var elementos = estado.leccion.elementos;
    var el = elementos[estado.indiceExamen];

    estado.respondiendo = true;
    var tiempoMs = estado.tiempoInicioPregunta
      ? Date.now() - estado.tiempoInicioPregunta
      : null;
    estado.tiemposExamen.push(tiempoMs);

    if (tiempoMs !== null && tiempoMs < UMBRAL_VELOCIDAD_LECCION_MS) {
      mostrarAvisoVelocidadLeccion(contenedor);
    }

    var acerto = NihonCheck.comprobarRespuestaRomaji(respuestaUsuario, el.lectura);
    estado.respuestasExamen.push({ acerto: acerto, respuesta: respuestaUsuario.trim() });

    if (estado.leccion && estado.leccion.tema) {
      NihonCheck.recalibrarPerfil({
        area: estado.area,
        tema: estado.leccion.tema,
        acerto: acerto,
        tiempoMs: tiempoMs || 0,
        caracter: el.caracter,
      });
    }

    mostrarFeedbackLeccion(contenedor, acerto, el.lectura);

    setTimeout(function () {
      var overlays = contenedor.querySelectorAll('.feedback');
      for (var o = 0; o < overlays.length; o++) {
        if (overlays[o].parentNode) overlays[o].parentNode.removeChild(overlays[o]);
      }

      if (estado.indiceExamen < elementos.length - 1) {
        estado.indiceExamen++;
        estado.respondiendo = false;
        renderizarExamenLeccion(contenedor, estado);
      } else {
        estado.fase = 'resultado';
        estado.respondiendo = false;
        limpiarHandlerLeccion(contenedor);
        renderizarResultadoLeccion(contenedor, estado);
      }
    }, acerto ? DELAY_ACIERTO_LECCION_MS : DELAY_FALLO_LECCION_MS);
  }

  NihonCheck.renderizarFaseLeccion = function (contenedor, opciones) {
    if (!contenedor || !leccionActivaEstado) return;
    limpiarHandlerLeccion(contenedor);

    opciones = opciones || {};
    var scrollAlInicio = opciones.scrollAlInicio !== false;

    var estado = leccionActivaEstado;
    var elementos = estado.leccion.elementos;

    if (estado.fase === 'presentacion') {
      var idx = estado.indicePresentacion;
      var esUltimo = idx >= elementos.length - 1;
      var puedeAvanzar = estado.practicaOk;
      contenedor.innerHTML =
        htmlPresentacionElemento(elementos[idx], idx, elementos.length, estado.area, estado.practicaOk) +
        '<div class="leccion-acciones leccion-acciones--multi">' +
          '<button type="button" class="btn-submit' + (puedeAvanzar ? '' : ' btn-submit--disabled') + '" ' +
            'data-action="leccion-siguiente"' + (puedeAvanzar ? '' : ' disabled') + '>' +
            (esUltimo ? 'Verificar dominio' : 'Siguiente') +
          '</button>' +
          (!puedeAvanzar
            ? '<p class="leccion-elemento__aviso-avance">Completa la práctica para continuar.</p>'
            : '') +
          (esUltimo
            ? '<button type="button" class="btn-secondary" data-action="leccion-terminar">Terminar estudio</button>'
            : '') +
        '</div>';

      if (!estado.practicaOk) {
        _leccionPracticaHandler = function (e) {
          var form = e.target.closest('#form-leccion-practica');
          if (!form) return;
          e.preventDefault();
          var input = contenedor.querySelector('#input-leccion-practica');
          var resp = input ? input.value : '';
          if (!resp.trim()) { if (input) input.focus(); return; }
          procesarPracticaElemento(contenedor, resp);
        };
        contenedor.addEventListener('submit', _leccionPracticaHandler);
      }
      if (scrollAlInicio) scrollLeccionAlInicio();
      return;
    }

    if (estado.fase === 'examen') {
      renderizarExamenLeccion(contenedor, estado);
      _leccionExamenHandler = function (e) {
        var form = e.target.closest('#form-leccion-examen');
        if (!form) return;
        e.preventDefault();
        var input = contenedor.querySelector('#input-leccion-examen');
        var resp = input ? input.value : '';
        if (!resp.trim()) { if (input) input.focus(); return; }
        procesarRespuestaExamen(contenedor, resp);
        if (input) input.value = '';
      };
      contenedor.addEventListener('submit', _leccionExamenHandler);
      return;
    }

    if (estado.fase === 'resultado') {
      renderizarResultadoLeccion(contenedor, estado);
    }
  };

  NihonCheck.iniciarLeccion = function (contenedor, area, leccionId) {
    if (!contenedor) return false;
    var leccion = typeof obtenerLeccion === 'function' ? obtenerLeccion(area, leccionId) : null;
    if (!leccion) return false;

    NihonCheck.marcarTemaProgreso(area, leccionId);
    leccionActivaEstado = crearEstadoLeccion(area, leccion);
    NihonCheck.renderizarFaseLeccion(contenedor);
    return true;
  };

  NihonCheck.terminarEstudioTema = function (contenedor) {
    if (!contenedor || !leccionActivaEstado) return;
    var estado = leccionActivaEstado;
    NihonCheck.sincronizarElementosLeccionABiblioteca(estado.area, estado.leccion);
    contenedor.innerHTML =
      '<div class="leccion-resultado leccion-resultado--ok">' +
        '<p class="leccion-resultado__icon" aria-hidden="true">📚</p>' +
        '<h3 class="leccion-resultado__titulo">Estudio guardado</h3>' +
        '<p class="leccion-resultado__mensaje">Los elementos se añadieron a tu biblioteca. ' +
          'Puedes verificar dominio cuando quieras.</p>' +
        '<button type="button" class="btn-submit" data-action="volver-lista-lecciones" ' +
          'data-area="' + estado.area + '">Volver al dashboard</button>' +
      '</div>';
    leccionActivaEstado = null;
  };

  NihonCheck.reiniciarLeccion = function (contenedor, fase) {
    if (!contenedor || !leccionActivaEstado) return;
    if (fase === 'presentacion') {
      leccionActivaEstado.fase = 'presentacion';
      leccionActivaEstado.indicePresentacion = 0;
      leccionActivaEstado.practicaOk = false;
    } else if (fase === 'examen') {
      leccionActivaEstado.fase = 'examen';
      leccionActivaEstado.indiceExamen = 0;
      leccionActivaEstado.respuestasExamen = [];
      leccionActivaEstado.tiemposExamen = [];
    }
    NihonCheck.renderizarFaseLeccion(contenedor);
  };

  NihonCheck.obtenerLeccionActiva = function () {
    return leccionActivaEstado;
  };

  NihonCheck.limpiarLeccionActiva = function (contenedor) {
    limpiarHandlerLeccion(contenedor);
    leccionActivaEstado = null;
  };

  /* ============================================================
     5. INTERFAZ DEL TEST (embebida; interfazTest.js puede sobrescribir)
     ============================================================ */

  var ETIQUETAS_CATEGORIA_TEST = {
    hiragana: 'Hiragana',
    katakana: 'Katakana',
    kanji: 'Kanji',
  };

  var _examenEnCurso = false;
  var _respondiendoExamen = false;
  var DELAY_ACIERTO_MS = 600;
  var DELAY_FALLO_MS = 1500;
  var UMBRAL_VELOCIDAD_MS = 500;

  function limpiarExamenTest(contenedor) {
    if (contenedor && contenedor._examenHandler) {
      contenedor.removeEventListener('submit', contenedor._examenHandler);
      contenedor._examenHandler = null;
    }
    _examenEnCurso = false;
    _respondiendoExamen = false;
  }

  function renderizarPreguntaTest(contenedor, pregunta, estado) {
    if (!pregunta) {
      contenedor.innerHTML = '<p class="test-placeholder">No hay más preguntas disponibles.</p>';
      return false;
    }

    var cat = pregunta.categoria;
    var etiquetaCat = ETIQUETAS_CATEGORIA_TEST[cat] || cat;
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

    estado.tiempoInicioPregunta = Date.now();

    setTimeout(function () {
      var input = contenedor.querySelector('#input-respuesta');
      if (input) input.focus();
    }, 50);

    return true;
  }

  function mostrarFeedbackTest(contenedor, acerto, respuestaCorrecta) {
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

  function mostrarAvisoVelocidadTest(contenedor) {
    var aviso = document.createElement('div');
    aviso.className = 'velocidad-aviso';
    aviso.setAttribute('role', 'alert');
    aviso.textContent = '¿Demasiado rápido? Asegúrate de no estar usando un traductor';
    contenedor.appendChild(aviso);

    setTimeout(function () {
      if (aviso.parentNode) aviso.parentNode.removeChild(aviso);
    }, 2500);
  }

  function mostrarResultadosTest(contenedor, historial, btnStart, errores, tiemposRespuesta, opcionesExamen) {
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
      limpiarExamenTest(contenedor);
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
    limpiarExamenTest(contenedor);
    NihonCheck.bancoPersonalizado = null;
    if (btnStart) btnStart.hidden = true;
  }

  NihonCheck.reiniciarVistaTest = function (contenedor, btnStart) {
    limpiarExamenTest(contenedor);
    NihonCheck.bancoPersonalizado = null;
    if (btnStart) {
      btnStart.hidden = false;
      btnStart.disabled = false;
    }
    if (contenedor) {
      contenedor.innerHTML = '<p class="test-placeholder">El test comenzará aquí…</p>';
    }
  };

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

    limpiarExamenTest(contenedor);

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

    if (!renderizarPreguntaTest(contenedor, preguntaActual, estado)) {
      contenedor.innerHTML =
        '<p class="test-placeholder">Error al cargar la primera pregunta.</p>';
      return;
    }

    if (btnStart) btnStart.hidden = true;
    _examenEnCurso = true;
    _respondiendoExamen = false;

    function manejarEnvio(evento) {
      if (_respondiendoExamen) return;

      var form = evento.target.closest('#form-respuesta');
      if (!form || estado.terminado) return;

      evento.preventDefault();

      var input = form.querySelector('#input-respuesta');
      var respuestaUsuario = input ? input.value : '';
      if (!respuestaUsuario.trim()) {
        if (input) input.focus();
        return;
      }

      var tiempoMs = estado.tiempoInicioPregunta
        ? Date.now() - estado.tiempoInicioPregunta
        : 0;
      estado.tiemposRespuesta.push(tiempoMs);

      if (tiempoMs < UMBRAL_VELOCIDAD_MS) {
        mostrarAvisoVelocidadTest(contenedor);
      }

      _respondiendoExamen = true;
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

      mostrarFeedbackTest(contenedor, acerto, preguntaActual.respuestaCorrecta);

      setTimeout(function () {
        _respondiendoExamen = false;
        if (estado.terminado) {
          mostrarResultadosTest(
            contenedor,
            estado.historial,
            btnStart,
            estado.errores,
            estado.tiemposRespuesta,
            NihonCheck._opcionesExamenActual
          );
        } else {
          preguntaActual = resultado.siguientePregunta;
          renderizarPreguntaTest(contenedor, preguntaActual, estado);
        }
      }, acerto ? DELAY_ACIERTO_MS : DELAY_FALLO_MS);
    }

    contenedor._examenHandler = manejarEnvio;
    contenedor.addEventListener('submit', manejarEnvio);
  };

  /* ============================================================
     EXAMEN — wrappers diagnosticos
     ============================================================ */

  /** Inicia examen personalizado desde la vista de carga de contenido. */
  NihonCheck.iniciarExamenDeContenido = function (contenedor, btnStart, uploadFeedback) {
    // Preferir caracteres del Ãºltimo anÃ¡lisis; si no hay, usar estudio pendiente
    var items;
    if (NihonCheck.caracteresUltimoAnalisis.length > 0) {
      items = NihonCheck.caracteresUltimoAnalisis.slice();
    } else {
      var lista = NihonCheck.obtenerEstudioPendiente();
      items = lista.map(function (item) { return item; });
    }

    if (items.length < 3) {
      if (uploadFeedback) {
        uploadFeedback.textContent = 'Se necesitan al menos 3 caracteres para un examen personalizado.';
        uploadFeedback.className = 'upload-feedback';
        uploadFeedback.hidden = false;
      }
      return false;
    }

    var banco = NihonCheck.construirBancoPersonalizado(items);
    banco = NihonCheck.priorizarBancoPorDebiles(banco);
    if (banco.length < 3) {
      if (uploadFeedback) {
        uploadFeedback.textContent = 'Se necesitan al menos 3 caracteres para un examen personalizado.';
        uploadFeedback.className = 'upload-feedback';
        uploadFeedback.hidden = false;
      }
      return false;
    }

    NihonCheck.bancoPersonalizado = banco;
    NihonCheck.iniciarExamen(contenedor, btnStart, { bancoPersonalizado: banco });
    return true;
  };

  /** Examen adaptativo de diagnóstico (primera visita). */
  NihonCheck.iniciarExamenDiagnostico = function (contenedor, btnStart, onCompletado) {
    if (!contenedor) {
      console.error('No se encontró el contenedor del test de nivel.');
      return;
    }

    if (typeof NihonCheck.iniciarExamen !== 'function') {
      contenedor.innerHTML =
        '<p class="test-placeholder">Error: no se cargó el módulo del test. Recarga la página (Ctrl+F5).</p>';
      return;
    }

    NihonCheck.bancoPersonalizado = null;

    try {
      NihonCheck.iniciarExamen(contenedor, btnStart, {
        modoDiagnostico: true,
        esDiagnostico: true,
        onCompletado: onCompletado || function (historial, stats, cont) {
          NihonCheck.marcarDiagnosticoCompletado(null, historial);
          cont.innerHTML = NihonCheck.generarHTMLResultadosRuta(historial);
        },
      });
    } catch (err) {
      console.error('Error al iniciar test de nivel:', err);
      contenedor.innerHTML =
        '<p class="test-placeholder">Error al iniciar el test. Recarga la página (Ctrl+F5).</p>';
    }
  };

  /* ============================================================
     FASE 0 — Preparación: actividad diaria, estadísticas y SRS
     Código nuevo aditivo. No modifica funciones existentes ni
     rompe datos previos en localStorage.
     Consola: NihonCheck.registrarActividadDiaria()
              NihonCheck.obtenerEstadisticasGlobales()
              NihonCheck.migrarBibliotecaParaSRS()
     ============================================================ */

  /** Clave en localStorage para el registro de días con actividad. */
  var CLAVE_ACTIVIDAD_DIARIA = 'nihoncheck_actividad_diaria';

  /**
   * Registra el día actual (YYYY-MM-DD) como día con actividad.
   * Lee el array existente, añade la fecha si aún no está y lo guarda.
   * Idempotente: llamar varias veces el mismo día no duplica la fecha.
   * Devuelve el array de fechas actualizado.
   */
  NihonCheck.registrarActividadDiaria = function () {
    var hoy;
    try {
      // Fecha local en formato YYYY-MM-DD
      var d = new Date();
      var mes = ('0' + (d.getMonth() + 1)).slice(-2);
      var dia = ('0' + d.getDate()).slice(-2);
      hoy = d.getFullYear() + '-' + mes + '-' + dia;
    } catch (e) {
      return [];
    }

    var lista = NihonCheck._leerJSON(CLAVE_ACTIVIDAD_DIARIA, []);
    if (!Array.isArray(lista)) lista = [];

    if (lista.indexOf(hoy) === -1) {
      lista.push(hoy);
      NihonCheck._escribirJSON(CLAVE_ACTIVIDAD_DIARIA, lista);
    }

    return lista;
  };

  /** Lee el array de días con actividad (vacío si no hay nada). */
  NihonCheck.obtenerActividadDiaria = function () {
    var lista = NihonCheck._leerJSON(CLAVE_ACTIVIDAD_DIARIA, []);
    return Array.isArray(lista) ? lista : [];
  };

  /**
   * Recorre la biblioteca personal y cuenta los elementos por estado visual:
   * dominado, progreso, reforzar y neutro. Devuelve un objeto con los
   * contadores y el total. Reutiliza calcularEstadoVisualTarjeta para
   * mantener coherencia con la UI existente.
   */
  NihonCheck.obtenerEstadisticasGlobales = function () {
    var conteos = { dominado: 0, progreso: 0, reforzar: 0, neutro: 0, total: 0 };

    var items = [];
    if (NihonCheck.obtenerItemsBibliotecaUnificados) {
      items = NihonCheck.obtenerItemsBibliotecaUnificados() || [];
    }

    for (var i = 0; i < items.length; i++) {
      var estado = NihonCheck.calcularEstadoVisualTarjeta
        ? NihonCheck.calcularEstadoVisualTarjeta(items[i])
        : 'neutro';
      if (conteos[estado] === undefined) estado = 'neutro';
      conteos[estado] += 1;
      conteos.total += 1;
    }

    return conteos;
  };

  /**
   * Migración suave para Repetición Espaciada (SRS): añade un objeto `srs`
   * con valores por defecto seguros a cada elemento de la biblioteca que
   * todavía no lo tenga. No sobreescribe datos existentes ni elimina campos.
   * Devuelve el número de elementos migrados (a los que se añadió `srs`).
   */
  NihonCheck.migrarBibliotecaParaSRS = function () {
    // Se lee/escribe el JSON crudo (no vía obtenerBibliotecaPersonal) para
    // PRESERVAR todos los campos existentes —incluido un srs ya migrado— y
    // garantizar idempotencia. normalizarItemBiblioteca solo conserva campos
    // de su lista blanca, por lo que pasar por ahí descartaría `srs`.
    var bib = NihonCheck._leerJSON(CLAVE_BIBLIOTECA_PERSONAL, null);
    if (!bib || typeof bib !== 'object') return 0;

    var migrados = 0;
    var carpetas = CARPETAS_BIBLIOTECA;

    for (var c = 0; c < carpetas.length; c++) {
      var items = bib[carpetas[c]];
      if (!Array.isArray(items)) continue;

      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        if (!item || typeof item !== 'object') continue;

        // Solo añadir si no existe: no rompe datos ya migrados
        if (!item.srs) {
          item.srs = {
            nivel: 0,
            proximoRepaso: null,
            ultimoRepaso: null,
            rachaAciertos: 0,
          };
          migrados += 1;
        }
      }
    }

    if (migrados > 0) {
      NihonCheck._escribirJSON(CLAVE_BIBLIOTECA_PERSONAL, bib);
    }

    return migrados;
  };

  window.NihonCheck = NihonCheck;

})();


