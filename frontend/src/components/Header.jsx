export default function Header({ usuario, onNovo, onEntrar, onSair }) {
  return (
    <header className="tw-bg-ceub-roxo tw-text-white">
      <nav className="tw-bg-transparent tw-shadow-none" role="navigation">
        <div className="nav-wrapper container tw-flex tw-items-center tw-justify-between tw-gap-3">
          <a href="/" className="tw-flex tw-items-center tw-gap-3 tw-text-white" aria-label="Página inicial">
            {/* Troque este bloco pela imagem oficial do logo (public/logo-ceub.png) se quiser */}
            <span className="tw-font-extrabold tw-text-2xl tw-tracking-tight">UniCEUB</span>
            <span className="tw-hidden sm:tw-inline tw-border-l tw-border-ceub-lilas/50 tw-pl-3 tw-text-xs tw-font-semibold tw-uppercase tw-tracking-[0.2em] tw-text-ceub-lilas">
              Eventos Acadêmicos
            </span>
          </a>
          <div className="tw-flex tw-items-center tw-gap-2">
            {usuario ? (
              <>
                <span className="tw-hidden md:tw-inline tw-text-xs tw-font-semibold tw-bg-white/15 tw-px-3 tw-py-1.5 tw-rounded-full">
                  {usuario.nome}
                </span>
                <button
                  type="button"
                  className="btn-flat waves-effect tw-text-white"
                  onClick={onSair}
                >
                  Sair
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn-flat waves-effect tw-text-white"
                onClick={onEntrar}
              >
                Entrar
              </button>
            )}
            <button
              type="button"
              className="btn waves-effect tw-bg-white tw-text-ceub-roxo tw-shadow-md"
              onClick={onNovo}
            >
              <i className="material-icons left">add</i>Novo evento
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
}
