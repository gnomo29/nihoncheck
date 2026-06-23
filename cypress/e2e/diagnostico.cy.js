/**
 * E2E: flujo completo del diagnóstico rápido (10 preguntas).
 * Requiere servidor local: npm run dev (puerto 3000).
 */

const STORAGE_KEYS = [
  'nihoncheck_perfil',
  'nihoncheck_usuario',
  'diagnosticoRealizado',
];

function clearNihonCheckStorage() {
  STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
}

describe('Diagnóstico rápido', () => {
  beforeEach(() => {
    cy.visit('/diagnostico.html', {
      onBeforeLoad(win) {
        clearNihonCheckStorage.call(win);
      },
    });
  });

  it('completa las 10 preguntas y actualiza el perfil en localStorage', () => {
    cy.contains('button', 'Comenzar').should('be.visible').click();

    // Todas las preguntas tienen correcta: 0 — primera opción = acierto.
    for (let i = 0; i < 10; i++) {
      cy.get('.diagnostico-opcion[data-opcion="0"]').should('be.visible').click();
      if (i < 9) {
        cy.contains('.diagnostico-progreso__label', `${i + 2} / 10`, { timeout: 5000 });
      }
    }

    cy.contains('p.diagnostico-kicker', 'Resultado').should('be.visible');
    cy.contains('h2.diagnostico-titulo', '10 / 10 aciertos').should('be.visible');
    cy.contains('a', 'Comenzar mi ruta personalizada')
      .should('be.visible')
      .and('have.attr', 'href', 'index.html');

    cy.window().then((win) => {
      const perfilRaw = win.localStorage.getItem('nihoncheck_perfil');
      expect(perfilRaw, 'nihoncheck_perfil').to.be.a('string');

      const perfil = JSON.parse(perfilRaw);
      expect(perfil.diagnosticoCompletado).to.equal(true);
      expect(perfil.nivelActual).to.equal(5);
      expect(perfil.diagnosticoRapido).to.equal(true);
      expect(perfil.fechaDiagnostico).to.be.a('string');

      expect(win.localStorage.getItem('diagnosticoRealizado')).to.equal('true');

      const usuarioRaw = win.localStorage.getItem('nihoncheck_usuario');
      expect(usuarioRaw, 'nihoncheck_usuario').to.be.a('string');
      const usuario = JSON.parse(usuarioRaw);
      expect(usuario.diagnosticoCompletado).to.equal(true);
      expect(usuario.testDiagnosticoCompletado).to.equal(true);
      expect(usuario.primeraVisitaCompletada).to.equal(true);
    });
  });
});
