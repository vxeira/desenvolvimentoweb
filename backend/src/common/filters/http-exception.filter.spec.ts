import { BadRequestException, HttpStatus, NotFoundException } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

function criarHostMock() {
  const status = jest.fn().mockReturnThis();
  const json = jest.fn().mockReturnThis();
  const res = { status, json };
  const host = {
    switchToHttp: () => ({
      getResponse: () => res,
    }),
  } as any;
  return { host, status, json };
}

describe('HttpExceptionFilter', () => {
  const filter = new HttpExceptionFilter();

  it('preserva mapa de erros de validação de campo', () => {
    const { host, status, json } = criarHostMock();
    filter.catch(
      new BadRequestException({ erro: 'Dados inválidos', erros: { titulo: 'Campo obrigatório' } }),
      host,
    );
    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith({
      erro: 'Dados inválidos',
      erros: { titulo: 'Campo obrigatório' },
      statusCode: 400,
    });
  });

  it('formata HttpException simples e array de mensagens', () => {
    const { host, status, json } = criarHostMock();
    filter.catch(new NotFoundException('Evento não encontrado'), host);
    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({ erro: 'Evento não encontrado', statusCode: 404 });

    const { host: h2, json: j2 } = criarHostMock();
    filter.catch(new BadRequestException(['Erro 1', 'Erro 2']), h2);
    expect(j2).toHaveBeenCalledWith({ erro: 'Erro 1; Erro 2', statusCode: 400 });
  });

  it('oculta detalhes em erros internos 500', () => {
    const { host, status, json } = criarHostMock();
    filter.catch(new Error('SQL syntax leak'), host);
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ erro: 'Erro interno do servidor', statusCode: 500 });
  });
});
