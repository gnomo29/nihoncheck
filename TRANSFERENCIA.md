# Documento de Transferencia — NihonCheck

> **Versión del proyecto:** assets en `?v=22` · **Fecha de transferencia:** junio 2025  
> **Ubicación:** `c:\Users\siste\Desktop\japon-test`  
> **Idioma de la UI:** español · **Público objetivo:** hispanohablantes aprendiendo japonés

---

## 1. Resumen ejecutivo del proyecto

**NihonCheck** es una aplicación web estática (HTML/CSS/JS vanilla) para hispanohablantes que aprenden japonés. Su filosofía central **no** es replicar Duolingo/Busuu/Lingodeer:

> *"Detectar lo que el usuario ya sabe para evitar que pierda tiempo estudiando contenido que ya domina."*

La app combina:
- **Área de Estudio Personal:** biblioteca con flashcards, conversor romaji→kana, carpetas (Kanji/Hiragana/Katakana/Gramática).
- **Camino de Aprendizaje:** diagnóstico adaptativo inicial (opcional), perfil granular de dominio, ruta personalizada sin bloqueos lineales, lecciones/temas con presentación + verificación.

Todo el estado vive en `localStorage`. No hay backend, build step obligatorio ni variables de entorno. Se abre con `index.html` vía `file://` o servidor estático.

---

## 2. Objetivo principal del sistema

1. **Diagnosticar** el nivel real del usuario (hiragana, katakana, kanji N5) con examen de escritura libre en romaji.
2. **Construir un perfil granular** por subtemas (`hiragana.vocales`, `katakana.dakuten`, `kanji.numeros`, etc.).
3. **Recomendar solo lo que falta** — excluir temas `dominado` de "Tu ruta para hoy".
4. **Recalibrar en tiempo real** cada práctica (biblioteca o lección) según aciertos, fallos y velocidad.
5. **Permitir estudio sin presión** (flashcards, práctica libre) separado del examen oficial.

---

## 3. Estado actual de desarrollo

| Área | Estado |
|------|--------|
| UI principal (home, biblioteca, camino, aprender, lecciones, test) | ✅ Funcional |
| Diagnóstico 30 preguntas (10+10+10) | ✅ Funcional |
| Perfil granular + ruta personalizada | ✅ Funcional |
| Recalibración en vivo | ✅ Funcional |
| Conversor romaji inteligente | ✅ Funcional |
| Lecciones por tema (sin candados) | ✅ Funcional |
| Banco 200 preguntas | ✅ Completo |
| Anti-trampa (tiempo, badge sospechosa) | ✅ Funcional |
| Tests de regresión automatizados | ❌ No existen |
| Backend / sync multi-dispositivo | ❌ No planificado aún |
| PWA / empaquetado npm | ❌ No existe |

**Madurez:** MVP funcional listo para pruebas de usuario. Últimas pasadas: refactor "Continuous Adaptive Learning" + auditoría de errores (onboarding, `diagnosticoRealizado`, dashboard, `TIEMPO_DOMINIO_MS=2000`).

---

## 4. Arquitectura completa

```
┌─────────────────────────────────────────────────────────────────┐
│                        index.html                                │
│  Vistas: home | biblioteca | camino | test-nivel | resultados   │
│          aprender | lecciones-lista | leccion                    │
│  Modales: modal-nuevo | modal-agregar                            │
└───────────────────────────┬─────────────────────────────────────┘
                            │
         ┌──────────────────┼──────────────────┐
         ▼                  ▼                  ▼
   js/app.js          styles.css         Google Fonts
   (navegación,       (diseño minimalista
    eventos UI)        japonés: blanco,
                       rojo #c0392b, gris)
         │
         ▼
┌────────────────────────────────────────────────────────────────┐
│                    window.NihonCheck                            │
│  js/nihoncheck.js — núcleo (~3200 líneas)                      │
│  biblioteca, memoria, perfil, dominio, lecciones, dashboard     │
│  + fallback embebido de iniciarExamen si interfazTest falla     │
└────────────┬───────────────────────────────────────────────────┘
             │
    ┌────────┼────────┬────────────┬──────────────┐
    ▼        ▼        ▼            ▼              ▼
romaji    preguntas  lecciones   temas.js    rutaPersonalizada
Converter  (200 Q)   (TEMAS)     (taxonomía)  (generarRuta)
    │        │        │            │              │
    └────────┴────────┴────────────┴──────────────┘
             │
    ┌────────┴────────┐
    ▼                 ▼
motorAdaptativo.js  interfazTest.js
(adaptación,        (UI examen,
 puntuación)          escritura libre)
             │
             ▼
      resultados.js (heatmap, HTML resultados)
             │
             ▼
      localStorage (persistencia)
```

