/** @type {import('tailwindcss').Config} */
export default {
  // Prefixo "tw-" evita conflito de nomes com as classes do Materialize
  prefix: 'tw-',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  // O reset do Tailwind (preflight) fica desligado para não sobrescrever o Materialize
  corePlugins: { preflight: false },
  theme: {
    extend: {
      // Identidade visual CEUB — paleta roxa institucional.
      // Para usar o hex exato do manual da marca, altere só este bloco
      // (e as variáveis --ceub-* em src/index.css).
      colors: {
        ceub: {
          roxo: '#5B2C83', // principal (cabeçalho, botões, datas)
          'roxo-vivo': '#7B3FB8', // destaques e hover
          'roxo-escuro': '#3D1A5B', // títulos e gradiente
          'roxo-profundo': '#25103A', // rodapé
          'roxo-claro': '#F3ECFA', // fundos suaves e chips
          lilas: '#C9A7F0', // detalhes sobre fundo roxo
          perigo: '#C62828', // excluir e mensagens de erro
        },
      },
      fontFamily: { sans: ['Montserrat', 'Roboto', 'sans-serif'] },
      boxShadow: {
        card: '0 4px 20px -6px rgba(61, 26, 91, 0.25)',
        'card-hover': '0 12px 32px -8px rgba(61, 26, 91, 0.40)',
      },
    },
  },
  plugins: [],
};
