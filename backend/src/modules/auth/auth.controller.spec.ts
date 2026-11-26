import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

describe('AuthController e JwtStrategy', () => {
  const authService = {
    register: jest.fn(),
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
    perfil: jest.fn(),
  } as unknown as jest.Mocked<AuthService>;

  const config = {
    get: jest.fn().mockReturnValue('production'),
    getOrThrow: jest.fn().mockReturnValue('a'.repeat(32)),
  } as unknown as ConfigService;

  const controller = new AuthController(authService, config);

  const mockRes = () => ({
    setHeader: jest.fn(),
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  }) as any;

  const sessao = {
    accessToken: 'acc',
    refreshToken: 'ref',
    csrfToken: 'csrf',
    usuario: { id: 1, nome: 'Ana', email: 'ana@ceub.edu.br', role: 'USUARIO' },
  };

  beforeEach(() => jest.clearAllMocks());

  it('register e login definem cookies HttpOnly/CSRF e Cache-Control: no-store', async () => {
    authService.register.mockResolvedValue(sessao);
    const res1 = mockRes();
    const out1 = await controller.register({ nome: 'Ana', email: 'ana@ceub.edu.br', senha: 'Senha@1234' }, res1);
    expect(out1).toEqual({ accessToken: 'acc', usuario: sessao.usuario });
    expect(res1.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
    expect(res1.cookie).toHaveBeenCalledWith('refresh_token', 'ref', expect.objectContaining({ httpOnly: true, secure: true }));
    expect(res1.cookie).toHaveBeenCalledWith('csrf_token', 'csrf', expect.objectContaining({ httpOnly: false }));

    authService.login.mockResolvedValue(sessao);
    const res2 = mockRes();
    const out2 = await controller.login({ email: 'ana@ceub.edu.br', senha: 'Senha@1234' }, res2);
    expect(out2.accessToken).toBe('acc');
  });

  it('refresh, logout e me delegam corretamente', async () => {
    authService.refresh.mockResolvedValue(sessao);
    const res = mockRes();
    const refOut = await controller.refresh({ cookies: { refresh_token: 'ref' } } as any, res);
    expect(refOut.accessToken).toBe('acc');

    await controller.logout({ cookies: { refresh_token: 'ref' } } as any, res);
    expect(authService.logout).toHaveBeenCalledWith('ref');
    expect(res.clearCookie).toHaveBeenCalledTimes(2);

    authService.perfil.mockResolvedValue(sessao.usuario);
    expect(await controller.me({ userId: 1, email: 'ana@ceub.edu.br', nome: 'Ana', role: 'USUARIO' })).toEqual(sessao.usuario);
  });

  it('JwtStrategy valida e mapeia payload', () => {
    const strategy = new JwtStrategy(config);
    expect(strategy.validate({ sub: 1, email: 'a@b.com', nome: 'A', role: 'USUARIO' })).toEqual({
      userId: 1,
      email: 'a@b.com',
      nome: 'A',
      role: 'USUARIO',
    });
  });
});
