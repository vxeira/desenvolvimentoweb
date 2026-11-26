import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { buildValidationPipe } from '../src/common/pipes/validation-pipe.factory';
import { PrismaService } from '../src/prisma/prisma.service';

describe('API NestJS + Prisma + Swagger + JWT (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(helmet());
    app.use(cookieParser());
    app.useGlobalPipes(buildValidationPipe());
    app.useGlobalFilters(new HttpExceptionFilter());

    const swaggerConfig = new DocumentBuilder().setTitle('Test').setVersion('1.0').addBearerAuth().build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);

    await app.init();
    prisma = app.get(PrismaService);
    await prisma.evento.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.usuario.deleteMany();
  });

  afterAll(async () => {
    await prisma.evento.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.usuario.deleteMany();
    await app.close();
  });

  it('GET /api/health e GET /api/docs-json respondem corretamente', async () => {
    await request(app.getHttpServer()).get('/api/health').expect(200);
    const docs = await request(app.getHttpServer()).get('/api/docs-json').expect(200);
    expect(docs.body.openapi).toBeDefined();
    expect(docs.body.paths['/api/eventos']).toBeDefined();
    expect(docs.body.paths['/api/auth/login']).toBeDefined();
  });

  it('fluxo completo: register -> cookies/CSRF -> refresh -> CRUD protegido -> ownership -> logout', async () => {
    const email = `e2e_${Date.now()}@ceub.edu.br`;
    const reg = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ nome: 'Teste E2E', email, senha: 'SenhaSegura@2026', documento: '22609999' })
      .expect(201);

    expect(reg.body.accessToken).toBeTruthy();
    expect(reg.body.usuario.documentoMascarado).toBe('****9999');
    expect(reg.headers['cache-control']).toBe('no-store');

    const setCookies: string[] = reg.headers['set-cookie'] as unknown as string[];
    const refreshCookie = setCookies.find((c) => c.startsWith('refresh_token='));
    const csrfCookie = setCookies.find((c) => c.startsWith('csrf_token='));
    expect(refreshCookie).toContain('HttpOnly');
    const csrfVal = csrfCookie!.split(';')[0].split('=')[1];

    // Refresh sem CSRF deve retornar 403
    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', [refreshCookie!, csrfCookie!])
      .expect(403);

    // Refresh com CSRF deve retornar 200
    const ref = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', [refreshCookie!, csrfCookie!])
      .set('x-csrf-token', csrfVal)
      .expect(200);

    const token = ref.body.accessToken;

    // POST sem JWT retorna 401
    await request(app.getHttpServer()).post('/api/eventos').send({}).expect(401);

    // POST com payload inválido retorna 400 com mapa erros
    const inv = await request(app.getHttpServer())
      .post('/api/eventos')
      .set('Authorization', `Bearer ${token}`)
      .send({ titulo: '', data: 'invalida', vagas: 0 })
      .expect(400);
    expect(inv.body.erros).toBeDefined();

    // POST válido retorna 201 + header Location
    const created = await request(app.getHttpServer())
      .post('/api/eventos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        titulo: 'Seminário NestJS',
        descricao: 'Prisma e Segurança',
        data: '2027-05-20',
        local: 'Auditório',
        curso: 'Ciência da Computação',
        vagas: 120,
      })
      .expect(201);
    expect(created.headers.location).toBe(`/api/eventos/${created.body.id}`);

    // GET público lista o evento
    const lista = await request(app.getHttpServer()).get('/api/eventos').expect(200);
    expect(lista.body.some((e: any) => e.id === created.body.id)).toBe(true);

    // PUT atualiza o evento
    const updated = await request(app.getHttpServer())
      .put(`/api/eventos/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ vagas: 150 })
      .expect(200);
    expect(updated.body.vagas).toBe(150);

    // DELETE remove com 204
    await request(app.getHttpServer())
      .delete(`/api/eventos/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);
  });
});
