import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { IsIsoDate } from '../../../common/validators/is-iso-date.validator';

export class CreateEventoDto {
  @ApiProperty({ example: 'Semana Acadêmica de Computação', maxLength: 120 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Deve ser um texto' })
  @IsNotEmpty({ message: 'Campo obrigatório' })
  @MaxLength(120, { message: 'Máximo de 120 caracteres' })
  titulo: string;

  @ApiPropertyOptional({ example: 'Palestras sobre IA e dados', default: '' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Deve ser um texto' })
  @MaxLength(1000, { message: 'Máximo de 1000 caracteres' })
  descricao?: string;

  @ApiProperty({ example: '2026-12-08', description: 'Data no formato AAAA-MM-DD' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsIsoDate({ message: 'Data inválida (use AAAA-MM-DD)' })
  data: string;

  @ApiProperty({ example: 'Auditório Bloco 3', maxLength: 120 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Deve ser um texto' })
  @IsNotEmpty({ message: 'Campo obrigatório' })
  @MaxLength(120, { message: 'Máximo de 120 caracteres' })
  local: string;

  @ApiProperty({ example: 'Ciência da Computação', maxLength: 80 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Deve ser um texto' })
  @IsNotEmpty({ message: 'Campo obrigatório' })
  @MaxLength(80, { message: 'Máximo de 80 caracteres' })
  curso: string;

  @ApiProperty({ example: 200, minimum: 1 })
  @Type(() => Number)
  @IsInt({ message: 'Deve ser um número inteiro' })
  @Min(1, { message: 'Deve ser maior que zero' })
  vagas: number;
}
