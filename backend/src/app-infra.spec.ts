import { BadRequestException } from '@nestjs/common';
import { validate } from 'class-validator';
import { buildValidationPipe } from './common/pipes/validation-pipe.factory';
import { CreateEventoDto } from './modules/eventos/dto/create-evento.dto';
import { HealthController } from './modules/health/health.controller';
import { PrismaService } from './prisma/prisma.service';

describe('HealthController, ValidationPipe, IsIsoDate e PrismaService', () => {
  it('HealthController retorna status ok', () => {
    const res = new HealthController().check();
    expect(res.status).toBe('ok');
    expect(res.timestamp).toBeDefined();
  });

  it('buildValidationPipe transforma erros em mapa { erros }', async () => {
    const pipe = buildValidationPipe();
    await expect(
      pipe.transform({ titulo: '', data: '2027-02-30', local: '', curso: '', vagas: 0 }, {
        type: 'body',
        metatype: CreateEventoDto,
      }),
    ).rejects.toThrow(BadRequestException);

    const dto = new CreateEventoDto();
    dto.titulo = 'OK';
    dto.data = '2027-03-15';
    dto.local = 'Bloco 1';
    dto.curso = 'Direito';
    dto.vagas = 10;
    expect(await validate(dto)).toHaveLength(0);
  });

  it('PrismaService conecta e desconecta nos hooks do ciclo de vida', async () => {
    const prisma = new PrismaService();
    const connectSpy = jest.spyOn(prisma, '$connect').mockResolvedValue();
    const disconnectSpy = jest.spyOn(prisma, '$disconnect').mockResolvedValue();
    await prisma.onModuleInit();
    await prisma.onModuleDestroy();
    expect(connectSpy).toHaveBeenCalled();
    expect(disconnectSpy).toHaveBeenCalled();
  });
});
