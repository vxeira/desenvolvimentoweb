import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { EventosService } from './eventos.service';

describe('EventosService', () => {
  const user = { userId: 1, email: 'a@ceub.edu.br', nome: 'Ana', role: 'USUARIO' };
  const prisma = {
    evento: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  } as any;

  let service: EventosService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EventosService(prisma);
  });

  it('lista e filtra eventos por busca e curso', async () => {
    prisma.evento.findMany.mockResolvedValue([
      {
        id: 1,
        titulo: 'Feira de Robótica',
        descricao: '',
        data: '2027-01-10',
        local: 'Bloco 1',
        curso: 'Direito',
        vagas: 30,
        criadoPorId: 1,
      },
      {
        id: 2,
        titulo: 'Júri Simulado',
        descricao: '',
        data: '2027-02-10',
        local: 'Bloco 2',
        curso: 'Direito',
        vagas: 40,
        criadoPorId: 1,
      },
    ]);

    const res = await service.listar({ busca: 'robótica', curso: 'Direito' });
    expect(res).toHaveLength(1);
    expect(res[0].titulo).toBe('Feira de Robótica');
  });

  it('lança 404 ao detalhar evento inexistente', async () => {
    prisma.evento.findUnique.mockResolvedValue(null);
    await expect(service.detalhar(99)).rejects.toThrow(NotFoundException);
  });

  it('bloqueia edição/remoção por outro usuário (A01 Broken Access Control)', async () => {
    prisma.evento.findUnique.mockResolvedValue({ id: 1, criadoPorId: 999 });
    await expect(service.atualizar(1, { vagas: 10 }, user)).rejects.toThrow(ForbiddenException);
    await expect(service.remover(1, user)).rejects.toThrow(ForbiddenException);
  });

  it('cria, atualiza e remove evento do próprio usuário', async () => {
    const base = {
      id: 1,
      titulo: 'Hackathon',
      descricao: '',
      data: '2027-03-10',
      local: 'Lab 1',
      curso: 'Ciência da Computação',
      vagas: 50,
      criadoPorId: 1,
    };
    prisma.evento.create.mockResolvedValue(base);
    prisma.evento.findUnique.mockResolvedValue(base);
    prisma.evento.update.mockResolvedValue({ ...base, vagas: 80 });
    prisma.evento.delete.mockResolvedValue(base);

    const criado = await service.criar(base, user);
    expect(criado.id).toBe(1);

    const atualizado = await service.atualizar(1, { vagas: 80 }, user);
    expect(atualizado.vagas).toBe(80);

    await service.remover(1, user);
    expect(prisma.evento.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });
});
