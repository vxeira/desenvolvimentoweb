import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Lucas Vieira', maxLength: 120 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Deve ser um texto' })
  @MinLength(2, { message: 'Mínimo de 2 caracteres' })
  @MaxLength(120, { message: 'Máximo de 120 caracteres' })
  nome: string;

  @ApiProperty({ example: 'lucas.vieira@ceub.edu.br', maxLength: 160 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'E-mail inválido' })
  @MaxLength(160, { message: 'Máximo de 160 caracteres' })
  email: string;

  @ApiProperty({ example: 'SenhaSegura@2026', minLength: 8, maxLength: 128 })
  @IsString({ message: 'Deve ser um texto' })
  @MinLength(8, { message: 'Mínimo de 8 caracteres' })
  @MaxLength(128, { message: 'Máximo de 128 caracteres' })
  senha: string;

  @ApiPropertyOptional({
    description: 'RA ou CPF opcional (armazenado criptografado com AES-256-GCM)',
    example: '22600001',
    maxLength: 30,
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Deve ser um texto' })
  @MaxLength(30, { message: 'Máximo de 30 caracteres' })
  documento?: string;
}
