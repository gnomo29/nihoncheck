/**
 * NIHONCHECK — Temas de estudio (no secuenciales)
 * Cada tema tiene nivel: basico | intermedio | avanzado
 */
(function () {
  'use strict';

  window.TEMAS = {
    hiragana: [
      {
        id: 'hira-vocales',
        tema: 'vocales',
        nombre: 'Grupo A',
        nivel: 'basico',
        jlpt: 'N5',
        elementos: [
          { caracter: 'あ', lectura: 'a', tipo: 'caracter' },
          { caracter: 'い', lectura: 'i', tipo: 'caracter' },
          { caracter: 'う', lectura: 'u', tipo: 'caracter' },
          { caracter: 'え', lectura: 'e', tipo: 'caracter' },
          { caracter: 'お', lectura: 'o', tipo: 'caracter' },
        ],
      },
      {
        id: 'hira-fila-k',
        tema: 'filaK',
        nombre: 'Grupo KA',
        nivel: 'basico',
        jlpt: 'N5',
        elementos: [
          { caracter: 'か', lectura: 'ka', tipo: 'caracter' },
          { caracter: 'き', lectura: 'ki', tipo: 'caracter' },
          { caracter: 'く', lectura: 'ku', tipo: 'caracter' },
          { caracter: 'け', lectura: 'ke', tipo: 'caracter' },
          { caracter: 'こ', lectura: 'ko', tipo: 'caracter' },
        ],
      },
      {
        id: 'hira-fila-s',
        tema: 'filaS',
        nombre: 'Grupo SA',
        nivel: 'basico',
        jlpt: 'N5',
        elementos: [
          { caracter: 'さ', lectura: 'sa', tipo: 'caracter' },
          { caracter: 'し', lectura: 'shi', tipo: 'caracter' },
          { caracter: 'す', lectura: 'su', tipo: 'caracter' },
          { caracter: 'せ', lectura: 'se', tipo: 'caracter' },
          { caracter: 'そ', lectura: 'so', tipo: 'caracter' },
        ],
      },
      {
        id: 'hira-fila-t',
        tema: 'filaT',
        nombre: 'Grupo TA',
        nivel: 'basico',
        jlpt: 'N5',
        elementos: [
          { caracter: 'た', lectura: 'ta', tipo: 'caracter' },
          { caracter: 'ち', lectura: 'chi', tipo: 'caracter' },
          { caracter: 'つ', lectura: 'tsu', tipo: 'caracter' },
          { caracter: 'て', lectura: 'te', tipo: 'caracter' },
          { caracter: 'と', lectura: 'to', tipo: 'caracter' },
        ],
      },
      {
        id: 'hira-combinaciones',
        tema: 'combinaciones',
        nombre: 'Grupo combinaciones (ゃ・ゅ・ょ)',
        nivel: 'intermedio',
        jlpt: 'N5',
        elementos: [
          { caracter: 'きゃ', lectura: 'kya', tipo: 'caracter' },
          { caracter: 'しゅ', lectura: 'shu', tipo: 'caracter' },
          { caracter: 'ちょ', lectura: 'cho', tipo: 'caracter' },
          { caracter: 'にゅ', lectura: 'nyu', tipo: 'caracter' },
          { caracter: 'りょ', lectura: 'ryo', tipo: 'caracter' },
        ],
      },
      {
        id: 'hira-dakuten',
        tema: 'dakuten',
        nombre: 'Grupo dakuten',
        nivel: 'intermedio',
        jlpt: 'N5',
        elementos: [
          { caracter: 'が', lectura: 'ga', tipo: 'caracter' },
          { caracter: 'ざ', lectura: 'za', tipo: 'caracter' },
          { caracter: 'だ', lectura: 'da', tipo: 'caracter' },
          { caracter: 'ば', lectura: 'ba', tipo: 'caracter' },
          { caracter: 'ぱ', lectura: 'pa', tipo: 'caracter' },
        ],
      },
    ],
    katakana: [
      {
        id: 'kata-vocales',
        tema: 'vocales',
        nombre: 'Grupo A',
        nivel: 'basico',
        jlpt: 'N5',
        elementos: [
          { caracter: 'ア', lectura: 'a', tipo: 'caracter' },
          { caracter: 'イ', lectura: 'i', tipo: 'caracter' },
          { caracter: 'ウ', lectura: 'u', tipo: 'caracter' },
          { caracter: 'エ', lectura: 'e', tipo: 'caracter' },
          { caracter: 'オ', lectura: 'o', tipo: 'caracter' },
        ],
      },
      {
        id: 'kata-fila-k',
        tema: 'filaK',
        nombre: 'Grupo KA',
        nivel: 'basico',
        jlpt: 'N5',
        elementos: [
          { caracter: 'カ', lectura: 'ka', tipo: 'caracter' },
          { caracter: 'キ', lectura: 'ki', tipo: 'caracter' },
          { caracter: 'ク', lectura: 'ku', tipo: 'caracter' },
          { caracter: 'ケ', lectura: 'ke', tipo: 'caracter' },
          { caracter: 'コ', lectura: 'ko', tipo: 'caracter' },
        ],
      },
      {
        id: 'kata-fila-s',
        tema: 'filaS',
        nombre: 'Grupo SA',
        nivel: 'basico',
        jlpt: 'N5',
        elementos: [
          { caracter: 'サ', lectura: 'sa', tipo: 'caracter' },
          { caracter: 'シ', lectura: 'shi', tipo: 'caracter' },
          { caracter: 'ス', lectura: 'su', tipo: 'caracter' },
          { caracter: 'セ', lectura: 'se', tipo: 'caracter' },
          { caracter: 'ソ', lectura: 'so', tipo: 'caracter' },
        ],
      },
      {
        id: 'kata-fila-t',
        tema: 'filaT',
        nombre: 'Grupo TA',
        nivel: 'basico',
        jlpt: 'N5',
        elementos: [
          { caracter: 'タ', lectura: 'ta', tipo: 'caracter' },
          { caracter: 'チ', lectura: 'chi', tipo: 'caracter' },
          { caracter: 'ツ', lectura: 'tsu', tipo: 'caracter' },
          { caracter: 'テ', lectura: 'te', tipo: 'caracter' },
          { caracter: 'ト', lectura: 'to', tipo: 'caracter' },
        ],
      },
      {
        id: 'kata-combinaciones',
        tema: 'combinaciones',
        nombre: 'Grupo combinaciones (ャ・ュ・ョ)',
        nivel: 'intermedio',
        jlpt: 'N5',
        elementos: [
          { caracter: 'キャ', lectura: 'kya', tipo: 'caracter' },
          { caracter: 'シュ', lectura: 'shu', tipo: 'caracter' },
          { caracter: 'チョ', lectura: 'cho', tipo: 'caracter' },
          { caracter: 'ニュ', lectura: 'nyu', tipo: 'caracter' },
          { caracter: 'リョ', lectura: 'ryo', tipo: 'caracter' },
        ],
      },
      {
        id: 'kata-dakuten',
        tema: 'dakuten',
        nombre: 'Grupo dakuten',
        nivel: 'intermedio',
        jlpt: 'N5',
        elementos: [
          { caracter: 'ガ', lectura: 'ga', tipo: 'caracter' },
          { caracter: 'ザ', lectura: 'za', tipo: 'caracter' },
          { caracter: 'ダ', lectura: 'da', tipo: 'caracter' },
          { caracter: 'バ', lectura: 'ba', tipo: 'caracter' },
          { caracter: 'パ', lectura: 'pa', tipo: 'caracter' },
        ],
      },
    ],
    kanji: [
      {
        id: 'kanji-numeros',
        tema: 'numeros',
        nombre: 'Números 一〜五',
        nivel: 'basico',
        jlpt: 'N5',
        elementos: [
          {
            caracter: '一', lectura: 'ichi', tipo: 'caracter',
            significados: ['uno', '1'],
            lecturasOn: ['ichi', 'itsu'],
            lecturasKun: ['hito', 'hitotsu'],
            explicacion: 'Un trazo horizontal: el número uno. En compuestos numéricos suele leerse ON (ichi); al contar objetos, KUN (hitotsu).',
            trucoMemoria: 'Imagina una sola línea horizontal: es «uno».',
            palabras: [
              { palabra: '一人', lectura: 'hitori', significado: 'una persona' },
              { palabra: '一月', lectura: 'ichigatsu', significado: 'enero' },
            ],
            ejemplosUso: [
              { japanese: '一つ', romaji: 'hitotsu', espanol: 'uno (contador general)' },
              { japanese: '第一', romaji: 'daiichi', espanol: 'el primero / número uno' },
            ],
            frases: [
              { japanese: '一つください。', romaji: 'Hitotsu kudasai.', espanol: 'Uno, por favor.' },
            ],
            practicaPrompt: 'Escribe la lectura ON más usada para números:',
            practicaRespuesta: 'ichi',
          },
          {
            caracter: '二', lectura: 'ni', tipo: 'caracter',
            significados: ['dos', '2'],
            lecturasOn: ['ni'],
            lecturasKun: ['futa', 'futatsu'],
            explicacion: 'Dos trazos horizontales. ON «ni» en fechas y compuestos; KUN «futatsu» al contar.',
            trucoMemoria: 'Dos líneas = dos.',
            palabras: [
              { palabra: '二月', lectura: 'nigatsu', significado: 'febrero' },
              { palabra: '二人', lectura: 'futari', significado: 'dos personas' },
            ],
            ejemplosUso: [
              { japanese: '二つ', romaji: 'futatsu', espanol: 'dos (contador)' },
              { japanese: '第二', romaji: 'daini', espanol: 'segundo' },
            ],
            frases: [
              { japanese: '二つあります。', romaji: 'Futatsu arimasu.', espanol: 'Hay dos.' },
            ],
            practicaRespuesta: 'ni',
          },
          {
            caracter: '三', lectura: 'san', tipo: 'caracter',
            significados: ['tres', '3'],
            lecturasOn: ['san'],
            lecturasKun: ['mi', 'mittsu'],
            explicacion: 'Tres trazos horizontales apilados. ON «san» en compuestos; KUN «mittsu» al contar.',
            trucoMemoria: 'Tres líneas apiladas = tres.',
            palabras: [
              { palabra: '三月', lectura: 'sangatsu', significado: 'marzo' },
              { palabra: '三人', lectura: 'sannin', significado: 'tres personas' },
            ],
            ejemplosUso: [
              { japanese: '三つ', romaji: 'mittsu', espanol: 'tres (contador)' },
              { japanese: '三角', romaji: 'sankaku', espanol: 'triángulo' },
            ],
            frases: [
              { japanese: '三時に会いましょう。', romaji: 'San-ji ni aimashou.', espanol: 'Quedemos a las tres.' },
            ],
            practicaRespuesta: 'san',
          },
          {
            caracter: '四', lectura: 'yon', tipo: 'caracter',
            significados: ['cuatro', '4'],
            lecturasOn: ['shi', 'yon'],
            lecturasKun: ['yo', 'yottsu'],
            explicacion: 'Cuidado: la lectura ON «shi» suena como «muerte», por eso a menudo se usa «yon». KUN «yottsu» al contar.',
            trucoMemoria: 'Recuerda «yon» (como «four») para evitar «shi» en situaciones cotidianas.',
            palabras: [
              { palabra: '四月', lectura: 'shigatsu', significado: 'abril (lectura fija)' },
              { palabra: '四時', lectura: 'yo-ji', significado: 'las cuatro en punto' },
            ],
            ejemplosUso: [
              { japanese: '四つ', romaji: 'yottsu', espanol: 'cuatro (contador)' },
              { japanese: '四日', romaji: 'yokka', espanol: 'día 4 del mes' },
            ],
            frases: [
              { japanese: '四つください。', romaji: 'Yottsu kudasai.', espanol: 'Cuatro, por favor.' },
            ],
            practicaPrompt: 'Escribe una lectura ON alternativa a «shi»:',
            practicaRespuesta: 'yon',
          },
          {
            caracter: '五', lectura: 'go', tipo: 'caracter',
            significados: ['cinco', '5'],
            lecturasOn: ['go'],
            lecturasKun: ['itsu', 'itsutsu'],
            explicacion: 'Cinco trazos cruzados. ON «go» en compuestos; KUN «itsutsu» al contar.',
            trucoMemoria: 'Cinco trazos que se cruzan en el centro.',
            palabras: [
              { palabra: '五月', lectura: 'gogatsu', significado: 'mayo' },
              { palabra: '五時', lectura: 'go-ji', significado: 'las cinco en punto' },
            ],
            ejemplosUso: [
              { japanese: '五つ', romaji: 'itsutsu', espanol: 'cinco (contador)' },
              { japanese: '五分', romaji: 'gofun', espanol: 'cinco minutos' },
            ],
            frases: [
              { japanese: '五分待ってください。', romaji: 'Gofun matte kudasai.', espanol: 'Espere cinco minutos, por favor.' },
            ],
            practicaRespuesta: 'go',
          },
        ],
      },
      {
        id: 'kanji-dias',
        tema: 'tiempo',
        nombre: 'Días de la semana',
        nivel: 'intermedio',
        jlpt: 'N5',
        elementos: [
          {
            caracter: '日', lectura: 'nichi', tipo: 'caracter',
            significados: ['día', 'sol'],
            lecturasOn: ['nichi', 'jitsu'],
            lecturasKun: ['hi', 'ka'],
            explicacion: 'Representa el sol. En días de la semana se lee KUN «ka» (日曜日 = domingo). En fechas, ON «nichi» o «ka».',
            trucoMemoria: 'Un rectángulo con una línea: el sol en el cielo.',
            palabras: [
              { palabra: '日本', lectura: 'nihon', significado: 'Japón (sol naciente)' },
              { palabra: '日曜日', lectura: 'nichiyoubi', significado: 'domingo' },
            ],
            ejemplosUso: [
              { japanese: '今日', romaji: 'kyou', espanol: 'hoy' },
              { japanese: '三日', romaji: 'mikka', espanol: 'día 3 del mes' },
            ],
            frases: [
              { japanese: '今日は暑いです。', romaji: 'Kyou wa atsui desu.', espanol: 'Hoy hace calor.' },
            ],
            practicaPrompt: 'Escribe la lectura KUN de «día/sol»:',
            practicaRespuesta: 'hi',
          },
          {
            caracter: '月', lectura: 'getsu', tipo: 'caracter',
            significados: ['mes', 'luna'],
            lecturasOn: ['getsu', 'gatsu'],
            lecturasKun: ['tsuki'],
            explicacion: 'Representa la luna. En meses del calendario: ON «gatsu» (一月 = enero). Solo: KUN «tsuki».',
            trucoMemoria: 'Parece una luna creciente con nubes.',
            palabras: [
              { palabra: '月曜日', lectura: 'getsuyoubi', significado: 'lunes' },
              { palabra: '一月', lectura: 'ichigatsu', significado: 'enero' },
            ],
            ejemplosUso: [
              { japanese: '今月', romaji: 'kongetsu', espanol: 'este mes' },
              { japanese: '来月', romaji: 'raigetsu', espanol: 'el mes que viene' },
            ],
            frases: [
              { japanese: '月がきれいです。', romaji: 'Tsuki ga kirei desu.', espanol: 'La luna es bonita.' },
            ],
            practicaPrompt: 'Escribe la lectura KUN de «luna»:',
            practicaRespuesta: 'tsuki',
          },
          {
            caracter: '火', lectura: 'ka', tipo: 'caracter',
            significados: ['fuego'],
            lecturasOn: ['ka'],
            lecturasKun: ['hi', 'bi'],
            explicacion: 'Martes (火曜日) usa ON «ka». Solo significa «fuego»: KUN «hi».',
            trucoMemoria: 'Parece llamas subiendo — fuego.',
            palabras: [
              { palabra: '火曜日', lectura: 'kayoubi', significado: 'martes' },
              { palabra: '火事', lectura: 'kaji', significado: 'incendio' },
            ],
            ejemplosUso: [
              { japanese: '花火', romaji: 'hanabi', espanol: 'fuegos artificiales' },
              { japanese: '火', romaji: 'hi', espanol: 'fuego' },
            ],
            frases: [
              { japanese: '火曜日に会いましょう。', romaji: 'Kayoubi ni aimashou.', espanol: 'Quedemos el martes.' },
            ],
            practicaPrompt: 'Escribe la lectura ON (martes):',
            practicaRespuesta: 'ka',
          },
          {
            caracter: '水', lectura: 'sui', tipo: 'caracter',
            significados: ['agua'],
            lecturasOn: ['sui'],
            lecturasKun: ['mizu'],
            explicacion: 'Miércoles (水曜日) usa ON «sui». Agua sola: KUN «mizu».',
            trucoMemoria: 'Parece un chorro de agua cayendo.',
            palabras: [
              { palabra: '水曜日', lectura: 'suiyoubi', significado: 'miércoles' },
              { palabra: '水道', lectura: 'suidou', significado: 'agua corriente' },
            ],
            ejemplosUso: [
              { japanese: '水', romaji: 'mizu', espanol: 'agua' },
              { japanese: 'お水', romaji: 'omizu', espanol: 'agua (cortés)' },
            ],
            frases: [
              { japanese: '水をください。', romaji: 'Mizu wo kudasai.', espanol: 'Agua, por favor.' },
            ],
            practicaPrompt: 'Escribe la lectura KUN de «agua»:',
            practicaRespuesta: 'mizu',
          },
          {
            caracter: '木', lectura: 'moku', tipo: 'caracter',
            significados: ['árbol', 'madera'],
            lecturasOn: ['moku', 'boku'],
            lecturasKun: ['ki', 'ko'],
            explicacion: 'Jueves (木曜日) usa ON «moku». Árbol solo: KUN «ki».',
            trucoMemoria: 'Parece un árbol con raíces y ramas.',
            palabras: [
              { palabra: '木曜日', lectura: 'mokuyoubi', significado: 'jueves' },
              { palabra: '木村', lectura: 'kimura', significado: 'apellido «pueblo del árbol»' },
            ],
            ejemplosUso: [
              { japanese: '木', romaji: 'ki', espanol: 'árbol' },
              { japanese: '大木', romaji: 'taiboku', espanol: 'árbol grande' },
            ],
            frases: [
              { japanese: 'あの木は高いです。', romaji: 'Ano ki wa takai desu.', espanol: 'Ese árbol es alto.' },
            ],
            practicaPrompt: 'Escribe la lectura ON (jueves):',
            practicaRespuesta: 'moku',
          },
        ],
      },
      {
        id: 'kanji-n5',
        tema: 'familia',
        nombre: 'Kanji básicos N5',
        nivel: 'intermedio',
        jlpt: 'N5',
        elementos: [
          {
            caracter: '人', lectura: 'hito', tipo: 'caracter',
            significados: ['persona', 'gente'],
            lecturasOn: ['jin', 'nin'],
            lecturasKun: ['hito', 'ri'],
            explicacion: 'Parece una persona caminando. En compuestos: ON «jin/nin» (日本人 = japonés); solo: KUN «hito».',
            trucoMemoria: 'Dos trazos que parecen piernas: una persona de pie.',
            palabras: [
              { palabra: '日本人', lectura: 'nihonjin', significado: 'persona japonesa' },
              { palabra: '一人', lectura: 'hitori', significado: 'una persona' },
            ],
            ejemplosUso: [
              { japanese: '人', romaji: 'hito', espanol: 'persona' },
              { japanese: '三人', romaji: 'sannin', espanol: 'tres personas' },
            ],
            frases: [
              { japanese: 'あの人は先生です。', romaji: 'Ano hito wa sensei desu.', espanol: 'Esa persona es profesor/a.' },
            ],
            practicaPrompt: 'Escribe la lectura KUN de «persona»:',
            practicaRespuesta: 'hito',
          },
          {
            caracter: '水', lectura: 'mizu', tipo: 'caracter',
            significados: ['agua'],
            lecturasOn: ['sui'],
            lecturasKun: ['mizu'],
            explicacion: 'Kanji esencial N5. ON en compuestos (水泳 = natación); KUN «mizu» cuando va solo.',
            trucoMemoria: 'Central en la vida diaria: beber agua = mizu.',
            palabras: [
              { palabra: '水泳', lectura: 'suiei', significado: 'natación' },
              { palabra: '水曜日', lectura: 'suiyoubi', significado: 'miércoles' },
            ],
            ejemplosUso: [
              { japanese: '冷水', romaji: 'reisui', espanol: 'agua fría' },
              { japanese: '水', romaji: 'mizu', espanol: 'agua' },
            ],
            frases: [
              { japanese: '毎日水を飲みます。', romaji: 'Mainichi mizu wo nomimasu.', espanol: 'Bebo agua todos los días.' },
            ],
            practicaRespuesta: 'mizu',
          },
          {
            caracter: '火', lectura: 'hi', tipo: 'caracter',
            significados: ['fuego'],
            lecturasOn: ['ka'],
            lecturasKun: ['hi', 'bi'],
            explicacion: 'KUN «hi» para fuego solo; ON «ka» en compuestos como 火事 (incendio).',
            trucoMemoria: 'Asocia con 花火 (hanabi): fuegos artificiales.',
            palabras: [
              { palabra: '花火', lectura: 'hanabi', significado: 'fuegos artificiales' },
              { palabra: '火事', lectura: 'kaji', significado: 'incendio' },
            ],
            ejemplosUso: [
              { japanese: '火', romaji: 'hi', espanol: 'fuego' },
              { japanese: '火曜日', romaji: 'kayoubi', espanol: 'martes' },
            ],
            frases: [
              { japanese: '火を消してください。', romaji: 'Hi wo keshite kudasai.', espanol: 'Apague el fuego, por favor.' },
            ],
            practicaPrompt: 'Escribe la lectura KUN de «fuego»:',
            practicaRespuesta: 'hi',
          },
          {
            caracter: '木', lectura: 'ki', tipo: 'caracter',
            significados: ['árbol', 'madera'],
            lecturasOn: ['moku', 'boku'],
            lecturasKun: ['ki', 'ko'],
            explicacion: 'KUN «ki» para árbol; ON «moku/boku» en compuestos (木材 = madera).',
            trucoMemoria: 'Ki suena parecido a «key» del árbol que abre la naturaleza.',
            palabras: [
              { palabra: '木材', lectura: 'mokuzai', significado: 'madera (material)' },
              { palabra: '大木', lectura: 'taiboku', significado: 'árbol grande' },
            ],
            ejemplosUso: [
              { japanese: '木', romaji: 'ki', espanol: 'árbol' },
              { japanese: '木曜日', romaji: 'mokuyoubi', espanol: 'jueves' },
            ],
            frases: [
              { japanese: '公園に木がたくさんあります。', romaji: 'Kouen ni ki ga takusan arimasu.', espanol: 'Hay muchos árboles en el parque.' },
            ],
            practicaRespuesta: 'ki',
          },
          {
            caracter: '金', lectura: 'kin', tipo: 'caracter',
            significados: ['oro', 'metal', 'dinero'],
            lecturasOn: ['kin', 'kon'],
            lecturasKun: ['kane', 'gane'],
            explicacion: 'ON «kin» en oro/metal (金曜日 = viernes). KUN «kane» para dinero.',
            trucoMemoria: 'Viernes es 金曜日 — día dorado del fin de semana.',
            palabras: [
              { palabra: '金曜日', lectura: 'kinyoubi', significado: 'viernes' },
              { palabra: 'お金', lectura: 'okane', significado: 'dinero' },
            ],
            ejemplosUso: [
              { japanese: 'お金', romaji: 'okane', espanol: 'dinero' },
              { japanese: '金', romaji: 'kin', espanol: 'oro / metal' },
            ],
            frases: [
              { japanese: 'お金がありません。', romaji: 'Okane ga arimasen.', espanol: 'No tengo dinero.' },
            ],
            practicaPrompt: 'Escribe la lectura KUN de «dinero»:',
            practicaRespuesta: 'kane',
          },
        ],
      },
      {
        id: 'kanji-naturaleza',
        tema: 'naturaleza',
        nombre: 'Naturaleza',
        nivel: 'intermedio',
        jlpt: 'N5',
        elementos: [
          {
            caracter: '山', lectura: 'yama', tipo: 'caracter',
            significados: ['montaña'],
            lecturasOn: ['san', 'zan'],
            lecturasKun: ['yama'],
            explicacion: 'Tres picos: montaña. KUN «yama» solo; ON «san» en nombres (富士山 = monte Fuji).',
            trucoMemoria: 'Tres picos dibujados = montaña.',
            palabras: [
              { palabra: '富士山', lectura: 'fujisan', significado: 'monte Fuji' },
              { palabra: '火山', lectura: 'kazan', significado: 'volcán' },
            ],
            ejemplosUso: [
              { japanese: '山', romaji: 'yama', espanol: 'montaña' },
              { japanese: '山道', romaji: 'yamamichi', espanol: 'sendero de montaña' },
            ],
            frases: [
              { japanese: '山に登りたいです。', romaji: 'Yama ni noboritai desu.', espanol: 'Quiero subir a la montaña.' },
            ],
            practicaRespuesta: 'yama',
          },
          {
            caracter: '川', lectura: 'kawa', tipo: 'caracter',
            significados: ['río'],
            lecturasOn: ['sen'],
            lecturasKun: ['kawa'],
            explicacion: 'Tres líneas curvas: corriente de agua. KUN «kawa»; ON «sen» en compuestos (川口 = desembocadura).',
            trucoMemoria: 'Líneas curvas como agua fluyendo.',
            palabras: [
              { palabra: '小川', lectura: 'ogawa', significado: 'arroyo' },
              { palabra: '川口', lectura: 'kawaguchi', significado: 'desembocadura del río' },
            ],
            ejemplosUso: [
              { japanese: '川', romaji: 'kawa', espanol: 'río' },
              { japanese: '川沿い', romaji: 'kawazoi', espanol: 'a orillas del río' },
            ],
            frases: [
              { japanese: '川で泳ぎます。', romaji: 'Kawa de oyogimasu.', espanol: 'Nado en el río.' },
            ],
            practicaRespuesta: 'kawa',
          },
          {
            caracter: '田', lectura: 'ta', tipo: 'caracter',
            significados: ['campo de arroz', 'campo'],
            lecturasOn: ['den'],
            lecturasKun: ['ta'],
            explicacion: 'Cuadrícula en el campo: arrozal. KUN «ta»; ON «den» en apellidos y compuestos (田中 = Tanaka).',
            trucoMemoria: 'Cuadrados como parcelas de arroz.',
            palabras: [
              { palabra: '田中', lectura: 'tanaka', significado: 'apellido Tanaka' },
              { palabra: '田んぼ', lectura: 'tanbo', significado: 'arrozal' },
            ],
            ejemplosUso: [
              { japanese: '田', romaji: 'ta', espanol: 'campo de arroz' },
              { japanese: '水田', romaji: 'suiden', espanol: 'arrozal inundado' },
            ],
            frases: [
              { japanese: '田植えをします。', romaji: 'Taue wo shimasu.', espanol: 'Transplantamos arroz.' },
            ],
            practicaRespuesta: 'ta',
          },
          {
            caracter: '雨', lectura: 'ame', tipo: 'caracter',
            significados: ['lluvia'],
            lecturasOn: ['u'],
            lecturasKun: ['ame', 'ama'],
            explicacion: 'Gotas bajo un cielo: lluvia. KUN «ame»; ON «u» en compuestos (雨天 = clima lluvioso).',
            trucoMemoria: 'Gotas cayendo del «techo» superior del kanji.',
            palabras: [
              { palabra: '雨天', lectura: 'uten', significado: 'clima lluvioso' },
              { palabra: '大雨', lectura: 'ooame', significado: 'lluvia fuerte' },
            ],
            ejemplosUso: [
              { japanese: '雨', romaji: 'ame', espanol: 'lluvia' },
              { japanese: '雨の日', romaji: 'ame no hi', espanol: 'día lluvioso' },
            ],
            frases: [
              { japanese: '雨が降っています。', romaji: 'Ame ga futte imasu.', espanol: 'Está lloviendo.' },
            ],
            practicaRespuesta: 'ame',
          },
          {
            caracter: '空', lectura: 'sora', tipo: 'caracter',
            significados: ['cielo', 'vacío'],
            lecturasOn: ['kuu'],
            lecturasKun: ['sora', 'a', 'kara'],
            explicacion: 'Cielo: KUN «sora». Vacío/aéreo: ON «kuu» (空港 = aeropuerto). También «kara» en 空っぽ (vacío).',
            trucoMemoria: 'Mira arriba: el cielo (sora) está vacío (kuu).',
            palabras: [
              { palabra: '空港', lectura: 'kuukou', significado: 'aeropuerto' },
              { palabra: '青空', lectura: 'aozora', significado: 'cielo azul' },
            ],
            ejemplosUso: [
              { japanese: '空', romaji: 'sora', espanol: 'cielo' },
              { japanese: '空気', romaji: 'kuuki', espanol: 'aire' },
            ],
            frases: [
              { japanese: '空が青いです。', romaji: 'Sora ga aoi desu.', espanol: 'El cielo es azul.' },
            ],
            practicaRespuesta: 'sora',
          },
        ],
      },
      {
        id: 'kanji-verbos',
        tema: 'verbos',
        nombre: 'Verbos básicos',
        nivel: 'intermedio',
        jlpt: 'N5',
        elementos: [
          {
            caracter: '行', lectura: 'iku', tipo: 'caracter',
            significados: ['ir'],
            lecturasOn: ['kou', 'gyou'],
            lecturasKun: ['i', 'yu', 'okona'],
            explicacion: 'Verbo ir: KUN «iku» (行く). ON «kou» en compuestos (銀行 = banco, «ir» a guardar dinero).',
            trucoMemoria: '行く (iku) = ir — uno de los primeros verbos de movimiento.',
            palabras: [
              { palabra: '銀行', lectura: 'ginkou', significado: 'banco' },
              { palabra: '旅行', lectura: 'ryokou', significado: 'viaje' },
            ],
            ejemplosUso: [
              { japanese: '行く', romaji: 'iku', espanol: 'ir' },
              { japanese: '学校に行く', romaji: 'gakkou ni iku', espanol: 'ir a la escuela' },
            ],
            frases: [
              { japanese: '明日学校に行きます。', romaji: 'Ashita gakkou ni ikimasu.', espanol: 'Mañana voy a la escuela.' },
            ],
            practicaPrompt: 'Escribe la lectura del verbo «ir» en romaji:',
            practicaRespuesta: 'iku',
          },
          {
            caracter: '来', lectura: 'kuru', tipo: 'caracter',
            significados: ['venir'],
            lecturasOn: ['rai'],
            lecturasKun: ['ku', 'kuru', 'kit'],
            explicacion: 'Verbo venir: KUN «kuru» (来る). ON «rai» en compuestos (来年 = el año que viene).',
            trucoMemoria: '来る (kuru) es el par de 行く (iku): venir vs ir.',
            palabras: [
              { palabra: '来年', lectura: 'rainen', significado: 'el año que viene' },
              { palabra: '来月', lectura: 'raigetsu', significado: 'el mes que viene' },
            ],
            ejemplosUso: [
              { japanese: '来る', romaji: 'kuru', espanol: 'venir' },
              { japanese: '来週', romaji: 'raishuu', espanol: 'la semana que viene' },
            ],
            frases: [
              { japanese: '友達が来ます。', romaji: 'Tomodachi ga kimasu.', espanol: 'Viene un amigo/a.' },
            ],
            practicaRespuesta: 'kuru',
          },
          {
            caracter: '食', lectura: 'taberu', tipo: 'caracter',
            significados: ['comer', 'comida'],
            lecturasOn: ['shoku'],
            lecturasKun: ['ta', 'k', 'ha'],
            explicacion: 'Verbo comer: KUN «taberu» (食べる). ON «shoku» en comida (食事 = comida/comida).',
            trucoMemoria: '食べる (taberu): el kanji combina «comida» y «bueno».',
            palabras: [
              { palabra: '食事', lectura: 'shokuji', significado: 'comida / comer' },
              { palabra: '食堂', lectura: 'shokudou', significado: 'comedor / cafetería' },
            ],
            ejemplosUso: [
              { japanese: '食べる', romaji: 'taberu', espanol: 'comer' },
              { japanese: '朝食', romaji: 'choushoku', espanol: 'desayuno' },
            ],
            frases: [
              { japanese: '寿司を食べます。', romaji: 'Sushi wo tabemasu.', espanol: 'Como sushi.' },
            ],
            practicaPrompt: 'Escribe la raíz del verbo «comer» en romaji:',
            practicaRespuesta: 'taberu',
          },
          {
            caracter: '見', lectura: 'miru', tipo: 'caracter',
            significados: ['ver', 'mirar'],
            lecturasOn: ['ken'],
            lecturasKun: ['mi'],
            explicacion: 'Verbo mirar: KUN «miru» (見る). ON «ken» en compuestos (見学 = visita de estudio).',
            trucoMemoria: 'Ojo sobre piernas: mirar.',
            palabras: [
              { palabra: '見学', lectura: 'kengaku', significado: 'visita de estudio' },
              { palabra: '花見', lectura: 'hanami', significado: 'contemplar flores de cerezo' },
            ],
            ejemplosUso: [
              { japanese: '見る', romaji: 'miru', espanol: 'mirar / ver' },
              { japanese: '映画を見る', romaji: 'eiga wo miru', espanol: 'ver una película' },
            ],
            frases: [
              { japanese: 'テレビを見ます。', romaji: 'Terebi wo mimasu.', espanol: 'Veo la televisión.' },
            ],
            practicaRespuesta: 'miru',
          },
          {
            caracter: '言', lectura: 'iu', tipo: 'caracter',
            significados: ['decir', 'palabra'],
            lecturasOn: ['gen', 'gon'],
            lecturasKun: ['i', 'koto'],
            explicacion: 'Decir: KUN «iu» (言う). ON «gen/gon» en palabra/lenguaje (日本語 = japonés).',
            trucoMemoria: 'Boca 口 bajo sonidos — decir algo.',
            palabras: [
              { palabra: '日本語', lectura: 'nihongo', significado: 'idioma japonés' },
              { palabra: '言葉', lectura: 'kotoba', significado: 'palabra / idioma' },
            ],
            ejemplosUso: [
              { japanese: '言う', romaji: 'iu', espanol: 'decir' },
              { japanese: '何と言いますか', romaji: 'nan to iimasu ka', espanol: '¿Qué se dice?' },
            ],
            frases: [
              { japanese: '日本語で言ってください。', romaji: 'Nihongo de itte kudasai.', espanol: 'Dígalo en japonés, por favor.' },
            ],
            practicaRespuesta: 'iu',
          },
        ],
      },
    ],
    gramatica: [
      {
        id: 'gram-particles-wa',
        tema: 'particulas',
        nombre: 'Partícula は (wa)',
        nivel: 'basico',
        jlpt: 'N5',
        elementos: [
          { caracter: 'は', lectura: 'wa', tipo: 'gramatica', explicacion: 'Marcador de tema' },
          { caracter: 'わたしは', lectura: 'watashi wa', tipo: 'gramatica', explicacion: 'Yo (como tema)', ejemplo: 'わたしは学生です' },
          { caracter: 'これは', lectura: 'kore wa', tipo: 'gramatica', explicacion: 'Esto es…', ejemplo: 'これは本です' },
          { caracter: 'あれは', lectura: 'are wa', tipo: 'gramatica', explicacion: 'Aquello es…', ejemplo: 'あれは車です' },
          { caracter: '〜は〜です', lectura: 'wa desu', tipo: 'gramatica', explicacion: 'Patrón: [tema] wa [predicado] desu' },
        ],
      },
      {
        id: 'gram-desu',
        tema: 'verbos',
        nombre: 'Verbo です (desu)',
        nivel: 'basico',
        jlpt: 'N5',
        elementos: [
          { caracter: 'です', lectura: 'desu', tipo: 'gramatica', explicacion: 'Copula formal: «es / soy»' },
          { caracter: '学生です', lectura: 'gakusei desu', tipo: 'gramatica', explicacion: 'Soy estudiante', ejemplo: 'わたしは学生です' },
          { caracter: '本です', lectura: 'hon desu', tipo: 'gramatica', explicacion: 'Es un libro', ejemplo: 'これは本です' },
          { caracter: '日本人です', lectura: 'nihonjin desu', tipo: 'gramatica', explicacion: 'Soy japonés/a' },
          { caracter: '〜ですか', lectura: 'desu ka', tipo: 'gramatica', explicacion: 'Pregunta formal con か', ejemplo: '学生ですか？' },
        ],
      },
      {
        id: 'gram-negacion',
        tema: 'negacion',
        nombre: 'Negaciones básicas',
        nivel: 'intermedio',
        jlpt: 'N5',
        elementos: [
          { caracter: 'じゃない', lectura: 'janai', tipo: 'gramatica', explicacion: 'No es (coloquial)' },
          { caracter: 'ではありません', lectura: 'dewa arimasen', tipo: 'gramatica', explicacion: 'No es (formal)' },
          { caracter: '学生じゃない', lectura: 'gakusei janai', tipo: 'gramatica', explicacion: 'No soy estudiante' },
          { caracter: '本ではありません', lectura: 'hon dewa arimasen', tipo: 'gramatica', explicacion: 'No es un libro (formal)' },
          { caracter: '〜ません', lectura: 'masen', tipo: 'gramatica', explicacion: 'Negación de verbos en -masu', ejemplo: '食べません' },
        ],
      },
    ],
  };

  window.LECCIONES = window.TEMAS;

  var AREAS_VALIDAS = ['hiragana', 'katakana', 'kanji', 'gramatica'];
  var ORDEN_NIVEL = { basico: 0, intermedio: 1, avanzado: 2 };

  function normalizarArea(area) {
    return AREAS_VALIDAS.indexOf(area) >= 0 ? area : null;
  }

  function enriquecerTema(tema, indice) {
    return {
      id: tema.id,
      tema: tema.tema || null,
      nombre: tema.nombre,
      titulo: tema.nombre,
      nivel: tema.nivel || 'basico',
      jlpt: tema.jlpt || null,
      numero: indice + 1,
      elementos: tema.elementos,
      area: tema.area,
    };
  }

  window.obtenerTemas = function (area) {
    var a = normalizarArea(area);
    if (!a || !window.TEMAS[a]) return [];
    return window.TEMAS[a].map(function (t, i) {
      var copia = enriquecerTema(t, i);
      copia.area = a;
      return copia;
    });
  };

  window.obtenerTema = function (area, id) {
    var temas = window.obtenerTemas(area);
    for (var i = 0; i < temas.length; i++) {
      if (temas[i].id === id) return temas[i];
    }
    return null;
  };

  window.obtenerTodosLosTemas = function () {
    var todos = [];
    AREAS_VALIDAS.forEach(function (area) {
      var temas = window.obtenerTemas(area);
      for (var i = 0; i < temas.length; i++) todos.push(temas[i]);
    });
    return todos;
  };

  window.obtenerTotalTemas = function (area) {
    return window.obtenerTemas(area).length;
  };

  window.obtenerTemaPorClave = function (area, claveDetalle) {
    var temas = window.obtenerTemas(area);
    for (var i = 0; i < temas.length; i++) {
      if (temas[i].tema === claveDetalle) return temas[i];
    }
    return null;
  };

  /** @deprecated Sin bloqueo secuencial — devuelve todos los temas. */
  window.temasVisiblesParaNivel = function (area) {
    return window.obtenerTemas(area);
  };

  window.obtenerAreaDeTema = function (temaId) {
    for (var a = 0; a < AREAS_VALIDAS.length; a++) {
      var area = AREAS_VALIDAS[a];
      if (window.obtenerTema(area, temaId)) return area;
    }
    return null;
  };

  window.obtenerLecciones = window.obtenerTemas;
  window.obtenerLeccion = window.obtenerTema;
  window.obtenerTotalLecciones = window.obtenerTotalTemas;
})();


