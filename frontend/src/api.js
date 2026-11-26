// Cliente HTTP para a API NestJS (backend/) com suporte a JWT e CSRF
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const CHAVE_TOKEN = 'ceub_access_token';
const CHAVE_USUARIO = 'ceub_usuario';

export class ApiError extends Error {
  constructor(mensagem, status, erros = {}) {
    super(mensagem);
    this.status = status;
    this.erros = erros;
  }
}

export function obterToken() {
  return sessionStorage.getItem(CHAVE_TOKEN);
}

export function obterUsuarioSalvo() {
  const bruto = sessionStorage.getItem(CHAVE_USUARIO);
  if (!bruto) return null;
  try {
    return JSON.parse(bruto);
  } catch {
    return null;
  }
}

export function definirSessao({ accessToken, usuario }) {
  if (accessToken) sessionStorage.setItem(CHAVE_TOKEN, accessToken);
  if (usuario) sessionStorage.setItem(CHAVE_USUARIO, JSON.stringify(usuario));
}

export function limparSessao() {
  sessionStorage.removeItem(CHAVE_TOKEN);
  sessionStorage.removeItem(CHAVE_USUARIO);
}

export function lerCookie(nome) {
  if (typeof document === 'undefined') return '';
  const par = document.cookie
    .split('; ')
    .find((item) => item.startsWith(`${nome}=`));
  return par ? decodeURIComponent(par.split('=')[1]) : '';
}

export async function renovarSessao() {
  const csrf = lerCookie('csrf_token');
  const resp = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrf ? { 'x-csrf-token': csrf } : {}),
    },
  });
  if (!resp.ok) {
    limparSessao();
    return null;
  }
  const sessao = await resp.json();
  definirSessao(sessao);
  return sessao;
}

async function requisicao(caminho, opcoes = {}, tentarRefresh = true) {
  const token = obterToken();
  const resp = await fetch(`${API_URL}${caminho}`, {
    credentials: 'include',
    ...opcoes,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opcoes.headers,
    },
  });

  if (resp.status === 401 && tentarRefresh && !caminho.startsWith('/auth/')) {
    const renovado = await renovarSessao().catch(() => null);
    if (renovado?.accessToken) {
      return requisicao(caminho, opcoes, false);
    }
  }

  if (resp.status === 204) return null;
  const corpo = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new ApiError(corpo.erro || 'Erro ao comunicar com o servidor', resp.status, corpo.erros);
  }
  return corpo;
}

export async function entrar(credenciais) {
  const sessao = await requisicao('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credenciais),
  }, false);
  definirSessao(sessao);
  return sessao;
}

export async function registrarUsuario(dados) {
  const sessao = await requisicao('/auth/register', {
    method: 'POST',
    body: JSON.stringify(dados),
  }, false);
  definirSessao(sessao);
  return sessao;
}

export async function sair() {
  const csrf = lerCookie('csrf_token');
  try {
    await requisicao('/auth/logout', {
      method: 'POST',
      headers: csrf ? { 'x-csrf-token': csrf } : {},
    }, false);
  } finally {
    limparSessao();
  }
}

export function listarEventos({ busca = '', curso = '' } = {}) {
  const params = new URLSearchParams();
  if (busca) params.set('busca', busca);
  if (curso) params.set('curso', curso);
  const qs = params.toString();
  return requisicao(`/eventos${qs ? `?${qs}` : ''}`);
}

export const criarEvento = (dados) =>
  requisicao('/eventos', { method: 'POST', body: JSON.stringify(dados) });

export const atualizarEvento = (id, dados) =>
  requisicao(`/eventos/${id}`, { method: 'PUT', body: JSON.stringify(dados) });

export const removerEvento = (id) => requisicao(`/eventos/${id}`, { method: 'DELETE' });
