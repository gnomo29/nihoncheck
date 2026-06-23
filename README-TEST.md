# NihonCheck — pruebas E2E (Cypress)

## Requisitos

- Node.js ≥ 18
- Dependencias instaladas: `npm install`

## Ejecutar tests E2E

### Opción recomendada (servidor + Cypress en un comando)

```bash
npm run test:e2e
```

Arranca el servidor de desarrollo en `http://localhost:3000`, espera a que responda y ejecuta Cypress en modo headless.

### Modo interactivo

Terminal 1:

```bash
npm run dev
```

Terminal 2:

```bash
npm run cy:open
```

En la UI de Cypress, elige **E2E Testing** y abre `diagnostico.cy.js`.

### Solo Cypress (servidor ya en marcha)

```bash
npm run cy:run
```

## Qué cubre `diagnostico.cy.js`

1. Visita `/diagnostico.html` con `localStorage` limpio.
2. Pulsa **Comenzar** y responde las 10 preguntas (primera opción en cada una).
3. Verifica la pantalla de resultado (10/10 aciertos, enlace «Comenzar mi ruta personalizada»).
4. Comprueba en `localStorage`:
   - `nihoncheck_perfil`: `diagnosticoCompletado: true`, `nivelActual: 5`
   - `diagnosticoRealizado`: `"true"`
   - `nihoncheck_usuario`: flags de diagnóstico completado

## Tests unitarios del lookup

```bash
npm test
```
