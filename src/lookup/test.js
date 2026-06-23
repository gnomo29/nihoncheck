/**
 * Tests de lookup — términos: あ, 学校, 猫
 * Ejecutar: npm test
 */

import { lookupTerm } from './orchestrator.js';

const TERMS = ['あ', '学校', '猫'];

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'Assertion failed');
}

async function runTests() {
  console.log('=== NihonCheck Lookup Tests ===\n');
  let passed = 0;
  let failed = 0;

  for (const term of TERMS) {
    process.stdout.write(`Buscando "${term}"... `);
    try {
      const result = await lookupTerm(term);
      assert(result.ok, `lookup falló para ${term}`);
      assert(result.term === term, `term no coincide`);
      assert(typeof result.confidence === 'number', 'sin confidence');
      assert(Array.isArray(result.readings), 'sin readings');
      assert(Array.isArray(result.meanings) || result.readings.length > 0, 'sin datos útiles');
      assert(result.jisho?.url, 'sin URL Jisho');
      if (term === '学校') {
        assert(Array.isArray(result.tokens) && result.tokens.length > 0, 'sin tokens kuromoji');
        assert(result.furigana?.includes('<ruby>'), 'sin furigana');
      }
      console.log(`OK (confianza: ${result.confidence}, fuentes: ${result.sources.join(', ')})`);
      passed++;
    } catch (err) {
      console.log(`FAIL: ${err.message}`);
      failed++;
    }
  }

  console.log(`\nResultado: ${passed} pasaron, ${failed} fallaron`);
  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
