import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'lucas.vieira@ceub.edu.br' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'E-mail inválido' })
  @MaxLength(160, { message: 'Máximo de 160 caracteres' })
  email: string;

  @ApiProperty({ example: 'SenhaSegura@2026' })
  @IsString({ message: 'Deve ser um texto' })
  @MinLength(8, { message: 'Mínimo de 8 caracteres' })
  @MaxLength(128, { message: 'Máximo de 128 caracteres' })
  senha: string;
}
