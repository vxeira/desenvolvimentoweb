import {
  criptografarDados,
  descriptografarDados,
  gerarHashSenha,
  hashTokenSha256,
  verificarSenha,
} from './encryption.util';
import { validateEnv } from '../../config/env.validation';
import { isIsoCalendarDate } from '../validators/is-iso-date.validator';

describe('Utilitários de segurança e validação', () => {
  const chaveHex = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  it('gera e verifica hash bcrypt sem expor senha plana', async () => {
    const hash = await gerarHashSenha('MinhaSenha@2026');
    expect(hash).not.toBe('MinhaSenha@2026');
    expect(await verificarSenha('MinhaSenha@2026', hash)).toBe(true);
    expect(await verificarSenha('SenhaErrada', hash)).toBe(false);
  });

  it('criptografa e descriptografa dados com AES-256-GCM', () => {
    const cifrado = criptografarDados('22600001', chaveHex);
    expect(cifrado.split(':')).toHaveLength(3);
    expect(cifrado).not.toContain('22600001');
    expect(descriptografarDados(cifrado, chaveHex)).toBe('22600001');
    expect(() => descriptografarDados('invalido', chaveHex)).toThrow(
      'Formato de dado criptografado inválido',
    );
  });

  it('gera hash SHA-256 determinístico para refresh tokens', () => {
    const h1 = hashTokenSha256('token-123');
    const h2 = hashTokenSha256('token-123');
    expect(h1).toBe(h2);
    expect(h1).toHaveLength(64);
  });

  it('valida variáveis de ambiente obrigatórias', () => {
    const valid = {
      DATABASE_URL: 'file:./dev.db',
      JWT_SECRET: 'a'.repeat(32),
      JWT_REFRESH_SECRET: 'b'.repeat(32),
      ENCRYPTION_KEY: chaveHex,
    };
    expect(validateEnv(valid)).toEqual(valid);
    expect(() => validateEnv({ ...valid, DATABASE_URL: '' })).toThrow(/DATABASE_URL/);
    expect(() => validateEnv({ ...valid, JWT_SECRET: 'curto' })).toThrow(/JWT_SECRET/);
    expect(() => validateEnv({ ...valid, JWT_REFRESH_SECRET: 'curto' })).toThrow(
      /JWT_REFRESH_SECRET/,
    );
    expect(() => validateEnv({ ...valid, ENCRYPTION_KEY: 'invalida' })).toThrow(
      /ENCRYPTION_KEY/,
    );
  });

  it('valida datas reais no calendário ISO', () => {
    expect(isIsoCalendarDate('2026-12-08')).toBe(true);
    expect(isIsoCalendarDate('2026-02-30')).toBe(false);
    expect(isIsoCalendarDate('08/12/2026')).toBe(false);
    expect(isIsoCalendarDate(123)).toBe(false);
  });
});