### Patrón de módulos

- **No ES Modules** — incompatible con `file://` sin bundler.
- Cada archivo extiende `window.NihonCheck` o expone globals (`window.TEMAS`, `window.NihonCheckTemas`, `window.generarRutaPersonalizada`, `window.RomajiConverter`).
- **Orden de carga crítico** (en `index.html`):

```html
romajiConverter.js → preguntas.js → lecciones.js → temas.js →
rutaPersonalizada.js → motorAdaptativo.js → resultados.js →
nihoncheck.js → interfazTest.js → app.js
```

`interfazTest.js` carga **después** de `nihoncheck.js` y **sobrescribe** `NihonCheck.iniciarExamen`. El embebido en `nihoncheck.js` (~línea 3017) es fallback si `interfazTest.js` no carga.

### Sistema de vistas

- Elementos `.view` con `hidden` y clase `view--active`.
- `showView(nombre)` en `js/app.js` alterna visibilidad y dispara renders (biblioteca, dashboard, lista lecciones).
- Navegación unificada: delegación en `document` con `data-action` y `data-nav`.

---

## 5. Tecnologías utilizadas

| Tecnología | Uso |
|------------|-----|
| HTML5 semántico | Estructura, vistas, modales, ARIA básico |
| CSS3 + variables CSS | Tema minimalista japonés |
| JavaScript ES5/ES6 mixto | Lógica (IIFE, `const` en algunos archivos, sin transpilar) |
| Google Fonts | Noto Sans JP + Noto Sans |
| localStorage | Única persistencia |
| Node.js (opcional) | Scripts en `scripts/` para generar preguntas / rebuild — no runtime |

**No hay:** React, Vue, TypeScript, npm package.json, bundler, servidor API, base de datos.

---

## 6. Estructura de carpetas y archivos importantes

```
japon-test/
├── index.html              # Entry point UI, carga scripts ?v=22
├── styles.css              # Estilos globales (~2000+ líneas)
├── app.js                  # STUB — solo comentario "movido a js/app.js"
├── TRANSFERENCIA.md        # Este documento
├── js/
│   ├── app.js              # ★ Punto de entrada: navegación, modales, eventos
│   ├── nihoncheck.js       # ★ Núcleo: biblioteca, perfil, lecciones, dashboard
│   ├── romajiConverter.js  # Conversor romaji, detección carpeta
│   ├── preguntas.js        # Banco 200 preguntas (75+75+50)
│   ├── lecciones.js        # TEMAS por área (datos escalables)
│   ├── temas.js            # Taxonomía subtemas + construirPerfilDesdeHistorial
│   ├── rutaPersonalizada.js# generarRutaPersonalizada, obtenerObjetivosSugeridos
│   ├── motorAdaptativo.js  # Motor examen adaptativo, bloques 10+10+10
│   ├── interfazTest.js     # UI del test (input romaji, feedback, tiempos)
│   └── resultados.js       # Heatmap, puntuación ponderada, HTML resultados
└── scripts/
    ├── generate-preguntas.js   # Utilidad generación banco
    └── rebuild-nihoncheck.js   # Utilidad rebuild parcial de nihoncheck.js
```

---

## 7. Funcionalidades terminadas

### Home
- Dos pilares: **Área de Estudio Personal** (4 carpetas + Agregar Material) y **Tu ruta de aprendizaje** (→ Camino).
- Contadores por carpeta (`data-count-carpeta`).
- Footer configuración: **Repetir diagnóstico** (solo si `diagnosticoRealizado`) + **Reiniciar progreso**.

### Onboarding
- Modal primera visita (`#modal-nuevo`): "Hacer diagnóstico" o "Saltar examen e iniciar desde 0".
- Auto-apertura si `NihonCheck.esUsuarioNuevo()`.
- Skip → `inicializarPerfilDesdeCero()` (todo `por_reforzar`, sin `diagnosticoRealizado`).

### Diagnóstico / Test
- 30 preguntas: 10 hiragana + 10 katakana + 10 kanji.
- Escritura libre romaji, auto-focus input.
- Adaptativo dentro de cada bloque (acierto → más difícil; fallo → más fácil misma categoría).
- Anti-trampa: aviso <0.5s; badge "Sospechosa" si promedio <1.5s.
- Puntuación asimétrica: +10 acierto, -25 fallo.
- Resultados con heatmap por categoría.
- `procesarDiagnosticoCompletado()` → perfil granular.

