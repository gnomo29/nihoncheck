/**

 * NIHONCHECK — Punto de entrada (navegación y flujos de usuario)

 */

(function () {

  'use strict';



  var NC = window.NihonCheck;

  if (!NC) return;



  var ETIQUETAS = {

    hiragana: 'Hiragana',

    katakana: 'Katakana',

    kanji: 'Kanji',

    gramatica: 'Gramática',

  };



  var DEBOUNCE_MS = 100;

  var debouncePreview = null;



  var views = {};

  var el = {};

  var estado = { carpeta: 'hiragana', filtro: 'todos', area: 'hiragana' };



  function $(id) { return document.getElementById(id); }



  function mostrarToast(msg) {

    if (!el.toast) return;

    el.toast.textContent = msg;

    el.toast.removeAttribute('hidden');

    clearTimeout(mostrarToast._t);

    mostrarToast._t = setTimeout(function () { el.toast.setAttribute('hidden', ''); }, 2800);

  }



  function mostrarToastRecalibracion() {

    if (!NC.obtenerUltimoEventoRecalibracion) return;

    var ev = NC.obtenerUltimoEventoRecalibracion();

    if (!ev || !ev.tipo) return;

    if (ev.tipo === 'promocion') {

      mostrarToast('¡' + ev.nombre + ' dominadas!');

    } else if (ev.tipo === 'degradacion') {

      mostrarToast(ev.nombre + ' volvió a tu ruta — necesita refuerzo');

    }

  }



  function refrescarDashboardSiVisible() {

    mostrarToastRecalibracion();

    var vistaAprender = $('view-aprender');

    if (vistaAprender && !vistaAprender.hasAttribute('hidden') && NC.renderizarDashboardAprender) {

      NC.renderizarDashboardAprender(el.aprenderDashboard);

    }

    var vistaLista = $('view-lecciones-lista');

    if (vistaLista && !vistaLista.hasAttribute('hidden') && el.leccionesLista) {

      NC.renderizarListaLecciones(el.leccionesLista, el.leccionesProgresoBar, estado.area);

    }

  }



  function abrirModal(id) { var m = $(id); if (m) m.removeAttribute('hidden'); }

  function cerrarModal(id) { var m = $(id); if (m) m.setAttribute('hidden', ''); }



  function necesitaDiagnostico() {

    if (NC.puedeAccederAprendizaje && NC.puedeAccederAprendizaje()) return false;

    return !NC.diagnosticoEstaCompletado();

  }



  function actualizarContadores() {

    var bib = NC.obtenerBibliotecaPersonal();

    document.querySelectorAll('[data-count-carpeta]').forEach(function (node) {

      var c = node.getAttribute('data-count-carpeta');

      node.textContent = (bib[c] || []).length;

    });

    if (NC.estadisticas && NC.estadisticas.renderizar) {

      NC.estadisticas.renderizar();

    }

  }



  function actualizarHintsCamino() {

    var perfil = NC.obtenerPerfil ? NC.obtenerPerfil() : null;

    var hint = $('camino-estado');

    var areaHint = $('camino-area-actual');

    var btnRepetir = $('btn-repetir-diagnostico');



    if (btnRepetir) {

      if (NC.diagnosticoRealizadoEstaMarcado && NC.diagnosticoRealizadoEstaMarcado()) {

        btnRepetir.removeAttribute('hidden');

      } else {

        btnRepetir.setAttribute('hidden', '');

      }

    }



    if (hint) {

      if (perfil && perfil.recomendaciones && perfil.recomendaciones.length) {

        var rec = perfil.recomendaciones[0];

        var primera = typeof rec === 'string' ? rec.split('-')[0] : (rec.area || '');

        hint.textContent = 'Ruta activa · ' + (ETIQUETAS[primera] || primera);

      } else if (NC.puedeAccederAprendizaje && NC.puedeAccederAprendizaje()) {

        hint.textContent = 'Ruta personalizada lista';

      } else {

        hint.textContent = 'Personaliza tu ruta de estudio';

      }

    }



    if (areaHint) {

      areaHint.textContent = (NC.puedeAccederAprendizaje && NC.puedeAccederAprendizaje())

        ? 'Ver dashboard de estudio'

        : 'Personaliza tu ruta de estudio';

    }

  }



  function pintarProgresoCamino() {

    var cont = $('camino-progreso');

    if (!cont) return;

    var perfil = NC.obtenerPerfil ? NC.obtenerPerfil() : null;

    var p = NC.obtenerProgresoHistorico();

    var ultimo = NC.obtenerUltimoExamen();



    if (!perfil && p.totalAprendidos === 0 && p.puntosDebilesPendientes === 0 && !ultimo) {

      cont.hidden = true;

      cont.innerHTML = '';

      return;

    }



    cont.hidden = false;

    var html =

      '<div class="camino-progreso__stats">' +

        '<span><strong>' + p.totalAprendidos + '</strong> aprendidos</span>' +

        '<span><strong>' + p.puntosDebilesPendientes + '</strong> por reforzar</span>' +

        '<span><strong>' + NC.contarTarjetasBiblioteca() + '</strong> en biblioteca</span>' +

      '</div>';



    if (perfil && perfil.porcentajes) {

      html += '<div class="camino-perfil-chips">';

      ['hiragana', 'katakana', 'kanji', 'gramatica'].forEach(function (a) {

        var pct = perfil.porcentajes[a] || 0;

        var nivel = perfil.niveles && perfil.niveles[a] ? perfil.niveles[a] : '';

        html += '<span class="camino-perfil-chip">' + (ETIQUETAS[a] || a) + ' ' + pct + '% · ' + nivel + '</span>';

      });

      html += '</div>';

    } else if (ultimo) {

      html += '<p class="camino-progreso__examen">Último diagnóstico: <strong>' + ultimo.porcentaje + '%</strong></p>';

    }



    cont.innerHTML = html;

  }



  function renderizarBibliotecaActual() {

    NC.renderizarBiblioteca({

      contenedorTabs: el.bibliotecaTabs,

      contenedorFiltros: el.bibliotecaFiltros,

      contenedorGrid: el.bibliotecaGrid,

      carpeta: estado.carpeta,

      filtroEstado: estado.filtro,

    });

  }



  function cerrarPracticaBiblioteca() {

    NC.cerrarPracticaTarjeta(el.bibliotecaPractica);

    if (el.bibliotecaGrid) el.bibliotecaGrid.removeAttribute('hidden');

  }



  function abrirPracticaBiblioteca(btn) {

    var carpeta = btn.getAttribute('data-biblioteca-carpeta');

    var clave = btn.getAttribute('data-biblioteca-clave');

    var bib = NC.obtenerBibliotecaPersonal();

    var items = bib[carpeta] || [];

    var item = null;



    for (var i = 0; i < items.length; i++) {

      if (NC.claveBibliotecaItem(items[i], carpeta) === clave) {

        item = items[i];

        break;

      }

    }

    if (!item) return;



    if (el.bibliotecaGrid) el.bibliotecaGrid.setAttribute('hidden', '');

    NC.renderizarPracticaTarjeta(el.bibliotecaPractica, item, 'biblioteca');

  }



  function manejarEnvioPractica(contenedor, onDespues) {

    if (!contenedor) return;

    contenedor.addEventListener('submit', function (e) {

      var form = e.target.closest('#form-practica-tarjeta');

      if (!form || contenedor.hasAttribute('hidden')) return;

      e.preventDefault();



      var input = contenedor.querySelector('#input-practica-tarjeta');

      var feedback = contenedor.querySelector('#feedback-practica-tarjeta');

      var respuesta = input ? input.value : '';

      if (!respuesta.trim()) { if (input) input.focus(); return; }



      var resultado = NC.procesarPracticaTarjeta(contenedor, respuesta);

      if (!resultado) return;



      if (feedback) {

        feedback.textContent = resultado.acerto

          ? '✓ Correcto'

          : '✗ Incorrecto · ' + resultado.lectura;

        feedback.className = 'biblioteca-practica__feedback biblioteca-practica__feedback--' +

          (resultado.acerto ? 'ok' : 'fail');

      }

      if (input) input.value = '';



      if (onDespues) onDespues(resultado.acerto);

      refrescarDashboardSiVisible();

    });

  }



  function showView(nombre) {

    Object.keys(views).forEach(function (k) {

      var v = views[k];

      if (!v) return;

      var on = k === nombre;

      if (on) v.removeAttribute('hidden'); else v.setAttribute('hidden', '');

      v.classList.toggle('view--active', on);

    });



    if (nombre === 'home') { actualizarContadores(); actualizarHintsCamino(); actualizarBannerRepaso(); }

    if (nombre === 'camino') { pintarProgresoCamino(); actualizarHintsCamino(); }

    if (nombre === 'biblioteca') {

      cerrarPracticaBiblioteca();

      renderizarBibliotecaActual();

    }

    if (nombre === 'aprender') {

      if (NC.renderizarDashboardAprender && el.aprenderDashboard) {

        NC.renderizarDashboardAprender(el.aprenderDashboard);

      }

    }

    if (nombre === 'lecciones-lista') {

      var tituloLista = $('lecciones-lista-titulo');

      if (tituloLista) tituloLista.textContent = 'Temas · ' + (ETIQUETAS[estado.area] || estado.area);

      NC.renderizarListaLecciones(el.leccionesLista, el.leccionesProgresoBar, estado.area);

    }

  }



  function obtenerContenedorTest() {

    return el.testContainer || document.getElementById('test-nivel-container');

  }



  function irHome() {

    var tc = obtenerContenedorTest();

    if (NC.reiniciarVistaTest && tc) NC.reiniciarVistaTest(tc, null);

    if (NC.limpiarLeccionActiva && el.leccionContenedor) {

      NC.limpiarLeccionActiva(el.leccionContenedor);

    }

    cerrarPracticaBiblioteca();

    showView('home');

  }



  function actualizarBannerRepaso() {

    if (!el.repasoBanner || !NC.srs || !NC.srs.contarRepasosPendientesHoy) return;

    var pendientes = NC.srs.contarRepasosPendientesHoy();

    if (pendientes > 0) {

      if (el.repasoBannerCantidad) el.repasoBannerCantidad.textContent = pendientes;

      el.repasoBanner.hidden = false;

    } else {

      el.repasoBanner.hidden = true;

    }

  }



  function irRepaso() {

    if (NC.vistaRepaso && NC.vistaRepaso.iniciar) {

      NC.vistaRepaso.iniciar(el.repasoContenedor, irHome);

    }

    showView('repaso');

  }



  function irCaminoDesdeVista() {

    if (NC.limpiarLeccionActiva && el.leccionContenedor) {

      NC.limpiarLeccionActiva(el.leccionContenedor);

    }

    showView('camino');

  }



  function cancelarTestNivel() {

    var tc = obtenerContenedorTest();

    if (NC.reiniciarVistaTest && tc) NC.reiniciarVistaTest(tc, null);

    if (NC.diagnosticoEstaCompletado()) showView('camino');

    else showView('home');

  }



  function irBiblioteca(carpeta) {

    if (carpeta) estado.carpeta = carpeta;

    showView('biblioteca');

  }



  function solicitarDiagnosticoSiNecesario(alContinuar) {

    if (!necesitaDiagnostico()) {

      if (alContinuar) alContinuar();

      return;

    }

    abrirModal('modal-nuevo');

  }



  function irCamino() {

    solicitarDiagnosticoSiNecesario(function () { showView('camino'); });

  }



  function irAprender() {

    solicitarDiagnosticoSiNecesario(function () { showView('aprender'); });

  }



  function irListaLecciones(area) {

    if (area) estado.area = area;

    showView('lecciones-lista');

  }



  function irLeccion(area, leccionId) {

    if (area) estado.area = area;

    var leccion = typeof obtenerLeccion === 'function' ? obtenerLeccion(estado.area, leccionId) : null;

    if (!leccion) {

      mostrarToast('Tema no encontrado.');

      return;

    }



    var tituloLeccion = $('leccion-titulo');

    if (tituloLeccion) {

      tituloLeccion.textContent = leccion.nombre || leccion.titulo;

      if (leccion.jlpt) {

        var badge = document.createElement('span');

        badge.className = 'jlpt-badge';

        badge.textContent = leccion.jlpt;

        tituloLeccion.appendChild(document.createTextNode(' '));

        tituloLeccion.appendChild(badge);

      }

    }



    NC.iniciarLeccion(el.leccionContenedor, estado.area, leccionId);

    showView('leccion');

  }



  function volverListaLecciones(area) {

    if (area) estado.area = area;

    if (NC.limpiarLeccionActiva && el.leccionContenedor) {

      NC.limpiarLeccionActiva(el.leccionContenedor);

    }

    showView('lecciones-lista');

  }



  function saltarDiagnosticoIniciarDesdeCero() {

    cerrarModal('modal-nuevo');

    if (NC.inicializarPerfilDesdeCero) {

      NC.inicializarPerfilDesdeCero();

    } else if (NC.marcarEmpezoDesdeCero) {

      NC.marcarEmpezoDesdeCero();

    }

    actualizarHintsCamino();

    mostrarToast('Ruta iniciada desde cero. ¡Empieza cuando quieras!');

    showView('aprender');

  }



  function repetirDiagnostico() {

    if (!window.confirm('¿Repetir el diagnóstico? Tu biblioteca personal no se modificará.')) return;

    if (NC.resetearDiagnostico) {

      NC.resetearDiagnostico();

    }

    actualizarHintsCamino();

    iniciarTestNivel(true);

  }



  function reiniciarProgresoCompleto() {

    if (!window.confirm('¿Reiniciar todo el progreso? Se conservará tu biblioteca personal.')) return;

    if (NC.reiniciarProgresoUsuario) {

      NC.reiniciarProgresoUsuario({

        limpiarPerfil: true,

        limpiarLecciones: true,

        limpiarDebiles: true,

        limpiarUltimoExamen: true,

        limpiarAprendidos: false,

      });

    }

    actualizarHintsCamino();

    actualizarContadores();

    mostrarToast('Progreso reiniciado. Puedes hacer el diagnóstico de nuevo.');

    if (NC.esUsuarioNuevo && NC.esUsuarioNuevo()) abrirModal('modal-nuevo');

    showView('home');

  }



  function iniciarTestNivel(esReevaluar) {

    cerrarModal('modal-nuevo');

    showView('test-nivel');



    var contenedor = obtenerContenedorTest();

    if (!contenedor) {

      mostrarToast('No se encontró el contenedor del test.');

      return;

    }



    var alCompletar = function (historial) {

      NC.procesarDiagnosticoCompletado(historial);

      if (el.resultadosRuta) {

        el.resultadosRuta.innerHTML = NC.generarHTMLResultadosRuta(historial);

      }

      actualizarHintsCamino();

      showView('resultados-ruta');

      if (esReevaluar) mostrarToast('Perfil actualizado. Tu biblioteca no se modificó.');

    };



    if (typeof NC.iniciarExamenDiagnostico === 'function') {

      NC.iniciarExamenDiagnostico(contenedor, null, alCompletar);

      return;

    }



    contenedor.innerHTML =

      '<p class="test-placeholder">No se pudo iniciar el diagnóstico. Recarga la página (Ctrl+F5).</p>';

  }



  function actualizarEtiquetaCarpeta(carpeta) {

    if (!el.carpetaDetectada) return;

    var nombre = ETIQUETAS[carpeta] || carpeta;

    el.carpetaDetectada.innerHTML = 'Se guardará en: <strong>' + nombre + '</strong>';

    el.carpetaDetectada.setAttribute('data-carpeta', carpeta);

  }



  function animarCarpetaGuardada(carpeta) {

    var card = document.querySelector('.folder-card[data-carpeta="' + carpeta + '"]');

    if (!card) return;

    card.classList.add('folder-card--saved');

    var check = document.createElement('span');

    check.className = 'save-check';

    check.textContent = '✓';

    check.setAttribute('aria-hidden', 'true');

    card.appendChild(check);

    setTimeout(function () {

      card.classList.remove('folder-card--saved');

      if (check.parentNode) check.parentNode.removeChild(check);

    }, 1500);

  }



  function pulsarCarpetaModal() {

    if (!el.carpetaDetectada) return;

    el.carpetaDetectada.classList.remove('form-agregar__carpeta-detectada--pulse');

    void el.carpetaDetectada.offsetWidth;

    el.carpetaDetectada.classList.add('form-agregar__carpeta-detectada--pulse');

    setTimeout(function () {

      el.carpetaDetectada.classList.remove('form-agregar__carpeta-detectada--pulse');

    }, 600);

  }



  function actualizarPreview() {

    var texto = el.inputMaterial ? el.inputMaterial.value : '';

    var preview = $('preview-material');

    if (!preview) return;



    if (!texto.trim()) {

      preview.textContent = '—';

      actualizarEtiquetaCarpeta('hiragana');

      return;

    }



    var previewTexto = NC.obtenerPreviewMaterial(texto);

    preview.textContent = previewTexto || '—';

    actualizarEtiquetaCarpeta(NC.detectarCarpetaDestino(texto));

  }



  function guardarMaterial(otro) {

    if (!el.inputMaterial) return;

    var texto = el.inputMaterial.value.trim();

    if (!texto) { mostrarToast('Escribe algo para guardar.'); return; }



    var carpeta = NC.detectarCarpetaDestino(texto);

    var n = NC.agregarMaterial(texto, carpeta);

    if (n === 0) { mostrarToast('Ese material ya está en la carpeta.'); return; }



    mostrarToast('Guardado en ' + ETIQUETAS[carpeta]);

    actualizarContadores();

    animarCarpetaGuardada(carpeta);

    pulsarCarpetaModal();



    if (otro) {

      el.inputMaterial.value = '';

      actualizarPreview();

      el.inputMaterial.focus();

    } else {

      cerrarModal('modal-agregar');

    }

  }



  function init() {

    views = {

      home: $('view-home'),

      biblioteca: $('view-biblioteca'),

      camino: $('view-camino'),

      'test-nivel': $('view-test-nivel'),

      'resultados-ruta': $('view-resultados-ruta'),

      aprender: $('view-aprender'),

      'lecciones-lista': $('view-lecciones-lista'),

      leccion: $('view-leccion'),

      repaso: $('view-repaso'),

    };



    el = {

      bibliotecaGrid: $('biblioteca-grid'),

      bibliotecaTabs: $('biblioteca-tabs'),

      bibliotecaFiltros: $('biblioteca-filtros'),

      bibliotecaPractica: $('biblioteca-practica'),

      aprenderDashboard: $('aprender-dashboard'),

      leccionesLista: $('lecciones-lista'),

      leccionesProgresoBar: $('lecciones-progreso-bar'),

      leccionContenedor: $('leccion-contenedor'),

      repasoContenedor: $('repaso-contenedor'),

      repasoBanner: $('repaso-banner'),

      repasoBannerCantidad: $('repaso-banner-cantidad'),

      testContainer: $('test-nivel-container'),

      resultadosRuta: $('resultados-ruta-container'),

      inputMaterial: $('input-material'),

      carpetaDetectada: $('carpeta-detectada'),

      toast: $('toast'),

    };



    document.addEventListener('click', manejarClickApp);



    NC.migrarEstudioPendienteABiblioteca();

    NC.sincronizarCaracteresAprendidosABiblioteca();

    NC.iniciarCacheMemoria();

    if (NC.sincronizarDiagnosticoRealizado) NC.sincronizarDiagnosticoRealizado();



    actualizarContadores();

    actualizarHintsCamino();



    if (NC.esUsuarioNuevo && NC.esUsuarioNuevo()) abrirModal('modal-nuevo');



    document.querySelectorAll('.modal-overlay').forEach(function (ov) {

      ov.addEventListener('click', function (ev) { if (ev.target === ov) ov.setAttribute('hidden', ''); });

    });



    var formAgregar = $('form-agregar');

    if (formAgregar) {

      formAgregar.addEventListener('submit', function (e) { e.preventDefault(); guardarMaterial(false); });

    }

    if (el.inputMaterial) {

      el.inputMaterial.addEventListener('input', function () {

        clearTimeout(debouncePreview);

        debouncePreview = setTimeout(actualizarPreview, DEBOUNCE_MS);

      });

      el.inputMaterial.addEventListener('keydown', function (e) {

        if (e.ctrlKey && e.key === 'Enter') {

          e.preventDefault();

          guardarMaterial(true);

        }

      });

    }



    manejarEnvioPractica(el.bibliotecaPractica, function () {

      renderizarBibliotecaActual();

    });



    // FASE 1b: inicializar el sistema de Repetición Espaciada (SRS).

    // Idempotente: migra la biblioteca solo la primera vez.

    if (NihonCheck.srs && NihonCheck.srs.inicializarSRS) {

      NihonCheck.srs.inicializarSRS();

    }



    showView('home');

  }



  function manejarClickApp(e) {

    var btn = e.target.closest('[data-action], [data-nav]');

    if (btn) {

      var a = btn.getAttribute('data-action');



      if (a === 'abrir-carpeta') { irBiblioteca(btn.getAttribute('data-carpeta')); return; }

      if (a === 'abrir-agregar') {

        abrirModal('modal-agregar');

        setTimeout(function () {

          actualizarPreview();

          el.inputMaterial.focus();

        }, 80);

        return;

      }

      if (a === 'cerrar-agregar') { cerrarModal('modal-agregar'); return; }

      if (a === 'guardar-y-otro') { e.preventDefault(); guardarMaterial(true); return; }

      if (a === 'ir-camino') { irCamino(); return; }

      if (a === 'modal-test-nivel') { iniciarTestNivel(false); return; }

      if (a === 'modal-saltar-desde-cero') { saltarDiagnosticoIniciarDesdeCero(); return; }

      if (a === 'repetir-diagnostico') { repetirDiagnostico(); return; }

      if (a === 'reiniciar-progreso') { reiniciarProgresoCompleto(); return; }

      if (a === 'continuar-aprender') { irAprender(); return; }

      if (a === 'ir-dashboard-aprender') { irAprender(); return; }

      if (a === 'elegir-area-lecciones') { irListaLecciones(btn.getAttribute('data-area')); return; }

      if (a === 'back-aprender-areas') { irAprender(); return; }

      if (a === 'back-lecciones-lista') { volverListaLecciones(); refrescarDashboardSiVisible(); return; }

      if (a === 'iniciar-leccion') {

        irLeccion(btn.getAttribute('data-area'), btn.getAttribute('data-leccion-id'));

        return;

      }

      if (a === 'leccion-siguiente') {

        var activa = NC.obtenerLeccionActiva();

        if (!activa || !el.leccionContenedor) return;

        if (!activa.practicaOk) return;

        var elementos = activa.leccion.elementos;

        if (activa.indicePresentacion < elementos.length - 1) {

          activa.indicePresentacion++;

          activa.practicaOk = false;

          NC.renderizarFaseLeccion(el.leccionContenedor);

        } else {

          activa.fase = 'examen';

          activa.indiceExamen = 0;

          activa.respuestasExamen = [];

          activa.tiemposExamen = [];

          NC.renderizarFaseLeccion(el.leccionContenedor);

        }

        return;

      }

      if (a === 'leccion-terminar') {

        NC.terminarEstudioTema(el.leccionContenedor);

        return;

      }

      if (a === 'repasar-leccion') {

        NC.reiniciarLeccion(el.leccionContenedor, 'presentacion');

        return;

      }

      if (a === 'reintentar-examen-leccion') {

        NC.reiniciarLeccion(el.leccionContenedor, 'examen');

        return;

      }

      if (a === 'volver-lista-lecciones') {

        if (NC.limpiarLeccionActiva && el.leccionContenedor) {

          NC.limpiarLeccionActiva(el.leccionContenedor);

        }

        irAprender();

        actualizarContadores();

        refrescarDashboardSiVisible();

        return;

      }



      var nav = btn.getAttribute('data-nav');

      if (a === 'ir-repaso') { irRepaso(); return; }

      if (a === 'back-home' || nav === 'home') { irHome(); return; }

      if (a === 'back-camino' || nav === 'camino') { irCaminoDesdeVista(); return; }

      if (a === 'cancelar-test') { cancelarTestNivel(); return; }



      if (a === 'cerrar-practica-tarjeta') {

        cerrarPracticaBiblioteca();

        renderizarBibliotecaActual();

        refrescarDashboardSiVisible();

        return;

      }



      if (a === 'marcar-gramatica') {

        var card = btn.closest('[data-biblioteca-clave]');

        if (card) {

          NC.registrarPracticaBiblioteca(

            card.getAttribute('data-biblioteca-carpeta'),

            card.getAttribute('data-biblioteca-clave'),

            true,

            { tiempoMs: 0 }

          );

          renderizarBibliotecaActual();

          refrescarDashboardSiVisible();

        }

        return;

      }

    }



    var tabBib = e.target.closest('[data-biblioteca-tab]');

    if (tabBib) {

      estado.carpeta = tabBib.getAttribute('data-biblioteca-tab');

      renderizarBibliotecaActual();

      return;

    }



    var filtroBib = e.target.closest('[data-biblioteca-filtro]');

    if (filtroBib) {

      estado.filtro = filtroBib.getAttribute('data-biblioteca-filtro');

      renderizarBibliotecaActual();

      return;

    }



    var cardBib = e.target.closest('.biblioteca-card');

    if (cardBib) {

      abrirPracticaBiblioteca(cardBib);

      return;

    }

  }



  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);

  else init();

})();




