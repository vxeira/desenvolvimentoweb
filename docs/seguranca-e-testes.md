# Segurança e Testes — divisão para 4 pessoas

Cada pessoa explica uma parte. Leia a sua, entenda a ideia e fale com as suas palavras.

| Pessoa | Parte |
| --- | --- |
| 1 | Ataques do OWASP: SQL injection, XSS e CSRF |
| 2 | Proteção de dados: hash, criptografia e HTTPS |
| 3 | Validação, segredos e JWT |
| 4 | Testes |

---

## Pessoa 1 — Ataques do OWASP

**SQL injection:** o atacante digita um comando de banco num campo, como `' OR 1=1 --` na busca.
Nós usamos o Prisma, que trata tudo que o usuário digita como texto, nunca como comando.
Testamos: a busca com esse texto devolveu lista vazia.

**XSS:** o atacante salva um código disfarçado de texto, como `<img src=x onerror=alert(1)>`.
O React mostra tudo como texto e o Helmet bloqueia scripts de fora.
Testamos: o código apareceu como texto e nada rodou.

**CSRF:** um site malicioso tenta usar o seu login em outra aba.
O login vai num cabeçalho que o navegador não envia sozinho, e a renovação de sessão exige um código extra.
Testamos: sem o código, a API respondeu 403.

**Onde mostrar:** `backend/src/modules/auth/guards/csrf.guard.ts`

---

## Pessoa 2 — Proteção de dados

**Hash de senha:** a senha nunca é guardada, só o hash bcrypt, uma "impressão digital" que não tem volta.
No banco aparece `$2a$10$...` no lugar da senha.

**Criptografia:** o RA do usuário é guardado embaralhado com AES-256. Diferente do hash, ele tem volta,
mas só com a chave secreta. Na tela ele aparece mascarado, como `****2345`.

**HTTPS:** em produção, o sistema obriga o uso de HTTPS e os cookies só trafegam por HTTPS.
No computador local roda em HTTP, e isso é normal.

**Onde mostrar:** `backend/src/common/crypto/encryption.util.ts`

---

## Pessoa 3 — Validação, segredos e JWT

**Validação de entrada:** a API confere todo dado que chega, mesmo que o site já confira.
Campo a mais é recusado, então ninguém consegue mandar `role: ADMIN` para virar administrador.

**Segredos:** senhas e chaves ficam no arquivo `.env`, que não vai para o GitHub.
A API nem inicia se uma chave estiver faltando ou for fraca.

**JWT:** é um "crachá digital" entregue no login. Ele vai em cada pedido e vence em 15 minutos.
Quando vence, o site renova sozinho, sem o usuário perceber.

**Onde mostrar:** `frontend/src/api.js`

---

## Pessoa 4 — Testes

**Fala:** "O sistema tem 73 testes automáticos, e todos passaram."

| Tipo | Ferramenta | Quantos | O que faz |
| --- | --- | --- | --- |
| Unitário do back-end | Jest | 25 | Testa cada peça da API separada |
| Ponta a ponta do back-end | Supertest | 2 | Faz pedidos reais à API |
| Unitário do front-end | Vitest | 38 | Testa cada parte da tela separada |
| No navegador | Cypress | 8 | Usa o sistema como uma pessoa: cria, edita, exclui e filtra |

A cobertura é de 94,9% no back-end e 99,3% no front-end; o mínimo exigido é 80%.
O GitHub roda todos os testes sozinho a cada envio de código.

**Um caso bom para contar:** testando o sistema, achamos um erro. Editar evento falhava porque o formulário
mandava um campo a mais, e a validação da API recusava. A segurança funcionou; corrigimos o formulário.

**Onde mostrar:** `frontend/cypress/e2e/eventos.cy.js`