### Perfil y ruta
- `nihoncheck_perfil.detalle` por subtema con estados:
  - `por_reforzar` 🔴
  - `en_progreso` 🟡
  - `en_progreso_lento` 🟡 (acierto pero ≥2000ms)
  - `dominado` ✅ (3 aciertos rápidos consecutivos <2000ms)
- Un fallo → inmediato `por_reforzar` (degradación).
- Dashboard "Tu ruta para hoy" + "Mapa de conocimiento" + explorador por área.
- Sin lecciones bloqueadas (`leccionEstaDesbloqueada()` → siempre `true`).

### Biblioteca
- Fuentes unificadas: `manual` y `automatica` ("Aprendido con NihonCheck").
- 4 pestañas: Hiragana, Katakana, Kanji, Gramática.
- Filtros: todos / por reforzar / dominados / en progreso.
- Flashcards (flip al clic).
- Práctica por tarjeta individual (afecta perfil vía `recalibrarPerfil`).
- Estados visuales tarjeta: 🟢 dominado (15 aciertos seguidos), 🟡 progreso, 🔴 reforzar.

### Agregar material
- Conversor romaji: minúsculas → hiragana, MAYÚSCULAS → katakana.
- Vista previa en vivo (debounce 100ms).
- Detección automática de carpeta destino.
- "Guardar y Limpiar" + animación check en carpeta.
- Ctrl+Enter = guardar y otro.

### Lecciones / Temas
- Fase presentación (5 elementos) → fase verificación (escritura libre).
- ≥85% en verificación → tema dominado, sync a biblioteca automática.
- Cada respuesta recalibra perfil del subtema.

### Memoria adaptativa (tests)
- `nihoncheck_puntos_debiles`: priorización en bancos personalizados.
- Limpieza: 3 aciertos seguidos o respuesta muy rápida elimina débil.

---

## 8. Funcionalidades en desarrollo

Ninguna tarea activa con código a medias detectado. El proyecto está en estado **estable post-refactor**.

Posibles mejoras iniciadas conceptualmente pero no implementadas:
- Ampliar lecciones de gramática (`adjetivos`, `preguntas` existen en taxonomía `temas.js` pero **no** en `lecciones.js`).
- Campo `tema` en preguntas del banco (`preguntas.js`) — hoy se infiere por carácter en diagnóstico.

---

## 9. Funcionalidades pendientes

| Pendiente | Prioridad sugerida | Notas |
|-----------|-------------------|-------|
| Lecciones gramática `adjetivos` y `preguntas` | Media | Claves en `temas.js` sin tema en `lecciones.js` → botones deshabilitados en mapa |
| Campo `tema` explícito en `preguntas.js` | Media | Mejorar precisión del perfil post-diagnóstico |
| Tests automatizados (unit/E2E) | Alta | Sin framework de test actualmente |
| Vista "Panel de Progreso" dedicada | Baja | Existió en diseño anterior; hoy progreso está en Camino + footer |
| Examen desde contenido analizado en UI actual | Media | `iniciarExamenDeContenido` existe pero no hay vista upload en `index.html` actual |
| Internacionalización | Baja | Solo español |
| Empaquetado PWA / instalable | Baja | |
| Sincronización nube / cuenta usuario | Futuro | |

---

## 10. Problemas conocidos y bugs detectados

### Resueltos recientemente (verificar no regresión)
- Test atascado en "Preparando diagnóstico" → fallback `iniciarExamen` en `nihoncheck.js`.
- Botones volver al inicio → delegación `data-action`/`data-nav` unificada.
- `temas.js` no cargado → añadido al HTML.
- `diagnosticoRealizado` desincronizado → `sincronizarDiagnosticoRealizado()`.
- Modal primera visita no abría → `esUsuarioNuevo()` en `initApp`.

### Issues abiertos / ambiguos

1. **Doble definición de `iniciarExamen`**
   - En `nihoncheck.js` (línea ~3017) e `interfazTest.js` (línea ~151).
   - La versión activa es `interfazTest.js`. Mantener sincronizadas o eliminar duplicado con cuidado.

2. **Subtemas gramática sin lección**
   - `temas.js` define `adjetivos`, `preguntas` en `CLAVES_DETALLE.gramatica`.
   - `lecciones.js` solo tiene 3 temas gramática (`gram-particles-wa`, `gram-desu`, `gram-negacion`).
   - En mapa de conocimiento, esos subtemas muestran botón `disabled`.

