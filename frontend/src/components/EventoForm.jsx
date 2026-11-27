import { useState } from 'react';
import { CURSOS, EVENTO_VAZIO, validarFormulario } from '../utils';

function Campo({ id, label, erro, children }) {
  return (
    <div className="input-field tw-mt-6">
      {children}
      <label htmlFor={id} className="active">{label}</label>
      {erro && (
        <span className="helper-text tw-text-ceub-perigo" role="alert">{erro}</span>
      )}
    </div>
  );
}

export default function EventoForm({ inicial, onSalvar, onCancelar }) {
  const [dados, setDados] = useState({ ...EVENTO_VAZIO, ...inicial });
  const [erros, setErros] = useState({});
  const [salvando, setSalvando] = useState(false);
  const editando = Boolean(inicial?.id);

  const alterar = (e) => setDados({ ...dados, [e.target.name]: e.target.value });

  async function enviar(e) {
    e.preventDefault();
    const encontrados = validarFormulario(dados);
    setErros(encontrados);
    if (Object.keys(encontrados).length) return;

    setSalvando(true);
    try {
      // Envia só os campos editáveis: a API rejeita propriedades extras (id, criadoPorId...)
      const campos = Object.fromEntries(
        Object.keys(EVENTO_VAZIO).map((campo) => [campo, dados[campo]]),
      );
      await onSalvar({ ...campos, vagas: Number(dados.vagas) });
    } catch (err) {
      const errosServidor = err.erros || {};
      const temErroDeCampo = Object.keys(errosServidor).some((campo) => campo in EVENTO_VAZIO);
      setErros(temErroDeCampo ? errosServidor : { geral: err.message });
    } finally {
      setSalvando(false);
    }
  }

  const classe = (campo) => (erros[campo] ? 'invalid' : '');

  return (
    <div
      className="tw-fixed tw-inset-0 tw-z-50 tw-flex tw-items-center tw-justify-center tw-bg-ceub-roxo-profundo/60 tw-backdrop-blur-sm tw-p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-form"
    >
      <form
        onSubmit={enviar}
        noValidate
        className="card tw-w-full tw-max-w-xl tw-rounded-2xl tw-overflow-hidden tw-m-0 tw-max-h-[90vh] tw-overflow-y-auto"
      >
        <div className="tw-bg-gradient-to-r tw-from-ceub-roxo tw-to-ceub-roxo-escuro tw-text-white tw-px-6 tw-py-5">
          <h2 id="titulo-form" className="tw-text-xl tw-font-bold tw-m-0">
            {editando ? 'Editar evento' : 'Novo evento'}
          </h2>
        </div>
        <div className="card-content">
          {erros.geral && <p className="tw-text-ceub-perigo" role="alert">{erros.geral}</p>}

          <Campo id="titulo" label="Título" erro={erros.titulo}>
            <input id="titulo" name="titulo" type="text" value={dados.titulo} onChange={alterar} className={classe('titulo')} maxLength={120} />
          </Campo>

          <Campo id="descricao" label="Descrição" erro={erros.descricao}>
            <textarea id="descricao" name="descricao" value={dados.descricao} onChange={alterar} className="materialize-textarea" />
          </Campo>

          <div className="tw-grid tw-grid-cols-1 sm:tw-grid-cols-2 tw-gap-x-4">
            <Campo id="data" label="Data" erro={erros.data}>
              <input id="data" name="data" type="date" value={dados.data} onChange={alterar} className={classe('data')} />
            </Campo>
            <Campo id="vagas" label="Vagas" erro={erros.vagas}>
              <input id="vagas" name="vagas" type="number" min="1" value={dados.vagas} onChange={alterar} className={classe('vagas')} />
            </Campo>
          </div>

          <Campo id="local" label="Local" erro={erros.local}>
            <input id="local" name="local" type="text" value={dados.local} onChange={alterar} className={classe('local')} maxLength={120} />
          </Campo>

          <Campo id="curso" label="Curso" erro={erros.curso}>
            <select id="curso" name="curso" value={dados.curso} onChange={alterar} className={`browser-default ${classe('curso')}`}>
              <option value="">Selecione o curso</option>
              {CURSOS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Campo>
        </div>
        <div className="card-action tw-flex tw-justify-end tw-gap-2">
          <button type="button" className="btn-flat waves-effect" onClick={onCancelar}>Cancelar</button>
          <button type="submit" className="btn waves-effect tw-bg-ceub-roxo" disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  );
}
