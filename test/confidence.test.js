import assert from 'node:assert/strict';
import { computeConfidence, getConfidenceLabel } from '../src/confidence.js';

describe('computeConfidence', () => {
  it('alta: lectura coincide, significados solapados y varias fuentes', () => {
    const result = computeConfidence({
      jisho: {
        readings: ['\u306D\u3053'],
        senses: ['cat', 'pet'],
      },
      deepL: 'cat pet',
      kuromojiTokens: [{ surface: '\u732B', reading: '\u30CD\u30B3' }],
      otherSources: { jmdict: true, tatoeba: true },
    });

    assert.equal(result.label, 'alta');
    assert.ok(result.score > 0.8);
    assert.ok(result.score <= 1);
  });

  it('baja: sin coincidencia de lectura ni DeepL', () => {
    const result = computeConfidence({
      jisho: { readings: ['\u3044\u306C'], senses: ['dog'] },
      deepL: null,
      kuromojiTokens: [{ reading: '\u306D\u3053' }],
      otherSources: { jmdict: false, tatoeba: false },
    });

    assert.equal(result.label, 'baja');
    assert.ok(result.score < 0.5);
    assert.equal(result.score, 0.05);
  });

  it('medio: lectura ok pero sin solape de significado', () => {
    const result = computeConfidence({
      jisho: { readings: ['\u304C\u3063\u3053\u3046'], senses: ['school'] },
      deepL: null,
      kuromojiTokens: [{ reading: '\u30AC\u30C3\u30B3\u30A6' }],
      otherSources: { jmdict: true, tatoeba: false },
    });

    assert.equal(result.label, 'medio');
    assert.ok(result.score > 0.5 && result.score <= 0.8);
    assert.equal(result.score, 0.6);
  });
});

describe('getConfidenceLabel', () => {
  it('respeta umbrales estrictos', () => {
    assert.equal(getConfidenceLabel(0.81), 'alta');
    assert.equal(getConfidenceLabel(0.8), 'medio');
    assert.equal(getConfidenceLabel(0.51), 'medio');
    assert.equal(getConfidenceLabel(0.5), 'baja');
  });
});