3. **Criterios de dominio duplicados**
   - Perfil por tema: 3 aciertos rápidos (<2000ms) → `dominado`.
   - Tarjeta biblioteca: 15 aciertos seguidos → 🟢 dominado visual.
   - Lección: ≥85% en verificación de 5 elementos → "tema dominado".
   - Son reglas **intencionalmente distintas** pero pueden confundir al usuario.

4. **Encoding en comentarios de `nihoncheck.js`**
   - Algunos comentarios muestran caracteres corruptos (`ANÃLISIS`, `â€"`). Solo cosmético.

5. **`app.js` en raíz**
   - Archivo stub; el real es `js/app.js`. No confundir.

6. **Sin `package.json`**
   - Scripts en `scripts/` requieren Node manualmente.

7. **Examen de contenido propio**
   - `NihonCheck.analizarTextoUsuario`, `iniciarExamenDeContenido` existen en código.
   - La UI de "Cargar contenido" / análisis de texto **no está** en el `index.html` actual (flujo migrado a "Agregar Material" → biblioteca).

8. **Cache busting**
   - Actualmente `?v=22`. Tras cambios, incrementar en **todos** los `<script>` y `<link>` de `index.html`.

---

## 11. Decisiones técnicas tomadas

| Decisión | Razón |
|----------|-------|
| Globals en lugar de ES Modules | Compatibilidad `file://` sin servidor |
| `window.NihonCheck` como namespace único | Evitar colisiones, API consola |
| Perfil en `nihoncheck_perfil` como SSOT | Ruta, mapa y recalibración leen de ahí |
| `diagnosticoRealizado` como string `'true'` | Clave separada además de `nihoncheck_usuario` |
| Sin progresión lineal tipo Duolingo | Filosofía del producto |
| Escritura libre vs opción múltiple | Eliminar azar y trampas |
| Dominio por velocidad (2000ms) | Diferenciar reconocimiento lento de dominio real |
| Biblioteca no se borra en reset diagnóstico | Contenido personal del usuario es sagrado |
| `interfazTest.js` separado de `nihoncheck.js` | Separación UI test / núcleo, con fallback embebido |
| Datos de lecciones en `lecciones.js` | Escalar añadiendo objetos al array `TEMAS` |
| Taxonomía en `temas.js` separada | Mapeo carácter→subtema reutilizable |

---

## 12. Convenciones de código

### JavaScript
- IIFE `(function () { 'use strict'; ... })();` en la mayoría de archivos.
- `motorAdaptativo.js`, `preguntas.js`, `interfazTest.js`, `resultados.js` usan `const NihonCheck = window.NihonCheck || {}`.
- Funciones públicas: `NihonCheck.nombreFuncion = function (...) {}`.
- Datos globales: `window.TEMAS`, `window.NihonCheckTemas`, `window.generarRutaPersonalizada`.
- Nombres en **español** para funciones de negocio: `obtenerPerfil`, `recalibrarPerfil`, `renderizarDashboardAprender`.
- IDs de temas: kebab-case (`hira-vocales`, `kanji-numeros`).
- Claves detalle perfil: camelCase (`filaK`, `en_progreso_lento` con guión bajo para estados).

### HTML/CSS
- BEM aproximado: `folder-card__name`, `dashboard-seccion__titulo`.
- Vistas: `id="view-{nombre}"`, `data-view="{nombre}"`.
- Acciones: `data-action="nombre-accion"` (manejadas en `manejarClickApp`).
- Variables CSS en `:root`: `--color-accent: #c0392b`.

### Persistencia
- Claves con prefijo `nihoncheck_` excepto `diagnosticoRealizado`.
- Siempre JSON.stringify/parse con try/catch.

---

## 13. Configuraciones importantes

### Constantes de dominio (`nihoncheck.js`)
```javascript
var ACIERTOS_DOMINIO = 3;              // aciertos rápidos seguidos → dominado (perfil)
var TIEMPO_DOMINIO_MS = 2000;          // umbral "rápido" para dominio
var TIEMPO_RAPIDO_MEMORIA_MS = 500;    // limpieza puntos débiles
var INTENTOS_RECIENTES_MAX = 5;        // ventana stats por tema
var ACIERTOS_DOMINADO_BIBLIOTECA = 15; // 🟢 visual en tarjeta biblioteca
```

