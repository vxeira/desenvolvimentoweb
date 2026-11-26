import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

interface CampoErroResponse {
  erro: string;
  erros?: Record<string, string>;
  statusCode: number;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();

      if (typeof body === 'object' && body !== null) {
        const resObj = body as Record<string, unknown>;
        if (resObj.erros && typeof resObj.erros === 'object') {
          const payload: CampoErroResponse = {
            erro: typeof resObj.erro === 'string' ? resObj.erro : 'Dados inválidos',
            erros: resObj.erros as Record<string, string>,
            statusCode: status,
          };
          return response.status(status).json(payload);
        }

        const msg = Array.isArray(resObj.message)
          ? resObj.message.join('; ')
          : typeof resObj.message === 'string'
            ? resObj.message
            : exception.message;

        return response.status(status).json({
          erro: msg,
          statusCode: status,
        });
      }

      return response.status(status).json({
        erro: typeof body === 'string' ? body : exception.message,
        statusCode: status,
      });
    }

    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      erro: 'Erro interno do servidor',
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  }
}
