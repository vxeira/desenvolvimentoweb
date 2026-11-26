import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { CsrfGuard } from './guards/csrf.guard';

describe('AuthService e CsrfGuard', () => {
  const chaveHex = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const config = {
    get: jest.fn((k: string) => (k === 'JWT_REFRESH_EXPIRES_IN' ? '7d' : 'development')),
    getOrThrow: jest.fn((k: string) => {
      if (k === 'ENCRYPTION_KEY') return chaveHex;
      if (k === 'JWT_REFRESH_SECRET') return 'b'.repeat(32);
      return 'a'.repeat(32);
    }),
  } as unknown as ConfigService;

  const jwtService = {
    signAsync: jest.fn().mockResolvedValue('jwt-token'),
    verifyAsync: jest.fn(),
  } as unknown as JwtService;

  const prisma = {
    usuario: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  } as any;

  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(prisma, jwtService, config);
  });

  it('cadastra usuário com hash de senha, documento cifrado e tokens', async () => {
    prisma.usuario.findUnique.mockResolvedValue(null);
    prisma.usuario.create.mockImplementation(({ data }: any) => ({
      id: 1,
      ...data,
    }));
    prisma.refreshToken.create.mockResolvedValue({ id: 1 });

    const res = await service.register({
      nome: 'Lucas',
      email: 'lucas@ceub.edu.br',
      senha: 'Senha@1234',
      documento: '22600001',
    });

    expect(res.accessToken).toBe('jwt-token');
    expect(res.usuario.email).toBe('lucas@ceub.edu.br');
    expect(res.usuario.documentoMascarado).toBe('****0001');
    expect(prisma.usuario.create.mock.calls[0][0].data.senhaHash).not.toBe('Senha@1234');
  });

  it('rejeita e-mail duplicado no cadastro', async () => {
    prisma.usuario.findUnique.mockResolvedValue({ id: 1 });
    await expect(
      service.register({ nome: 'A', email: 'a@ceub.edu.br', senha: 'Senha@1234' }),
    ).rejects.toThrow(ConflictException);
  });

  it('rejeita login com credenciais inválidas', async () => {
    prisma.usuario.findUnique.mockResolvedValue(null);
    await expect(
      service.login({ email: 'x@ceub.edu.br', senha: 'Senha@1234' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('valida refresh token ausente ou inválido', async () => {
    await expect(service.refresh(undefined)).rejects.toThrow(UnauthorizedException);
    (jwtService.verifyAsync as jest.Mock).mockRejectedValue(new Error('invalid'));
    await expect(service.refresh('bad')).rejects.toThrow(UnauthorizedException);
  });

  it('rotaciona refresh token válido e revoga no logout', async () => {
    (jwtService.verifyAsync as jest.Mock).mockResolvedValue({ sub: 1 });
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 10,
      usuarioId: 1,
      revogado: false,
      expiraEm: new Date(Date.now() + 60000),
      usuario: { id: 1, nome: 'Lucas', email: 'l@ceub.edu.br', role: 'USUARIO', documentoCriptografado: null },
    });

    const res = await service.refresh('valid-refresh');
    expect(prisma.refreshToken.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { revogado: true },
    });
    expect(res.accessToken).toBe('jwt-token');

    await service.logout('valid-refresh');
    expect(prisma.refreshToken.updateMany).toHaveBeenCalled();
  });

  it('valida CsrfGuard com double submit cookie', () => {
    const guard = new CsrfGuard();
    const makeCtx = (cookie: any, header: any) =>
      ({
        switchToHttp: () => ({
          getRequest: () => ({ cookies: { csrf_token: cookie }, headers: { 'x-csrf-token': header } }),
        }),
      }) as any;

    expect(guard.canActivate(makeCtx('abc', 'abc'))).toBe(true);
    expect(() => guard.canActivate(makeCtx('abc', 'xyz'))).toThrow();
    expect(() => guard.canActivate(makeCtx(undefined, 'abc'))).toThrow();
  });
});
