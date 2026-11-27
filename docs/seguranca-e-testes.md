# Segurança e Testes do CEUB Eventos — explicado de forma simples

Este arquivo explica, em linguagem simples, **como o sistema se protege** e **quais testes foram feitos e passaram**.
A ideia é que qualquer pessoa do grupo consiga ler e explicar com as próprias palavras.

Todos os caminhos de arquivo partem da pasta raiz do projeto.

---

## Resumo em 30 segundos

> O sistema se protege contra os ataques mais comuns da lista OWASP Top 10 (SQL injection, XSS e CSRF).
> As senhas nunca ficam guardadas: só o "hash" delas. Dados pessoais, como o RA, são criptografados.
> Todo dado que chega na API é conferido antes de ser usado, e os segredos ficam fora do GitHub.
> O login usa JWT, um "crachá digital" que expira em 15 minutos.
> Tudo isso é conferido por **73 testes automáticos, e todos passaram**.

---

# PARTE 1 — SEGURANÇA

Para cada item: **o que é o ataque**, **como o projeto se protege**, **onde está no código** e **como provar**.

## 1. SQL Injection

**O que é:** o atacante digita um comando de banco de dados num campo do site (por exemplo, na busca),
tentando fazer o banco executar algo que não deveria, como mostrar ou apagar todos os dados.
Exemplo de texto malicioso: `' OR 1=1 --`

**Como o projeto se protege:** nenhuma consulta ao banco é escrita "na mão". Todas passam pelo **Prisma** (o ORM),
que sempre manda o texto digitado separado do comando. Assim, o que o usuário digita é tratado só como texto,
nunca como comando.

**Onde está:** `backend/src/modules/eventos/eventos.service.ts`, linha 22 (a busca usa `contains` do Prisma).

**Como provar:** buscar `' OR 1=1 --` no sistema. **Resultado testado: a API devolveu lista vazia**, ou seja,
só procurou um evento com esse nome estranho e não executou nada.

## 2. XSS (Cross-Site Scripting)

**O que é:** o atacante salva um código JavaScript disfarçado de texto (por exemplo, na descrição de um evento).
Quando outra pessoa abre a página, o código roda no navegador dela e pode roubar dados.
Exemplo: `<img src=x onerror=alert(1)>`

**Como o projeto se protege:**
- O **React** mostra todo texto como texto puro. Ele nunca transforma o que o usuário digitou em código.
- O projeto **não usa** `dangerouslySetInnerHTML` (a única forma de "desligar" essa proteção do React).
- O **Helmet** envia o cabeçalho `Content-Security-Policy`, que proíbe o navegador de rodar scripts de outros sites.

**Onde está:** `backend/src/main.ts`, linhas 29 a 43 (Helmet).

**Como provar:** criar um evento com `<img src=x onerror=alert(1)>` na descrição.
**Resultado testado: o texto apareceu na tela como texto normal e nenhum alerta abriu.**

## 3. CSRF (Cross-Site Request Forgery)

**O que é:** você está logado no nosso sistema e abre um site malicioso em outra aba. Esse site tenta fazer o
seu navegador mandar um pedido para o nosso sistema "em seu nome", aproveitando que o navegador envia os cookies sozinho.

**Como o projeto se protege:**
- O "crachá" principal (o token JWT) vai num cabeçalho chamado `Authorization`. O navegador **nunca** envia esse
  cabeçalho sozinho, então um site malicioso não consegue usá-lo.
- O único cookie que o navegador envia sozinho é o de **renovar a sessão**. Para ele usamos a técnica
  **Double Submit Cookie**: além do cookie, o front precisa repetir o mesmo código no cabeçalho `x-csrf-token`.
  O site malicioso consegue fazer o navegador mandar o cookie, mas **não consegue ler** o valor para colocar no cabeçalho.

**Onde está:** `backend/src/modules/auth/guards/csrf.guard.ts`.

**Como provar:** chamar a renovação de sessão sem o cabeçalho.
**Resultado testado: a API respondeu 403 "Token CSRF inválido ou ausente".**

## 4. Controle de acesso (quem pode mexer em quê)

**O que é:** um usuário logado tentar editar ou apagar um evento que **não é dele**.

**Como o projeto se protege:** antes de editar ou excluir, o servidor confere se o evento pertence a quem está pedindo.
Se não pertencer, responde **403 (Proibido)**. Sem login nenhum, responde **401 (Não autenticado)**.

**Onde está:** `backend/src/modules/eventos/eventos.service.ts`, linha 93 (`garantirPermissao`).

**Como provar:** tentar criar um evento sem estar logado.
**Resultado testado: a API respondeu 401 Unauthorized.**

