import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export async function gerarHashSenha(senhaPlana: string): Promise<string> {
  return bcrypt.hash(senhaPlana, SALT_ROUNDS);
}

export async function verificarSenha(senhaPlana: string, hash: string): Promise<boolean> {
  return bcrypt.compare(senhaPlana, hash);
}

export function hashTokenSha256(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function criptografarDados(texto: string, chaveHex: string): string {
  const key = Buffer.from(chaveHex, 'hex');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(texto, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function descriptografarDados(payload: string, chaveHex: string): string {
  const partes = payload.split(':');
  if (partes.length !== 3) {
    throw new Error('Formato de dado criptografado inválido');
  }
  const [ivHex, tagHex, dataHex] = partes;
  const key = Buffer.from(chaveHex, 'hex');
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataHex, 'hex')),
    decipher.final(),
  ]).toString('utf8');
}
