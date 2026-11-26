import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EventoCard from '../components/EventoCard';
import EventoForm from '../components/EventoForm';
import ConfirmarExclusao from '../components/ConfirmarExclusao';
import Header from '../components/Header';
import AuthModal from '../components/AuthModal';
import * as api from '../api';

vi.mock('../api', () => ({
  entrar: vi.fn(),
  registrarUsuario: vi.fn(),
}));

const evento = {
  id: 1, titulo: 'Semana de TI', descricao: 'Palestras', data: '2026-12-10',
  local: 'Bloco 3', curso: 'Ciência da Computação', vagas: 100,
};

describe('Header', () => {
  it('dispara onNovo e onEntrar quando deslogado', async () => {
    const onNovo = vi.fn();
    const onEntrar = vi.fn();
    render(<Header onNovo={onNovo} onEntrar={onEntrar} />);
    await userEvent.click(screen.getByRole('button', { name: /novo evento/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(onNovo).toHaveBeenCalled();
    expect(onEntrar).toHaveBeenCalled();
  });

  it('exibe nome do usuário e botão Sair quando autenticado', async () => {
    const onSair = vi.fn();
    render(<Header usuario={{ nome: 'Lucas' }} onNovo={vi.fn()} onSair={onSair} />);
    expect(screen.getByText('Lucas')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Sair' }));
    expect(onSair).toHaveBeenCalled();
  });
});

describe('AuthModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('valida campos e alterna entre login e cadastro', async () => {
    const onAutenticado = vi.fn();
    const onCancelar = vi.fn();
    render(<AuthModal onAutenticado={onAutenticado} onCancelar={onCancelar} />);

    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Informe um e-mail válido');

    await userEvent.type(screen.getByLabelText('E-mail'), 'lucas@ceub.edu.br');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(screen.getByRole('alert')).toHaveTextContent('mínimo 8 caracteres');

    await userEvent.click(screen.getByRole('button', { name: /cadastre-se/i }));
    expect(screen.getByRole('heading', { name: 'Criar conta' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar' }));
    expect(screen.getByRole('alert')).toHaveTextContent('nome completo');

    await userEvent.type(screen.getByLabelText('Nome'), 'Lucas Vieira');
    await userEvent.type(screen.getByLabelText(/Senha/), 'Senha@1234');
    await userEvent.type(screen.getByLabelText(/RA/), '22600001');
    vi.mocked(api.registrarUsuario).mockResolvedValue({ accessToken: 't', usuario: { id: 1, nome: 'Lucas Vieira' } });

    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar' }));
    expect(api.registrarUsuario).toHaveBeenCalledWith({
      nome: 'Lucas Vieira',
      email: 'lucas@ceub.edu.br',
      senha: 'Senha@1234',
      documento: '22600001',
    });
    expect(onAutenticado).toHaveBeenCalledWith({ id: 1, nome: 'Lucas Vieira' });

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancelar).toHaveBeenCalled();
  });

  it('exibe erro retornado pela API no login', async () => {
    vi.mocked(api.entrar).mockRejectedValue(new Error('Credenciais inválidas'));
    render(<AuthModal onAutenticado={vi.fn()} onCancelar={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('E-mail'), 'lucas@ceub.edu.br');
    await userEvent.type(screen.getByLabelText(/Senha/), 'Senha@1234');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Credenciais inválidas');
  });
});

describe('EventoCard', () => {
  it('exibe as informações e aciona editar/excluir', async () => {
    const onEditar = vi.fn();
    const onRemover = vi.fn();
    render(<EventoCard evento={evento} onEditar={onEditar} onRemover={onRemover} />);
    expect(screen.getByText('Semana de TI')).toBeInTheDocument();
    expect(screen.getByText('DEZ')).toBeInTheDocument();
    expect(screen.getByText('100 vagas')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Editar Semana de TI' }));
    await userEvent.click(screen.getByRole('button', { name: 'Excluir Semana de TI' }));
    expect(onEditar).toHaveBeenCalledWith(evento);
    expect(onRemover).toHaveBeenCalledWith(evento);
  });

  it('não exibe parágrafo de descrição quando vazia', () => {
    render(<EventoCard evento={{ ...evento, descricao: '' }} onEditar={vi.fn()} onRemover={vi.fn()} />);
    expect(screen.queryByText('Palestras')).not.toBeInTheDocument();
  });
});

describe('EventoForm', () => {
  it('mostra erros de validação e não envia', async () => {
    const onSalvar = vi.fn();
    render(<EventoForm inicial={{}} onSalvar={onSalvar} onCancelar={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Novo evento' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(screen.getAllByText('Campo obrigatório')).toHaveLength(5);
    expect(onSalvar).not.toHaveBeenCalled();
  });

  it('envia os dados preenchidos com vagas numéricas', async () => {
    const onSalvar = vi.fn().mockResolvedValue();
    render(<EventoForm inicial={{}} onSalvar={onSalvar} onCancelar={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('Título'), 'Hackathon');
    await userEvent.type(screen.getByLabelText('Descrição'), '24h de código');
    await userEvent.type(screen.getByLabelText('Data'), '2026-12-20');
    await userEvent.type(screen.getByLabelText('Vagas'), '40');
    await userEvent.type(screen.getByLabelText('Local'), 'Lab 5');
    await userEvent.selectOptions(screen.getByLabelText('Curso'), 'Direito');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(onSalvar).toHaveBeenCalledWith({
      titulo: 'Hackathon', descricao: '24h de código', data: '2026-12-20',
      local: 'Lab 5', curso: 'Direito', vagas: 40,
    });
  });

  it('em modo edição preenche os campos e não envia o id', async () => {
    const onSalvar = vi.fn().mockResolvedValue();
    render(<EventoForm inicial={evento} onSalvar={onSalvar} onCancelar={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Editar evento' })).toBeInTheDocument();
    expect(screen.getByLabelText('Título')).toHaveValue('Semana de TI');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(onSalvar.mock.calls[0][0]).not.toHaveProperty('id');
  });

  it('exibe erros vindos do servidor', async () => {
    const onSalvar = vi.fn()
      .mockRejectedValueOnce(Object.assign(new Error('x'), { erros: { local: 'Máximo de 120 caracteres' } }))
      .mockRejectedValueOnce(new Error('Servidor fora do ar'));
    render(<EventoForm inicial={evento} onSalvar={onSalvar} onCancelar={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Máximo de 120 caracteres')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Servidor fora do ar')).toBeInTheDocument();
  });

  it('cancela', async () => {
    const onCancelar = vi.fn();
    render(<EventoForm inicial={{}} onSalvar={vi.fn()} onCancelar={onCancelar} />);
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancelar).toHaveBeenCalled();
  });
});

describe('ConfirmarExclusao', () => {
  it('confirma e cancela', async () => {
    const onConfirmar = vi.fn();
    const onCancelar = vi.fn();
    render(<ConfirmarExclusao evento={evento} onConfirmar={onConfirmar} onCancelar={onCancelar} />);
    expect(screen.getByText('Semana de TI')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onConfirmar).toHaveBeenCalled();
    expect(onCancelar).toHaveBeenCalled();
  });
});
