import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AuthService, AuthSessionResult } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { CsrfGuard } from './guards/csrf.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthenticatedUser } from './strategies/jwt.strategy';

const REFRESH_COOKIE_AGE_MS = 7 * 24 * 60 * 60 * 1000;

@ApiTags('Autenticação')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('register')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Cadastra um novo usuário e inicia sessão JWT' })
  @ApiResponse({ status: 201, description: 'Usuário cadastrado e autenticado.' })
  @ApiResponse({ status: 400, description: 'Dados inválidos.' })
  @ApiResponse({ status: 409, description: 'E-mail já cadastrado.' })
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const sessao = await this.authService.register(dto);
    this.aplicarCookiesEHeaders(res, sessao);
    return { accessToken: sessao.accessToken, usuario: sessao.usuario };
  }

  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Autentica usuário e retorna Access Token JWT + cookies seguros' })
  @ApiResponse({ status: 200, description: 'Autenticação realizada com sucesso.' })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas.' })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const sessao = await this.authService.login(dto);
    this.aplicarCookiesEHeaders(res, sessao);
    return { accessToken: sessao.accessToken, usuario: sessao.usuario };
  }

  @Post('refresh')
  @UseGuards(CsrfGuard)
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth('refresh_token')
  @ApiHeader({ name: 'x-csrf-token', required: true, description: 'Token anti-CSRF' })
  @ApiOperation({ summary: 'Renova Access Token via Refresh Token HttpOnly com rotação e CSRF' })
  @ApiResponse({ status: 200, description: 'Sessão renovada.' })
  @ApiResponse({ status: 401, description: 'Refresh token inválido ou expirado.' })
  @ApiResponse({ status: 403, description: 'Token CSRF inválido ou ausente.' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const sessao = await this.authService.refresh(req.cookies?.refresh_token);
    this.aplicarCookiesEHeaders(res, sessao);
    return { accessToken: sessao.accessToken, usuario: sessao.usuario };
  }

  @Post('logout')
  @UseGuards(CsrfGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiCookieAuth('refresh_token')
  @ApiHeader({ name: 'x-csrf-token', required: true, description: 'Token anti-CSRF' })
  @ApiOperation({ summary: 'Revoga refresh token e limpa cookies de sessão' })
  @ApiResponse({ status: 204, description: 'Logout concluído.' })
  @ApiResponse({ status: 403, description: 'Token CSRF inválido ou ausente.' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(req.cookies?.refresh_token);
    res.setHeader('Cache-Control', 'no-store');
    res.clearCookie('refresh_token', { path: '/api/auth' });
    res.clearCookie('csrf_token', { path: '/' });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retorna o perfil do usuário autenticado' })
  @ApiResponse({ status: 200, description: 'Perfil retornado com sucesso.' })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.perfil(user.userId);
  }

  private aplicarCookiesEHeaders(res: Response, sessao: AuthSessionResult) {
    const isProd = this.config.get<string>('NODE_ENV') === 'production';
    res.setHeader('Cache-Control', 'no-store');
    res.cookie('refresh_token', sessao.refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/api/auth',
      maxAge: REFRESH_COOKIE_AGE_MS,
    });
    res.cookie('csrf_token', sessao.csrfToken, {
      httpOnly: false,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: REFRESH_COOKIE_AGE_MS,
    });
  }
}
