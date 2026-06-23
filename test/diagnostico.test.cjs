const assert = require('assert');
const { readFileSync } = require('fs');
const { join } = require('path');
const vm = require('vm');

/**
 * Carga js/diagnostico.js en un sandbox (IIFE de navegador) para pruebas en Node.
 * La API expuesta es window.NihonCheckDiagnostico; calcularResultados es alias de calcularNivel.
 */
function cargarDiagnostico() {
  const ruta = join(__dirname, '..', 'js', 'diagnostico.js');
  const codigo = readFileSync(ruta, 'utf8');
  const window = {};
  const sandbox = {
    window,
    document: {
      readyState: 'complete',
      getElementById: () => null,
      addEventListener: () => {},
      documentElement: {
        setAttribute: () => {},
        removeAttribute: () => {},
      },
    },
    localStorage: {
      getItem: () => null,
      setItem: () => {},
    },
    setTimeout(fn) {
      fn();
    },
    console,
  };
  vm.createContext(sandbox);
  vm.runInContext(codigo, sandbox, { filename: 'diagnostico.js' });
  return window.NihonCheckDiagnostico;
}

function respuestasCorrectas(preguntas) {
  return preguntas.map((p) => p.correcta);
}

function respuestasIncorrectas(preguntas) {
  return preguntas.map((p) => (p.correcta + 1) % p.opciones.length);
}

/** Hiragana falla; vocab y gramática aciertan → solo sube por vocab (nivel 5). */
function respuestasMixtas(preguntas) {
  return preguntas.map((p, i) => {
    if (p.categoria === 'hiragana') {
      return (p.correcta + 1) % p.opciones.length;
    }
    return p.correcta;
  });
}

describe('NihonCheck diagnostico — calcularResultados / calcularNivel', function () {
  const api = cargarDiagnostico();
  const { PREGUNTAS, calcularResultados, calcularNivel } = api;

  it('calcularResultados es alias de calcularNivel', function () {
    assert.strictEqual(calcularResultados, calcularNivel);
  });

  it('todas correctas: 10 aciertos, nivel 5 y sugerencias de nivel 3 y 5', function () {
    const respuestas = respuestasCorrectas(PREGUNTAS);
    const resultado = calcularResultados(respuestas);

    assert.strictEqual(resultado.aciertosTotales, 10);
    assert.strictEqual(resultado.nivelActual, 5);
    assert.strictEqual(resultado.porcentajes.hiragana, 100);
    assert.strictEqual(resultado.porcentajes.vocab, 100);
    assert.strictEqual(resultado.porcentajes.gramatica, 100);
    assert.strictEqual(resultado.sugerencias.length, 2);
    assert.ok(resultado.sugerencias.some((s) => s.nivel === 3));
    assert.ok(resultado.sugerencias.some((s) => s.nivel === 5));
  });

  it('todas incorrectas: 0 aciertos, nivel 1 sin sugerencias', function () {
    const respuestas = respuestasIncorrectas(PREGUNTAS);
    const resultado = calcularResultados(respuestas);

    assert.strictEqual(resultado.aciertosTotales, 0);
    assert.strictEqual(resultado.nivelActual, 1);
    assert.strictEqual(resultado.porcentajes.hiragana, 0);
    assert.strictEqual(resultado.porcentajes.vocab, 0);
    assert.strictEqual(resultado.porcentajes.gramatica, 0);
    assert.strictEqual(resultado.sugerencias.length, 0);
  });

  it('mixtas: hiragana bajo umbral, vocab alto → nivel 5 y una sugerencia', function () {
    const respuestas = respuestasMixtas(PREGUNTAS);
    const resultado = calcularResultados(respuestas);

    assert.strictEqual(resultado.aciertosTotales, 6);
    assert.strictEqual(resultado.nivelActual, 5);
    assert.strictEqual(resultado.porcentajes.hiragana, 0);
    assert.strictEqual(resultado.porcentajes.vocab, 100);
    assert.strictEqual(resultado.porcentajes.gramatica, 100);
    assert.strictEqual(resultado.sugerencias.length, 1);
    assert.strictEqual(resultado.sugerencias[0].nivel, 5);
  });
});
