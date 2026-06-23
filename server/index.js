/**
 * Servidor Express — API de lookup NihonCheck.
 */

import 'dotenv/config';
import express from 'express';
import * as orchestrator from '../src/lookup/orchestrator.js';

const PORT = Number(process.env.PORT) || 3000;
const app = express();

// CORS abierto para pruebas locales y clientes externos
app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.options('*', (_req, res) => res.sendStatus(204));

/**
 * GET /api/lookup?term= — búsqueda de un término japonés.
 * Ejemplo: curl "http://localhost:3000/api/lookup?term=猫"
 */
app.get('/api/lookup', async (req, res) => {
  const raw = req.query.term;

  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return res.status(400).json({ error: 'Parámetro term requerido' });
  }

  const term = String(raw).trim();

  try {
    const result = await orchestrator.lookupTerm(term, {
      deeplKey: process.env.DEEPL_KEY,
      googleKey: process.env.GOOGLE_KEY,
    });
    return res.status(200).json(result);
  } catch (err) {
    console.error('Error en /api/lookup:', err);
    return res.status(500).json({
      error: 'No pudimos completar la búsqueda. Inténtalo de nuevo más tarde.',
    });
  }
});

app.listen(PORT, () => {
  console.log(`NihonCheck API: http://localhost:${PORT}`);
  console.log(`Lookup: http://localhost:${PORT}/api/lookup?term=猫`);
});
