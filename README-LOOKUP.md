# NihonCheck — Sistema de Lookup

Búsqueda de palabras japonesas con Jisho, kuromoji, Tatoeba y confianza ponderada. Requiere el servidor de desarrollo (`npm run dev`); la app principal sigue funcionando en `file://` sin lookup.

> **PWA:** Para instalar en móvil o escritorio y uso offline del app shell, ver [README-PWA.md](./README-PWA.md).

## Dependencias

| Paquete | Uso |
|---------|-----|
| `wanakana` | Detección kana/kanji y apoyo a furigana |
| `kuromoji` | Tokenización morfológica (lecturas fallback) |
| `express` | Servidor estático + API `/api/lookup` |
| `dotenv` | Variables de entorno opcionales |
| `node-fetch` | Solo dev/tests en Node antiguo (Node 18+ usa `fetch` nativo) |

## Instalación

```bash
npm install
cp .env.example .env
# Editar .env con claves opcionales
```

## Variables de entorno (`.env`)

| Variable | Obligatoria | Descripción |
|----------|-------------|-------------|
| `DEEPL_KEY` | No | Traducción ES vía DeepL API |
| `GOOGLE_KEY` | No | Traducción ES vía Google Cloud Translation |
| `WEBHOOK_URL` | No | POST JSON al reportar errores |
| `PORT` | No | Puerto del servidor (default 3000) |

## Comandos

```bash
# Servidor estático + API lookup
npm run dev

# Abrir en navegador
# http://localhost:3000

# Tests de lookup (あ, 学校, 猫) — requiere red
npm test
```

## Kuromoji (tokenización)

El diccionario morfológico (~10 MB) se carga **solo en el servidor Node**, no en el navegador `file://`.

- Al arrancar `npm run dev`, el servidor precarga kuromoji en segundo plano (`init()`).
- Cada lookup llama a `tokenize(term)` y devuelve `tokens` en el JSON.
- La tarjeta muestra furigana (`<ruby>`) y el desglose **Análisis (kuromoji)** cuando hay tokens.

```js
// Node (ESM)
import { init, tokenize } from './src/analysis/kuromojiWrapper.js';
await init();
const tokens = await tokenize('学校');
// [{ surface: '学校', reading: 'ガッコウ', pos: '名詞', ... }]
```

## API


## Ejemplo curl

```bash
# Requiere `npm run dev` en otra terminal
curl -sS "http://localhost:3000/api/lookup?term=%E7%8C%AB"
```

Códigos de error habituales: `400` (falta `term`), `429` (límite Jisho), `502`/`503` (API o red).
```
GET /api/lookup?term=TERM
```

Respuesta JSON con `word`, `readings`, `meanings`, `confidence`, `furigana`, `tokens`, `examples`, `jisho.url`, etc.

## Integración en la UI

- Sección **Buscar palabra** en Mi Biblioteca
- `window.lookupTerm(term)` — fetch a `/api/lookup` cuando el servidor está activo
- Sin servidor: mensaje de fallback (la app principal no se rompe)

## Reportes de errores

Los usuarios pueden reportar errores en resultados de lookup desde **Mi Biblioteca → Buscar palabra → Reportar error**.

### Almacenamiento local

- Clave `localStorage`: `reports_nihoncheck`
- Cada entrada incluye: `id`, `date`, `term`, `report` (tipo), `comment`, `userAgent`, `sourceUrl`, `lookupData`

### API del servidor

```
POST /api/reports
Content-Type: application/json
```

Cuerpo JSON (campos obligatorios en **negrita**):

| Campo | Obligatorio | Descripción |
|-------|-------------|-------------|
| **term** | Sí | Término buscado |
| **comment** | Sí | Descripción del error |
| report | No | Tipo: `lectura`, `significado`, `ejemplos`, `otro` (default `lookup_error`) |
| id | No | ID del cliente (se genera si falta) |
| date | No | ISO 8601 (se genera si falta) |
| userAgent | No | Se toma del header si falta |
| sourceUrl | No | URL de la página |
| lookupData | No | Snapshot JSON del resultado |

Respuesta `201`: `{ "ok": true, "id": "r_..." }`

Los reportes se acumulan en `out/reports.json` (ignorado por git).

Ejemplo con curl:

```bash
curl -X POST http://localhost:3000/api/reports \
  -H "Content-Type: application/json" \
  -d '{"term":"猫","report":"lectura","comment":"La lectura mostrada no coincide","sourceUrl":"http://localhost:3000"}'
```

En `file://` solo se guarda en `localStorage`; con `npm run dev` también se envía al servidor.

### Exportar CSV

Desde la consola del navegador (con la app abierta):

```javascript
// Descarga automática (lookupClient expone window.exportCSV)
exportCSV();

// O vía módulo ES (servidor dev)
import('/src/ui/report.js').then(m => m.exportCSV());
```

También disponible: `getReports()` para leer el array local, y `exportReportsCsv()` para obtener el string CSV sin descargar.

Si `WEBHOOK_URL` está configurado, `POST /api/report` (legacy) reenvía al webhook externo.

## Límite de tasa Jisho

La API de Jisho ([jisho.org/api](https://jisho.org/api/v1/search/words)) no publica límites oficiales, pero se recomienda:

- **Máximo ~1 petición por segundo** en uso educativo
- No usar como backend de producción masivo
- Cachear resultados en cliente si se amplía el uso

Uso indebido puede resultar en bloqueo temporal de IP.

## Estructura de archivos

```
src/lookup/       jisho, jmdict (stub), tatoeba, orchestrator, test
src/analysis/     kuromojiWrapper, furigana
src/kanji/        kanjivg URLs
src/confidence.js algoritmo 0.5/0.4/0.1
src/ui/           wordCard, report
server.js         Express dev server
js/lookupClient.js integración navegador (vanilla)
examples/         JSON de ejemplo
```

## JMdict offline (futuro)

`src/lookup/jmdict.js` documenta el stub para diccionario local sin red.

## Ejemplos de salida

Ver `examples/lookup-a.json`, `lookup-gakkou.json`, `lookup-neko.json`.
