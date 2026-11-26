import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { CreateEventoDto } from './dto/create-evento.dto';
import { QueryEventoDto } from './dto/query-evento.dto';
import { UpdateEventoDto } from './dto/update-evento.dto';
import { EventosService } from './eventos.service';

@ApiTags('Eventos')
@Controller('eventos')
export class EventosController {
  constructor(private readonly eventosService: EventosService) {}

  @Get()
  @ApiOperation({ summary: 'Lista eventos acadêmicos ordenados por data' })
  @ApiQuery({ name: 'busca', required: false, type: String })
  @ApiQuery({ name: 'curso', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Lista de eventos retornada com sucesso.' })
  listar(@Query() query: QueryEventoDto) {
    return this.eventosService.listar(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha um evento acadêmico pelo ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Evento encontrado.' })
  @ApiResponse({ status: 404, description: 'Evento não encontrado.' })
  detalhar(@Param('id', ParseIntPipe) id: number) {
    return this.eventosService.detalhar(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Cria um novo evento acadêmico (requer JWT)' })
  @ApiResponse({ status: 201, description: 'Evento criado com sucesso.' })
  @ApiResponse({ status: 400, description: 'Dados inválidos.' })
  @ApiResponse({ status: 401, description: 'Token JWT ausente ou inválido.' })
  async criar(
    @Body() dto: CreateEventoDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const evento = await this.eventosService.criar(dto, user);
    res.setHeader('Location', `/api/eventos/${evento.id}`);
    return evento;
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualiza um evento acadêmico (requer JWT)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Evento atualizado com sucesso.' })
  @ApiResponse({ status: 400, description: 'Dados inválidos.' })
  @ApiResponse({ status: 401, description: 'Token JWT ausente ou inválido.' })
  @ApiResponse({ status: 403, description: 'Sem permissão para alterar este evento.' })
  @ApiResponse({ status: 404, description: 'Evento não encontrado.' })
  atualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEventoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.eventosService.atualizar(id, dto, user);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualiza parcialmente um evento acadêmico (requer JWT)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Evento atualizado com sucesso.' })
  @ApiResponse({ status: 401, description: 'Token JWT ausente ou inválido.' })
  @ApiResponse({ status: 403, description: 'Sem permissão para alterar este evento.' })
  @ApiResponse({ status: 404, description: 'Evento não encontrado.' })
  atualizarParcial(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEventoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.eventosService.atualizar(id, dto, user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove um evento acadêmico (requer JWT)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 204, description: 'Evento removido.' })
  @ApiResponse({ status: 401, description: 'Token JWT ausente ou inválido.' })
  @ApiResponse({ status: 403, description: 'Sem permissão para remover este evento.' })
  @ApiResponse({ status: 404, description: 'Evento não encontrado.' })
  remover(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.eventosService.remover(id, user);
  }
}
