/**
 * Inicialización de Sentry para NihonCheck (vanilla JS + CDN @sentry/browser).
 * Sin DSN: todas las funciones son no-op y la app funciona igual.
 */
(function () {
  'use strict';

  var enabled = false;
  var globalHandlersAttached = false;

  /** Claves permitidas en contexto de eventos (sin PII ni datos de perfil). */
  var ALLOWED_EVENT_KEYS = {
    nivelActual: true,
    aciertosTotales: true,
    porcentajes: true,
    term: true,
    report: true,
    scope: true,
    status: true,
  };

  /**
   * Filtra datos antes de enviarlos a Sentry.
   * @param {object} [data]
   * @returns {object|undefined}
   */
  function sanitizeContext(data) {
    if (!data || typeof data !== 'object') return undefined;
    var out = {};
    Object.keys(data).forEach(function (key) {
      if (!ALLOWED_EVENT_KEYS[key]) return;
      var val = data[key];
      if (key === 'porcentajes' && val && typeof val === 'object') {
        out.porcentajes = {
          hiragana: val.hiragana,
          vocab: val.vocab,
          gramatica: val.gramatica,
        };
        return;
      }
      if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
        out[key] = val;
      }
    });
    return Object.keys(out).length ? out : undefined;
  }

  /**
   * Inicializa Sentry solo si hay DSN válido y el SDK está cargado.
   * @param {string} dsn
   * @param {{ environment?: string }} [options]
   * @returns {boolean}
   */
  function initSentry(dsn, options) {
    if (!dsn || typeof dsn !== 'string' || !dsn.trim()) {
      return false;
    }
    if (typeof Sentry === 'undefined') {
      console.warn('[Sentry] SDK no cargado — omitiendo init');
      return false;
    }
    if (enabled) return true;

    try {
      Sentry.init({
        dsn: dsn.trim(),
        environment: (options && options.environment) || 'production',
        // No adjuntar datos de usuario ni localStorage
        sendDefaultPii: false,
        beforeSend: function (event) {
          if (event.extra) {
            event.extra = sanitizeContext(event.extra);
          }
          if (event.contexts && event.contexts.extra) {
            event.contexts.extra = sanitizeContext(event.contexts.extra);
          }
          return event;
        },
      });
      enabled = true;
      attachGlobalErrorHandlers();
      return true;
    } catch (err) {
      console.warn('[Sentry] Error al inicializar:', err);
      return false;
    }
  }

  /**
   * Captura una excepción con contexto opcional (filtrado).
   * @param {Error|*} err
   * @param {object} [context]
   */
  function captureException(err, context) {
    if (!enabled || typeof Sentry === 'undefined') return;
    try {
      var extra = sanitizeContext(context);
      if (extra) {
        Sentry.withScope(function (scope) {
          scope.setExtras(extra);
          Sentry.captureException(err);
        });
      } else {
        Sentry.captureException(err);
      }
    } catch (e) {
      console.warn('[Sentry] No se pudo capturar excepción:', e);
    }
  }

  /**
   * Registra un evento de producto (nivel info).
   * @param {string} name
   * @param {object} [data]
   */
  function trackEvent(name, data) {
    if (!enabled || typeof Sentry === 'undefined') return;
    if (!name) return;
    try {
      Sentry.captureEvent({
        message: name,
        level: 'info',
        tags: { event: name },
        extra: sanitizeContext(data),
      });
    } catch (e) {
      console.warn('[Sentry] No se pudo registrar evento:', e);
    }
  }

  /**
   * Errores globales no capturados (opcional, solo con DSN activo).
   */
  function attachGlobalErrorHandlers() {
    if (globalHandlersAttached || typeof window === 'undefined') return;
    globalHandlersAttached = true;

    var prevOnError = window.onerror;
    window.onerror = function (message, source, lineno, colno, error) {
      captureException(error || new Error(String(message)), {
        scope: 'window.onerror',
        status: source ? String(source) + ':' + lineno : undefined,
      });
      if (typeof prevOnError === 'function') {
        return prevOnError.apply(this, arguments);
      }
      return false;
    };

    window.addEventListener('unhandledrejection', function (ev) {
      var reason = ev.reason;
      captureException(reason instanceof Error ? reason : new Error(String(reason)), {
        scope: 'unhandledrejection',
      });
    });
  }

  window.NihonCheckSentry = {
    initSentry: initSentry,
    captureException: captureException,
    trackEvent: trackEvent,
    isEnabled: function () {
      return enabled;
    },
  };
})();
