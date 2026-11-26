export default function ConfirmarExclusao({ evento, onConfirmar, onCancelar }) {
  return (
    <div
      className="tw-fixed tw-inset-0 tw-z-50 tw-flex tw-items-center tw-justify-center tw-bg-ceub-roxo-profundo/60 tw-backdrop-blur-sm tw-p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="titulo-confirmar"
    >
      <div className="card tw-w-full tw-max-w-md tw-rounded-2xl tw-m-0">
        <div className="card-content">
          <h2 id="titulo-confirmar" className="tw-text-xl tw-font-bold tw-text-ceub-roxo-escuro tw-mt-0">
            Excluir evento?
          </h2>
          <p>
            O evento <strong>{evento.titulo}</strong> será removido permanentemente.
          </p>
        </div>
        <div className="card-action tw-flex tw-justify-end tw-gap-2">
          <button type="button" className="btn-flat waves-effect" onClick={onCancelar}>Cancelar</button>
          <button type="button" className="btn waves-effect tw-bg-ceub-perigo" onClick={onConfirmar}>
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
}
