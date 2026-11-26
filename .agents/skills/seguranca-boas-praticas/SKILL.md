---
name: seguranca-boas-praticas
description: >-
  Aplica controles de segurança e boas práticas no back-end e na integração com o
  front-end: mitigação do OWASP Top 10 (SQL Injection, XSS, CSRF, Broken Access
  Control), proteção de dados (hash de senhas, criptografia, HTTPS), validação de
  entrada, gestão de segredos e autenticação JWT com o front-end. Use esta skill
  ao implementar autenticação/autorização, manipular dados sensíveis, revisar
  endpoints, configurar variáveis de ambiente ou auditar vulnerabilidades.
---

# Segurança & Boas Práticas

Esta skill define os controles obrigatórios de segurança para proteger a aplicação, os dados dos usuários e a comunicação entre back-end e front-end.

## Pilares Obrigatórios

1. **OWASP Top 10**
   - **SQL Injection:** usar sempre queries parametrizadas via ORM (Prisma / SQLAlchemy). Nunca concatenar variáveis de entrada em SQL bruto (proibido `$queryRawUnsafe` com strings interpoladas).
   - **XSS (Cross-Site Scripting):** não injetar HTML não sanitizado no front-end (`dangerouslySetInnerHTML`, `innerHTML`), escapar saídas, validar tipos de entrada e aplicar headers de proteção (`helmet` com `Content-Security-Policy` e `X-Content-Type-Options: nosniff`).
   - **CSRF (Cross-Site Request Forgery):** se houver cookies de sessão/autenticação, definir `SameSite=Lax` ou `SameSite=Strict` + `HttpOnly` + proteção anti-CSRF e CORS restrito às origens autorizadas. Quando usar `Authorization: Bearer <token>`, não armazenar o token em locais acessíveis por scripts maliciosos sem mitigação de XSS.
   - **Broken Access Control:** proteger rotas privadas com Guards (`JwtAuthGuard`, `RolesGuard`) e validar sempre no servidor se o usuário autenticado tem permissão sobre o recurso solicitado (ownership/perfil).

2. **Proteção de Dados**
   - **Hash de senhas:** armazenar apenas hashes seguros com salt automático (`argon2` ou `bcrypt` com custo adequado, ex.: `saltRounds >= 10` ou `12`). Nunca usar texto puro, MD5, SHA-1 ou SHA-256 simples para senhas. Nunca retornar `senhaHash` em respostas JSON ou logs.
   - **Criptografia:** criptografar dados sensíveis em repouso quando necessário (ex.: AES-256-GCM com IV único por registro).
   - **HTTPS:** exigir TLS/HTTPS em produção, configurar HSTS (`Strict-Transport-Security`) e flag `Secure` em cookies.

3. **Segurança de Aplicação (Validação de Entrada & Gestão de Segredos)**
   - **Validação de entrada:** validar todo payload, query param e route param no back-end (mesmo que o front-end já valide). No NestJS, ativar `ValidationPipe` global com `whitelist: true` e `forbidNonWhitelisted: true` para bloquear *Mass Assignment*. Limitar tamanho de strings, intervalos numéricos e formatos (datas, e-mails).
   - **Gestão de segredos:** nunca versionar `.env`, chaves JWT, senhas de banco ou tokens no Git. Manter apenas `.env.example` com placeholders, validar variáveis críticas na inicialização (`ConfigModule` + schema) e impedir que mensagens de erro exponham stack traces ou segredos em produção.

4. **JWT — Comunicação com o Front**
   - **Back-end:** assinar tokens com segredo forte (`JWT_SECRET` via ambiente) e expiração curta para Access Token (ex.: `15m`). Incluir apenas claims mínimas no payload (`sub`, `role` — nunca senha ou dados sensíveis).
   - **Front-end:** enviar o token no header `Authorization: Bearer <token>` (ou via cookie `HttpOnly` com `credentials: 'include'`), tratar respostas `401 Unauthorized` (limpar sessão/redirecionar para login ou renovar via refresh token) e `403 Forbidden` (exibir acesso negado).
   - **Rate limiting e Brute Force:** aplicar throttling em rotas de login/autenticação (ex.: `@nestjs/throttler`).

## Checklist Rápido de Auditoria

1. Há alguma query SQL montada por concatenação/interpolação de string? -> Substituir por ORM ou query parametrizada.
2. Endpoints de criação/edição rejeitam campos não permitidos e tipos inválidos? -> Verificar DTOs / validadores.
3. Algum segredo, chave ou arquivo `.env` está rastreado no repositório? -> Remover, rotacionar e garantir no `.gitignore`.
4. Senhas usam `bcrypt`/`argon2` e são omitidas nas respostas da API? -> Verificar models e serializers.
5. Rotas protegidas exigem Guard JWT e retornam `401`/`403` adequadamente? -> Testar sem token e com token inválido/expirado.

## Referências

Para exemplos de implementação (hash com bcrypt, estratégia JWT no NestJS, integração no cliente HTTP do front-end e checklist detalhado OWASP), consulte [owasp-e-jwt.md](./references/owasp-e-jwt.md).
