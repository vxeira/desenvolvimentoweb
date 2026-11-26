import { randomBytes, randomUUID } from 'crypto';
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  criptografarDados,
  descriptografarDados,
  gerarHashSenha,
  hashTokenSha256,
  verificarSenha,
} from '../../common/crypto/encryption.util';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './strategies/jwt.strategy';

export interface UsuarioPublico {
  id: number;
  nome: string;
  email: string;
  role: string;
  documentoMascarado?: string | null;
}

export interface AuthSessionResult {
  accessToken: string;
  refreshToken: string;
  csrfToken: string;
  usuario: UsuarioPublico;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthSessionResult> {
    const existente = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
    });
    if (existente) {
      throw new ConflictException('E-mail já cadastrado');
    }

    const senhaHash = await gerarHashSenha(dto.senha);
    const encryptionKey = this.config.getOrThrow<string>('ENCRYPTION_KEY');
    const documentoCriptografado = dto.documento
      ? criptografarDados(dto.documento, encryptionKey)
      : null;

    const usuario = await this.prisma.usuario.create({
      data: {
        nome: dto.nome,
        email: dto.email,
        senhaHash,
        role: 'USUARIO',
        documentoCriptografado,
      },
    });

    return this.emitirSessao(usuario);
  }

  async login(dto: LoginDto): Promise<AuthSessionResult> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
    });
    if (!usuario || !(await verificarSenha(dto.senha, usuario.senhaHash))) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    return this.emitirSessao(usuario);
  }

  async refresh(refreshTokenRaw: string | undefined): Promise<AuthSessionResult> {
    if (!refreshTokenRaw) {
      throw new UnauthorizedException('Refresh token ausente');
    }

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshTokenRaw, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }

    const tokenHash = hashTokenSha256(refreshTokenRaw);
    const registro = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { usuario: true },
    });

    if (!registro || registro.revogado || registro.expiraEm <= new Date()) {
      throw new UnauthorizedException('Refresh token revogado ou expirado');
    }

    if (registro.usuarioId !== payload.sub) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    await this.prisma.refreshToken.update({
      where: { id: registro.id },
      data: { revogado: true },
    });

    return this.emitirSessao(registro.usuario);
  }

  async logout(refreshTokenRaw: string | undefined): Promise<void> {
    if (!refreshTokenRaw) return;
    const tokenHash = hashTokenSha256(refreshTokenRaw);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revogado: false },
      data: { revogado: true },
    });
  }

  async perfil(userId: number): Promise<UsuarioPublico> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: userId },
    });
    if (!usuario) {
      throw new UnauthorizedException('Usuário não encontrado');
    }
    return this.sanitizarUsuario(usuario);
  }

  private async emitirSessao(usuario: {
    id: number;
    nome: string;
    email: string;
    role: string;
    documentoCriptografado: string | null;
  }): Promise<AuthSessionResult> {
    const payload: JwtPayload = {
      sub: usuario.id,
      email: usuario.email,
      nome: usuario.nome,
      role: usuario.role,
    };

    const accessToken = await this.jwtService.signAsync(payload);
    const refreshToken = await this.jwtService.signAsync(
      { ...payload, jti: randomUUID() },
      {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d',
      },
    );

    const expiraEm = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.prisma.refreshToken.create({
      data: {
        tokenHash: hashTokenSha256(refreshToken),
        usuarioId: usuario.id,
        expiraEm,
      },
    });

    return {
      accessToken,
      refreshToken,
      csrfToken: randomBytes(24).toString('hex'),
      usuario: this.sanitizarUsuario(usuario),
    };
  }

  private sanitizarUsuario(usuario: {
    id: number;
    nome: string;
    email: string;
    role: string;
    documentoCriptografado: string | null;
  }): UsuarioPublico {
    let documentoMascarado: string | null = null;
    if (usuario.documentoCriptografado) {
      try {
        const key = this.config.getOrThrow<string>('ENCRYPTION_KEY');
        const claro = descriptografarDados(usuario.documentoCriptografado, key);
        documentoMascarado =
          claro.length > 4 ? `${'*'.repeat(claro.length - 4)}${claro.slice(-4)}` : '****';
      } catch {
        documentoMascarado = null;
      }
    }

    return {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      role: usuario.role,
      ...(documentoMascarado ? { documentoMascarado } : {}),
    };
  }
}
