'use strict';

const fs = require('fs');
const path = require('path');

function padId(prefix, n) {
  return prefix + '-' + String(n).padStart(3, '0');
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildOpciones(correcta, pool) {
  const opts = new Set([correcta]);
  const candidates = shuffle(pool.filter((x) => x !== correcta));
  for (const c of candidates) {
    if (opts.size >= 4) break;
    opts.add(c);
  }
  let i = 0;
  while (opts.size < 4) {
    opts.add(candidates[i % candidates.length] || correcta + String(opts.size));
    i++;
  }
  return shuffle([...opts]);
}

const HIRA_BASIC = [
  ['あ', 'a'], ['い', 'i'], ['う', 'u'], ['え', 'e'], ['お', 'o'],
  ['か', 'ka'], ['き', 'ki'], ['く', 'ku'], ['け', 'ke'], ['こ', 'ko'],
  ['さ', 'sa'], ['し', 'shi'], ['す', 'su'], ['せ', 'se'], ['そ', 'so'],
  ['た', 'ta'], ['ち', 'chi'], ['つ', 'tsu'], ['て', 'te'], ['と', 'to'],
  ['な', 'na'], ['に', 'ni'], ['ぬ', 'nu'], ['ね', 'ne'], ['の', 'no'],
  ['は', 'ha'], ['ひ', 'hi'], ['ふ', 'fu'], ['へ', 'he'], ['ほ', 'ho'],
  ['ま', 'ma'], ['み', 'mi'], ['む', 'mu'], ['め', 'me'], ['も', 'mo'],
  ['や', 'ya'], ['ゆ', 'yu'], ['よ', 'yo'],
  ['ら', 'ra'], ['り', 'ri'], ['る', 'ru'], ['れ', 're'], ['ろ', 'ro'],
  ['わ', 'wa'], ['を', 'wo'],
  ['ん', 'n'],
];

const HIRA_DAKUTEN = [
  ['が', 'ga'], ['ぎ', 'gi'], ['ぐ', 'gu'], ['げ', 'ge'],
  ['ざ', 'za'], ['じ', 'ji'], ['ず', 'zu'], ['ぜ', 'ze'],
  ['だ', 'da'], ['ぢ', 'ji'], ['づ', 'zu'], ['で', 'de'],
  ['ば', 'ba'], ['び', 'bi'], ['ぶ', 'bu'], ['べ', 'be'],
  ['ぱ', 'pa'], ['ぴ', 'pi'], ['ぷ', 'pu'], ['ぺ', 'pe'],
];

const HIRA_COMBO = [
  ['きゃ', 'kya'], ['きゅ', 'kyu'], ['きょ', 'kyo'],
  ['ぎゃ', 'gya'], ['ぎゅ', 'gyu'], ['ぎょ', 'gyo'],
  ['しゃ', 'sha'], ['しゅ', 'shu'], ['しょ', 'sho'],
  ['じゃ', 'ja'], ['じゅ', 'ju'], ['じょ', 'jo'],
  ['ちゃ', 'cha'], ['ちゅ', 'chu'], ['ちょ', 'cho'],
  ['にゃ', 'nya'], ['にゅ', 'nyu'], ['にょ', 'nyo'],
  ['ひゃ', 'hya'], ['ひゅ', 'hyu'], ['ひょ', 'hyo'],
  ['びゃ', 'bya'], ['びゅ', 'byu'], ['びょ', 'byo'],
  ['ぴゃ', 'pya'], ['ぴゅ', 'pyu'], ['ぴょ', 'pyo'],
  ['みゃ', 'mya'], ['みゅ', 'myu'], ['みょ', 'myo'],
  ['りゃ', 'rya'], ['りゅ', 'ryu'], ['りょ', 'ryo'],
];

const KATA_MAP = {
  'あ': 'ア', 'い': 'イ', 'う': 'ウ', 'え': 'エ', 'お': 'オ',
  'か': 'カ', 'き': 'キ', 'く': 'ク', 'け': 'ケ', 'こ': 'コ',
  'さ': 'サ', 'し': 'シ', 'す': 'ス', 'せ': 'セ', 'そ': 'ソ',
  'た': 'タ', 'ち': 'チ', 'つ': 'ツ', 'て': 'テ', 'と': 'ト',
  'な': 'ナ', 'に': 'ニ', 'ぬ': 'ヌ', 'ね': 'ネ', 'の': 'ノ',
  'は': 'ハ', 'ひ': 'ヒ', 'ふ': 'フ', 'へ': 'ヘ', 'ほ': 'ホ',
  'ま': 'マ', 'み': 'ミ', 'む': 'ム', 'め': 'メ', 'も': 'モ',
  'や': 'ヤ', 'ゆ': 'ユ', 'よ': 'ヨ',
  'ら': 'ラ', 'り': 'リ', 'る': 'ル', 'れ': 'レ', 'ろ': 'ロ',
  'わ': 'ワ', 'を': 'ヲ', 'ん': 'ン',
  'が': 'ガ', 'ぎ': 'ギ', 'ぐ': 'グ', 'げ': 'ゲ', 'ご': 'ゴ',
  'ざ': 'ザ', 'じ': 'ジ', 'ず': 'ズ', 'ぜ': 'ゼ', 'ぞ': 'ゾ',
  'だ': 'ダ', 'ぢ': 'ヂ', 'づ': 'ヅ', 'で': 'デ', 'ど': 'ド',
  'ば': 'バ', 'び': 'ビ', 'ぶ': 'ブ', 'べ': 'ベ', 'ぼ': 'ボ',
  'ぱ': 'パ', 'ぴ': 'ピ', 'ぷ': 'プ', 'ぺ': 'ペ', 'ぽ': 'ポ',
  'きゃ': 'キャ', 'きゅ': 'キュ', 'きょ': 'キョ',
  'ぎゃ': 'ギャ', 'ぎゅ': 'ギュ', 'ぎょ': 'ギョ',
  'しゃ': 'シャ', 'しゅ': 'シュ', 'しょ': 'ショ',
  'じゃ': 'ジャ', 'じゅ': 'ジュ', 'じょ': 'ジョ',
  'ちゃ': 'チャ', 'ちゅ': 'チュ', 'ちょ': 'チョ',
  'にゃ': 'ニャ', 'にゅ': 'ニュ', 'にょ': 'ニョ',
  'ひゃ': 'ヒャ', 'ひゅ': 'ヒュ', 'ひょ': 'ヒョ',
  'びゃ': 'ビャ', 'びゅ': 'ビュ', 'びょ': 'ビョ',
  'ぴゃ': 'ピャ', 'ぴゅ': 'ピュ', 'ぴょ': 'ピョ',
  'みゃ': 'ミャ', 'みゅ': 'ミュ', 'みょ': 'ミョ',
  'りゃ': 'リャ', 'りゅ': 'リュ', 'りょ': 'リョ',
};

function toKatakana(hira) {
  if (KATA_MAP[hira]) return KATA_MAP[hira];
  let out = '';
  for (const ch of hira) {
    out += KATA_MAP[ch] || ch;
  }
  return out;
}

const ALL_READINGS = [
  ...HIRA_BASIC, ...HIRA_DAKUTEN, ...HIRA_COMBO,
  ['ご', 'go'], ['ぞ', 'zo'], ['ど', 'do'], ['ぼ', 'bo'], ['ぽ', 'po'],
].map(([, r]) => r);

function makeKanaQuestion(id, categoria, nivel, caracter, reading, pregunta) {
  return {
    id,
    categoria,
    nivel,
    caracter,
    pregunta,
    opciones: buildOpciones(reading, ALL_READINGS),
    respuestaCorrecta: reading,
  };
}

function buildHiragana() {
  const items = [];
  let n = 1;

  for (const [ch, rd] of HIRA_BASIC) {
    items.push(makeKanaQuestion(
      padId('h', n++), 'hiragana', 'basico', ch, rd,
      '¿Qué sonido representa este carácter?'
    ));
  }

  for (const [ch, rd] of HIRA_DAKUTEN) {
    items.push(makeKanaQuestion(
      padId('h', n++), 'hiragana', 'avanzado', ch, rd,
      ch.startsWith('ぱ') || ch.startsWith('ぴ') || ch.startsWith('ぷ') || ch.startsWith('ぺ')
        ? '¿Qué sonido representa este carácter con handakuten (゜)?'
        : '¿Qué sonido representa este carácter con dakuten (゛)?'
    ));
  }

  const combos = HIRA_COMBO.slice(0, 9);
  for (const [ch, rd] of combos) {
    items.push(makeKanaQuestion(
      padId('h', n++), 'hiragana', 'avanzado', ch, rd,
      '¿Qué sonido representa esta combinación?'
    ));
  }

  if (items.length !== 75) {
    throw new Error('Hiragana count must be 75, got ' + items.length);
  }
  return items;
}

function buildKatakana() {
  const items = [];
  let n = 1;

  for (const [ch, rd] of HIRA_BASIC) {
    const kata = toKatakana(ch);
    items.push(makeKanaQuestion(
      padId('k', n++), 'katakana', 'basico', kata, rd,
      '¿Qué sonido representa este carácter?'
    ));
  }

  for (const [ch, rd] of HIRA_DAKUTEN) {
    const kata = toKatakana(ch);
    items.push(makeKanaQuestion(
      padId('k', n++), 'katakana', 'avanzado', kata, rd,
      ch.startsWith('ぱ') || ch.startsWith('ぴ') || ch.startsWith('ぷ') || ch.startsWith('ぺ')
        ? '¿Qué sonido representa este carácter con handakuten (゜)?'
        : '¿Qué sonido representa este carácter con dakuten (゛)?'
    ));
  }

  const combos = HIRA_COMBO.slice(0, 9);
  for (const [ch, rd] of combos) {
    const kata = toKatakana(ch);
    items.push(makeKanaQuestion(
      padId('k', n++), 'katakana', 'avanzado', kata, rd,
      '¿Qué sonido representa esta combinación?'
    ));
  }

  if (items.length !== 75) {
    throw new Error('Katakana count must be 75, got ' + items.length);
  }
  return items;
}

const KANJI_LIST = [
  { kanji: '一', meaning: 'uno', reading: 'ichi', distractors: ['dos', 'diez', 'cien'] },
  { kanji: '二', meaning: 'dos', reading: 'ni', distractors: ['uno', 'tres', 'nueve'] },
  { kanji: '三', meaning: 'tres', reading: 'san', distractors: ['dos', 'cuatro', 'siete'] },
  { kanji: '四', meaning: 'cuatro', reading: 'yon', distractors: ['tres', 'cinco', 'ocho'] },
  { kanji: '五', meaning: 'cinco', reading: 'go', distractors: ['cuatro', 'seis', 'diez'] },
  { kanji: '六', meaning: 'seis', reading: 'roku', distractors: ['cinco', 'siete', 'nueve'] },
  { kanji: '七', meaning: 'siete', reading: 'nana', distractors: ['seis', 'ocho', 'tres'] },
  { kanji: '八', meaning: 'ocho', reading: 'hachi', distractors: ['siete', 'nueve', 'diez'] },
  { kanji: '九', meaning: 'nueve', reading: 'kyuu', distractors: ['ocho', 'diez', 'uno'] },
  { kanji: '十', meaning: 'diez', reading: 'juu', distractors: ['nueve', 'cien', 'mil'] },
  { kanji: '百', meaning: 'cien', reading: 'hyaku', distractors: ['mil', 'diez', 'diez mil'] },
  { kanji: '千', meaning: 'mil', reading: 'sen', distractors: ['cien', 'diez mil', 'año'] },
  { kanji: '円', meaning: 'yen', reading: 'en', distractors: ['dinero', 'círculo', 'banco'] },
  { kanji: '年', meaning: 'año', reading: 'nen', distractors: ['mes', 'día', 'tiempo'] },
  { kanji: '月', meaning: 'mes', reading: 'tsuki', distractors: ['año', 'día', 'luna'] },
  { kanji: '日', meaning: 'día', reading: 'hi', distractors: ['mes', 'año', 'sol'] },
  { kanji: '時', meaning: 'hora', reading: 'toki', distractors: ['minuto', 'día', 'tiempo'] },
  { kanji: '分', meaning: 'minuto', reading: 'fun', distractors: ['hora', 'parte', 'segundo'] },
  { kanji: '人', meaning: 'persona', reading: 'hito', distractors: ['hombre', 'mujer', 'niño'] },
  { kanji: '男', meaning: 'hombre', reading: 'otoko', distractors: ['mujer', 'niño', 'persona'] },
  { kanji: '女', meaning: 'mujer', reading: 'onna', distractors: ['hombre', 'niña', 'madre'] },
  { kanji: '子', meaning: 'niño', reading: 'ko', distractors: ['padre', 'madre', 'amigo'] },
  { kanji: '父', meaning: 'padre', reading: 'chichi', distractors: ['madre', 'hermano', 'hijo'] },
  { kanji: '母', meaning: 'madre', reading: 'haha', distractors: ['padre', 'hermana', 'hija'] },
  { kanji: '友', meaning: 'amigo', reading: 'tomo', distractors: ['familia', 'persona', 'compañero'] },
  { kanji: '先', meaning: 'anterior', reading: 'saki', distractors: ['después', 'antes', 'futuro'] },
  { kanji: '生', meaning: 'vida', reading: 'sei', distractors: ['muerte', 'nacimiento', 'estudio'] },
  { kanji: '学', meaning: 'estudio', reading: 'gaku', distractors: ['escuela', 'libro', 'leer'] },
  { kanji: '校', meaning: 'escuela', reading: 'kou', distractors: ['estudio', 'clase', 'libro'] },
  { kanji: '食', meaning: 'comida', reading: 'shoku', distractors: ['bebida', 'comer', 'cocina'] },
  { kanji: '飲', meaning: 'beber', reading: 'nomu', distractors: ['comer', 'bebida', 'agua'] },
  { kanji: '見', meaning: 'ver', reading: 'mi', distractors: ['oir', 'leer', 'mirar'] },
  { kanji: '聞', meaning: 'oír', reading: 'ki', distractors: ['ver', 'hablar', 'escuchar'] },
  { kanji: '言', meaning: 'decir', reading: 'iu', distractors: ['hablar', 'leer', 'escribir'] },
  { kanji: '読', meaning: 'leer', reading: 'yomu', distractors: ['escribir', 'ver', 'estudiar'] },
  { kanji: '書', meaning: 'escribir', reading: 'kaku', distractors: ['leer', 'dibujar', 'palabra'] },
  { kanji: '話', meaning: 'conversación', reading: 'hanashi', distractors: ['idioma', 'palabra', 'decir'] },
  { kanji: '買', meaning: 'comprar', reading: 'kai', distractors: ['vender', 'dinero', 'tienda'] },
  { kanji: '金', meaning: 'dinero', reading: 'kane', distractors: ['oro', 'plata', 'comprar'] },
  { kanji: '車', meaning: 'coche', reading: 'kuruma', distractors: ['tren', 'bicicleta', 'camión'] },
  { kanji: '電', meaning: 'electricidad', reading: 'den', distractors: ['luz', 'fuego', 'agua'] },
  { kanji: '駅', meaning: 'estación', reading: 'eki', distractors: ['tren', 'parada', 'camino'] },
  { kanji: '道', meaning: 'camino', reading: 'michi', distractors: ['calle', 'puente', 'mapa'] },
  { kanji: '店', meaning: 'tienda', reading: 'mise', distractors: ['casa', 'mercado', 'comprar'] },
  { kanji: '家', meaning: 'casa', reading: 'ie', distractors: ['habitación', 'edificio', 'familia'] },
  { kanji: '国', meaning: 'país', reading: 'kuni', distractors: ['ciudad', 'mundo', 'idioma'] },
  { kanji: '語', meaning: 'idioma', reading: 'go', distractors: ['palabra', 'letra', 'hablar'] },
  { kanji: '本', meaning: 'libro', reading: 'hon', distractors: ['cuaderno', 'papel', 'leer'] },
  { kanji: '水', meaning: 'agua', reading: 'mizu', distractors: ['fuego', 'viento', 'tierra'] },
  { kanji: '火', meaning: 'fuego', reading: 'hi', distractors: ['agua', 'aire', 'luz'] },
];

const ALL_KANJI_READINGS = KANJI_LIST.map((k) => k.reading);
const ALL_KANJI_MEANINGS = KANJI_LIST.map((k) => k.meaning);

function buildKanji() {
  const items = [];
  let n = 1;

  if (KANJI_LIST.length !== 50) {
    throw new Error('Kanji count must be 50, got ' + KANJI_LIST.length);
  }

  for (const k of KANJI_LIST) {
    items.push({
      id: padId('kj', n++),
      categoria: 'kanji',
      nivel: 'avanzado',
      caracter: k.kanji,
      pregunta: '¿Cuál es la lectura de este kanji? (significado: ' + k.meaning + ')',
      opciones: buildOpciones(k.reading, [...ALL_KANJI_READINGS, 'shi', 'chi', 'tsu', 'fu']),
      respuestaCorrecta: k.reading,
    });
  }

  return items;
}

function formatQuestion(q, indent) {
  const lines = [
    `${indent}{`,
    `${indent}  id: '${q.id}',`,
    `${indent}  categoria: '${q.categoria}',`,
    `${indent}  nivel: '${q.nivel}',`,
    `${indent}  caracter: '${q.caracter}',`,
    `${indent}  pregunta: '${q.pregunta}',`,
    `${indent}  opciones: [${q.opciones.map((o) => `'${o.replace(/'/g, "\\'")}'`).join(', ')}],`,
    `${indent}  respuestaCorrecta: '${q.respuestaCorrecta.replace(/'/g, "\\'")}',`,
    `${indent}},`,
  ];
  return lines.join('\n');
}

