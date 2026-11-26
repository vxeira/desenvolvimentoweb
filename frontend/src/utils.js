export const CURSOS = [
  'Ciência da Computação',
  'Análise e Desenvolvimento de Sistemas',
  'Direito',
  'Medicina',
  'Administração',
  'Arquitetura e Urbanismo',
  'Psicologia',
  'Engenharia Civil',
];

const MESES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

/** Converte "2026-12-10" em { dia: "10", mes: "DEZ", ano: "2026", completa: "10/12/2026" } */
export function formatarData(iso) {
  const [ano, mes, dia] = iso.split('-');
  return { dia, mes: MESES[Number(mes) - 1], ano, completa: `${dia}/${mes}/${ano}` };
}

export const EVENTO_VAZIO = { titulo: '', descricao: '', data: '', local: '', curso: '', vagas: '' };

/** Validação no cliente, espelhando as regras do backend */
export function validarFormulario(dados) {
  const erros = {};
  ['titulo', 'data', 'local', 'curso'].forEach((campo) => {
    if (!String(dados[campo] ?? '').trim()) erros[campo] = 'Campo obrigatório';
  });
  const vagas = Number(dados.vagas);
  if (dados.vagas === '' || dados.vagas === null || dados.vagas === undefined) {
    erros.vagas = 'Campo obrigatório';
  } else if (!Number.isInteger(vagas) || vagas < 1) {
    erros.vagas = 'Informe um número inteiro maior que zero';
  }
  return erros;
}
