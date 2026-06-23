# NihonCheck

Aplicación de aprendizaje de japonés con API de lookup (Jisho, kuromoji, Tatoeba y más).

## Instalación

```bash
npm install
```

## Servidor API

Arranca el servidor Express en el puerto 3000 (configurable con la variable de entorno `PORT`):

```bash
node server/index.js
```

O con recarga automática en desarrollo:

```bash
npm run dev
```

## Ejemplo: lookup

```bash
curl -sS "http://localhost:3000/api/lookup?term=猫"
```

Respuesta JSON (200) con lecturas, significados, ejemplos y metadatos del término.

## Más documentación

- [README-LOOKUP.md](./README-LOOKUP.md) — detalle del sistema de lookup
- [README-PWA.md](./README-PWA.md) — instalación PWA
- [README-TEST.md](./README-TEST.md) — pruebas
