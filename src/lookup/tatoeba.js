/**
 * Tatoeba — ejemplos de oraciones.
 *
 * API pública limitada. Usamos búsqueda web JSON cuando está disponible;
 * si falla, devolvemos stub documentado.
 *
 * Límites conocidos:
 * - Sin API oficial estable para terceros
 * - Rate limiting agresivo; máx. pocas peticiones por minuto
 * - Resultados en inglés/japonés según corpus
 */

const TATOEBA_SEARCH =
  'https://tatoeba.org/eng/api_v0/search';

/**
 * @param {string} query
 * @param {number} [limit]
 * @returns {Promise<{ examples: object[], source: string, limited: boolean }>}
 */
export async function searchTatoeba(query, limit = 3) {
  const term = String(query || '').trim();
  if (!term) {
    return { examples: [], source: 'tatoeba', limited: true };
  }

  const url = `${TATOEBA_SEARCH}?from=jpn&query=${encodeURIComponent(term)}&orphans=no&sort=relevance&limit=${limit}`;

  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
      return {
        examples: [],
        source: 'tatoeba',
        limited: true,
        error: `Tatoeba HTTP ${res.status}`,
        note: 'API Tatoeba puede bloquear peticiones frecuentes o CORS desde navegador.',
      };
    }

    const json = await res.json();
    const results = json.results || [];

    const examples = results.slice(0, limit).map((r) => {
      const jpn = (r.transcriptions || []).find((t) => t.lang === 'jpn');
      const eng = (r.transcriptions || []).find((t) => t.lang === 'eng');
      return {
        japanese: jpn?.text || r.text || '',
        translation: eng?.text || '',
        id: r.id,
      };
    });

    return {
      examples: examples.filter((e) => e.japanese),
      source: 'tatoeba',
      limited: true,
    };
  } catch (err) {
    return {
      examples: [],
      source: 'tatoeba',
      limited: true,
      error: err.message,
      note: 'Stub: Tatoeba no disponible. El servidor Node puede reintentar sin CORS.',
    };
  }
}
