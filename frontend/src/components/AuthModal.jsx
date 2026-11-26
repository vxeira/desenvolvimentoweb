import { useState } from 'react';
import { entrar, registrarUsuario } from '../api';

export default function AuthModal({ onAutenticado, onCancelar }) {
  const [modo, setModo] = useState('login');
  const [dados, setDados] = useState({ nome: '', email: '', senha: '', documento: '' });
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  const alterar = (e) => setDados({ ...dados, [e.target.name]: e.target.value });

  async function enviar(e) {
    e.preventDefault();
    setErro('');

    if (modo === 'register' && dados.nome.trim().length < 2) {
      setErro('Informe seu nome completo (mínimo 2 caracteres)');
      return;
    }
    if (!dados.email.includes('@')) {
      setErro('Informe um e-mail válido');
      return;
    }
    if (dados.senha.length < 8) {
      setErro('A senha deve ter no mínimo 8 caracteres');
      return;
    }

    setEnviando(true);
    try {
      const sessao =
        modo === 'login'
          ? await entrar({ email: dados.email.trim(), senha: dados.senha })
          : await registrarUsuario({
              nome: dados.nome.trim(),
              email: dados.email.trim(),
              senha: dados.senha,
              ...(dados.documento.trim() ? { documento: dados.documento.trim() } : {}),
            });
      onAutenticado(sessao.usuario);
    } catch (err) {
      setErro(err.message || 'Falha na autenticação');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div
      className="tw-fixed tw-inset-0 tw-z-50 tw-flex tw-items-center tw-justify-center tw-bg-ceub-roxo-profundo/60 tw-backdrop-blur-sm tw-p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-auth"
    >
      <form
        onSubmit={enviar}
        noValidate
        className="card tw-w-full tw-max-w-md tw-rounded-2xl tw-overflow-hidden tw-m-0"
      >
        <div className="tw-bg-gradient-to-r tw-from-ceub-roxo tw-to-ceub-roxo-escuro tw-text-white tw-px-6 tw-py-5">
          <h2 id="titulo-auth" className="tw-text-xl tw-font-bold tw-m-0">
            {modo === 'login' ? 'Entrar com JWT' : 'Criar conta'}
          </h2>
          <p className="tw-text-xs tw-text-ceub-lilas tw-m-0 tw-mt-1">
            Autenticação necessária para cadastrar, editar ou excluir eventos.
          </p>
        </div>

        <div className="card-content">
          {erro && (
            <p className="tw-text-ceub-perigo tw-mt-0" role="alert">
              {erro}
            </p>
          )}

          {modo === 'register' && (
            <div className="input-field tw-mt-4">
              <input
                id="auth-nome"
                name="nome"
                type="text"
                value={dados.nome}
                onChange={alterar}
                maxLength={120}
              />
              <label htmlFor="auth-nome" className="active">Nome</label>
            </div>
          )}

          <div className="input-field tw-mt-6">
            <input
              id="auth-email"
              name="email"
              type="email"
              value={dados.email}
              onChange={alterar}
              maxLength={160}
            />
            <label htmlFor="auth-email" className="active">E-mail</label>
          </div>

          <div className="input-field tw-mt-6">
            <input
              id="auth-senha"
              name="senha"
              type="password"
              value={dados.senha}
              onChange={alterar}
              maxLength={128}
            />
            <label htmlFor="auth-senha" className="active">Senha (mín. 8 caracteres)</label>
          </div>

          {modo === 'register' && (
            <div className="input-field tw-mt-6">
              <input
                id="auth-documento"
                name="documento"
                type="text"
                value={dados.documento}
                onChange={alterar}
                maxLength={30}
                placeholder="Opcional (armazenado cifrado)"
              />
              <label htmlFor="auth-documento" className="active">RA / Documento (opcional)</label>
            </div>
          )}

          <button
            type="button"
            className="btn-flat tw-px-0 tw-text-ceub-roxo tw-normal-case"
            onClick={() => {
              setModo(modo === 'login' ? 'register' : 'login');
              setErro('');
            }}
          >
            {modo === 'login' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entrar'}
          </button>
        </div>

        <div className="card-action tw-flex tw-justify-end tw-gap-2">
          <button type="button" className="btn-flat waves-effect" onClick={onCancelar}>
            Cancelar
          </button>
          <button type="submit" className="btn waves-effect tw-bg-ceub-roxo" disabled={enviando}>
            {enviando ? 'Aguarde...' : modo === 'login' ? 'Entrar' : 'Cadastrar'}
          </button>
        </div>
      </form>
    </div>
  );
}