### Constantes examen (`motorAdaptativo.js` / `interfazTest.js`)
```javascript
CUOTA_POR_CATEGORIA = { hiragana: 10, katakana: 10, kanji: 10 };
PUNTOS_ACIERTO = 10; PUNTOS_FALLO = 25;
DELAY_ACIERTO_MS = 600; DELAY_FALLO_MS = 1500;
UMBRAL_VELOCIDAD_MS = 500;  // aviso anti-trampa
// Badge sospechosa: promedio < 1.5s (resultados.js)
```

### Lección
- Dominio tema: ≥85% en verificación de 5 elementos.
- `UMBRAL_VELOCIDAD_LECCION_MS` = 500 (mismo aviso que test).

### UI (`app.js`)
- `DEBOUNCE_MS = 100` para vista previa romaji.

### Cache busting
- Incrementar `?v=N` en `index.html` líneas 13 y 449-458.

---

## 14. Variables de entorno necesarias

**Ninguna.** La aplicación es 100% cliente.

Opcional para desarrollo:
- Servidor estático local (Live Server, `npx serve`, etc.) — recomendado pero no obligatorio.
- Node.js solo para scripts en `scripts/`.

---

## 15. Dependencias críticas

### Runtime (carga en navegador)
| Archivo | Depende de |
|---------|------------|
| `app.js` | `NihonCheck` completo |
| `nihoncheck.js` | `preguntas`, `motorAdaptativo`, `resultados`, `interfazTest` (parcial), `temas`, `lecciones`, `rutaPersonalizada`, `RomajiConverter` |
| `interfazTest.js` | `motorAdaptativo`, `resultados` |
| `motorAdaptativo.js` | `preguntas` (vía `obtenerTodasLasPreguntas`) |
| `rutaPersonalizada.js` | `NihonCheckTemas`, `resolverTemaId` → `obtenerTemaPorClave` |
| `temas.js` | — |
| `lecciones.js` | — |
| `romajiConverter.js` | — |

### Externas
- Google Fonts CDN (requiere internet para tipografías).

### Dev (opcional)
- Node.js para `scripts/generate-preguntas.js`, `scripts/rebuild-nihoncheck.js`.

---

## 16. Flujo de datos entre módulos

### Flujo diagnóstico
```
Usuario → modal-nuevo → iniciarTestNivel()
  → iniciarExamenDiagnostico() → iniciarExamen() [interfazTest]
  → motorAdaptativo (estado, preguntas)
  → por cada respuesta: registrarResultadoMemoria() [puntos débiles]
  → al terminar: procesarDiagnosticoCompletado()
      → construirPerfilDesdeHistorial() [temas.js]
      → guardarPerfil, inicializarDominioDesdePerfil
      → marcarDiagnosticoRealizado(true)
  → generarHTMLResultadosRuta() → view-resultados-ruta
```

### Flujo práctica biblioteca
```
Clic tarjeta → renderizarPracticaTarjeta()
  → submit → procesarPracticaTarjeta()
      → registrarPracticaBiblioteca()
          → recalibrarPerfil() → actualizarRutaRecomendada()
  → refrescarDashboardSiVisible() + toast promoción/degradación
```

### Flujo lección
```
iniciarLeccion() → presentación → examen (5 preguntas)
  → cada respuesta: recalibrarPerfil({ area, tema: leccion.tema })
  → resultado ≥85%: marcarLeccionCompletada + sincronizarElementosLeccionABiblioteca
```

### Flujo agregar material
```
input → obtenerPreviewMaterial() [romajiConverter]
     → detectarCarpetaDestino()
     → agregarMaterial() → procesarEntradaMaterial()
     → guardarBibliotecaPersonal()
```

### Objeto perfil (`nihoncheck_perfil`) — estructura
```javascript
{
  diagnosticoCompletado: boolean,
  inicioDesdeCero: boolean,          // si saltó examen
  fechaInicio / fechaDiagnostico: ISO string,
  porcentajesPorArea: { hiragana, katakana, kanji, gramatica },
  porcentajes: { ... },              // alias legacy
  nivelesArea / niveles: { ... },     // principiante | intermedio | avanzado
  detalle: {
    hiragana: { vocales: 'por_reforzar', filaK: 'en_progreso', ... },
    katakana: { ... },
    kanji: { ... },
    gramatica: { ... }
  },
  estadisticasTema: {
    'hiragana:vocales': { aciertos, fallos, aciertosSeguidos, aciertosSeguidosRapidos, ultimosIntentos[], tiempoPromedioMs }
  },
  recomendaciones: [ { area, nivel, titulo, porcentaje, temas: [...] } ]
}
```

