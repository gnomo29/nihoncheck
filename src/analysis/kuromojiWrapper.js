/**
 * Wrapper kuromoji — tokenización morfológica del japonés.
 *
 * Uso en Node (ESM):
 *   import { init, tokenize } from './src/analysis/kuromojiWrapper.js';
 *   await init(); // carga el diccionario (~10 MB, una sola vez)
 *   const tokens = await tokenize('学校');
 *
 * `tokenize` llama a `init()` de forma lazy si aún no está listo.
 */

import kuromoji from 'kuromoji';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('kuromoji').Tokenizer | null} */
let tokenizer = null;
/** @type {Promise<import('kuromoji').Tokenizer> | null} */
let initPromise = null;

/**
 * Inicializa el tokenizer (singleton, async).
 * @returns {Promise<import('kuromoji').Tokenizer>}
 */
export function init() {
  if (tokenizer) return Promise.resolve(tokenizer);
  if (initPromise) return initPromise;

  const dictPath = path.join(__dirname, '../../node_modules/kuromoji/dict');

  initPromise = new Promise((resolve, reject) => {
    kuromoji.builder({ dicPath: dictPath }).build((err, built) => {
      if (err) {
        initPromise = null;
        reject(err);
        return;
      }
      tokenizer = built;
      resolve(built);
    });
  });

  return initPromise;
}

/** @deprecated Usar init() */
export const initTokenizer = init;

/**
 * Tokeniza texto japonés.
 * @param {string} text
 * @returns {Promise<Array<{ surface: string, reading: string, basic: string, pos: string, posDetail: string }>>}
 */
export async function tokenize(text) {
  const tk = await init();
  const input = String(text || '').trim();
  if (!input) return [];

  return tk.tokenize(input).map((t) => ({
    surface: t.surface_form,
    reading: t.reading || t.pronunciation || '',
    basic: t.basic_form,
    pos: t.pos,
    posDetail: t.pos_detail_1,
  }));
}