## 5. Hash de senhas

**O que é:** se alguém roubar o banco de dados, não pode conseguir ler as senhas.

**Como o projeto se protege:** a senha **nunca é guardada**. Guardamos só o **hash bcrypt** dela, que é como uma
"impressão digital" da senha: dá para conferir se a senha digitada bate, mas **não dá para voltar** do hash para a senha.
O bcrypt ainda mistura um valor aleatório (salt), então duas pessoas com a mesma senha têm hashes diferentes.

**Onde está:** `backend/src/common/crypto/encryption.util.ts`, linha 7.

**Como provar:** **resultado testado: no banco, a senha aparece como `$2a$10$...`**, e não como a senha real.

## 6. Criptografia de dados

**O que é:** alguns dados precisamos guardar e **ler de volta** depois (diferente da senha), mas não podem ficar abertos.

**Como o projeto se protege:** o RA/CPF do usuário (opcional no cadastro) é **criptografado com AES-256-GCM**.
Diferente do hash, a criptografia **tem volta**, mas só com a chave secreta, que fica no `.env`.
Quando a API devolve esse dado, ele vem **mascarado**, por exemplo `****2345`.
Os tokens de sessão também ficam no banco só como hash (SHA-256).

**Onde está:** `backend/src/common/crypto/encryption.util.ts`, linha 21.

**Como provar:** **resultado testado: no banco, o RA aparece como uma sequência embaralhada** (`7e93b99d...`).

**Hash x criptografia (pergunta comum):** hash é de **mão única** (serve para senha). Criptografia **tem volta com a chave**
(serve para dado que precisamos ler de novo).

## 7. HTTPS

**O que é:** HTTPS cifra a comunicação entre o navegador e o servidor, para ninguém no meio do caminho (ex.: Wi-Fi público)
ler os dados.

**Como o projeto se protege:**
- Em produção, o Helmet liga o **HSTS**, que obriga o navegador a usar sempre HTTPS (por 1 ano).
- Os cookies ganham a marca **Secure**, que só deixa enviá-los por HTTPS.
- O servidor também consegue subir direto em HTTPS se o `.env` tiver `SSL_KEY_PATH` e `SSL_CERT_PATH`.

**Onde está:** `backend/src/main.ts`, linhas 11 a 21 (certificado) e linha 30 (HSTS).

**Atenção para a apresentação:** rodando no computador (localhost) ele usa **HTTP**, e isso é normal.
O HTTPS é ativado em produção. Se perguntarem, essa é a resposta.

## 8. Validação de entrada

**O que é:** nunca confiar no que chega do usuário. Mesmo que o formulário do site confira os campos, alguém pode mandar
dados direto para a API, sem passar pelo site.

**Como o projeto se protege:**
- Todo dado que chega é conferido no servidor: tipo, tamanho (título até 120 caracteres, senha de 8 a 128) e formato
  (e-mail válido, data válida).
- **Campos a mais são recusados** com erro 400. Isso impede, por exemplo, alguém mandar `role: ADMIN` no cadastro
  para virar administrador.

**Onde está:** `backend/src/common/pipes/validation-pipe.factory.ts`, linhas 5 e 6 (`whitelist` e `forbidNonWhitelisted`).

**Curiosidade boa para contar:** essa proteção funcionou tão bem que pegou um erro do nosso próprio front-end:
o formulário de edição mandava um campo a mais (`criadoPorId`) e a API recusava. Corrigimos o front-end.

## 9. Gestão de segredos

**O que é:** senhas do sistema, chaves de criptografia e chaves do JWT **não podem ir para o GitHub**.

**Como o projeto se protege:**
- Os segredos ficam no arquivo `.env`, que está no `.gitignore` (não vai para o GitHub).
- No GitHub só vai o `.env.example`, com valores de exemplo.
- A API **se recusa a iniciar** se faltar algum segredo ou se ele for fraco (ex.: chave do JWT com menos de 32 caracteres).
- Se der um erro inesperado, a API responde só "Erro interno do servidor", sem mostrar detalhes técnicos.

**Onde está:** `backend/.env.example` e `backend/src/config/env.validation.ts`.

## 10. JWT — comunicação com o front-end

**O que é:** o JWT é um **"crachá digital"**. Depois do login, o front mostra esse crachá a cada pedido, e a API
sabe quem você é sem pedir a senha de novo.

**Como funciona no projeto:**
- No login, a API entrega **dois tokens**:
  - **Token de acesso:** dura **15 minutos** e vai no cabeçalho `Authorization: Bearer ...` em cada pedido.
  - **Token de renovação:** dura **7 dias** e fica num **cookie HttpOnly**, que o JavaScript não consegue ler
    (então nem um ataque XSS consegue roubá-lo).
