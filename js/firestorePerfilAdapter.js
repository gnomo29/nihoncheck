/**
 * NihonCheck — adaptador Firestore para perfil y datos locales.
 * Requiere Firebase inicializado (js/firebaseAuth.js) y usuario autenticado.
 * Sin Firebase o sin sesión: todas las funciones degradan sin error.
 */
(function () {
  'use strict';

  /** Claves localStorage → documento en users/{uid}/data/{docId} */
  var CLAVES_MIGRACION = [
    { storageKey: 'nihoncheck_perfil', docId: 'perfil' },
    { storageKey: 'nihoncheck_usuario', docId: 'usuario' },
    { storageKey: 'nihoncheck_biblioteca_personal', docId: 'biblioteca' },
    { storageKey: 'nihoncheck_dominio', docId: 'dominio' },
    { storageKey: 'nihoncheck_gramatica', docId: 'gramatica' },
    { storageKey: 'nihoncheck_puntos_debiles', docId: 'puntosDebiles' },
    { storageKey: 'nihoncheck_caracteres_aprendidos', docId: 'caracteresAprendidos' },
    { storageKey: 'nihoncheck_ultimo_examen', docId: 'ultimoExamen' },
    { storageKey: 'nihoncheck_estudio_pendiente', docId: 'estudioPendiente' },
    { storageKey: 'nihoncheck_progreso_lecciones', docId: 'progresoLecciones' },
    { storageKey: 'nihoncheck_actividad_diaria', docId: 'actividadDiaria' },
    { storageKey: 'nihoncheck_srs_config', docId: 'srsConfig' },
  ];

  var CLAVES_INDICADOR_LOCAL = [
    'nihoncheck_perfil',
    'nihoncheck_usuario',
    'nihoncheck_biblioteca_personal',
    'nihoncheck_dominio',
  ];

  function getFirebaseRuntime() {
    return window.NihonCheckFirebase || null;
  }

  function getDb() {
    var rt = getFirebaseRuntime();
    return rt && rt.db ? rt.db : null;
  }

  function getAuth() {
    var rt = getFirebaseRuntime();
    return rt && rt.auth ? rt.auth : null;
  }

  function getCurrentUid() {
    var auth = getAuth();
    return auth && auth.currentUser ? auth.currentUser.uid : null;
  }

  function serverTimestamp() {
    if (typeof firebase !== 'undefined' && firebase.firestore && firebase.firestore.FieldValue) {
      return firebase.firestore.FieldValue.serverTimestamp();
    }
    return new Date();
  }

  function dataDocRef(uid, docId) {
    return getDb().collection('users').doc(uid).collection('data').doc(docId);
  }

  function metaDocRef(uid) {
    return getDb().collection('users').doc(uid).collection('meta').doc('lastSync');
  }

  function leerLocalJSON(clave) {
    try {
      var raw = localStorage.getItem(clave);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function escribirLocalJSON(clave, valor) {
    try {
      localStorage.setItem(clave, JSON.stringify(valor));
      return true;
    } catch (e) {
      return false;
    }
  }

  /** Firebase listo y usuario con sesión iniciada. */
  function isFirestoreAvailable() {
    if (!getDb() || !getAuth()) return false;
    return !!getAuth().currentUser;
  }

  /** Guarda perfil en users/{uid}/data/perfil y actualiza meta/lastSync. */
  function savePerfilToFirestore(uid, perfil) {
    var db = getDb();
    if (!db || !uid || perfil == null) return Promise.resolve(false);

    var batch = db.batch();
    batch.set(
      dataDocRef(uid, 'perfil'),
      { payload: perfil, updatedAt: serverTimestamp() },
      { merge: true }
    );
    batch.set(metaDocRef(uid), { lastSync: serverTimestamp() }, { merge: true });

    return batch.commit()
      .then(function () { return true; })
      .catch(function (err) {
        console.warn('[NihonCheck Firestore] savePerfil:', err);
        return false;
      });
  }

  /** Carga perfil remoto o null si no existe. */
  function loadPerfilFromFirestore(uid) {
    var db = getDb();
    if (!db || !uid) return Promise.resolve(null);

    return dataDocRef(uid, 'perfil').get()
      .then(function (snap) {
        if (!snap.exists) return null;
        var data = snap.data();
        return data && data.payload != null ? data.payload : null;
      })
      .catch(function (err) {
        console.warn('[NihonCheck Firestore] loadPerfil:', err);
        return null;
      });
  }

  /** ¿Hay datos locales relevantes para migrar? */
  function hasLocalData() {
    for (var i = 0; i < CLAVES_INDICADOR_LOCAL.length; i++) {
      try {
        if (localStorage.getItem(CLAVES_INDICADOR_LOCAL[i])) return true;
      } catch (e) { /* sin localStorage */ }
    }
    return false;
  }

  /** ¿La cuenta remota no tiene perfil ni biblioteca? */
  function isRemoteEmpty(uid) {
    var db = getDb();
    if (!db || !uid) return Promise.resolve(true);

    return dataDocRef(uid, 'perfil').get()
      .then(function (perfilSnap) {
        if (perfilSnap.exists) return false;
        return dataDocRef(uid, 'biblioteca').get();
      })
      .then(function (bibSnap) {
        if (bibSnap === false) return false;
        if (!bibSnap) return true;
        return !bibSnap.exists;
      })
      .catch(function () {
        return true;
      });
  }

  /**
   * Sube todas las claves locales conocidas a Firestore.
   * Estructura: users/{uid}/data/{docId} con campo payload.
   */
  function migrateLocalToRemote(uid) {
    var db = getDb();
    if (!db || !uid) return Promise.resolve({ ok: false, migrated: 0 });

    var batch = db.batch();
    var migrated = 0;

    for (var i = 0; i < CLAVES_MIGRACION.length; i++) {
      var entry = CLAVES_MIGRACION[i];
      var payload = leerLocalJSON(entry.storageKey);
      if (payload == null) continue;

      batch.set(
        dataDocRef(uid, entry.docId),
        { payload: payload, updatedAt: serverTimestamp(), source: 'localMigration' },
        { merge: true }
      );
      migrated++;
    }

    if (migrated === 0) {
      return Promise.resolve({ ok: true, migrated: 0 });
    }

    batch.set(metaDocRef(uid), { lastSync: serverTimestamp(), migratedFrom: 'localStorage' }, { merge: true });

    return batch.commit()
      .then(function () {
        document.dispatchEvent(new CustomEvent('nihoncheck-firestore-migrated', {
          detail: { uid: uid, migrated: migrated },
        }));
        return { ok: true, migrated: migrated };
      })
      .catch(function (err) {
        console.warn('[NihonCheck Firestore] migrate:', err);
        return { ok: false, migrated: 0, error: err };
      });
  }

  /** Tras guardarPerfil local: sube perfil si hay sesión (no bloquea la UI). */
  function syncPerfilIfLoggedIn() {
    if (!isFirestoreAvailable()) return Promise.resolve(false);

    var uid = getCurrentUid();
    var NC = window.NihonCheck;
    if (!uid || !NC || !NC.obtenerPerfil) return Promise.resolve(false);

    var perfil = NC.obtenerPerfil();
    if (!perfil) return Promise.resolve(false);

    return savePerfilToFirestore(uid, perfil);
  }

  /**
   * Tras login: ofrece migración si hay datos locales y la nube está vacía.
   * Llamar desde onAuthStateChanged cuando user != null.
   */
  function offerMigrationIfNeeded(uid) {
    if (!uid || !getDb()) return Promise.resolve(false);
    if (!hasLocalData()) return Promise.resolve(false);

    return isRemoteEmpty(uid).then(function (empty) {
      if (!empty) return false;

      var aceptar = false;
      try {
        aceptar = window.confirm(
          'Tienes progreso guardado en este dispositivo.\n\n' +
          '¿Subirlo a tu cuenta en la nube? (recomendado la primera vez que inicias sesión)'
        );
      } catch (e) {
        return false;
      }

      if (!aceptar) return false;

      return migrateLocalToRemote(uid).then(function (result) {
        return !!(result && result.ok);
      });
    });
  }

  /** Descarga documentos remotos a localStorage (opcional, p. ej. nuevo dispositivo). */
  function applyRemoteToLocal(uid) {
    var db = getDb();
    if (!db || !uid) return Promise.resolve(false);

    var promises = CLAVES_MIGRACION.map(function (entry) {
      return dataDocRef(uid, entry.docId).get().then(function (snap) {
        if (!snap.exists) return false;
        var data = snap.data();
        if (data && data.payload != null) {
          return escribirLocalJSON(entry.storageKey, data.payload);
        }
        return false;
      });
    });

    return Promise.all(promises).then(function (results) {
      return results.some(Boolean);
    });
  }

  /** Descarga documentos remotos a localStorage. strategy: 'replace' | 'merge' */
  function loadAllFromFirestore(uid, options) {
    var db = getDb();
    if (!db || !uid) return Promise.resolve({ aplicados: 0 });

    var strategy = (options && options.strategy) || 'replace';

    var promises = CLAVES_MIGRACION.map(function (entry) {
      return dataDocRef(uid, entry.docId).get().then(function (snap) {
        if (!snap.exists) return 0;
        var data = snap.data();
        if (!data || data.payload == null) return 0;

        if (strategy === 'merge' && leerLocalJSON(entry.storageKey) != null) {
          return 0;
        }

        return escribirLocalJSON(entry.storageKey, data.payload) ? 1 : 0;
      });
    });

    return Promise.all(promises).then(function (counts) {
      var aplicados = counts.reduce(function (sum, n) { return sum + n; }, 0);
      return { aplicados: aplicados };
    }).catch(function (err) {
      console.warn('[NihonCheck Firestore] loadAll:', err);
      return { aplicados: 0 };
    });
  }

  window.NihonCheckFirestore = {
    isFirestoreAvailable: isFirestoreAvailable,
    savePerfilToFirestore: savePerfilToFirestore,
    loadPerfilFromFirestore: loadPerfilFromFirestore,
    migrateLocalToRemote: migrateLocalToRemote,
    syncPerfilIfLoggedIn: syncPerfilIfLoggedIn,
    offerMigrationIfNeeded: offerMigrationIfNeeded,
    hasLocalData: hasLocalData,
    isRemoteEmpty: isRemoteEmpty,
    applyRemoteToLocal: applyRemoteToLocal,
    loadAllFromFirestore: loadAllFromFirestore,
    CLAVES_MIGRACION: CLAVES_MIGRACION,
  };
})();
