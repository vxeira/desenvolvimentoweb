export function validateEnv(config: Record<string, unknown>) {
  const required = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET', 'ENCRYPTION_KEY'];
  for (const key of required) {
    if (!config[key] || String(config[key]).trim() === '') {
      throw new Error(`Variável de ambiente obrigatória ausente: ${key}`);
    }
  }

  if (String(config.JWT_SECRET).length < 32) {
    throw new Error('JWT_SECRET deve ter no mínimo 32 caracteres');
  }
  if (String(config.JWT_REFRESH_SECRET).length < 32) {
    throw new Error('JWT_REFRESH_SECRET deve ter no mínimo 32 caracteres');
  }
  if (!/^[0-9a-fA-F]{64}$/.test(String(config.ENCRYPTION_KEY))) {
    throw new Error('ENCRYPTION_KEY deve conter 64 caracteres hexadecimais (32 bytes)');
  }

  return config;
}
