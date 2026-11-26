import { EventosController } from './eventos.controller';
import { EventosService } from './eventos.service';

describe('EventosController', () => {
  const service = {
    listar: jest.fn(),
    detalhar: jest.fn(),
    criar: jest.fn(),
    atualizar: jest.fn(),
    remover: jest.fn(),
  } as unknown as jest.Mocked<EventosService>;

  const controller = new EventosController(service);
  const user = { userId: 1, email: 'a@ceub.edu.br', nome: 'Ana', role: 'USUARIO' };
  const evento = {
    id: 10,
    titulo: 'Palestra',
    descricao: '',
    data: '2027-01-10',
    local: 'Bloco 1',
    curso: 'Direito',
    vagas: 50,
    criadoPorId: 1,
  };

  beforeEach(() => jest.clearAllMocks());

  it('executa listar, detalhar, criar (com Location), atualizar, atualizarParcial e remover', async () => {
    service.listar.mockResolvedValue([evento]);
    expect(await controller.listar({})).toEqual([evento]);

    service.detalhar.mockResolvedValue(evento);
    expect(await controller.detalhar(10)).toEqual(evento);

    service.criar.mockResolvedValue(evento);
    const res = { setHeader: jest.fn() } as any;
    expect(await controller.criar(evento, user, res)).toEqual(evento);
    expect(res.setHeader).toHaveBeenCalledWith('Location', '/api/eventos/10');

    service.atualizar.mockResolvedValue({ ...evento, vagas: 60 });
    expect(await controller.atualizar(10, { vagas: 60 }, user)).toEqual({ ...evento, vagas: 60 });
    expect(await controller.atualizarParcial(10, { vagas: 60 }, user)).toEqual({ ...evento, vagas: 60 });

    service.remover.mockResolvedValue(undefined);
    await controller.remover(10, user);
    expect(service.remover).toHaveBeenCalledWith(10, user);
  });
});
