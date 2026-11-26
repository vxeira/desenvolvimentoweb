// Testes ponta a ponta: frontend (Vite) + backend (NestJS + Prisma + JWT) rodando de verdade.
import { PREFIXO } from '../support/e2e';

const card = (titulo) => cy.contains('article', titulo);

describe('CEUB Eventos — fluxo completo com JWT e CRUD', () => {
  it('carrega a página com a identidade CEUB', () => {
    cy.visit('/');
    cy.contains('h1', 'Agenda de eventos acadêmicos').should('be.visible');
    cy.contains('header', 'UniCEUB').should('be.visible');
    cy.contains('button', /novo evento/i).should('be.visible');
  });

  it('lista um evento existente (Read)', () => {
    cy.criarEventoApi({ titulo: `${PREFIXO} Palestra de IA`, local: 'Auditório' });
    cy.visit('/');
    card(`${PREFIXO} Palestra de IA`).within(() => {
      cy.contains('Auditório');
      cy.contains('50 vagas');
      cy.contains('MAR');
    });
  });

  it('valida campos obrigatórios no formulário', () => {
    cy.visitarAutenticado();
    cy.contains('button', /novo evento/i).click();
    cy.contains('button', 'Salvar').click();
    cy.get('[role=dialog] [role=alert]').should('have.length', 5);
    cy.contains('button', 'Cancelar').click();
    cy.get('[role=dialog]').should('not.exist');
  });

  it('cria um evento pela interface (Create)', () => {
    cy.visitarAutenticado();
    cy.contains('button', /novo evento/i).click();
    cy.get('#titulo').type(`${PREFIXO} Hackathon`);
    cy.get('#descricao').type('24 horas de código');
    cy.get('#data').type('2027-04-15');
    cy.get('#vagas').type('80');
    cy.get('#local').type('Laboratório 5');
    cy.get('#curso').select('Análise e Desenvolvimento de Sistemas');
    cy.contains('button', 'Salvar').click();

    cy.contains('[role=status]', 'Evento criado com sucesso').should('be.visible');
    card(`${PREFIXO} Hackathon`).should('contain', '80 vagas').and('contain', 'ABR');
  });

  it('edita um evento (Update)', () => {
    cy.criarEventoApi({ titulo: `${PREFIXO} Workshop`, vagas: 30 });
    cy.visitarAutenticado();
    cy.get(`[aria-label="Editar ${PREFIXO} Workshop"]`).click();
    cy.get('#titulo').should('have.value', `${PREFIXO} Workshop`);
    cy.get('#vagas').clear().type('45');
    cy.contains('button', 'Salvar').click();

    cy.contains('[role=status]', 'Evento atualizado com sucesso').should('be.visible');
    card(`${PREFIXO} Workshop`).should('contain', '45 vagas');
  });

  it('exclui um evento após confirmação (Delete)', () => {
    cy.criarEventoApi({ titulo: `${PREFIXO} Para excluir` });
    cy.visitarAutenticado();
    cy.get(`[aria-label="Excluir ${PREFIXO} Para excluir"]`).click();
    cy.get('[role=alertdialog]').within(() => cy.contains('button', 'Excluir').click());

    cy.contains('[role=status]', 'Evento excluído').should('be.visible');
    cy.contains('article', `${PREFIXO} Para excluir`).should('not.exist');
  });

  it('cancelar a exclusão mantém o evento', () => {
    cy.criarEventoApi({ titulo: `${PREFIXO} Permanece` });
    cy.visitarAutenticado();
    cy.get(`[aria-label="Excluir ${PREFIXO} Permanece"]`).click();
    cy.get('[role=alertdialog]').within(() => cy.contains('button', 'Cancelar').click());
    card(`${PREFIXO} Permanece`).should('exist');
  });

  it('filtra por título e por curso', () => {
    cy.criarEventoApi({ titulo: `${PREFIXO} Júri Simulado`, curso: 'Direito' });
    cy.criarEventoApi({ titulo: `${PREFIXO} Feira de Robótica`, curso: 'Engenharia Civil' });
    cy.visit('/');

    cy.get('#busca').type('Robótica');
    card(`${PREFIXO} Feira de Robótica`).should('exist');
    cy.contains('article', `${PREFIXO} Júri Simulado`).should('not.exist');

    cy.get('#busca').clear();
    cy.get('#filtro-curso').select('Direito');
    card(`${PREFIXO} Júri Simulado`).should('exist');
    cy.contains('article', `${PREFIXO} Feira de Robótica`).should('not.exist');
  });
});
