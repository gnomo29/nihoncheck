# Sentry en NihonCheck

Monitoreo opcional de errores y eventos de producto. Sin DSN configurado, la app funciona igual (funciones no-op).

## Obtener el DSN

1. Crea una cuenta en [sentry.io](https://sentry.io).
2. Crea un proyecto **Browser / JavaScript**.
3. Ve a **Settings → Client Keys (DSN)** y copia el DSN.

## Configuración del cliente (navegador)

1. Copia `js/sentry-config.example.js` → `js/sentry-config.js`.
2. Pega tu DSN en `dsn` y ajusta `environment` (`development`, `production`, etc.).
3. `index.html` y `diagnostico.html` cargan el SDK de Sentry por CDN y `js/sentryInit.js`.
4. `js/app.js` llama a `initSentry` al arrancar si hay DSN.

Si no existe `js/sentry-config.js`, ignora el 404 en consola o crea el archivo desde el ejemplo.

## Configuración del servidor (opcional)

En `.env` (copia desde `.env.example`):

```env
SENTRY_DSN=https://TU_CLAVE@o000000.ingest.sentry.io/0000000
```

Requiere `npm install` (`@sentry/node`). Sin `SENTRY_DSN`, el servidor no envía nada a Sentry.

## Privacidad

- No se envían datos de `localStorage`, perfiles de usuario ni comentarios de reportes.
- Los eventos de producto solo incluyen campos agregados (nivel de diagnóstico, término buscado, tipo de reporte).
- `sendDefaultPii` está desactivado en el cliente.

## Eventos registrados

| Evento | Cuándo | Datos enviados |
|--------|--------|----------------|
| `diagnostico_completado` | Tras guardar el resultado del diagnóstico rápido | `nivelActual`, `aciertosTotales`, `porcentajes` |
| `reporte_enviado` | Tras enviar un reporte de error de lookup | `term`, `report` (tipo) |

## Errores capturados

- Excepciones en `app.js` (init y flujos críticos).
- Fallos de red del lookup (excepto modo offline esperado).
- `window.onerror` y promesas rechazadas sin manejar (solo con DSN activo).
- Errores de API en `server.js` (lookup, reportes, kanji SVG) si `SENTRY_DSN` está en `.env`.

## API (`window.NihonCheckSentry`)

```javascript
NihonCheckSentry.initSentry(dsn, { environment: 'production' });
NihonCheckSentry.captureException(err, { scope: 'mi-modulo' });
NihonCheckSentry.trackEvent('mi_evento', { term: '猫' });
NihonCheckSentry.isEnabled(); // true si hay DSN activo
```
