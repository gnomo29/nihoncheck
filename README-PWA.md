# NihonCheck — Instalación como PWA

NihonCheck puede instalarse en el escritorio o en la pantalla de inicio del móvil como aplicación web progresiva (PWA).

## Requisitos

| Entorno | PWA / Service Worker | Lookup API |
|---------|----------------------|------------|
| `npm run dev` → `http://localhost:3000` | ✅ Sí | ✅ Sí |
| HTTPS en producción | ✅ Sí | Según despliegue |
| Abrir `index.html` con `file://` | ❌ No (app funciona, sin caché offline) | ❌ No |

Los service workers **solo se registran** en contextos seguros: `https://` o `http://localhost` / `127.0.0.1`. Si abres los archivos directamente (`file:///C:/...`), la app sigue funcionando con normalidad, pero no habrá instalación PWA ni caché offline.

## Instalar en Android (Chrome)

1. Arranca el servidor local:
   ```bash
   npm install
   npm run dev
   ```
2. En el móvil (misma red Wi‑Fi) abre `http://<IP-de-tu-PC>:3000` o usa un túnel HTTPS si despliegas en la nube.
3. Menú ⋮ → **Añadir a pantalla de inicio** / **Instalar aplicación**.
4. Confirma el nombre **NihonCheck**. El icono aparecerá como app independiente (`display: standalone`).

En escritorio Chrome: icono de instalación (⊕) en la barra de direcciones.

## Instalar en iOS (Safari)

1. Abre la URL en **Safari** (no en Chrome iOS para la mejor compatibilidad de “Añadir a inicio”).
2. Botón **Compartir** → **Añadir a pantalla de inicio**.
3. Confirma el nombre y el icono.

### Limitaciones en iOS

- No hay prompt automático de instalación como en Android/Chrome.
- El almacenamiento en caché del service worker es más limitado; tras ~7 días sin uso Safari puede purgar datos.
- Las notificaciones push y sincronización en segundo plano no están disponibles para PWAs en iOS.
- La búsqueda de palabras (`/api/lookup`) requiere red; no se cachea offline.

## Archivos PWA

| Archivo | Función |
|---------|---------|
| `manifest.json` | Nombre, colores, iconos, `start_url`, modo standalone |
| `service-worker.js` | Caché del app shell (`nihoncheck-v1`) |
| `icons/icon-192.png`, `icon-512.png` | Iconos del manifest |
| `icons/icon.svg` | Fuente vectorial (sustituir PNG si personalizas) |

### Regenerar iconos PNG

```bash
node _gen-pwa-icons.mjs
```

O edita `icons/icon.svg` y exporta PNG 192×192 y 512×512.

## Caché y actualizaciones

- **App shell** (HTML, CSS, JS listados en `index.html`): estrategia *cache-first* → funciona offline tras la primera visita.
- **API** (`/api/*`): estrategia *network-first* → siempre intenta red; lookup y kanji SVG no se sirven desde caché antigua.
- Al cambiar recursos estáticos, incrementa `?v=` en `index.html` y, si cambia la lista de precache, renombra la caché en `service-worker.js` (p. ej. `nihoncheck-v2`).

## Desarrollo local

```bash
npm run dev
# http://localhost:3000
```

Comprueba el service worker en DevTools → **Application** → **Service Workers** / **Manifest**.

## Ver también

- [README-LOOKUP.md](./README-LOOKUP.md) — API de búsqueda y variables de entorno.
