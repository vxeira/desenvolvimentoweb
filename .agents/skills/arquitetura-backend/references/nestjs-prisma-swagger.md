# Referência: NestJS, HTTP, Prisma, Swagger e Padrão de Tabelas

## 1. Arquitetura Modular no NestJS (`Module` + `Controller` + `Service`)

Estrutura recomendada por domínio em `src/modules/<recurso>/`:

```text
src/
├── main.ts
├── app.module.ts
├── prisma/
│   ├── prisma.module.ts
│   └── prisma.service.ts
└── modules/
    └── eventos/
        ├── eventos.module.ts
        ├── eventos.controller.ts
        ├── eventos.service.ts
        └── dto/
            ├── create-evento.dto.ts
            └── update-evento.dto.ts
```

---

## 2. Bootstrap NestJS (`main.ts`): CORS, Cookies, Pipes e Swagger

```ts
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.use(cookieParser());

  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:5173'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    exposedHeaders: ['Location'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('CEUB API')
    .setDescription('Documentação REST da API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

---

## 3. Web e APIs: Métodos HTTP, Status Codes, Headers, Cookies e CORS

### Métodos e Status Codes

| Operação | Método | Rota Exemplo | Sucesso | Erros Comuns |
|---|---|---|---|---|
| Listar recursos | `GET` | `/api/eventos` | `200 OK` | `401`, `403` |
| Detalhar recurso | `GET` | `/api/eventos/:id` | `200 OK` | `400`, `404` |
| Criar recurso | `POST` | `/api/eventos` | `201 Created` | `400`, `409`, `422` |
| Substituir recurso | `PUT` | `/api/eventos/:id` | `200 OK` | `400`, `404`, `422` |
| Atualizar parcial | `PATCH` | `/api/eventos/:id` | `200 OK` | `400`, `404`, `422` |
| Remover recurso | `DELETE` | `/api/eventos/:id` | `204 No Content` | `401`, `403`, `404` |

### Headers Essenciais

- **Requisição:** `Content-Type: application/json`, `Accept: application/json`, `Authorization: Bearer <token>`.
- **Resposta:** `Content-Type: application/json; charset=utf-8`, `Location: /api/eventos/10` (em `201 Created`), `Cache-Control: no-store` (em rotas sensíveis/autenticação).

### Cookies Seguros no NestJS

```ts
import { Response } from 'express';

// Definir cookie de refresh token ou sessão
res.cookie('refresh_token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax', // ou 'strict' quando aplicável
  path: '/api/auth/refresh',
  maxAge: 7 * 24 * 60 * 60 * 1000,
});
```

---

## 4. ORMs e Migrations com Prisma + Padrão `tbl_<num>_<nome>`

### `prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql" // ou sqlite / mysql conforme ambiente
  url      = env("DATABASE_URL")
}

model Usuario {
  id        Int      @id @default(autoincrement())
  nome      String   @db.VarChar(120)
  email     String   @unique @db.VarChar(160)
  senhaHash String   @map("senha_hash")
  criadoEm  DateTime @default(now()) @map("criado_em")

  @@map("tbl_001_usuarios")
}

model Evento {
  id        Int      @id @default(autoincrement())
  titulo    String   @db.VarChar(120)
  descricao String   @default("")
  data      DateTime
  local     String   @db.VarChar(120)
  curso     String   @db.VarChar(80)
  vagas     Int

  @@map("tbl_002_eventos")
}
```

> **Convenção `tbl+num+nome`:** use o prefixo `tbl_`, número sequencial de 3 dígitos (`001`, `002`, ...) e o nome da entidade no plural em `snake_case` sem acentos no nome físico SQL (`tbl_001_usuarios` em vez de `tbl_001_usuários`) para garantir portabilidade entre PostgreSQL, MySQL e SQLite.

### `PrismaService` e `PrismaModule`

```ts
// src/prisma/prisma.service.ts
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

```ts
// src/prisma/prisma.module.ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

### Comandos essenciais de Migration

```bash
npx prisma format
npx prisma migrate dev --name init_tbl_001_usuarios
npx prisma generate
# Em produção / CI:
npx prisma migrate deploy
```

---

## 5. Exemplo de DTO, Service e Controller com Swagger

```ts
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiProperty,
  ApiPropertyOptional,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Injectable,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';

export class CreateEventoDto {
  @ApiProperty({ example: 'Semana Acadêmica de Computação', maxLength: 120 })
  @IsString()
  @MaxLength(120)
  titulo: string;

  @ApiPropertyOptional({ example: 'Palestras sobre IA e engenharia web' })
  @IsOptional()
  @IsString()
  descricao?: string;

  @ApiProperty({ example: 200, minimum: 1 })
  @IsInt()
  @Min(1)
  vagas: number;
}

@Injectable()
export class EventosService {
  constructor(private readonly prisma: PrismaService) {}

  listar(curso?: string) {
    return this.prisma.evento.findMany({
      where: curso ? { curso } : undefined,
      orderBy: { data: 'asc' },
    });
  }

  async detalhar(id: number) {
    const evento = await this.prisma.evento.findUnique({ where: { id } });
    if (!evento) {
      throw new NotFoundException('Evento não encontrado');
    }
    return evento;
  }
}

@ApiTags('Eventos')
@ApiBearerAuth()
@Controller('eventos')
export class EventosController {
  constructor(private readonly eventosService: EventosService) {}

  @Get()
  @ApiOperation({ summary: 'Lista eventos acadêmicos' })
  @ApiQuery({ name: 'curso', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Lista retornada com sucesso.' })
  listar(@Query('curso') curso?: string) {
    return this.eventosService.listar(curso);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha um evento por ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Evento encontrado.' })
  @ApiResponse({ status: 404, description: 'Evento não encontrado.' })
  detalhar(@Param('id', ParseIntPipe) id: number) {
    return this.eventosService.detalhar(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Cria um novo evento' })
  @ApiResponse({ status: 201, description: 'Evento criado.' })
  @ApiResponse({ status: 400, description: 'Payload inválido.' })
  criar(@Body() dto: CreateEventoDto) {
    return dto;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove um evento por ID' })
  @ApiResponse({ status: 204, description: 'Evento removido.' })
  @ApiResponse({ status: 404, description: 'Evento não encontrado.' })
  remover(@Param('id', ParseIntPipe) id: number) {
    return;
  }
}
```
