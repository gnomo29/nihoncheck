/* ============================================================
   NihonCheck — Exportar / importar backup JSON (localStorage)
   Expone: window.NihonCheckBackup
   ============================================================ */

(function () {
  'use strict';

  var BACKUP_VERSION = 1;

  var CLAVE_PERFIL = 'nihoncheck_perfil';
  var CLAVE_BIBLIOTECA = 'nihoncheck_biblioteca_personal';
  var CLAVE_DOMINIO = 'nihoncheck_dominio';
  var CLAVE_USUARIO = 'nihoncheck_usuario';
  var CLAVE_SRS_CONFIG = 'nihoncheck_srs_config';

  var CARPETAS_BIBLIOTECA = ['hiragana', 'katakana', 'kanji', 'gramatica'];

  function leerClaveRaw(clave) {
    try {
      var raw = localStorage.getItem(clave);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function escribirClave(clave, valor) {
    var NC = window.NihonCheck;
    if (NC && NC._escribirJSON) {
      NC._escribirJSON(clave, valor);
      return;
    }
    try {
      localStorage.setItem(clave, JSON.stringify(valor));
    } catch (e) {
      // localStorage puede fallar en modo privado o con cuota llena
    }
  }

  function fechaArchivo() {
    var d = new Date();
    var mes = ('0' + (d.getMonth() + 1)).slice(-2);
    var dia = ('0' + d.getDate()).slice(-2);
    return d.getFullYear() + '-' + mes + '-' + dia;
  }

  function esObjeto(valor) {
    return valor !== null && typeof valor === 'object' && !Array.isArray(valor);
  }

  function validarSrs(srs, ruta) {
    var errores = [];
    if (srs === undefined || srs === null) return errores;
    if (!esObjeto(srs)) {
      errores.push(ruta + ': srs debe ser un objeto.');
      return errores;
    }
    if (srs.nivel !== undefined && typeof srs.nivel !== 'number') {
      errores.push(ruta + '.srs.nivel debe ser un número.');
    }
    if (srs.rachaAciertos !== undefined && typeof srs.rachaAciertos !== 'number') {
      errores.push(ruta + '.srs.rachaAciertos debe ser un número.');
    }
    if (srs.vecesRepasado !== undefined && typeof srs.vecesRepasado !== 'number') {
      errores.push(ruta + '.srs.vecesRepasado debe ser un número.');
    }
    if (srs.proximoRepaso !== undefined && srs.proximoRepaso !== null && typeof srs.proximoRepaso !== 'string') {
      errores.push(ruta + '.srs.proximoRepaso debe ser null o una cadena ISO/fecha.');
    }
    if (srs.ultimoRepaso !== undefined && srs.ultimoRepaso !== null && typeof srs.ultimoRepaso !== 'string') {
      errores.push(ruta + '.srs.ultimoRepaso debe ser null o una cadena ISO/fecha.');
    }
    return errores;
  }

  function validarItemBiblioteca(item, ruta) {
    var errores = [];
    if (!esObjeto(item)) {
      errores.push(ruta + ': cada ítem debe ser un objeto.');
      return errores;
    }
    return errores.concat(validarSrs(item.srs, ruta));
  }

  function validarBiblioteca(biblioteca) {
    var errores = [];
    if (!esObjeto(biblioteca)) {
      errores.push('biblioteca debe ser un objeto.');
      return errores;
    }
    CARPETAS_BIBLIOTECA.forEach(function (carpeta) {
      if (!Array.isArray(biblioteca[carpeta])) {
        errores.push('biblioteca.' + carpeta + ' debe ser un array.');
        return;
      }
      biblioteca[carpeta].forEach(function (item, i) {
        errores = errores.concat(validarItemBiblioteca(item, 'biblioteca.' + carpeta + '[' + i + ']'));
      });
    });
    return errores;
  }

  function validarPerfil(perfil) {
    var errores = [];
    if (!esObjeto(perfil)) {
      errores.push('perfil debe ser un objeto.');
      return errores;
    }
    var tieneDetalle = esObjeto(perfil.detalle);
    var tieneDiag = perfil.diagnosticoCompletado !== undefined;
    if (!tieneDetalle && !tieneDiag) {
      errores.push('perfil debe incluir detalle o diagnosticoCompletado.');
    }
    return errores;
  }

  function validateBackup(data) {
    var errores = [];
    if (!esObjeto(data)) {
      return { valid: false, errors: ['El backup debe ser un objeto JSON.'] };
    }
    if (typeof data.version !== 'number' || data.version < 1) {
      errores.push('version debe ser un número (≥ 1).');
    }
    errores = errores.concat(validarPerfil(data.perfil));
    errores = errores.concat(validarBiblioteca(data.biblioteca));
    if (data.dominio !== undefined && data.dominio !== null && !esObjeto(data.dominio)) {
      errores.push('dominio debe ser un objeto si está presente.');
    }
    if (data.usuario !== undefined && data.usuario !== null && !esObjeto(data.usuario)) {
      errores.push('usuario debe ser un objeto si está presente.');
    }
    if (data.srsConfig !== undefined && data.srsConfig !== null && !esObjeto(data.srsConfig)) {
      errores.push('srsConfig debe ser un objeto si está presente.');
    }
    if (errores.length) {
      return { valid: false, errors: errores };
    }
    return { valid: true };
  }

  function restaurarEnLocalStorage(data) {
    var NC = window.NihonCheck;

    if (NC && NC.guardarPerfil) {
      NC.guardarPerfil(data.perfil);
    } else {
      escribirClave(CLAVE_PERFIL, data.perfil);
    }

    if (NC && NC.guardarBibliotecaPersonal) {
      NC.guardarBibliotecaPersonal(data.biblioteca);
    } else {
      escribirClave(CLAVE_BIBLIOTECA, data.biblioteca);
    }

    if (data.dominio !== undefined && data.dominio !== null) {
      escribirClave(CLAVE_DOMINIO, data.dominio);
    }

    if (data.usuario !== undefined && data.usuario !== null) {
      if (NC && NC.guardarUsuario) {
        NC.guardarUsuario(data.usuario);
      } else {
        escribirClave(CLAVE_USUARIO, data.usuario);
      }
    } else if (data.perfil && data.perfil.diagnosticoCompletado && NC && NC.sincronizarDiagnosticoRealizado) {
      NC.sincronizarDiagnosticoRealizado();
    }

    if (data.srsConfig !== undefined && data.srsConfig !== null) {
      escribirClave(CLAVE_SRS_CONFIG, data.srsConfig);
    }
  }

  function exportBackup() {
    var backup = {
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      perfil: leerClaveRaw(CLAVE_PERFIL),
      biblioteca: leerClaveRaw(CLAVE_BIBLIOTECA),
      dominio: leerClaveRaw(CLAVE_DOMINIO),
      usuario: leerClaveRaw(CLAVE_USUARIO),
    };

    var srsConfig = leerClaveRaw(CLAVE_SRS_CONFIG);
    if (srsConfig) {
      backup.srsConfig = srsConfig;
    }

    var json = JSON.stringify(backup, null, 2);
    var blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = 'nihoncheck-backup-' + fechaArchivo() + '.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function importBackup(file) {
    return new Promise(function (resolve) {
      if (!file) {
        resolve({ ok: false, errors: ['No se seleccionó ningún archivo.'] });
        return;
      }

      var reader = new FileReader();
      reader.onload = function () {
        var data;
        try {
          data = JSON.parse(reader.result);
        } catch (e) {
          resolve({ ok: false, errors: ['El archivo no es un JSON válido.'] });
          return;
        }

        var validation = validateBackup(data);
        if (!validation.valid) {
          resolve({ ok: false, errors: validation.errors });
          return;
        }

        try {
          restaurarEnLocalStorage(data);
          resolve({ ok: true });
        } catch (e) {
          resolve({ ok: false, errors: ['No se pudo restaurar el backup en este dispositivo.'] });
        }
      };

      reader.onerror = function () {
        resolve({ ok: false, errors: ['No se pudo leer el archivo.'] });
      };

      reader.readAsText(file);
    });
  }

  window.NihonCheckBackup = {
    BACKUP_VERSION: BACKUP_VERSION,
    exportBackup: exportBackup,
    importBackup: importBackup,
    validateBackup: validateBackup,
  };
})();