### Objeto biblioteca (`nihoncheck_biblioteca_personal`)
```javascript
{
  hiragana: [{ caracter, lectura, fuente: 'manual'|'automatica', aciertosSeguidos, ultimoResultado, ultimaPractica, ... }],
  katakana: [...],
  kanji: [...],
  gramatica: [{ titulo, explicacion, ejemplo, lectura, fuente, ... }]
}
```

---

## 17. Últimas tareas realizadas

### Refactor Continuous Adaptive Learning
- `generarRutaPersonalizada()` reescrito: solo `por_reforzar`, `en_progreso`, `en_progreso_lento`; excluye `dominado`.
- Dashboard consolidado: "Tu ruta para hoy" + "Mapa de conocimiento" + explorador áreas.
- `resetearDiagnostico()` — reset ligero sin borrar biblioteca.
- Sincronización `diagnosticoRealizado` con `guardarUsuario()`.
- Degradación: un fallo en tema dominado → `por_reforzar`.
- Eliminados restos de bloqueo secuencial.
- `inicioDesdeCero` sincronizado en objeto usuario.

### Auditoría de errores
- Modal primera visita + botón "Saltar examen e iniciar desde 0".
- `inicializarPerfilDesdeCero()` implementado.
- `puedeAccederAprendizaje()` para bypass post-skip.
- Footer "Repetir diagnóstico" condicional.
- `TIEMPO_DOMINIO_MS = 2000`.
- Cache `?v=22` (nota: auditoría mencionó v=23; estado actual del repo es **v=22**).

---

## 18. Próximos pasos recomendados

1. **Completar lecciones gramática faltantes** (`gram-adjetivos`, `gram-preguntas`) alineadas con `temas.js`.
2. **Añadir campo `tema`** a preguntas en `preguntas.js` para diagnóstico más preciso.
3. **Decidir destino del flujo "analizar texto → examinar"** — reintegrar UI o documentar como deprecado.
4. **Unificar o documentar** criterios de dominio (perfil vs biblioteca vs lección).
5. **Eliminar o sincronizar** duplicado `iniciarExamen` entre `nihoncheck.js` e `interfazTest.js`.
6. **Añadir tests** mínimos para `calcularEstadoTema`, `generarRutaPersonalizada`, `convertirRomajiAKana`.
7. **Incrementar cache** a `?v=23` tras próximos cambios.
8. **Considerar `package.json`** con script `serve` para desarrollo.

---

## 19. Riesgos o puntos que requieren atención

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| `nihoncheck.js` monolítico (~3200 líneas) | Difícil mantenimiento | Extraer módulos con cuidado de orden carga |
| Sin tests | Regresiones silenciosas | Probar flujos manualmente tras cada cambio |
| `file://` + múltiples scripts | Fallos intermitentes de carga | Usar servidor local; fallback embebido en nihoncheck |
| localStorage límite ~5MB | Pérdida datos en bibliotecas grandes | Monitorear tamaño |
| Dos fuentes verdad dominio (`perfil.detalle` vs `nihoncheck_dominio`) | Inconsistencias | `sincronizarDominioDesdeDetalle()` mantiene sync |
| Subtemas sin lección | UX rota en mapa | Completar datos o ocultar subtemas vacíos |
| Dependencia Google Fonts offline | Tipografía fallback | Self-host fonts si PWA |

---

## 20. Contexto para continuar exactamente donde se quedó

### Cómo ejecutar
1. Abrir `index.html` en navegador (mejor con servidor local).
2. Hard refresh: **Ctrl+F5** tras cambios.
3. Reset usuario: consola → `localStorage.clear(); location.reload();`

### Flujos de prueba manual
| Escenario | Pasos | Resultado esperado |
|-----------|-------|-------------------|
| Primera visita | `localStorage.clear()` → reload | Modal con 2 botones |
| Skip examen | "Saltar examen e iniciar desde 0" | Dashboard con ruta, sin `diagnosticoRealizado` |
| Diagnóstico | Completar 30 preguntas | `diagnosticoRealizado === 'true'`, perfil granular |
| Práctica biblioteca | Practicar tarjeta con tiempo | Perfil recalibra, toast si promoción/degradación |
| Repetir diagnóstico | Footer → Repetir | Biblioteca intacta, nuevo test |
| Reiniciar progreso | Footer → Reiniciar | Perfil borrado, biblioteca conservada, modal reaparece |

