import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  API_URL,
  ApiError,
  atualizarEvento,
  criarEvento,
  definirSessao,
  entrar,
  lerCookie,
  limparSessao,
  listarEventos,
  obterToken,
  obterUsuarioSalvo,
  registrarUsuario,
  removerEvento,
  renovarSessao,
  sair,
} from '../api';

function mockFetch(status, corpo) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: corpo === undefined ? () => Promise.reject(new Error('sem corpo')) : () => Promise.resolve(corpo),
  });
}

describe('api + JWT + CSRF', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    limparSessao();
    document.cookie = 'csrf_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  });

  it('gerencia sessão em sessionStorage e lê cookie CSRF', () => {
    expect(obterToken()).toBeNull();
    expect(obterUsuarioSalvo()).toBeNull();

    definirSessao({ accessToken: 'tok-1', usuario: { id: 1, nome: 'Ana' } });
    expect(obterToken()).toBe('tok-1');
    expect(obterUsuarioSalvo()).toEqual({ id: 1, nome: 'Ana' });

    sessionStorage.setItem('ceub_usuario', '{invalido');
    expect(obterUsuarioSalvo()).toBeNull();

    document.cookie = 'csrf_token=abc123; path=/';
    expect(lerCookie('csrf_token')).toBe('abc123');
    expect(lerCookie('inexistente')).toBe('');
  });

  it('lista eventos sem filtros e envia Bearer token quando autenticado', async () => {
    definirSessao({ accessToken: 'jwt-abc', usuario: { id: 1 } });
    const f = mockFetch(200, [{ id: 1 }]);
    expect(await listarEventos()).toEqual([{ id: 1 }]);
    expect(f).toHaveBeenCalledWith(
      `${API_URL}/eventos`,
      expect.objectContaining({
        credentials: 'include',
        headers: expect.objectContaining({ Authorization: 'Bearer jwt-abc' }),
      }),
    );
  });

  it('lista eventos com filtros na query string', async () => {
    const f = mockFetch(200, []);
    await listarEventos({ busca: 'hack', curso: 'Direito' });
    expect(f.mock.calls[0][0]).toBe(`${API_URL}/eventos?busca=hack&curso=Direito`);
  });

  it('cria, atualiza e remove eventos corretamente', async () => {
    const f1 = mockFetch(201, { id: 2 });
    await criarEvento({ titulo: 'A' });
    expect(f1.mock.calls[0][1]).toMatchObject({ method: 'POST', body: '{"titulo":"A"}' });

    const f2 = mockFetch(200, { id: 3 });
    await atualizarEvento(3, { vagas: 5 });
    expect(f2.mock.calls[0][0]).toBe(`${API_URL}/eventos/3`);
    expect(f2.mock.calls[0][1].method).toBe('PUT');

    mockFetch(204);
    expect(await removerEvento(4)).toBeNull();
  });

  it('realiza login, cadastro, refresh automático em 401 e logout', async () => {
    document.cookie = 'csrf_token=csrf-xyz; path=/';
    const f = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ accessToken: 't1', usuario: { id: 1, nome: 'Ana' } }) })
      .mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({ accessToken: 't2', usuario: { id: 2, nome: 'Leo' } }) })
      .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({ erro: 'Expirado' }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ accessToken: 't3', usuario: { id: 2, nome: 'Leo' } }) })
      .mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({ id: 9 }) })
      .mockResolvedValueOnce({ ok: true, status: 204, json: async () => ({}) });

    await entrar({ email: 'a@b.com', senha: '123' });
    expect(obterToken()).toBe('t1');

    await registrarUsuario({ nome: 'Leo', email: 'l@b.com', senha: '123' });
    expect(obterToken()).toBe('t2');

    const criado = await criarEvento({ titulo: 'Novo' });
    expect(criado).toEqual({ id: 9 });
    expect(obterToken()).toBe('t3');

    await sair();
    expect(obterToken()).toBeNull();
    expect(f).toHaveBeenCalledTimes(6);
  });

  it('limpa sessão quando renovarSessao falha', async () => {
    definirSessao({ accessToken: 't', usuario: { id: 1 } });
    mockFetch(401, { erro: 'Inválido' });
    expect(await renovarSessao()).toBeNull();
    expect(obterToken()).toBeNull();
  });

  it('lança ApiError com mensagem e erros do backend', async () => {
    mockFetch(400, { erros: { titulo: 'Campo obrigatório' } });
    const err = await criarEvento({}).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(400);
    expect(err.erros).toEqual({ titulo: 'Campo obrigatório' });
    expect(err.message).toBe('Erro ao comunicar com o servidor');

    mockFetch(404, { erro: 'Evento não encontrado' });
    await expect(removerEvento(9)).rejects.toThrow('Evento não encontrado');
    mockFetch(500);
    await expect(listarEventos()).rejects.toThrow('Erro ao comunicar com o servidor');
  });
});