- Quando o token de acesso vence, a API responde 401. O front então **renova sozinho**, pega um token novo e repete o pedido,
  sem o usuário perceber.
- A cada renovação, o token antigo é **cancelado** (rotação). No logout, também é cancelado.

**Onde está:** `frontend/src/api.js`, linha 73 (Bearer) e linha 78 (renovação automática).

## 11. Limite de tentativas (bônus)

**O que é:** ataque de força bruta, em que o atacante tenta milhares de senhas até acertar.

**Como o projeto se protege:** login e cadastro aceitam no máximo **10 tentativas por minuto**.

**Onde está:** `backend/src/modules/auth/auth.controller.ts`, linhas 42 e 55.

---

# PARTE 2 — TESTES

## Os 4 tipos de teste, em palavras simples

| Tipo | Ferramenta | O que faz | Analogia |
| --- | --- | --- | --- |
| Unitário do back-end | Jest | Testa cada peça da API isolada | Testar cada peça do carro na bancada |
| Ponta a ponta do back-end | Jest + Supertest | Liga a API de verdade e faz pedidos HTTP reais | Ligar o motor e ver se funciona |
| Unitário do front-end | Vitest | Testa cada componente da tela isolado | Testar cada botão do painel |
| Ponta a ponta no navegador | Cypress | Abre um navegador e usa o sistema como uma pessoa | Fazer um test drive |

## Resultado geral

| Suíte | Testes | Resultado | Cobertura de linhas |
| --- | --- | --- | --- |
| Back-end unitários (Jest) | 25 | **25 passaram** | 94,9% |
| Back-end ponta a ponta (Supertest) | 2 | **2 passaram** | — |
| Front-end unitários (Vitest) | 38 | **38 passaram** | 99,3% |
| Navegador ponta a ponta (Cypress) | 8 | **8 passaram** | — |
| **Total** | **73** | **73 passaram** | mínimo exigido: 80% |

**Cobertura** = quanto do código os testes "visitam". 94,9% quer dizer que quase todas as linhas do back-end são
executadas por algum teste.

Os builds de produção do back-end e do front-end também passaram.

## Back-end — testes unitários (25)

| Arquivo | Teste | O que ele confere, em palavras simples |
| --- | --- | --- |
| `app-infra.spec.ts` | HealthController retorna status ok | A rota que diz "a API está no ar" funciona |
| | buildValidationPipe transforma erros em mapa | Erros de validação voltam organizados por campo |
| | PrismaService conecta e desconecta | A conexão com o banco abre e fecha certo |
| `encryption.util.spec.ts` | gera e verifica hash bcrypt | Senha vira hash e a conferência funciona, sem expor a senha |
| | criptografa e descriptografa com AES-256-GCM | O RA é cifrado e volta igual com a chave |
| | gera hash SHA-256 para refresh tokens | Os tokens de sessão são guardados como hash |
| | valida variáveis de ambiente obrigatórias | A API não sobe sem os segredos ou com segredo fraco |
| | valida datas reais no calendário | Datas inválidas, como 30 de fevereiro, são recusadas |
| `http-exception.filter.spec.ts` | preserva mapa de erros de campo | Os erros chegam ao front indicando o campo |
| | formata erros simples e listas de mensagens | Toda mensagem de erro tem o mesmo formato |
| | oculta detalhes em erros internos 500 | Erros inesperados não mostram detalhes técnicos |
| `auth.controller.spec.ts` | register e login definem cookies HttpOnly/CSRF | Cadastro e login criam os cookies seguros |
| | refresh, logout e me funcionam | Renovar, sair e "quem sou eu" funcionam |
| | JwtStrategy valida o token | O crachá JWT é lido corretamente |
| `auth.service.spec.ts` | cadastra com hash, documento cifrado e tokens | O cadastro aplica hash e criptografia |
| | rejeita e-mail duplicado | Não deixa cadastrar o mesmo e-mail duas vezes (409) |
| | rejeita login com credenciais inválidas | Senha errada não entra (401) |
| | valida refresh token ausente ou inválido | Renovação sem token ou com token falso é recusada |
| | rotaciona refresh token e revoga no logout | Token antigo é cancelado a cada renovação e no logout |
| | valida CsrfGuard com double submit cookie | A proteção contra CSRF funciona |
| `eventos.controller.spec.ts` | executa listar, detalhar, criar (com Location), atualizar e remover | Todas as rotas do CRUD respondem certo |
| `eventos.service.spec.ts` | lista e filtra por busca e curso | A busca e o filtro funcionam |
| | lança 404 em evento inexistente | Evento que não existe responde 404 |
| | bloqueia edição/remoção por outro usuário | Ninguém mexe em evento dos outros (403) |
| | cria, atualiza e remove evento do próprio usuário | O dono consegue fazer tudo no próprio evento |

