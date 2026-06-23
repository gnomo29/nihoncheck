/**
 * NihonCheck — autenticación Firebase (email/contraseña), opcional.
 * Sin configuración válida o en file:// la app sigue funcionando solo con localStorage.
 */
(function () {
  'use strict';

  var _auth = null;
  var _db = null;
  var _initialized = false;
  var _authCallbacks = [];
  var _migrationOfferedForUid = null;

  function isHttpContext() {
    var p = window.location.protocol;
    return p === 'http:' || p === 'https:';
  }

  function isConfigValid(config) {
    if (!config || !config.apiKey || !config.projectId) return false;
    if (config.apiKey === 'TU_API_KEY' || config.projectId === 'tu-proyecto') return false;
    return true;
  }

  function mapAuthError(err) {
    var code = err && err.code ? err.code : '';
    var map = {
      'auth/invalid-email': 'Correo electrónico no válido.',
      'auth/user-disabled': 'Esta cuenta está deshabilitada.',
      'auth/user-not-found': 'No hay cuenta con ese correo.',
      'auth/wrong-password': 'Contraseña incorrecta.',
      'auth/email-already-in-use': 'Ese correo ya está registrado.',
      'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
      'auth/too-many-requests': 'Demasiados intentos. Espera un momento.',
      'auth/network-request-failed': 'Error de red. Comprueba tu conexión.',
      'auth/invalid-credential': 'Credenciales incorrectas.',
    };
    return map[code] || (err && err.message) || 'Error de autenticación.';
  }

  function notifyAuthChange(user) {
    for (var i = 0; i < _authCallbacks.length; i++) {
      try {
        _authCallbacks[i](user);
      } catch (e) { /* noop */ }
    }
  }

  function onLoginSuccess(user) {
    if (!user || !user.uid) return;
    if (_migrationOfferedForUid === user.uid) return;
    _migrationOfferedForUid = user.uid;

    var FS = window.NihonCheckFirestore;
    if (FS && FS.offerMigrationIfNeeded) {
      FS.offerMigrationIfNeeded(user.uid);
    }
  }

  /** Inicializa Firebase App, Auth y Firestore. Devuelve true si quedó listo. */
  function initFirebase(config) {
    if (_initialized) return !!_auth;
    if (!isHttpContext()) return false;
    if (typeof firebase === 'undefined') return false;
    if (!isConfigValid(config)) return false;

    try {
      var app = firebase.apps.length ? firebase.app() : firebase.initializeApp(config);
      _auth = firebase.auth();
      _db = firebase.firestore();
      _initialized = true;

      window.NihonCheckFirebase = {
        app: app,
        auth: _auth,
        db: _db,
      };

      _auth.onAuthStateChanged(function (user) {
        notifyAuthChange(user);
        if (user) onLoginSuccess(user);
        else _migrationOfferedForUid = null;
      });

      return true;
    } catch (err) {
      console.warn('[NihonCheck Firebase] init:', err);
      return false;
    }
  }

  function initFromWindowConfig() {
    return initFirebase(window.NIHONCHECK_FIREBASE_CONFIG);
  }

  function onAuthStateChanged(callback) {
    if (typeof callback === 'function') _authCallbacks.push(callback);
    if (_auth && _auth.currentUser !== undefined) {
      try { callback(_auth.currentUser); } catch (e) { /* noop */ }
    }
    return function () {
      var idx = _authCallbacks.indexOf(callback);
      if (idx >= 0) _authCallbacks.splice(idx, 1);
    };
  }

  function login(email, password) {
    if (!_auth) return Promise.reject(new Error('Firebase no configurado'));
    return _auth.signInWithEmailAndPassword(email, password)
      .catch(function (err) {
        throw new Error(mapAuthError(err));
      });
  }

  function register(email, password) {
    if (!_auth) return Promise.reject(new Error('Firebase no configurado'));
    return _auth.createUserWithEmailAndPassword(email, password)
      .catch(function (err) {
        throw new Error(mapAuthError(err));
      });
  }

  function logout() {
    if (!_auth) return Promise.resolve();
    _migrationOfferedForUid = null;
    return _auth.signOut();
  }

  function getCurrentUser() {
    return _auth && _auth.currentUser ? _auth.currentUser : null;
  }

  function isAvailable() {
    return _initialized && !!_auth;
  }

  /** Sincronización manual: sube todo el localStorage relevante. */
  function syncAllLocalToFirestore() {
    var user = getCurrentUser();
    var FS = window.NihonCheckFirestore;
    if (!user || !FS || !FS.migrateLocalToRemote) {
      return Promise.resolve({ ok: false, migrated: 0 });
    }
    return FS.migrateLocalToRemote(user.uid);
  }

  function traducirError(err) {
    if (!err) return 'Error desconocido';
    if (typeof err === 'string') return err;
    if (err.message) return err.message;
    return mapAuthError(err);
  }

  /** Delega en el adaptador Firestore (subida completa local → remoto). */
  function migrateLocalToFirestore(uid) {
    var FS = window.NihonCheckFirestore;
    if (!uid || !FS || !FS.migrateLocalToRemote) {
      return Promise.reject(new Error('Firestore no disponible'));
    }
    return FS.migrateLocalToRemote(uid).then(function (res) {
      if (res && res.ok) return res;
      throw new Error('No se pudo sincronizar con la nube');
    });
  }

  /** Delega en el adaptador Firestore (descarga remoto → localStorage). */
  function loadAllFromFirestore(uid, options) {
    var FS = window.NihonCheckFirestore;
    if (!uid || !FS || !FS.loadAllFromFirestore) {
      return Promise.reject(new Error('Firestore no disponible'));
    }
    return FS.loadAllFromFirestore(uid, options);
  }

  var api = {
    initFirebase: initFirebase,
    initFromWindowConfig: initFromWindowConfig,
    onAuthStateChanged: onAuthStateChanged,
    login: login,
    register: register,
    logout: logout,
    getCurrentUser: getCurrentUser,
    isAvailable: isAvailable,
    syncAllLocalToFirestore: syncAllLocalToFirestore,
    migrateLocalToFirestore: migrateLocalToFirestore,
    loadAllFromFirestore: loadAllFromFirestore,
    traducirError: traducirError,
    mapAuthError: mapAuthError,
  };

  window.NihonCheckAuth = api;
  window.NihonCheckFirebaseAuth = api;
})();
