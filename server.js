/**
 * Servidor de desarrollo — estáticos + API lookup + reportes.
 */

import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { lookupTerm } from './src/lookup/orchestrator.js';
import { getKanjiSvgUrl } from './src/kanji/kanjivg.js';

const SENTRY_DSN = (process.env.SENTRY_DSN || '').trim();
let captureServerException = () => {};

if (SENTRY_DSN) {
  try {
    const Sentry = await import('@sentry/node');
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
    });
    captureServerException = (err, context) => {
      if (context) {
        Sentry.withScope((scope) => {
          Object.entries(context).forEach(([key, val]) => scope.setExtra(key, val));
          Sentry.captureException(err);
        });
      } else {
        Sentry.captureException(err);
      }
    };
  } catch (err) {
    console.warn('[Sentry] No se pudo cargar @sentry/node:', err.message);
  }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const REPORTS_FILE = path.join(__dirname, 'out', 'reports.json');
const app = express();

app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.options('*', (_req, res) => res.sendStatus(204));
app.use(express.json({ limit: '256kb' }));

app.get('/manifest.json', (_req, res) => {
  res.type('application/manifest+json');
  res.sendFile(path.join(__dirname, 'manifest.json'));
});

app.get('/service-worker.js', (_req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Service-Worker-Allowed', '/');
  res.sendFile(path.join(__dirname, 'service-worker.js'));
});

// Archivos estáticos del proyecto (index.html, js/, styles.css, etc.)
app.use(express.static(__dirname));
app.use('/public', express.static(path.join(__dirname, 'public')));

/** GET /api/kanji-svg?char=学 — proxy KanjiVG (evita CORS en file:// y raw GitHub) */
app.get('/api/kanji-svg', async (req, res) => {
  const char = String(req.query.char || '').trim();
  if (!char) {
    return res.status(400).json({ ok: false, error: 'Parámetro char requerido' });
  }

  const url = getKanjiSvgUrl(char);
  if (!url) {
    return res.status(404).json({ ok: false, error: 'No es un kanji válido' });
  }

  try {
    const upstream = await fetch(url);
    if (!upstream.ok) {
      return res.status(upstream.status).json({ ok: false, error: 'SVG no encontrado' });
    }
    const svg = await upstream.text();
    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(svg);
  } catch (err) {
    captureServerException(err, { route: 'kanji-svg' });
    console.error('Kanji SVG proxy error:', err);
    res.status(502).json({ ok: false, error: err.message || 'Error al obtener SVG' });
  }
});


function mapLookupFailure(result, term) {
  const jishoStatus = result.jisho?.status;
  const jishoError = result.jisho?.error;

  if (jishoStatus === 429) {
    return {
      status: 429,
      body: {
        ok: false,
        error:
          'Jisho devolvió 429 (límite de tasa). Espera ~1 s entre búsquedas e inténtalo de nuevo.',
        term,
        jisho: { status: 429, error: jishoError },
      },
    };
  }

  const upstreamFailed =
    jishoStatus === 0 ||
    (typeof jishoStatus === 'number' && jishoStatus >= 500) ||
    Boolean(jishoError);

  const hasUsefulData =
    (result.meanings?.length ?? 0) > 0 ||
    (result.readings?.length ?? 0) > 0 ||
    (result.examples?.length ?? 0) > 0 ||
    (result.jmdict?.entries?.length ?? 0) > 0;

  if (upstreamFailed && !hasUsefulData) {
    const status = jishoStatus === 0 ? 503 : 502;
    return {
      status,
      body: {
        ok: false,
        error: jishoError || 'Servicio de lookup no disponible (error de red o API)',
        term,
        jisho: { status: jishoStatus ?? null, error: jishoError ?? null },
      },
    };
  }

  return null;
}

/** GET /api/lookup?term=猫 — curl: curl -sS "http://localhost:3000/api/lookup?term=%E7%8C%AB" */
app.get('/api/lookup', async (req, res) => {
  const raw = req.query.term;
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return res.status(400).json({ ok: false, error: 'Parámetro term requerido' });
  }

  const term = String(raw).trim();

  try {
    const result = await lookupTerm(term, {
      deeplKey: process.env.DEEPL_KEY,
      googleKey: process.env.GOOGLE_KEY,
    });

    if (result.ok === false) {
      return res.status(400).json(result);
    }

    const failure = mapLookupFailure(result, term);
    if (failure) {
      return res.status(failure.status).json(failure.body);
    }

    if (!result.meanings?.length && !result.readings?.length) {
      return res.json({
        ...result,
        empty: true,
        message: 'Sin resultados en Jisho ni lecturas derivadas para este término.',
      });
    }

    res.json(result);
  } catch (err) {
    captureServerException(err, { route: 'lookup', term });
    console.error('Lookup error:', err);
    const msg = err.message || 'Error interno';
    const status = /fetch|network|ECONNREFUSED|ENOTFOUND/i.test(msg) ? 503 : 500;
    res.status(status).json({ ok: false, error: msg });
  }
});

/**
 * Valida cuerpo de reporte.
 * @param {unknown} body
 * @returns {{ ok: true, entry: object } | { ok: false, error: string }}
 */
function validateReportBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, error: 'Body JSON requerido' };
  }

  const term = String(body.term || '').trim();
  const comment = String(body.comment || body.message || '').trim();

  if (!term) {
    return { ok: false, error: 'Campo term requerido' };
  }
  if (!comment) {
    return { ok: false, error: 'Campo comment requerido' };
  }

  const entry = {
    id: body.id || `r_${Date.now()}`,
    date: body.date || body.createdAt || new Date().toISOString(),
    term,
    report: String(body.report || 'lookup_error'),
    comment,
    userAgent: String(body.userAgent || ''),
    sourceUrl: String(body.sourceUrl || ''),
    lookupData: body.lookupData ?? null,
    receivedAt: new Date().toISOString(),
  };

  return { ok: true, entry };
}

/** Lee reportes persistidos o devuelve array vacío. */
async function readReportsFile() {
  try {
    const raw = await readFile(REPORTS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

/** POST /api/reports — guarda reporte en out/reports.json */
app.post('/api/reports', async (req, res) => {
  const validated = validateReportBody(req.body);
  if (!validated.ok) {
    return res.status(400).json({ ok: false, error: validated.error });
  }

  const entry = validated.entry;
  if (!entry.userAgent) {
    entry.userAgent = req.get('User-Agent') || '';
  }

  try {
    await mkdir(path.dirname(REPORTS_FILE), { recursive: true });
    const list = await readReportsFile();
    list.push(entry);
    await writeFile(REPORTS_FILE, JSON.stringify(list, null, 2), 'utf8');
    res.status(201).json({ ok: true, id: entry.id });
  } catch (err) {
    captureServerException(err, { route: 'reports' });
    console.error('Report save error:', err);
    res.status(500).json({ ok: false, error: err.message || 'Error al guardar reporte' });
  }
});

/** POST /api/report — reenvío opcional a webhook (legacy) */
app.post('/api/report', async (req, res) => {
  const webhook = process.env.WEBHOOK_URL;
  if (!webhook) {
    return res.json({ sent: false, reason: 'WEBHOOK_URL no configurado' });
  }

  try {
    const r = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    res.json({ sent: r.ok, status: r.status });
  } catch (err) {
    res.status(500).json({ sent: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`NihonCheck dev server: http://localhost:${PORT}`);
  console.log(`API lookup: http://localhost:${PORT}/api/lookup?term=猫`);
  console.log(`API kanji SVG: http://localhost:${PORT}/api/kanji-svg?char=学`);
});
