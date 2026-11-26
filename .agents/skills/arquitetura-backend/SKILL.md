---
name: arquitetura-backend
description: >-
  Define e aplica os padrões de arquitetura e back-end do projeto usando NestJS,
  boas práticas HTTP/REST (métodos, status codes, headers, cookies, CORS),
  documentação Swagger (OpenAPI), ORM Prisma com migrations e convenção de
  nomenclatura de tabelas tbl_<num>_<nome>. Use esta skill ao criar ou refatorar
  módulos de API, endpoints REST, schemas de banco de dados, migrations ou
  documentação de endpoints no back-end.
---

# Arquitetura & Back-end (NestJS + Prisma + Swagger)

Esta skill orienta a construção, revisão e padronização do back-end seguindo a stack e as convenções definidas para o projeto.

> **Nota sobre o estado atual do repositório:** verifique se o diretório `backend/` está utilizando NestJS ou outra stack (como Flask) antes de gerar código, aplicando os padrões equivalentes ou guiando a migração para NestJS + Prisma quando solicitado.

## Pilares Obrigatórios

1. **Framework — NestJS**
   - Organizar por domínio em módulos (`*.module.ts`, `*.controller.ts`, `*.service.ts`, `dto/*.dto.ts`).
   - Controllers devem lidar apenas com roteamento, extração de parâmetros, códigos HTTP e delegação ao Service.
   - Regras de negócio e acesso a dados ficam isolados nos Services (injetados via DI).
   - Usar DTOs tipados para entrada (`Create*Dto`, `Update*Dto`) e saída/serialização.

2. **Web e APIs — Protocolo HTTP**
   - **Métodos:** `GET` (leitura idempotente), `POST` (criação), `PUT` (substituição completa), `PATCH` (atualização parcial), `DELETE` (remoção), `OPTIONS` (preflight CORS).
   - **Status Codes semânticos:** `200 OK`, `201 Created` (com header `Location` quando aplicável), `204 No Content` (ex.: `DELETE`), `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `409 Conflict`, `422 Unprocessable Entity`, `500 Internal Server Error`.
   - **Headers & Cookies:** retornar `Content-Type: application/json`; quando usar cookies (ex.: refresh token/sessão), configurar `httpOnly: true`, `secure: true` (em produção), `sameSite: 'lax'` ou `'strict'`.
   - **CORS:** habilitar explicitamente apenas origens confiáveis (via variável de ambiente, ex.: `CORS_ORIGIN`), métodos permitidos, headers (`Content-Type`, `Authorization`) e `credentials: true` apenas quando necessário.

3. **APIs REST — Documentação Swagger (OpenAPI)**
   - Configurar `@nestjs/swagger` no `main.ts` com `DocumentBuilder` e expor a interface interativa (ex.: `/api/docs`).
   - Decorar controllers com `@ApiTags(...)`, endpoints com `@ApiOperation` e `@ApiResponse`, rotas autenticadas com `@ApiBearerAuth()`, e propriedades de DTOs com `@ApiProperty` / `@ApiPropertyOptional`.

4. **ORMs e Migrations — Prisma**
   - Centralizar o schema em `prisma/schema.prisma` e injetar um `PrismaService` global estendendo `PrismaClient`.
   - Toda alteração estrutural no banco deve gerar migration versionada (`npx prisma migrate dev --name <descricao>`), nunca editando o banco manualmente em produção (`npx prisma migrate deploy`).
   - Executar `npx prisma generate` após alterações no schema e usar `prisma.$transaction(...)` em operações compostas.

5. **Padrão de Tabelas (`tbl+num+nome`)**
   - Toda tabela no banco de dados deve seguir estritamente o padrão **`tbl_<num>_<nome>`** (prefixo `tbl_`, número sequencial com 3 dígitos e nome em `snake_case` no plural, sem acentos no identificador SQL — ex.: `tbl_001_usuarios`, `tbl_002_eventos`).
   - No Prisma, manter o `model` em `PascalCase` singular no TypeScript e mapear o nome físico com `@@map("tbl_001_usuarios")`.

## Fluxo de Trabalho ao Implementar um Recurso

1. **Modelagem no Prisma:** definir o `model` em `schema.prisma` com `@@map("tbl_NNN_nome")` e campos com `@map` se necessário; rodar `npx prisma migrate dev`.
2. **DTOs & Validação:** criar DTOs com decoradores `@ApiProperty` (Swagger) e validadores de entrada.
3. **Service:** implementar regras de negócio usando `PrismaService`, lançando exceções HTTP adequadas do NestJS (`NotFoundException`, `ConflictException`, etc.).
4. **Controller:** expor rotas REST semânticas com `@HttpCode(...)` e decoradores Swagger completos.
5. **Verificação:** validar build, migrations, endpoints no Swagger UI (`/api/docs`) e testes automatizados.

## Referências

Para exemplos práticos de `schema.prisma`, configuração de `main.ts` (CORS + Swagger), DTOs e `PrismaService`, consulte [nestjs-prisma-swagger.md](./references/nestjs-prisma-swagger.md).
