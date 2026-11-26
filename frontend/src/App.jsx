import { useCallback, useEffect, useState } from 'react';
import {
  atualizarEvento,
  criarEvento,
  limparSessao,
  listarEventos,
  obterToken,
  obterUsuarioSalvo,
  removerEvento,
  sair,
} from './api';
import { CURSOS } from './utils';
import Header from './components/Header';
import EventoCard from './components/EventoCard';
import EventoForm from './components/EventoForm';
import ConfirmarExclusao from './components/ConfirmarExclusao';
import AuthModal from './components/AuthModal';

export default function App() {
  const [eventos, setEventos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [filtros, setFiltros] = useState({ busca: '', curso: '' });
  const [emEdicao, setEmEdicao] = useState(null); // null = fechado; {} = novo; evento = edição
  const [paraExcluir, setParaExcluir] = useState(null);
  const [aviso, setAviso] = useState('');
  const [usuario, setUsuario] = useState(() => (obterToken() ? obterUsuarioSalvo() : null));
  const [mostrarAuth, setMostrarAuth] = useState(false);
  const [acaoPendente, setAcaoPendente] = useState(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      setEventos(await listarEventos(filtros));
      setErro('');
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }, [filtros]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    if (!aviso) return undefined;
    const t = setTimeout(() => setAviso(''), 3000);
    return () => clearTimeout(t);
  }, [aviso]);

  function exigirAutenticacao(acao) {
    if (usuario && obterToken()) {
      acao();
      return;
    }
    setAcaoPendente(() => acao);
    setMostrarAuth(true);
  }

  function aoAutenticar(novoUsuario) {
    setUsuario(novoUsuario);
    setMostrarAuth(false);
    setAviso(`Bem-vindo(a), ${novoUsuario.nome}`);
    if (acaoPendente) {
      const pendente = acaoPendente;
      setAcaoPendente(null);
      pendente();
    }
  }

  async function aoSair() {
    await sair();
    setUsuario(null);
    setAviso('Sessão encerrada');
  }

  async function salvar(dados) {
    try {
      if (emEdicao.id) {
        await atualizarEvento(emEdicao.id, dados);
        setAviso('Evento atualizado com sucesso');
      } else {
        await criarEvento(dados);
        setAviso('Evento criado com sucesso');
      }
      setEmEdicao(null);
      await carregar();
    } catch (e) {
      if (e.status === 401) {
        limparSessao();
        setUsuario(null);
        setEmEdicao(null);
        setMostrarAuth(true);
        return;
      }
      throw e;
    }
  }

  async function confirmarExclusao() {
    try {
      await removerEvento(paraExcluir.id);
      setAviso('Evento excluído');
      await carregar();
    } catch (e) {
      if (e.status === 401) {
        limparSessao();
        setUsuario(null);
        setMostrarAuth(true);
      }
      setErro(e.message);
    } finally {
      setParaExcluir(null);
    }
  }

  const alterarFiltro = (e) => setFiltros({ ...filtros, [e.target.name]: e.target.value });

  const resumo = [
    { icone: 'event', valor: eventos.length, rotulo: 'eventos' },
    { icone: 'groups', valor: eventos.reduce((soma, ev) => soma + ev.vagas, 0), rotulo: 'vagas ofertadas' },
    { icone: 'school', valor: new Set(eventos.map((ev) => ev.curso)).size, rotulo: 'cursos' },
  ];

  return (
    <div className="tw-min-h-screen tw-flex tw-flex-col tw-font-sans">
      <Header
        usuario={usuario}
        onNovo={() => exigirAutenticacao(() => setEmEdicao({}))}
        onEntrar={() => setMostrarAuth(true)}
        onSair={aoSair}
      />

      <section className="tw-relative tw-overflow-hidden tw-bg-gradient-to-br tw-from-ceub-roxo tw-via-ceub-roxo-escuro tw-to-ceub-roxo-profundo tw-text-white tw-pb-20 tw-pt-12">
        {/* Formas decorativas */}
        <div aria-hidden="true" className="tw-absolute tw--right-24 tw--top-24 tw-h-80 tw-w-80 tw-rounded-full tw-bg-ceub-roxo-vivo/30 tw-blur-2xl" />
        <div aria-hidden="true" className="tw-absolute tw-right-40 tw-bottom-0 tw-h-40 tw-w-40 tw-rounded-full tw-border-8 tw-border-solid tw-border-ceub-lilas/10" />

        <div className="container tw-relative">
          <p className="tw-m-0 tw-mb-2 tw-text-xs tw-font-bold tw-uppercase tw-tracking-[0.25em] tw-text-ceub-lilas">
            Centro Universitário de Brasília
          </p>
          <h1 className="tw-text-3xl md:tw-text-5xl tw-font-extrabold tw-m-0 tw-leading-tight">Agenda de eventos acadêmicos</h1>
          <p className="tw-text-purple-100 tw-mt-3 tw-mb-8 tw-max-w-2xl tw-text-base md:tw-text-lg">
            Cadastre, acompanhe e organize palestras, semanas acadêmicas e workshops do UniCEUB.
          </p>
          <ul className="tw-m-0 tw-p-0 tw-flex tw-flex-wrap tw-gap-3" aria-label="Resumo">
            {resumo.map((item) => (
              <li key={item.rotulo} className="tw-list-none tw-flex tw-items-center tw-gap-3 tw-rounded-2xl tw-bg-white/10 tw-px-4 tw-py-3 tw-backdrop-blur tw-ring-1 tw-ring-white/15">
                <i className="material-icons tw-text-ceub-lilas">{item.icone}</i>
                <span>
                  <strong className="tw-block tw-text-xl tw-font-extrabold tw-leading-none">{item.valor}</strong>
                  <span className="tw-text-xs tw-text-purple-100">{item.rotulo}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <main className="container tw--mt-10 tw-pb-14 tw-flex-1 tw-relative">
        <div className="card tw-rounded-2xl tw-m-0 tw-mb-8 tw-shadow-card">
          <div className="card-content tw-grid tw-grid-cols-1 md:tw-grid-cols-3 tw-gap-4 tw-items-end tw-py-3">
            <div className="input-field tw-m-0 md:tw-col-span-2">
              <i className="material-icons prefix tw-text-ceub-roxo">search</i>
              <input id="busca" name="busca" type="text" placeholder="Ex.: Hackathon" value={filtros.busca} onChange={alterarFiltro} />
              <label htmlFor="busca" className="active">Buscar por título</label>
            </div>
            <div>
              <label htmlFor="filtro-curso" className="tw-text-ceub-roxo-escuro tw-font-semibold">Filtrar por curso</label>
              <select id="filtro-curso" name="curso" value={filtros.curso} onChange={alterarFiltro} className="browser-default">
                <option value="">Todos os cursos</option>
                {CURSOS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        {erro && (
          <div className="card-panel tw-bg-red-50 tw-text-ceub-perigo tw-rounded-xl tw-flex tw-items-center tw-gap-2" role="alert">
            <i className="material-icons">error_outline</i>
            {erro}
          </div>
        )}

        {carregando ? (
          <div className="progress" aria-label="Carregando">
            <div className="indeterminate" />
          </div>
        ) : eventos.length === 0 ? (
          <div className="tw-text-center tw-py-16 tw-px-6 tw-rounded-2xl tw-border-2 tw-border-dashed tw-border-ceub-lilas tw-bg-white">
            <div className="tw-mx-auto tw-mb-4 tw-flex tw-h-20 tw-w-20 tw-items-center tw-justify-center tw-rounded-full tw-bg-ceub-roxo-claro">
              <i className="material-icons medium tw-text-ceub-roxo">event_busy</i>
            </div>
            <p className="tw-text-lg tw-font-semibold tw-text-ceub-roxo-escuro tw-m-0">Nenhum evento encontrado.</p>
            <p className="tw-text-gray-500 tw-mt-1">Ajuste os filtros ou cadastre um novo evento.</p>
            <button
              type="button"
              className="btn waves-effect tw-bg-ceub-roxo tw-mt-2"
              onClick={() => exigirAutenticacao(() => setEmEdicao({}))}
            >
              <i className="material-icons left">add</i>Cadastrar evento
            </button>
          </div>
        ) : (
          <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 lg:tw-grid-cols-3 tw-gap-6">
            {eventos.map((ev) => (
              <EventoCard
                key={ev.id}
                evento={ev}
                onEditar={(item) => exigirAutenticacao(() => setEmEdicao(item))}
                onRemover={(item) => exigirAutenticacao(() => setParaExcluir(item))}
              />
            ))}
          </div>
        )}
      </main>

      <footer className="tw-bg-ceub-roxo-profundo tw-text-purple-100 tw-text-sm">
        <div className="tw-h-1 tw-bg-gradient-to-r tw-from-ceub-roxo tw-via-ceub-lilas tw-to-ceub-roxo" />
        <div className="container tw-flex tw-flex-col sm:tw-flex-row tw-items-center tw-justify-between tw-gap-2 tw-py-6">
          <span className="tw-font-extrabold tw-text-white tw-text-lg">UniCEUB</span>
          <span>Centro Universitário de Brasília · Projeto acadêmico</span>
        </div>
      </footer>

      {emEdicao && (
        <EventoForm inicial={emEdicao} onSalvar={salvar} onCancelar={() => setEmEdicao(null)} />
      )}
      {paraExcluir && (
        <ConfirmarExclusao
          evento={paraExcluir}
          onConfirmar={confirmarExclusao}
          onCancelar={() => setParaExcluir(null)}
        />
      )}
      {mostrarAuth && (
        <AuthModal
          onAutenticado={aoAutenticar}
          onCancelar={() => {
            setMostrarAuth(false);
            setAcaoPendente(null);
          }}
        />
      )}
      {aviso && (
        <div className="tw-fixed tw-bottom-6 tw-left-1/2 tw--translate-x-1/2 tw-z-50 tw-bg-ceub-roxo-escuro tw-text-white tw-px-6 tw-py-3 tw-rounded-full tw-shadow-card-hover tw-flex tw-items-center tw-gap-2" role="status">
          <i className="material-icons tw-text-ceub-lilas">check_circle</i>
          <span>{aviso}</span>
        </div>
      )}
    </div>
  );
}