## Back-end — testes ponta a ponta (2)

| Teste | O que ele confere |
| --- | --- |
| GET /api/health e /api/docs-json respondem | A API e a documentação Swagger estão no ar |
| Fluxo completo | Numa API real: cadastro, cookies e CSRF, renovação de sessão, CRUD protegido por login, bloqueio de quem não é dono e logout |

## Front-end — testes unitários (38)

| Grupo | Testes | O que conferem |
| --- | --- | --- |
| App (tela principal) | 14 | Lista os eventos; pede login ao clicar em "Novo evento" deslogado; botão Sair; tela vazia; resumo de eventos, vagas e cursos; erro quando a API cai; filtros; criar; editar; pede login de novo se a sessão vencer (401); cancelar; excluir; cancelar exclusão; erro ao excluir |
| api.js (comunicação com a API) | 7 | Guarda a sessão; envia o token Bearer; filtros na URL; criar, editar e excluir; login, cadastro, renovação automática no 401 e logout; limpa a sessão se a renovação falhar; trata erros da API |
| Header | 2 | Botões quando deslogado; nome e botão Sair quando logado |
| AuthModal (login/cadastro) | 2 | Valida os campos e alterna entre login e cadastro; mostra erro da API |
| EventoCard | 2 | Mostra os dados do evento e os botões; esconde descrição vazia |
| EventoForm (formulário) | 6 | Mostra erros e não envia; envia os dados certos; na edição envia **só** os campos editáveis; mostra erro geral do servidor; mostra erros por campo; cancelar |
| ConfirmarExclusao | 1 | Confirmar e cancelar a exclusão |
| utils (funções de apoio) | 4 | Formata a data; aceita dados válidos; acusa campos vazios; acusa vagas inválidas |

## Cypress — testes no navegador (8)

Com o sistema rodando de verdade, o Cypress abre o navegador e:

1. Carrega a página com a identidade do CEUB.
2. Mostra um evento já existente (**Read**).
3. Valida os campos obrigatórios do formulário.
4. Cria um evento pela tela (**Create**).
5. Edita um evento (**Update**).
6. Exclui um evento depois de confirmar (**Delete**).
7. Confere que cancelar a exclusão mantém o evento.
8. Filtra por título e por curso.

## Testes manuais de segurança feitos com o sistema rodando

| O que testamos | Resultado |
| --- | --- |
| Código XSS na descrição do evento | Apareceu como texto, nenhum script rodou |
| Busca com `' OR 1=1 --` (SQL injection) | Lista vazia, nada executado |
| Criar evento sem login | 401 Unauthorized |
| Renovar sessão sem o token CSRF | 403 Token CSRF inválido |
| Chamar a API a partir de outro site (CORS) | Bloqueado |
| Senha no banco | Guardada como hash bcrypt (`$2a$10$...`) |
| RA no banco | Guardado criptografado |
| Cookie de sessão | HttpOnly, invisível para o JavaScript |
| Cabeçalhos de segurança | CSP, X-Frame-Options, X-Content-Type-Options e Referrer-Policy presentes |

## O bug que os testes ajudaram a achar

Ao testar o sistema rodando de verdade, descobrimos que **editar um evento sempre dava erro 400**.
O formulário mandava um campo a mais (`criadoPorId`), e a validação de segurança da API recusava.
Ou seja: **a segurança funcionou**, o front-end é que mandava dado demais.
Corrigimos o `frontend/src/components/EventoForm.jsx` para enviar só os campos editáveis
e criamos um teste para esse caso. Sem a correção, o teste de edição do Cypress falha; com ela, passa.

## Como rodar os testes

```
cd backend
npm run test:cov      # 25 testes unitários + cobertura

cd frontend
npm run coverage      # 38 testes unitários + cobertura
npx cypress run       # 8 testes no navegador (com back-end e front-end rodando)
```

**Cuidado:** não rodem `npm run test:e2e` do back-end no computador da apresentação.
Ele apaga todas as tabelas do banco configurado no `.env`, inclusive os dados da demonstração.
Esse teste roda automaticamente no GitHub (CI) a cada push.

## Testes automáticos no GitHub (CI)

A cada push, o GitHub Actions (`.github/workflows/ci.yml`) roda tudo sozinho, em 3 etapas:

1. **Back-end:** testes unitários com cobertura, testes ponta a ponta e build.
2. **Front-end:** testes unitários com cobertura e build.
3. **Cypress:** só roda se as duas primeiras passarem.
