import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { CreateEventoDto } from './dto/create-evento.dto';
import { QueryEventoDto } from './dto/query-evento.dto';
import { UpdateEventoDto } from './dto/update-evento.dto';

@Injectable()
export class EventosService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(query: QueryEventoDto) {
    const where: Record<string, unknown> = {};
    if (query.curso) {
      where.curso = query.curso;
    }
    if (query.busca) {
      where.titulo = { contains: query.busca };
    }

    const eventos = await this.prisma.evento.findMany({
      where,
      orderBy: { data: 'asc' },
    });

    // SQLite `contains` é case-sensitive para caracteres Unicode; garante busca case-insensitive consistente
    if (query.busca) {
      const termo = query.busca.toLowerCase();
      return eventos
        .filter((ev) => ev.titulo.toLowerCase().includes(termo))
        .map((ev) => this.serializar(ev));
    }

    return eventos.map((ev) => this.serializar(ev));
  }

  async detalhar(id: number) {
    const evento = await this.buscarOuFalhar(id);
    return this.serializar(evento);
  }

  async criar(dto: CreateEventoDto, user: AuthenticatedUser) {
    const evento = await this.prisma.evento.create({
      data: {
        titulo: dto.titulo,
        descricao: dto.descricao ?? '',
        data: dto.data,
        local: dto.local,
        curso: dto.curso,
        vagas: dto.vagas,
        criadoPorId: user.userId,
      },
    });
    return this.serializar(evento);
  }

  async atualizar(id: number, dto: UpdateEventoDto, user: AuthenticatedUser) {
    const evento = await this.buscarOuFalhar(id);
    this.garantirPermissao(evento.criadoPorId, user);

    const atualizado = await this.prisma.evento.update({
      where: { id },
      data: {
        ...(dto.titulo !== undefined ? { titulo: dto.titulo } : {}),
        ...(dto.descricao !== undefined ? { descricao: dto.descricao } : {}),
        ...(dto.data !== undefined ? { data: dto.data } : {}),
        ...(dto.local !== undefined ? { local: dto.local } : {}),
        ...(dto.curso !== undefined ? { curso: dto.curso } : {}),
        ...(dto.vagas !== undefined ? { vagas: dto.vagas } : {}),
      },
    });
    return this.serializar(atualizado);
  }

  async remover(id: number, user: AuthenticatedUser): Promise<void> {
    const evento = await this.buscarOuFalhar(id);
    this.garantirPermissao(evento.criadoPorId, user);
    await this.prisma.evento.delete({ where: { id } });
  }

  private async buscarOuFalhar(id: number) {
    const evento = await this.prisma.evento.findUnique({ where: { id } });
    if (!evento) {
      throw new NotFoundException('Evento não encontrado');
    }
    return evento;
  }

  private garantirPermissao(criadoPorId: number | null, user: AuthenticatedUser) {
    if (criadoPorId !== null && criadoPorId !== user.userId && user.role !== 'ADMIN') {
      throw new ForbiddenException('Você não tem permissão para alterar este evento');
    }
  }

  private serializar(evento: {
    id: number;
    titulo: string;
    descricao: string;
    data: string;
    local: string;
    curso: string;
    vagas: number;
    criadoPorId: number | null;
  }) {
    return {
      id: evento.id,
      titulo: evento.titulo,
      descricao: evento.descricao,
      data: evento.data,
      local: evento.local,
      curso: evento.curso,
      vagas: evento.vagas,
      criadoPorId: evento.criadoPorId,
    };
  }
}
