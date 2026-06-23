/**
 * KanjiVG — URLs de trazos SVG por carácter kanji.
 * https://github.com/KanjiVG/kanjivg
 */

const KANJIVG_RAW =
  'https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji';

/**
 * Comprueba si un carácter es kanji CJK unificado.
 * @param {string} char
 */
function isKanji(char) {
  if (!char || char.length !== 1) return false;
  const code = char.codePointAt(0);
  return (
    (code >= 0x4e00 && code <= 0x9fff) ||
    (code >= 0x3400 && code <= 0x4dbf)
  );
}

/**
 * Código Unicode en hex de 5 dígitos para KanjiVG.
 * @param {string} kanji
 */
function kanjiToCode(kanji) {
  return kanji.codePointAt(0).toString(16).padStart(5, '0');
}

/**
 * Devuelve URL raw de GitHub para el SVG de un kanji, o null.
 * @param {string} kanji — un solo carácter
 * @returns {string | null}
 */
export function getKanjiSvgUrl(kanji) {
  const ch = String(kanji || '').trim();
  if (!ch || !isKanji(ch[0])) return null;
  return `${KANJIVG_RAW}/${kanjiToCode(ch[0])}.svg`;
}

/**
 * URLs para todos los kanji en una cadena.
 * @param {string} text
 * @returns {{ char: string, url: string }[]}
 */
export function getKanjiSvgUrls(text) {
  const seen = new Set();
  const out = [];

  for (const ch of String(text || '')) {
    if (!isKanji(ch) || seen.has(ch)) continue;
    seen.add(ch);
    const url = getKanjiSvgUrl(ch);
    if (url) out.push({ char: ch, url });
  }

  return out;
}
