import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import * as api from '../api';

vi.mock('../api', () => ({
  listarEventos: vi.fn(),
  criarEvento: vi.fn(),
  atualizarEvento: vi.fn(),
  removerEvento: vi.fn(),
  entrar: vi.fn(),
  registrarUsuario: vi.fn(),
  sair: vi.fn(),
  obterToken: vi.fn(),
  obterUsuarioSalvo: vi.fn(),
  limparSessao: vi.fn(),
}));

const evento = {
  id: 1, titulo: 'Semana de TI', descricao: '', data: '2026-12-10',
  local: 'Bloco 3', curso: 'Direito', vagas: 100,
};

async function preencherNovo() {
  await userEvent.type(screen.getByLabelText('Título'), 'Hackathon');
  await userEvent.type(screen.getByLabelText('Data'), '2026-12-20');
  await userEvent.type(screen.getByLabelText('Vagas'), '40');
  await userEvent.type(screen.getByLabelText('Local'), 'Lab 5');
  await userEvent.selectOptions(screen.getByLabelText('Curso'), 'Direito');
}

describe('App', () => {
  beforeEach(() => {
    vi.mocked(api.listarEventos).mockReset().mockResolvedValue([evento]);
    vi.mocked(api.criarEvento).mockReset().mockResolvedValue({});
    vi.mocked(api.atualizarEvento).mockReset().mockResolvedValue({});
    vi.mocked(api.removerEvento).mockReset().mockResolvedValue(null);
    vi.mocked(api.entrar).mockReset().mockResolvedValue({ accessToken: 'tok', usuario: { id: 1, nome: 'Ana' } });
    vi.mocked(api.sair).mockReset().mockResolvedValue();
    vi.mocked(api.obterToken).mockReset().mockReturnValue('tok');
    vi.mocked(api.obterUsuarioSalvo).mockReset().mockReturnValue({ id: 1, nome: 'Ana' });
    vi.mocked(api.limparSessao).mockReset();
  });

  it('lista os eventos carregados da API', async () => {
    render(<App />);
    expect(screen.getByLabelText('Carregando')).toBeInTheDocument();
    expect(await screen.findByText('Semana de TI')).toBeInTheDocument();
    expect(screen.getByText('Ana')).toBeInTheDocument();
  });

  it('solicita autenticação JWT ao clicar em Novo evento deslogado e executa ação pendente após login', async () => {
    vi.mocked(api.obterToken).mockReturnValue(null);
    vi.mocked(api.obterUsuarioSalvo).mockReturnValue(null);
    render(<App />);
    await screen.findByText('Semana de TI');

    await userEvent.click(screen.getByRole('button', { name: /novo evento/i }));
    expect(screen.getByRole('heading', { name: 'Entrar com JWT' })).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('E-mail'), 'ana@ceub.edu.br');
    await userEvent.type(screen.getByLabelText(/Senha/), 'Senha@1234');
    vi.mocked(api.obterToken).mockReturnValue('tok');
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('heading', { name: 'Novo evento' })).toBeInTheDocument();
  });

  it('permite encerrar sessão pelo botão Sair', async () => {
    render(<App />);
    await screen.findByText('Semana de TI');
    await userEvent.click(screen.getByRole('button', { name: 'Sair' }));
    expect(api.sair).toHaveBeenCalled();
    expect(await screen.findByText('Sessão encerrada')).toBeInTheDocument();
  });

  it('mostra estado vazio e permite cadastrar a partir dele', async () => {
    api.listarEventos.mockResolvedValue([]);
    render(<App />);
    expect(await screen.findByText('Nenhum evento encontrado.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /cadastrar evento/i }));
    expect(screen.getByRole('heading', { name: 'Novo evento' })).toBeInTheDocument();
  });

  it('mostra o resumo de eventos, vagas e cursos', async () => {
    api.listarEventos.mockResolvedValue([evento, { ...evento, id: 2, vagas: 50, curso: 'Medicina' }]);
    render(<App />);
    const resumo = await screen.findByRole('list', { name: 'Resumo' });
    await waitFor(() => expect(within(resumo).getByText('150')).toBeInTheDocument());
    expect(within(resumo).getAllByText('2')).toHaveLength(2);
  });

  it('mostra erro quando a API falha', async () => {
    api.listarEventos.mockRejectedValue(new Error('Falha de rede'));
    render(<App />);
    expect(await screen.findByText('Falha de rede')).toBeInTheDocument();
  });

  it('aplica filtros de busca e curso', async () => {
    render(<App />);
    await screen.findByText('Semana de TI');
    await userEvent.type(screen.getByLabelText('Buscar por título'), 'TI');
    await userEvent.selectOptions(screen.getByLabelText('Filtrar por curso'), 'Direito');
    await waitFor(() =>
      expect(api.listarEventos).toHaveBeenLastCalledWith({ busca: 'TI', curso: 'Direito' }),
    );
  });

  it('cria um evento (Create)', async () => {
    render(<App />);
    await screen.findByText('Semana de TI');
    await userEvent.click(screen.getByRole('button', { name: /novo evento/i }));
    await preencherNovo();
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(api.criarEvento).toHaveBeenCalledWith(expect.objectContaining({ titulo: 'Hackathon', vagas: 40 }));
    expect(await screen.findByText('Evento criado com sucesso')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('edita um evento (Update)', async () => {
    render(<App />);
    await userEvent.click(await screen.findByRole('button', { name: 'Editar Semana de TI' }));
    const titulo = screen.getByLabelText('Título');
    await userEvent.clear(titulo);
    await userEvent.type(titulo, 'Semana de TI 2026');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(api.atualizarEvento).toHaveBeenCalledWith(1, expect.objectContaining({ titulo: 'Semana de TI 2026' }));
    expect(await screen.findByText('Evento atualizado com sucesso')).toBeInTheDocument();
  });

  it('reabre autenticação se salvar retornar 401', async () => {
    api.criarEvento.mockRejectedValue(Object.assign(new Error('Não autenticado'), { status: 401 }));
    render(<App />);
    await screen.findByText('Semana de TI');
    await userEvent.click(screen.getByRole('button', { name: /novo evento/i }));
    await preencherNovo();
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByRole('heading', { name: 'Entrar com JWT' })).toBeInTheDocument();
  });

  it('fecha o formulário ao cancelar', async () => {
    render(<App />);
    await userEvent.click(await screen.findByRole('button', { name: /novo evento/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('exclui um evento (Delete) e o aviso some sozinho', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<App />);
    await userEvent.click(await screen.findByRole('button', { name: 'Excluir Semana de TI' }));
    const dialogo = screen.getByRole('alertdialog');
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Excluir' }));
    expect(api.removerEvento).toHaveBeenCalledWith(1);
    expect(await screen.findByText('Evento excluído')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(3100));
    expect(screen.queryByText('Evento excluído')).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it('cancela a exclusão', async () => {
    render(<App />);
    await userEvent.click(await screen.findByRole('button', { name: 'Excluir Semana de TI' }));
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(api.removerEvento).not.toHaveBeenCalled();
  });

  it('mostra erro quando a exclusão falha', async () => {
    api.removerEvento.mockRejectedValue(Object.assign(new Error('Evento não encontrado'), { status: 401 }));
    render(<App />);
    await userEvent.click(await screen.findByRole('button', { name: 'Excluir Semana de TI' }));
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Excluir' }));
    expect(await screen.findByText('Evento não encontrado')).toBeInTheDocument();
  });
});
