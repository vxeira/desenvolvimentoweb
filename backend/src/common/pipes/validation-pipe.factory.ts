import { BadRequestException, ValidationError, ValidationPipe } from '@nestjs/common';

export function buildValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors: ValidationError[]) => {
      const erros: Record<string, string> = {};
      for (const err of errors) {
        if (err.constraints) {
          const primeiraMsg = Object.values(err.constraints)[0];
          erros[err.property] = primeiraMsg;
        }
      }
      return new BadRequestException({
        erro: 'Dados inválidos',
        erros,
      });
    },
  });
}
