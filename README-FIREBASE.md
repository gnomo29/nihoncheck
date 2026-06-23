# Firebase — autenticación y sincronización de perfil (NihonCheck)

La cuenta en la nube es **opcional**. Sin Firebase, o abriendo la app con `file://`, todo sigue guardándose en `localStorage`.

## Requisitos

- HTTPS o `http://localhost` (`npm run dev`). **No funciona en `file://`** por restricciones del SDK.
- Proyecto en [Firebase Console](https://console.firebase.google.com/).

## Configuración rápida

1. Crea un proyecto Firebase.
2. **Authentication** → Sign-in method → activa **Correo/Contraseña**.
3. **Firestore Database** → crea base de datos (modo producción o prueba).
4. Registra una app **Web** y copia el objeto de configuración.
5. Copia `js/firebase-config.example.js` → `js/firebase-config.js` y rellena los valores.
6. (Opcional) Usa `.env.example` como referencia de nombres de variables.

### Variables de entorno (referencia)

```env
FIREBASE_API_KEY=tu_api_key
FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
FIREBASE_PROJECT_ID=tu-proyecto
FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789012
FIREBASE_APP_ID=1:123456789012:web:abcdef123456
```

El cliente web lee `window.NIHONCHECK_FIREBASE_CONFIG` desde `js/firebase-config.js` (no desde `.env` directamente).

## Reglas Firestore (ejemplo)

Solo el usuario autenticado puede leer/escribir sus datos:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Estructura en Firestore

```
users/{uid}/data/perfil          ← nihoncheck_perfil (JSON en campo payload)
users/{uid}/data/usuario         ← nihoncheck_usuario
users/{uid}/data/biblioteca      ← nihoncheck_biblioteca_personal
users/{uid}/data/dominio         ← nihoncheck_dominio
users/{uid}/data/gramatica       ← nihoncheck_gramatica
users/{uid}/data/...             ← otras claves locales (ver firestorePerfilAdapter.js)
users/{uid}/meta/lastSync        ← marca de tiempo de última sincronización
```

## Flujo de migración local → remoto

1. El usuario usa la app sin cuenta; el progreso queda en `localStorage`.
2. Inicia sesión (email/contraseña) con Firebase Auth.
3. Si hay datos locales y la cuenta remota está vacía, aparece un diálogo:
   *«¿Subirlo a tu cuenta en la nube?»*
4. Al aceptar, `migrateLocalToRemote(uid)` sube todas las claves conocidas.
5. Cada vez que se llama `NihonCheck.guardarPerfil()`, si hay sesión, `syncPerfilIfLoggedIn()` actualiza `data/perfil` en segundo plano.

### Resolución de conflictos

- **Primera migración:** gana el dispositivo local (subida completa).
- **Uso habitual:** cada `guardarPerfil` local dispara sync del perfil; el remoto se sobrescribe con el último guardado local.
- **Nuevo dispositivo:** usa `NihonCheckFirestore.applyRemoteToLocal(uid)` (manual o desde UI futura) para bajar la nube al `localStorage`.

## API del adaptador (`window.NihonCheckFirestore`)

| Función | Descripción |
|---------|-------------|
| `isFirestoreAvailable()` | Firebase listo y usuario logueado |
| `savePerfilToFirestore(uid, perfil)` | Guarda perfil en `users/{uid}/data/perfil` |
| `loadPerfilFromFirestore(uid)` | Devuelve `perfil` o `null` |
| `migrateLocalToRemote(uid)` | Sube todas las claves locales |
| `syncPerfilIfLoggedIn()` | Sync tras guardar perfil local |
| `offerMigrationIfNeeded(uid)` | Diálogo de migración tras login |
| `loadAllFromFirestore(uid, opts)` | Baja datos remotos a localStorage (`strategy: 'merge'|'replace'`) |

## Puntos de enganche en el código

- `js/nihoncheck.js` → final de `guardarPerfil` llama a `syncPerfilIfLoggedIn()`.
- `js/firebaseAuth.js` → `onAuthStateChanged` llama a `offerMigrationIfNeeded` al iniciar sesión.
- `js/app.js` → `initFirebaseAuth()` al arrancar (si hay config válida).

## Scripts cargados (index.html)

Orden: SDK Firebase (CDN) → `firebase-config.js` → `firestorePerfilAdapter.js` → `firebaseAuth.js` → resto de la app.

`window.NihonCheckAuth` delega `migrateLocalToFirestore` / `loadAllFromFirestore` al adaptador (botones del modal Cuenta).

## CDN vs npm

Se usa **CDN compat** (`firebase-app-compat`, `firebase-auth-compat`, `firebase-firestore-compat`) para compatibilidad con la app estática sin bundler. El paquete npm no es necesario para el cliente.

## Seguridad

- No subas `js/firebase-config.js` con claves reales (está en `.gitignore`).
- Usa reglas Firestore que restrinjan `users/{uid}` al propio `uid`.
