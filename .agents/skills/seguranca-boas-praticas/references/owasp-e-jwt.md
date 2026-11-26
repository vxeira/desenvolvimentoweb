# Referência: OWASP Top 10, Proteção de Dados, Segredos e JWT

## 1. Mitigações OWASP Top 10 (Cobertura Completa)

| Categoria OWASP | Risco / O que evitar | Como mitigar no projeto |
|---|---|---|
| **A01 — Broken Access Control** | Confiar em ocultação de UI no front-end ou aceitar `userId` do body. | Usar `JwtAuthGuard` + `RolesGuard`; usar `req.user.sub` e validar ownership no Service. |
| **A02 — Cryptographic Failures** | Senha em texto puro, MD5/SHA1, HTTP em produção, segredo JWT fraco. | `bcrypt`/`argon2` para senhas; `AES-256-GCM` para dados cifrados; HTTPS + HSTS. |
| **A03 — Injection (SQLi / XSS)** | `prisma.$queryRawUnsafe(\`... ${input}\`)`, `dangerouslySetInnerHTML`, `innerHTML`. | Usar Prisma Client tipado ou `$queryRaw\`...\`` (parametrizado); `helmet()` + CSP; escape no React. |
| **A04 — Insecure Design** | Fluxos críticos sem limites (ex.: reset de senha ou inscrição sem regra de negócio). | Modelar validações de domínio no back-end e limitar ações sensíveis. |
| **A05 — Security Misconfiguration** | `cors({ origin: '*' })` com `credentials: true`, stack traces em produção. | CORS restrito a origens confiáveis; ocultar detalhes internos em `500`; usar `helmet()`. |
| **A06 — Vulnerable Components** | Dependências desatualizadas com CVEs conhecidas. | Rodar `npm audit` / `pip-audit` no CI e manter pacotes atualizados. |
| **A07 — Identification & Auth Failures** | Login sem rate limiting, JWT sem `expiresIn`, enumeração de usuários. | `@nestjs/throttler` no login; Access Token curto (`15m`) + Refresh Token; erro genérico no login. |
| **A08 — Software & Data Integrity Failures** | Desserialização insegura, pipelines sem verificação de integridade. | Lockfiles (`package-lock.json`), validação estrita de payload e assinatura verificada de JWT. |
| **A09 — Security Logging & Monitoring** | Logar senhas/tokens em claro ou não registrar falhas de login/acesso. | Logar eventos de segurança (401/403) mascarando credenciais, tokens e dados sensíveis. |
| **A10 — Server-Side Request Forgery (SSRF)** | Fazer `fetch` no back-end para URLs arbitrárias enviadas pelo usuário. | Validar URLs contra allowlist de domínios/protocolos antes de requisições server-side. |

### Proteção específica contra CSRF e XSS

- **CSRF:** se a autenticação usar cookies, definir `sameSite: 'lax'` (ou `'strict'`), `httpOnly: true`, validar `Origin`/`Referer` e usar token anti-CSRF (ex.: padrão *Double Submit Cookie* em operações mutáveis `POST`/`PUT`/`PATCH`/`DELETE`).
- **XSS:** aplicar `app.use(helmet())` com `Content-Security-Policy`, nunca renderizar HTML bruto vindo de usuário no React e validar/sanitizar strings no DTO.

---

## 2. Proteção de Dados: Hash, Criptografia e HTTPS

### Hash de senhas (`bcrypt`)

```ts
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

export async function gerarHashSenha(senhaPlana: string): Promise<string> {
  return bcrypt.hash(senhaPlana, SALT_ROUNDS);
}

export async function verificarSenha(senhaPlana: string, hash: string): Promise<boolean> {
  return bcrypt.compare(senhaPlana, hash);
}
```

### Criptografia simétrica de dados sensíveis (`AES-256-GCM`)

```ts
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

export function criptografar(texto: string, chaveHex: string): string {
  const key = Buffer.from(chaveHex, 'hex'); // 32 bytes (256 bits)
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(texto, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function descriptografar(payload: string, chaveHex: string): string {
  const [ivHex, tagHex, dataHex] = payload.split(':');
  const key = Buffer.from(chaveHex, 'hex');
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]).toString('utf8');
}
```

### HTTPS e Headers de Segurança (`helmet`)

```ts
import helmet from 'helmet';

app.use(
  helmet({
    hsts: { maxAge: 31536000, includeSubDomains: true },
    contentSecurityPolicy: true,
  }),
);
```

Em produção, servir exclusivamente atrás de HTTPS (TLS 1.2+) com redirecionamento HTTP -> HTTPS no proxy reverso/load balancer.

---

## 3. Segurança de Aplicação: Validação de Entrada e Gestão de Segredos

### Validação estrita de entrada (NestJS)

```ts
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'E-mail inválido' })
  @MaxLength(160)
  email: string;

  @IsString()
  @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres' })
  @MaxLength(128)
  senha: string;
}
```

Ativar globalmente `new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })` para impedir *Mass Assignment*.

### Gestão de Segredos (`@nestjs/config`)

```ts
// app.module.ts
ConfigModule.forRoot({
  isGlobal: true,
  validate: (env) => {
    for (const key of ['DATABASE_URL', 'JWT_SECRET', 'CORS_ORIGIN']) {
      if (!env[key]) throw new Error(`Variável de ambiente obrigatória ausente: ${key}`);
    }
    if (String(env.JWT_SECRET).length < 32) {
      throw new Error('JWT_SECRET deve ter pelo menos 32 caracteres');
    }
    return env;
  },
});
```

- Nunca commitar `.env`, chaves privadas (`*.pem`, `*.key`) ou tokens.
- Manter `.env.example` apenas com nomes das variáveis e valores fictícios.

---

## 4. JWT: Implementação no Back-end e Comunicação com o Front-end

### Configuração do módulo e estratégia JWT (NestJS)

```ts
// auth.module.ts
JwtModule.registerAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    secret: config.getOrThrow<string>('JWT_SECRET'),
    signOptions: { expiresIn: '15m' },
  }),
});
```

```ts
// jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtPayload {
  sub: number;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  validate(payload: JwtPayload) {
    return { userId: payload.sub, email: payload.email, role: payload.role };
  }
}
```

```ts
// jwt-auth.guard.ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

### Fluxo no Front-end (`frontend/src/api.js`)

```js
async function requisicaoAutenticada(caminho, opcoes = {}) {
  const token = obterTokenAtual(); // ou cookie HttpOnly com credentials: 'include'
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...opcoes.headers,
  };

  const resp = await fetch(`${API_URL}${caminho}`, {
    ...opcoes,
    headers,
  });

  if (resp.status === 401) {
    // Token ausente/expirado: tentar refresh ou limpar sessão e redirecionar para login
  }
  if (resp.status === 403) {
    // Usuário autenticado sem permissão para o recurso
  }

  return resp;
}
```

> **Boas práticas na comunicação Front <-> Back:**
> - Nunca expor segredos (`JWT_SECRET`, chaves privadas) em variáveis `VITE_*`, pois tudo com prefixo `VITE_` é incluído no bundle público do Vite.
> - Manter payload do JWT enxuto (`sub`, `email`, `role`) — nunca colocar senhas ou dados pessoais sensíveis dentro do token.
