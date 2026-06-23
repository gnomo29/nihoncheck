const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'js', 'nihoncheck.js');
const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);

function findLine(re) {
  return lines.findIndex(function (l) { return re.test(l); });
}

const analisisStart = findLine(/4\. AN/);
const testStart = findLine(/5\. INTERFAZ DEL TEST/);
const deContStart = findLine(/NihonCheck\.iniciarExamenDeContenido/);

const tailFromAnalisis = lines.slice(analisisStart - 1, testStart - 1);
const wrappers = lines.slice(deContStart - 1);

const out = [
  '/**',
  ' * NIHONCHECK — Nucleo: biblioteca, memoria, vistas',
  ' * Requiere: preguntas.js, motorAdaptativo.js, resultados.js, interfazTest.js',
  ' */',
  '(function () {',
  "  'use strict';",
  '',
  '  var NihonCheck = window.NihonCheck || {};',
  '',
].concat(tailFromAnalisis).concat([
  '',
  '  /* ============================================================',
  '     EXAMEN — wrappers diagnosticos',
  '     ============================================================ */',
  '',
]).concat(wrappers).join('\n');

fs.writeFileSync(filePath, out, 'utf8');
console.log('Written', out.split('\n').length, 'lines');


