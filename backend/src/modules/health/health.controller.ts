import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Verifica o status de disponibilidade da API' })
  @ApiResponse({ status: 200, description: 'API operacional.' })
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