function generatePreguntasFile(hiragana, katakana, kanji) {
  const h = hiragana.map((q) => formatQuestion(q, '    ')).join('\n');
  const k = katakana.map((q) => formatQuestion(q, '    ')).join('\n');
  const kj = kanji.map((q) => formatQuestion(q, '    ')).join('\n');

  return `/**
 * BANCO DE PREGUNTAS
 * ------------------
 * Cada pregunta es un objeto con estas propiedades:
 *   - id, categoria, nivel, caracter, pregunta, opciones, respuestaCorrecta
 */

const NihonCheck = window.NihonCheck || {};

NihonCheck.PREGUNTAS = {

  hiragana: [
${h}
  ],

  katakana: [
${k}
  ],

  kanji: [
${kj}
  ],
};

NihonCheck.obtenerTodasLasPreguntas = function () {
  return [
    ...NihonCheck.PREGUNTAS.hiragana,
    ...NihonCheck.PREGUNTAS.katakana,
    ...NihonCheck.PREGUNTAS.kanji,
  ];
};

window.NihonCheck = NihonCheck;
`;
}

function generateCompactLine(q) {
  const opts = q.opciones.map((o) => "'" + o.replace(/'/g, "\\'") + "'").join(', ');
  return (
    "{ id: '" + q.id + "', categoria: '" + q.categoria + "', nivel: '" + q.nivel +
    "', caracter: '" + q.caracter + "', pregunta: '" + q.pregunta +
    "', opciones: [" + opts + "], respuestaCorrecta: '" +
    q.respuestaCorrecta.replace(/'/g, "\\'") + "' }"
  );
}

const hiragana = buildHiragana();
const katakana = buildKatakana();
const kanji = buildKanji();

console.log('Counts:', {
  hiragana: hiragana.length,
  katakana: katakana.length,
  kanji: kanji.length,
  total: hiragana.length + katakana.length + kanji.length,
});

const preguntasPath = path.join(__dirname, '..', 'js', 'preguntas.js');
fs.writeFileSync(preguntasPath, generatePreguntasFile(hiragana, katakana, kanji), 'utf8');
console.log('Written:', preguntasPath);

function generateNihoncheckPreguntasBlock(h, k, kj) {
  const lines = [
    '  NihonCheck.PREGUNTAS = {',
    '    hiragana: [',
    ...h.map((q) => '      ' + generateCompactLine(q) + ','),
    '    ],',
    '    katakana: [',
    ...k.map((q) => '      ' + generateCompactLine(q) + ','),
    '    ],',
    '    kanji: [',
    ...kj.map((q) => '      ' + generateCompactLine(q) + ','),
    '    ],',
    '  };',
  ];
  return lines.join('\n');
}

function patchNihoncheck() {
  const nihonPath = path.join(__dirname, '..', 'js', 'nihoncheck.js');
  let src = fs.readFileSync(nihonPath, 'utf8');

  const startMarker = '  NihonCheck.PREGUNTAS = {';
  const endMarker = '  NihonCheck.obtenerTodasLasPreguntas = function () {';
  const start = src.indexOf(startMarker);
  const end = src.indexOf(endMarker);
  if (start === -1 || end === -1) throw new Error('Could not find PREGUNTAS block in nihoncheck.js');

  const preguntasBlock = generateNihoncheckPreguntasBlock(hiragana, katakana, kanji);
  src = src.slice(0, start) + preguntasBlock + '\n\n' + src.slice(end);

  const obtenerOld = "  NihonCheck.obtenerTodasLasPreguntas = function () {\n    return NihonCheck.PREGUNTAS.hiragana.concat(NihonCheck.PREGUNTAS.katakana);\n  };";
  const obtenerNew = "  NihonCheck.obtenerTodasLasPreguntas = function () {\n    return NihonCheck.PREGUNTAS.hiragana\n      .concat(NihonCheck.PREGUNTAS.katakana)\n      .concat(NihonCheck.PREGUNTAS.kanji);\n  };";
  src = src.replace(obtenerOld, obtenerNew);

  const decidirOld = `  NihonCheck.decidirSiguienteNivel = function (acerto, categoria, nivel) {
    if (acerto) {
      if (nivel === 'basico') {
        return { categoria: categoria, nivel: 'avanzado' };
      }
      return {
        categoria: categoria === 'hiragana' ? 'katakana' : 'hiragana',
        nivel: 'basico',
      };
    }
    return { categoria: categoria, nivel: 'basico' };
  };`;

  const decidirNew = `  NihonCheck.decidirSiguienteNivel = function (acerto, categoria, nivel) {
    if (acerto) {
      if (nivel === 'basico') {
        return { categoria: categoria, nivel: 'avanzado' };
      }
      if (categoria === 'hiragana') {
        return { categoria: 'katakana', nivel: 'basico' };
      }
      if (categoria === 'katakana') {
        return { categoria: 'kanji', nivel: 'avanzado' };
      }
      return { categoria: 'hiragana', nivel: 'basico' };
    }
    if (categoria === 'kanji') {
      return { categoria: 'kanji', nivel: 'avanzado' };
    }
    return { categoria: categoria, nivel: 'basico' };
  };`;
  src = src.replace(decidirOld, decidirNew);

  const statsOld = `  NihonCheck.calcularEstadisticas = function (historial) {
    var hiragana = historial.filter(function (r) { return r.categoria === 'hiragana'; });
    var katakana = historial.filter(function (r) { return r.categoria === 'katakana'; });

    function contarAciertos(arr) {
      var n = 0;
      for (var i = 0; i < arr.length; i++) if (arr[i].acerto) n++;
      return n;
    }

    return {
      global: {
        total: historial.length,
        aciertos: contarAciertos(historial),
        porcentaje: calcularPorcentaje(historial),
      },
      hiragana: {
        total: hiragana.length,
        aciertos: contarAciertos(hiragana),
        porcentaje: calcularPorcentaje(hiragana),
      },
      katakana: {
        total: katakana.length,
        aciertos: contarAciertos(katakana),
        porcentaje: calcularPorcentaje(katakana),
      },
    };
  };`;

  const statsNew = `  NihonCheck.calcularEstadisticas = function (historial) {
    var hiragana = historial.filter(function (r) { return r.categoria === 'hiragana'; });
    var katakana = historial.filter(function (r) { return r.categoria === 'katakana'; });
    var kanji = historial.filter(function (r) { return r.categoria === 'kanji'; });

    function contarAciertos(arr) {
      var n = 0;
      for (var i = 0; i < arr.length; i++) if (arr[i].acerto) n++;
      return n;
    }

    return {
      global: {
        total: historial.length,
        aciertos: contarAciertos(historial),
        porcentaje: calcularPorcentaje(historial),
      },
      hiragana: {
        total: hiragana.length,
        aciertos: contarAciertos(hiragana),
        porcentaje: calcularPorcentaje(hiragana),
      },
      katakana: {
        total: katakana.length,
        aciertos: contarAciertos(katakana),
        porcentaje: calcularPorcentaje(katakana),
      },
      kanji: {
        total: kanji.length,
        aciertos: contarAciertos(kanji),
        porcentaje: calcularPorcentaje(kanji),
      },
    };
  };`;
  src = src.replace(statsOld, statsNew);

  const mensajeOld = `  NihonCheck.generarMensajeResumen = function (stats) {
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
    if (partes.length === 0) return 'No hay datos suficientes para el resumen.';
    if (partes.length === 1) return partes[0] + '.';
    return partes[0] + ', pero ' + partes[1] + '.';
  };`;

  const mensajeNew = `  NihonCheck.generarMensajeResumen = function (stats) {
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
  };`;
  src = src.replace(mensajeOld, mensajeNew);

  src = src.replace(
    "'<div class=\"heatmap\">' + celda('Hiragana', stats.hiragana) + celda('Katakana', stats.katakana) + '</div>'",
    "'<div class=\"heatmap\">' + celda('Hiragana', stats.hiragana) + celda('Katakana', stats.katakana) + celda('Kanji', stats.kanji) + '</div>'"
  );

  fs.writeFileSync(nihonPath, src, 'utf8');
  console.log('Patched:', nihonPath);
}

patchNihoncheck();

module.exports = { hiragana, katakana, kanji, generateCompactLine };