### API consola útil
```javascript
NihonCheck.obtenerPerfil()
NihonCheck.obtenerDominio()
NihonCheck.obtenerBibliotecaPersonal()
NihonCheck.obtenerPuntosDebiles()
NihonCheck.obtenerUsuario()
localStorage.getItem('diagnosticoRealizado')
generarRutaPersonalizada(NihonCheck.obtenerPerfil())
RomajiConverter.convertirRomajiInteligente('neko')
RomajiConverter.agregarRegla('tsu', 'つ')  // extender diccionario
```

### Puntos de extensión para nuevas features
- **Nuevas lecciones:** añadir objeto a `window.TEMAS.{area}` en `lecciones.js` con `id`, `tema` (clave detalle), `elementos`.
- **Nuevas preguntas:** añadir a `NihonCheck.PREGUNTAS` en `preguntas.js`.
- **Nuevos subtemas:** actualizar `CLAVES_DETALLE` y `SETS_CARACTER` en `temas.js` + lección correspondiente.
- **Nuevas acciones UI:** `data-action` en HTML + handler en `manejarClickApp()` (`js/app.js`).
- **Nuevas vistas:** sección en `index.html` + entrada en `views` object en `initApp()`.

### Archivos que NO tocar sin entender impacto
- Orden de scripts en `index.html`
- `calcularEstadoTema()` — reglas de dominio
- `esUsuarioNuevo()` — lógica onboarding
- `sincronizarDiagnosticoRealizado()` — doble clave diagnóstico

### Historial de conversación
Transcript completo del desarrollo:  
`C:\Users\siste\.cursor\projects\c-Users-siste-Desktop-japon-test\agent-transcripts\a41500b2-034c-4aae-92b9-c8030e7e0cd0\a41500b2-034c-4aae-92b9-c8030e7e0cd0.jsonl`

---

# PROMPT PARA NUEVO CHAT

Copia y pega el siguiente bloque completo al iniciar un chat nuevo en Cursor:

---

