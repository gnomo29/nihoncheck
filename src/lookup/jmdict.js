/**
 * Stub JMdict — diccionario offline futuro.
 *
 * Planificado:
 * - Cargar JMdict_e / JMdict_e_ex desde archivo JSON o SQLite local
 * - Búsqueda sin red para entornos file:// o sin API
 * - Sincronizar entradas con IDs de Jisho cuando sea posible
 *
 * Por ahora devuelve estructura vacía documentada.
 */

/** @typedef {{ id: string, kanji: string[], reading: string[], gloss: string[] }} JmdictEntry */

/**
 * Búsqueda offline (no implementada).
 * @param {string} term
 * @returns {Promise<{ entries: JmdictEntry[], available: boolean }>}
 */
export async function searchJmdict(term) {
  void term;
  return {
    available: false,
    entries: [],
    note:
      'JMdict offline pendiente. Usa Jisho API vía orchestrator hasta integrar dict local.',
  };
}

/**
 * Documentación de formato esperado para importación futura.
 */
export const JMdict_SCHEMA = {
  id: 'string — ent_seq de JMdict',
  kanji: 'string[] — formas en kanji',
  reading: 'string[] — lecturas kana',
  gloss: 'string[] — definiciones en inglés/español',
};
