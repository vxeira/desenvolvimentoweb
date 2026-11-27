// Comandos customizados usados nos testes E2E (Frontend Vite + Backend NestJS/Prisma/JWT).
export const PREFIXO = '[E2E]';
const EMAIL_E2E = 'e2e_cypress@ceub.edu.br';
const SENHA_E2E = 'SenhaE2E@2026';

// Autentica uma vez e reaproveita a sessão: a API limita login/cadastro a 10 por minuto
// (proteção contra força bruta) e a suíte inteira passaria desse limite.
let sessaoE2E = null;

Cypress.Commands.add('autenticarApi', () => {
  if (sessaoE2E) return cy.wrap(sessaoE2E, { log: false });
  return cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/auth/login`,
    body: { email: EMAIL_E2E, senha: SENHA_E2E },
    failOnStatusCode: false,
  }).then((res) => {
    if (res.status === 200) {
      sessaoE2E = res.body;
      return res.body;
    }
    if (res.status !== 401) {
      throw new Error(`Login E2E falhou com status ${res.status}`);
    }
    return cy.request('POST', `${Cypress.env('apiUrl')}/auth/register`, {
      nome: 'Usuário E2E',
      email: EMAIL_E2E,
      senha: SENHA_E2E,
    }).its('body').then((body) => {
      sessaoE2E = body;
    });
  });
});

Cypress.Commands.add('visitarAutenticado', () => {
  return cy.autenticarApi().then((sessao) => {
    return cy.visit('/', {
      onBeforeLoad(win) {
        win.sessionStorage.setItem('ceub_access_token', sessao.accessToken);
        win.sessionStorage.setItem('ceub_usuario', JSON.stringify(sessao.usuario));
      },
    });
  });
});

Cypress.Commands.add('criarEventoApi', (dados = {}) => {
  return cy.autenticarApi().then((sessao) => {
    const evento = {
      titulo: `${PREFIXO} Evento`,
      descricao: 'Criado pelo Cypress',
      data: '2027-03-10',
      local: 'Bloco 1',
      curso: 'Ciência da Computação',
      vagas: 50,
      ...dados,
    };
    return cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/eventos`,
      headers: { Authorization: `Bearer ${sessao.accessToken}` },
      body: evento,
    }).its('body');
  });
});

Cypress.Commands.add('limparEventosE2E', () => {
  return cy.autenticarApi().then((sessao) => {
    return cy.request(`${Cypress.env('apiUrl')}/eventos?busca=${encodeURIComponent(PREFIXO)}`)
      .its('body')
      .each((ev) =>
        cy.request({
          method: 'DELETE',
          url: `${Cypress.env('apiUrl')}/eventos/${ev.id}`,
          headers: { Authorization: `Bearer ${sessao.accessToken}` },
        }),
      );
  });
});

beforeEach(() => cy.limparEventosE2E());
after(() => cy.limparEventosE2E());
