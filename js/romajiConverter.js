/**
 * NIHONCHECK — Conversor inteligente de Romaji a Kana
 * Carga antes de nihoncheck.js (compatible con file://)
 */
(function () {
  'use strict';

  /*
   * Diccionario extensible de sílabas romaji → hiragana.
   * El algoritmo usa coincidencia voraz (greedy longest-match):
   * en cada posición prueba primero 3 letras, luego 2, luego 1.
   * Las entradas más largas deben existir en el mapa (ej. 'kya' antes que 'ky').
   *
   * Para añadir una combinación especial:
   *   RomajiConverter.agregarRegla('tsu', 'つ');
   * o editar ROMAJI_MAP directamente en romajiConverter.js
   */
  var ROMAJI_MAP = {
    // Vocales básicas (gojuon)
    'a': 'あ', 'i': 'い', 'u': 'う', 'e': 'え', 'o': 'お',

    // K
    'ka': 'か', 'ki': 'き', 'ku': 'く', 'ke': 'け', 'ko': 'こ',
    'kya': 'きゃ', 'kyu': 'きゅ', 'kyo': 'きょ',

    // G (dakuten)
    'ga': 'が', 'gi': 'ぎ', 'gu': 'ぐ', 'ge': 'げ', 'go': 'ご',
    'gya': 'ぎゃ', 'gyu': 'ぎゅ', 'gyo': 'ぎょ',

    // S
    'sa': 'さ', 'shi': 'し', 'si': 'し', 'su': 'す', 'se': 'せ', 'so': 'そ',
    'sha': 'しゃ', 'shu': 'しゅ', 'sho': 'しょ',
    'sya': 'しゃ', 'syu': 'しゅ', 'syo': 'しょ',

    // Z (dakuten)
    'za': 'ざ', 'ji': 'じ', 'zi': 'じ', 'zu': 'ず', 'ze': 'ぜ', 'zo': 'ぞ',
    'ja': 'じゃ', 'ju': 'じゅ', 'jo': 'じょ',
    'jya': 'じゃ', 'jyu': 'じゅ', 'jyo': 'じょ',
    'zya': 'じゃ', 'zyu': 'じゅ', 'zyo': 'じょ',

    // T
    'ta': 'た', 'chi': 'ち', 'ti': 'ち', 'tsu': 'つ', 'tu': 'つ', 'te': 'て', 'to': 'と',
    'cha': 'ちゃ', 'chu': 'ちゅ', 'cho': 'ちょ',
    'tya': 'ちゃ', 'tyu': 'ちゅ', 'tyo': 'ちょ',
    'cya': 'ちゃ', 'cyu': 'ちゅ', 'cyo': 'ちょ',

    // D (dakuten)
    'da': 'だ', 'di': 'ぢ', 'du': 'づ', 'de': 'で', 'do': 'ど',
    'dya': 'ぢゃ', 'dyu': 'ぢゅ', 'dyo': 'ぢょ',

    // N
    'na': 'な', 'ni': 'に', 'nu': 'ぬ', 'ne': 'ね', 'no': 'の',
    'nya': 'にゃ', 'nyu': 'にゅ', 'nyo': 'にょ',

    // H
    'ha': 'は', 'hi': 'ひ', 'fu': 'ふ', 'hu': 'ふ', 'he': 'へ', 'ho': 'ほ',
    'hya': 'ひゃ', 'hyu': 'ひゅ', 'hyo': 'ひょ',

    // B (dakuten)
    'ba': 'ば', 'bi': 'び', 'bu': 'ぶ', 'be': 'べ', 'bo': 'ぼ',
    'bya': 'びゃ', 'byu': 'びゅ', 'byo': 'びょ',

    // P (handakuten)
    'pa': 'ぱ', 'pi': 'ぴ', 'pu': 'ぷ', 'pe': 'ぺ', 'po': 'ぽ',
    'pya': 'ぴゃ', 'pyu': 'ぴゅ', 'pyo': 'ぴょ',

    // M
    'ma': 'ま', 'mi': 'み', 'mu': 'む', 'me': 'め', 'mo': 'も',
    'mya': 'みゃ', 'myu': 'みゅ', 'myo': 'みょ',

    // Y
    'ya': 'や', 'yu': 'ゆ', 'yo': 'よ',

    // R
    'ra': 'ら', 'ri': 'り', 'ru': 'る', 're': 'れ', 'ro': 'ろ',
    'rya': 'りゃ', 'ryu': 'りゅ', 'ryo': 'りょ',

    // W
    'wa': 'わ', 'wi': 'うぃ', 'we': 'うぇ', 'wo': 'を',

    // Especiales
    'n': 'ん', 'nn': 'ん', "n'": 'ん',
    'xtu': 'っ', 'xtsu': 'っ', 'ltu': 'っ', 'ltsu': 'っ',

    // Vocales largas (combinaciones frecuentes)
    'aa': 'ああ', 'ii': 'いい', 'uu': 'うう', 'ee': 'ええ', 'oo': 'おお',
    'ou': 'おう', 'ei': 'えい',
    'ā': 'ああ', 'ī': 'いい', 'ū': 'うう', 'ē': 'ええ', 'ō': 'おう',
  };

  var CONSONANTES = 'bcdfghjklmnpqrstvwxyz';
  var VOCALES = 'aiueo';

  /** Normaliza macrones y convierte a minúsculas para el matching. */
  function normalizarRomaji(texto) {
    return (texto || '')
      .replace(/ā/g, 'aa')
      .replace(/ī/g, 'ii')
      .replace(/ū/g, 'uu')
      .replace(/ē/g, 'ee')
      .replace(/ō/g, 'ou')
      .toLowerCase();
  }

  /** Convierte bloque hiragana a katakana (+0x60 en el bloque kana). */
  function hiraganaAKatakana(texto) {
    var resultado = '';
    for (var i = 0; i < texto.length; i++) {
      var codigo = texto.charCodeAt(i);
      if (codigo >= 0x3041 && codigo <= 0x3096) {
        resultado += String.fromCharCode(codigo + 0x60);
      } else {
        resultado += texto[i];
      }
    }
    return resultado;
  }

  /**
   * Detecta el tipo dominante del texto introducido.
   * Devuelve porcentajes y banderas por tipo de escritura.
   */
  function detectarTipoTexto(texto) {
    var conteos = { romaji: 0, hiragana: 0, katakana: 0, kanji: 0, otro: 0 };
    var str = texto || '';

    for (var i = 0; i < str.length; i++) {
      var c = str[i];
      var codigo = c.charCodeAt(0);

      if (codigo >= 0x3040 && codigo <= 0x309F) {
        conteos.hiragana++;
      } else if (codigo >= 0x30A0 && codigo <= 0x30FF) {
        conteos.katakana++;
      } else if ((codigo >= 0x4E00 && codigo <= 0x9FFF) ||
                 (codigo >= 0x3400 && codigo <= 0x4DBF)) {
        conteos.kanji++;
      } else if (/[a-zA-ZāīūēōĀĪŪĒŌ]/.test(c)) {
        conteos.romaji++;
      } else if (!/\s/.test(c)) {
        conteos.otro++;
      }
    }

    var totalSignificativo = conteos.romaji + conteos.hiragana + conteos.katakana + conteos.kanji;
    var porcentajes = {
      romaji: 0,
      hiragana: 0,
      katakana: 0,
      kanji: 0,
      otro: 0,
    };

    if (totalSignificativo > 0) {
      porcentajes.romaji = Math.round((conteos.romaji / totalSignificativo) * 100);
      porcentajes.hiragana = Math.round((conteos.hiragana / totalSignificativo) * 100);
      porcentajes.katakana = Math.round((conteos.katakana / totalSignificativo) * 100);
      porcentajes.kanji = Math.round((conteos.kanji / totalSignificativo) * 100);
    }

    var tiposPresentes = [];
    if (conteos.romaji > 0) tiposPresentes.push('romaji');
    if (conteos.hiragana > 0) tiposPresentes.push('hiragana');
    if (conteos.katakana > 0) tiposPresentes.push('katakana');
    if (conteos.kanji > 0) tiposPresentes.push('kanji');

    var tipo = 'otro';
    var dominante = 'otro';

    if (tiposPresentes.length > 1) {
      tipo = 'mixto';
    } else if (tiposPresentes.length === 1) {
      tipo = tiposPresentes[0];
      dominante = tiposPresentes[0];
    } else if (conteos.romaji > 0) {
      tipo = 'romaji';
      dominante = 'romaji';
    }

    // Si es mixto, el dominante es el de mayor conteo
    if (tipo === 'mixto') {
      dominante = 'romaji';
      var maxVal = conteos.romaji;
      ['hiragana', 'katakana', 'kanji', 'romaji'].forEach(function (t) {
        if (conteos[t] > maxVal) {
          maxVal = conteos[t];
          dominante = t;
        }
      });
    }

    return {
      tipo: tipo,
      dominante: dominante,
      porcentajes: porcentajes,
      conteos: conteos,
      tieneRomaji: conteos.romaji > 0,
      tieneHiragana: conteos.hiragana > 0,
      tieneKatakana: conteos.katakana > 0,
      tieneKanji: conteos.kanji > 0,
      esMayormenteRomaji: totalSignificativo > 0 &&
        conteos.romaji >= conteos.hiragana &&
        conteos.romaji >= conteos.katakana &&
        conteos.romaji >= conteos.kanji &&
        conteos.romaji > 0,
    };
  }

  /**
   * Convierte romaji a kana con algoritmo voraz longest-match (3→2→1).
   * destino: 'hiragana' (defecto) o 'katakana'
   */
  function convertirRomajiAKana(romaji, destino) {
    destino = destino || 'hiragana';
    var original = romaji || '';
    var texto = normalizarRomaji(original);
    var resultado = '';
    var i = 0;

    while (i < texto.length) {
      var ch = texto[i];

      // Puntuación, espacios y dígitos: passthrough (conserva el carácter original)
      if (!/[a-z]/.test(ch)) {
        resultado += original[i] || ch;
        i++;
        continue;
      }

      // Tsu pequeño explícito: xtu, xtsu, ltu, ltsu
      if (texto.substr(i, 4) === 'xtsu') {
        resultado += 'っ';
        i += 4;
        continue;
      }
      if (texto.substr(i, 4) === 'ltsu') {
        resultado += 'っ';
        i += 4;
        continue;
      }
      if (texto.substr(i, 3) === 'xtu' || texto.substr(i, 3) === 'ltu') {
        resultado += 'っ';
        i += 3;
        continue;
      }

      // Doble consonante → っ (ej. tt → っ + t...)
      if (i + 1 < texto.length &&
          texto[i] === texto[i + 1] &&
          CONSONANTES.indexOf(ch) !== -1 &&
          ch !== 'n') {
        resultado += 'っ';
        i++;
        continue;
      }

      // nn → ん
      if (ch === 'n' && texto[i + 1] === 'n') {
        resultado += 'ん';
        i += 2;
        continue;
      }

      // n suelto antes de consonante, apóstrofo o fin de palabra → ん
      if (ch === 'n') {
        var siguiente = texto[i + 1];
        if (!siguiente || siguiente === "'" || siguiente === ' ') {
          resultado += 'ん';
          i += (siguiente === "'") ? 2 : 1;
          continue;
        }
        if (CONSONANTES.indexOf(siguiente) !== -1 && siguiente !== 'y') {
          resultado += 'ん';
          i++;
          continue;
        }
      }

      // Coincidencia voraz: probar 3, 2 y 1 caracteres (longest-match)
      var encontrado = false;
      for (var len = 3; len >= 1; len--) {
        var fragmento = texto.substr(i, len);
        if (ROMAJI_MAP[fragmento]) {
          resultado += ROMAJI_MAP[fragmento];
          i += len;
          encontrado = true;
          break;
        }
      }

      if (!encontrado) {
        // Carácter latino sin regla: conservar tal cual
        resultado += original[i] || ch;
        i++;
      }
    }

    if (destino === 'katakana') {
      return hiraganaAKatakana(resultado);
    }
    return resultado;
  }

  /** Atajo para salida en katakana (préstamos, ALL CAPS, etc.). */
  function convertirRomajiAKatakana(romaji) {
    return convertirRomajiAKana(romaji, 'katakana');
  }

  /**
   * Heurística por palabra: MAYÚSCULAS → katakana, minúsculas → hiragana.
   * Mayúsculas/minúsculas mezcladas: gana la mayoría de letras latinas;
   * en empate, decide la primera letra (mayúscula → katakana).
   */
  function esPalabraKatakana(palabra) {
    var upper = 0;
    var lower = 0;
    var str = palabra || '';

    for (var i = 0; i < str.length; i++) {
      var c = str[i];
      if (/[A-Z]/.test(c)) upper++;
      else if (/[a-z]/.test(c)) lower++;
    }

    if (upper > lower) return true;
    if (lower > upper) return false;

    var primera = str.match(/[a-zA-Z]/);
    if (!primera) return false;
    var ch = primera[0];
    return ch === ch.toUpperCase() && ch !== ch.toLowerCase();
  }

  /** Cuenta kana y kanji significativos (sin espacios ni puntuación). */
  function contarCaracteresJaponeses(texto) {
    var n = 0;
    var str = texto || '';
    for (var i = 0; i < str.length; i++) {
      var codigo = str.charCodeAt(i);
      if ((codigo >= 0x3040 && codigo <= 0x309F) ||
          (codigo >= 0x30A0 && codigo <= 0x30FF) ||
          (codigo >= 0x4E00 && codigo <= 0x9FFF) ||
          (codigo >= 0x3400 && codigo <= 0x4DBF)) {
        n++;
      }
    }
    return n;
  }

  /**
   * Detecta carpeta destino según vista previa convertida y texto original.
   * Prioridad: kanji → solo katakana → solo hiragana → mezcla o >5 chars → hiragana.
   */
  function detectarCarpetaDestino(textoPreview, textoOriginal) {
    var preview = textoPreview || '';
    var original = textoOriginal || '';
    var detPreview = detectarTipoTexto(preview);
    var detOriginal = detectarTipoTexto(original);

    var tieneKanji = detPreview.tieneKanji || detOriginal.tieneKanji;
    var tieneHira = detPreview.tieneHiragana || detOriginal.tieneHiragana;
    var tieneKata = detPreview.tieneKatakana || detOriginal.tieneKatakana;
    var lenSignificativo = contarCaracteresJaponeses(preview) ||
      contarCaracteresJaponeses(original);

    if (tieneKanji) return 'kanji';
    if (tieneKata && !tieneHira && !tieneKanji) return 'katakana';
    if (tieneHira && !tieneKata && !tieneKanji) {
      if (lenSignificativo > 5) return 'gramatica';
      return 'hiragana';
    }

    var esMixto = (tieneHira && tieneKata) ||
      detPreview.tipo === 'mixto' ||
      detOriginal.tipo === 'mixto';
    if (esMixto || lenSignificativo > 5) return 'gramatica';

    return 'hiragana';
  }

  /** Permite ampliar el diccionario en tiempo de ejecución (consola o código del alumno). */
  function agregarRegla(customKey, hiraganaChar) {
    if (!customKey || !hiraganaChar) return false;
    ROMAJI_MAP[normalizarRomaji(customKey)] = hiraganaChar;
    return true;
  }

  /**
   * Convierte palabras romaji separadas por espacios; respeta puntuación entre palabras.
   * Cada palabra elige hiragana o katakana con esPalabraKatakana (mayoría / primera letra).
   */
  function convertirTextoRomaji(texto) {
    return convertirRomajiInteligente(texto);
  }

  /** Conversión romaji → kana con detección independiente por palabra. */
  function convertirRomajiInteligente(texto) {
    var partes = (texto || '').split(/(\s+|[,、.．!！?？;；:：]+)/);
    var salida = '';

    for (var p = 0; p < partes.length; p++) {
      var parte = partes[p];
      if (!parte) continue;

      if (/^\s+$/.test(parte) || /^[,、.．!！?？;；:：]+$/.test(parte)) {
        salida += parte;
        continue;
      }

      if (!/[a-zA-Zāīūēō]/.test(parte)) {
        salida += parte;
        continue;
      }

      var destino = esPalabraKatakana(parte) ? 'katakana' : 'hiragana';
      salida += convertirRomajiAKana(parte, destino);
    }

    return salida;
  }

  window.RomajiConverter = {
    ROMAJI_MAP: ROMAJI_MAP,
    detectarTipoTexto: detectarTipoTexto,
    detectarCarpetaDestino: detectarCarpetaDestino,
    esPalabraKatakana: esPalabraKatakana,
    convertirRomajiAKana: convertirRomajiAKana,
    convertirRomajiAKatakana: convertirRomajiAKatakana,
    convertirTextoRomaji: convertirTextoRomaji,
    convertirRomajiInteligente: convertirRomajiInteligente,
    agregarRegla: agregarRegla,
  };
})();
