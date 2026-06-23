/**
 * Cliente Jisho API — búsqueda de palabras japonesas.
 * https://jisho.org/api/v1/search/words?keyword=TERM
 *
 * Límite no oficial: ~1 req/s; uso educativo con caché recomendado.
 */

const JISHO_BASE = 'https://jisho.org/api/v1/search/words';

/**
 * @param {string} term
 * @returns {Promise<{ meta: object, data: object[] }>}
 */
export async function searchJisho(term) {
  const keyword = String(term || '').trim();
  if (!keyword) {
    return { meta: { status: 400 }, data: [], error: 'Término vacío' };
  }

  const url = `${JISHO_BASE}?keyword=${encodeURIComponent(keyword)}`;

  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
      return {
        meta: { status: res.status },
        data: [],
        error: `Jisho HTTP ${res.status}`,
      };
    }

    const json = await res.json();
    return {
      meta: json.meta || { status: 200 },
      data: Array.isArray(json.data) ? json.data : [],
    };
  } catch (err) {
    return {
      meta: { status: 0 },
      data: [],
      error: err.message || 'Error de red Jisho',
    };
  }
}

/**
 * Extrae lecturas y significados del primer resultado Jisho.
 * @param {object[]} data
 */
export function parseJishoEntry(data) {
  if (!data || !data.length) {
    return { word: null, readings: [], meanings: [], jlpt: null, tags: [] };
  }

  const entry = data[0];
  const japanese = entry.japanese || [];
  const senses = entry.senses || [];

  const word =
    japanese.find((j) => j.word)?.word ||
    japanese[0]?.reading ||
    null;

  const readings = [
    ...new Set(
      japanese
        .map((j) => j.reading || j.word)
        .filter(Boolean)
    ),
  ];

  const meanings = senses.flatMap((s) => s.english_definitions || []);
  const tags = senses.flatMap((s) => s.tags || []);
  const jlpt = entry.jlpt?.[0] || null;

  return { word, readings, meanings, jlpt, tags, slug: entry.slug };
}