```
Eres el agente de desarrollo de NihonCheck, una aplicación web estática para hispanohablantes que aprenden japonés. El proyecto está en c:\Users\siste\Desktop\japon-test.

## FILOSOFÍA DEL PRODUCTO (NO NEGOCIABLE)
NihonCheck NO es Duolingo. Su propósito es: "Detectar lo que el usuario ya sabe para evitar que pierda tiempo estudiando contenido que ya domina."
- Sin progresión lineal bloqueada (no candados, no árbol obligatorio).
- El diagnóstico inicial es OPCIONAL (modal: "Hacer diagnóstico" o "Saltar examen e iniciar desde 0").
- La ruta "Tu ruta para hoy" solo muestra temas NO dominados (por_reforzar, en_progreso, en_progreso_lento).
- El estudio (flashcards, biblioteca) tiene prioridad sobre el examen.
- Dominio por velocidad: ✅ dominado solo con 3 aciertos rápidos consecutivos (<2000ms). Acierto lento → en_progreso_lento. Un fallo → por_reforzar inmediato.

## STACK
- HTML + CSS + JavaScript vanilla, SIN framework, SIN npm, SIN backend.
- Compatible con file:// (NO usar ES Modules import/export).
- Estado en localStorage únicamente.
- Globals: window.NihonCheck, window.NihonCheckTemas, window.TEMAS, window.generarRutaPersonalizada, window.RomajiConverter.

## ORDEN DE SCRIPTS (index.html, actualmente ?v=22)
romajiConverter.js → preguntas.js → lecciones.js → temas.js → rutaPersonalizada.js → motorAdaptativo.js → resultados.js → nihoncheck.js → interfazTest.js → app.js

## ESTRUCTURA CLAVE
- index.html — UI con vistas: home, biblioteca, camino, test-nivel, resultados-ruta, aprender, lecciones-lista, leccion. Modales: modal-nuevo, modal-agregar.
- js/app.js — Punto de entrada: navegación (showView), eventos (data-action), modales, agregar material, flujos diagnóstico.
- js/nihoncheck.js — Núcleo (~3200 líneas): biblioteca, memoria, perfil, dominio, lecciones UI, dashboard, fallback iniciarExamen.
- js/temas.js — Taxonomía subtemas + construirPerfilDesdeHistorial().
- js/lecciones.js — Datos TEMAS por área (escalable, añadir objetos al array).
- js/rutaPersonalizada.js — generarRutaPersonalizada(), obtenerObjetivosSugeridos().
- js/preguntas.js — 200 preguntas (75 hiragana + 75 katakana + 50 kanji N5).
- js/motorAdaptativo.js — Examen adaptativo bloques 10+10+10, puntuación asimétrica.
- js/interfazTest.js — UI test escritura libre romaji (SOBRESCRIBE iniciarExamen de nihoncheck).
- js/romajiConverter.js — Conversor romaji (minúsculas→hiragana, MAYÚSCULAS→katakana), detectarCarpetaDestino.
- js/resultados.js — Heatmap, badge "Sospechosa" si promedio <1.5s.
- styles.css — Diseño minimalista japonés: blanco, rojo #c0392b, gris.
- app.js (raíz) — STUB vacío, ignorar. El real es js/app.js.
- TRANSFERENCIA.md — Documento de transferencia completo.

## LOCALSTORAGE (claves importantes)
- diagnosticoRealizado — string 'true' tras diagnóstico (sync con usuario)
- nihoncheck_usuario — { diagnosticoCompletado, empezoDesdeCero, inicioDesdeCero, primeraVisitaCompletada, areaElegida }
- nihoncheck_perfil — SSOT: detalle granular por subtema, estadisticasTema, recomendaciones, porcentajesPorArea
- nihoncheck_dominio — cache temaId → estado (sync desde detalle)
- nihoncheck_biblioteca_personal — { hiragana[], katakana[], kanji[], gramatica[] } con fuente manual|automatica
- nihoncheck_puntos_debiles — memoria adaptativa para tests
- nihoncheck_progreso_lecciones — metadata completado lecciones
- nihoncheck_caracteres_aprendidos — legacy, migrado a biblioteca
- nihoncheck_ultimo_examen — snapshot último diagnóstico

## CONSTANTES CRÍTICAS (nihoncheck.js)
ACIERTOS_DOMINIO = 3, TIEMPO_DOMINIO_MS = 2000, ACIERTOS_DOMINADO_BIBLIOTECA = 15

## FLUJOS DE USUARIO
1. HOME: Área Estudio Personal (carpetas→biblioteca, Agregar Material) + Camino (→Aprender con la web).
2. PRIMERA VISITA: modal-nuevo auto-abre si esUsuarioNuevo(). Skip → inicializarPerfilDesdeCero(). Diagnóstico → 30 preguntas → procesarDiagnosticoCompletado().
3. APRENDER: Dashboard con "Tu ruta para hoy" + "Mapa de conocimiento" + áreas. Clic tema → lección (presentación 5 elem → verificación romaji).
4. BIBLIOTECA: flashcards, filtros estado, práctica individual con recalibrarPerfil().
5. AGREGAR MATERIAL: romaji preview, carpeta auto, Guardar y Limpiar.
6. CONFIG FOOTER: Repetir diagnóstico (resetearDiagnostico, mantiene biblioteca), Reiniciar progreso (reiniciarProgresoUsuario).

## ESTADO ACTUAL
- MVP funcional, post-refactor adaptive learning + auditoría errores.
- Cache ?v=22 en index.html.
- Sin tests automatizados.
- Sin package.json.

## PROBLEMAS CONOCIDOS / PENDIENTES
1. Subtemas gramática adjetivos/preguntas en temas.js SIN lección en lecciones.js (botones disabled en mapa).
2. preguntas.js sin campo tema explícito (se infiere por carácter).
3. iniciarExamen duplicado en nihoncheck.js e interfazTest.js (activo: interfazTest).
4. Flujo "analizar texto → examinar contenido" existe en código (iniciarExamenDeContenido) pero NO en UI actual.
5. Criterios dominio distintos: perfil (3 rápidos), biblioteca (15 seguidos), lección (85%).
6. Tras cambios JS/CSS, incrementar ?v=N en index.html y pedir Ctrl+F5.

## CONVENCIONES
- Funciones negocio en español: obtenerPerfil, recalibrarPerfil, renderizarDashboardAprender.
- Eventos UI: data-action en HTML, manejarClickApp() en app.js.
- Vistas: showView('nombre'), views object en initApp.
- No usar ES modules. Extender window.NihonCheck.
- Cambios mínimos, no over-engineer. Match estilo existente.
- No crear commits salvo que el usuario lo pida.

## CÓMO PROBAR
localStorage.clear(); location.reload(); — primera visita
NihonCheck.obtenerPerfil() — ver perfil en consola
Ctrl+F5 — hard refresh tras cambios

## TAREA
[Describe aquí lo que necesitas hacer]

Antes de implementar, lee los archivos relevantes del proyecto. Respeta la filosofía anti-Duolingo. Mantén compatibilidad file://. Si modificas lógica de perfil/dominio, verifica flujos: primera visita, skip, diagnóstico, práctica biblioteca, lección, reset diagnóstico, reiniciar progreso.
```

---

*Fin del documento de transferencia.*
