import { formatarData } from '../utils';

export default function EventoCard({ evento, onEditar, onRemover }) {
  const data = formatarData(evento.data);
  return (
    <article className="card surgir tw-group tw-rounded-2xl tw-overflow-hidden tw-m-0 tw-h-full tw-flex tw-flex-col tw-shadow-card hover:tw-shadow-card-hover hover:tw--translate-y-1 tw-transition tw-duration-200 tw-border-t-4 tw-border-solid tw-border-x-0 tw-border-b-0 tw-border-ceub-roxo">
      <div className="tw-flex tw-items-stretch">
        <div className="tw-bg-gradient-to-b tw-from-ceub-roxo tw-to-ceub-roxo-escuro tw-text-white tw-flex tw-flex-col tw-items-center tw-justify-center tw-px-5 tw-py-4 tw-min-w-[84px]">
          <span className="tw-text-3xl tw-font-extrabold tw-leading-none">{data.dia}</span>
          <span className="tw-text-xs tw-font-bold tw-tracking-widest tw-text-ceub-lilas tw-mt-1">{data.mes}</span>
          <span className="tw-text-xs tw-opacity-70">{data.ano}</span>
        </div>
        <div className="card-content tw-flex-1 tw-py-4">
          <span className="chip tw-bg-ceub-roxo-claro tw-text-ceub-roxo tw-font-semibold tw-text-xs tw-h-auto tw-leading-snug tw-py-1 tw-mb-1">
            {evento.curso}
          </span>
          <h3 className="tw-text-lg tw-font-bold tw-text-ceub-roxo-escuro tw-m-0 tw-mt-1 group-hover:tw-text-ceub-roxo tw-transition-colors">
            {evento.titulo}
          </h3>
        </div>
      </div>
      <div className="card-content tw-pt-2 tw-flex-1">
        {evento.descricao && <p className="tw-text-gray-600 tw-mb-3">{evento.descricao}</p>}
        <div className="tw-flex tw-flex-wrap tw-gap-2">
          <span className="tw-inline-flex tw-items-center tw-gap-1 tw-rounded-full tw-bg-ceub-roxo-claro tw-px-3 tw-py-1 tw-text-sm tw-text-ceub-roxo-escuro">
            <i className="material-icons tiny tw-text-ceub-roxo-vivo">place</i>
            {evento.local}
          </span>
          <span className="tw-inline-flex tw-items-center tw-gap-1 tw-rounded-full tw-bg-ceub-roxo-claro tw-px-3 tw-py-1 tw-text-sm tw-text-ceub-roxo-escuro">
            <i className="material-icons tiny tw-text-ceub-roxo-vivo">groups</i>
            {evento.vagas} vagas
          </span>
        </div>
      </div>
      <div className="card-action tw-flex tw-justify-end tw-gap-2 tw-border-ceub-roxo-claro">
        <button
          type="button"
          className="btn-flat waves-effect tw-text-ceub-roxo"
          onClick={() => onEditar(evento)}
          aria-label={`Editar ${evento.titulo}`}
        >
          <i className="material-icons left">edit</i>Editar
        </button>
        <button
          type="button"
          className="btn-flat waves-effect tw-text-ceub-perigo"
          onClick={() => onRemover(evento)}
          aria-label={`Excluir ${evento.titulo}`}
        >
          <i className="material-icons left">delete</i>Excluir
        </button>
      </div>
    </article>
  );
}
