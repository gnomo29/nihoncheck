/* ============================================================
   FASE 1 — Motor SRS (Repetición Espaciada)
   ------------------------------------------------------------
   Archivo standalone. Solo depende de que ya existan:
     - NihonCheck._leerJSON(clave, defecto)
     - NihonCheck._escribirJSON(clave, valor)
     - NihonCheck.migrarBibliotecaParaSRS()   (Fase 0)

   NO modifica funciones existentes. Expone su API en:
     NihonCheck.srs = {
       programarRepaso,
       obtenerRepasosPendientesHoy,
       procesarRepasoSRS,
       contarRepasosPendientesHoy,
       inicializarSRS,
     }

   Compatible con el campo `srs` que agregó migrarBibliotecaParaSRS:
     { nivel, proximoRepaso, ultimoRepaso, rachaAciertos }
   (programarRepaso añade además `vecesRepasado` de forma defensiva).
   ============================================================ */

(function () {
  'use strict';

  var NihonCheck = (typeof window !== 'undefined' && window.NihonCheck) || {};

  /* ---------- Constantes ---------- */

  // Intervalos en días según el nivel SRS (índice = nivel).
  var INTERVALOS_SRS = [1, 3, 7, 15, 30];

  // Clave de configuración del SRS (flag de migración + versión).
  var CLAVE_SRS_CONFIG = 'nihoncheck_srs_config';

  // Misma clave y carpetas que usa nihoncheck.js (no exportadas allí).
  var CLAVE_BIBLIOTECA_PERSONAL = 'nihoncheck_biblioteca_personal';
  var CARPETAS_BIBLIOTECA = ['hiragana', 'katakana', 'kanji', 'gramatica'];

  var NIVEL_MAXIMO = INTERVALOS_SRS.length - 1; // 4

  /* ---------- Helpers internos ---------- */

  /** Lee JSON usando el helper de NihonCheck; defensivo si no existe. */
  function leer(clave, defecto) {
    if (NihonCheck._leerJSON) return NihonCheck._leerJSON(clave, defecto);
    try {
      var raw = localStorage.getItem(clave);
      return raw ? JSON.parse(raw) : defecto;
    } catch (e) {
      return defecto;
    }
  }

  /** Escribe JSON usando el helper de NihonCheck; defensivo si no existe. */
  function escribir(clave, valor) {
    if (NihonCheck._escribirJSON) return NihonCheck._escribirJSON(clave, valor);
    try {
      localStorage.setItem(clave, JSON.stringify(valor));
    } catch (e) {
      // localStorage puede fallar en modo privado
    }
  }

  /** Fecha local en formato YYYY-MM-DD (misma convención que Fase 0). */
  function fechaHoy() {
    var d = new Date();
    var mes = ('0' + (d.getMonth() + 1)).slice(-2);
    var dia = ('0' + d.getDate()).slice(-2);
    return d.getFullYear() + '-' + mes + '-' + dia;
  }

  /** Devuelve YYYY-MM-DD sumando `dias` a la fecha de hoy. */
  function fechaEnDias(dias) {
    var d = new Date();
    d.setDate(d.getDate() + (dias || 0));
    var mes = ('0' + (d.getMonth() + 1)).slice(-2);
    var dia = ('0' + d.getDate()).slice(-2);
    return d.getFullYear() + '-' + mes + '-' + dia;
  }

  /** Garantiza que el ítem tenga un objeto srs válido (sin perder datos). */
  function asegurarSrs(item) {
    if (!item || typeof item !== 'object') return null;
    if (!item.srs || typeof item.srs !== 'object') {
      item.srs = {
        nivel: 0,
        proximoRepaso: null,
        ultimoRepaso: null,
        rachaAciertos: 0,
        vecesRepasado: 0,
      };
    } else {
      // Completar campos faltantes sin sobreescribir los existentes.
      if (typeof item.srs.nivel !== 'number') item.srs.nivel = 0;
      if (typeof item.srs.rachaAciertos !== 'number') item.srs.rachaAciertos = 0;
      if (typeof item.srs.vecesRepasado !== 'number') item.srs.vecesRepasado = 0;
      if (item.srs.proximoRepaso === undefined) item.srs.proximoRepaso = null;
      if (item.srs.ultimoRepaso === undefined) item.srs.ultimoRepaso = null;
    }
    return item.srs;
  }

  /**
   * Clave de identificación de un ítem (misma lógica que
   * NihonCheck.claveBibliotecaItem). Se reimplementa local para no
   * depender de su disponibilidad y mantener el archivo standalone.
   */
  function claveItem(item, carpeta) {
    if (!item) return '';
    if (carpeta === 'gramatica') {
      return 'gram:' + (item.titulo || item.caracter || '');
    }
    if (item.tipo === 'palabra' && item.lectura) {
      return 'palabra:' + item.caracter + '|' + item.lectura;
    }
    return item.caracter || '';
  }

  /** Coincidencia flexible por "caracter" (incluye gramática por título). */
  function coincideCaracter(item, caracter) {
    if (!item) return false;
    if (item.caracter && item.caracter === caracter) return true;
    if (item.titulo && item.titulo === caracter) return true;
    return false;
  }

  /* ---------- API pública ---------- */

  /**
   * Actualiza el estado SRS de un ítem según el resultado del repaso.
   * NO persiste nada: solo modifica y devuelve el objeto recibido.
   *
   * @param {Object} item   Ítem de la biblioteca (con o sin .srs)
   * @param {boolean} acerto true = respuesta correcta
   * @returns {Object} el mismo item modificado (o null si inválido)
   */
  function programarRepaso(item, acerto) {
    if (!item || typeof item !== 'object') return item;
    var srs = asegurarSrs(item);
    if (!srs) return item;

    if (acerto) {
      srs.nivel = Math.min(srs.nivel + 1, NIVEL_MAXIMO);
      srs.rachaAciertos = srs.rachaAciertos + 1;
    } else {
      srs.nivel = 0;
      srs.rachaAciertos = 0;
    }

    var dias = INTERVALOS_SRS[srs.nivel];
    srs.proximoRepaso = fechaEnDias(dias);
    srs.ultimoRepaso = new Date().toISOString();
    srs.vecesRepasado = (srs.vecesRepasado || 0) + 1;

    return item;
  }

  /**
   * Devuelve los ítems cuyo repaso está pendiente hoy (o atrasado).
   * Lee la biblioteca cruda directamente (preserva el campo srs) y
   * añade la propiedad `carpeta` a cada ítem devuelto.
   *
   * @returns {Array<Object>} ítems pendientes (puede ser vacío)
   */
  function obtenerRepasosPendientesHoy() {
    var bib = leer(CLAVE_BIBLIOTECA_PERSONAL, null);
    if (!bib || typeof bib !== 'object') return [];

    var hoy = fechaHoy();
    var pendientes = [];

    for (var c = 0; c < CARPETAS_BIBLIOTECA.length; c++) {
      var carpeta = CARPETAS_BIBLIOTECA[c];
      var items = bib[carpeta];
      if (!Array.isArray(items)) continue;

      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        if (!item || typeof item !== 'object') continue;
        if (!item.srs || typeof item.srs !== 'object') continue;

        var prox = item.srs.proximoRepaso;
        if (!prox) continue; // null = aún no programado

        // Comparación lexicográfica válida para YYYY-MM-DD.
        if (prox <= hoy) {
          // Clonado superficial + carpeta, sin mutar el original.
          var copia = Object.assign({}, item, { carpeta: carpeta });
          pendientes.push(copia);
        }
      }
    }

    return pendientes;
  }

  /**
   * Procesa el resultado de un repaso: localiza el ítem por carpeta +
   * caracter, le aplica programarRepaso y persiste la biblioteca.
   *
   * @param {string} carpeta  'hiragana' | 'katakana' | 'kanji' | 'gramatica'
   * @param {string} caracter caracter (o título en gramática)
   * @param {boolean} acerto
   * @returns {Object|null} el ítem actualizado, o null si no se encontró
   */
  function procesarRepasoSRS(carpeta, caracter, acerto) {
    var bib = leer(CLAVE_BIBLIOTECA_PERSONAL, null);
    if (!bib || typeof bib !== 'object') return null;

    var items = bib[carpeta];
    if (!Array.isArray(items)) return null;

    var objetivo = null;
    for (var i = 0; i < items.length; i++) {
      if (coincideCaracter(items[i], caracter)) {
        objetivo = items[i];
        break;
      }
    }
    if (!objetivo) return null;

    programarRepaso(objetivo, acerto);
    escribir(CLAVE_BIBLIOTECA_PERSONAL, bib);

    return objetivo;
  }

  /**
   * Número (entero) de repasos pendientes hoy. Útil para el badge.
   * @returns {number}
   */
  function contarRepasosPendientesHoy() {
    return obtenerRepasosPendientesHoy().length;
  }

  /**
   * Inicializa el SRS una sola vez: migra la biblioteca (Fase 0) y
   * guarda un flag en CLAVE_SRS_CONFIG. Idempotente: la 2ª llamada
   * no hace nada y devuelve false.
   *
   * @returns {boolean} true si ejecutó la migración, false si ya estaba
   */
  function inicializarSRS() {
    var config = leer(CLAVE_SRS_CONFIG, null);
    if (config && config.migrado === true) {
      return false; // ya inicializado
    }

    if (NihonCheck.migrarBibliotecaParaSRS) {
      NihonCheck.migrarBibliotecaParaSRS();
    }

    escribir(CLAVE_SRS_CONFIG, { migrado: true, version: 1 });
    return true;
  }

  /* ---------- Exposición ---------- */

  NihonCheck.srs = {
    INTERVALOS_SRS: INTERVALOS_SRS,
    programarRepaso: programarRepaso,
    obtenerRepasosPendientesHoy: obtenerRepasosPendientesHoy,
    procesarRepasoSRS: procesarRepasoSRS,
    contarRepasosPendientesHoy: contarRepasosPendientesHoy,
    inicializarSRS: inicializarSRS,
  };

  if (typeof window !== 'undefined') {
    window.NihonCheck = NihonCheck;
  }

  // Soporte para pruebas en Node (no afecta al navegador).
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = NihonCheck;
  }
})();
