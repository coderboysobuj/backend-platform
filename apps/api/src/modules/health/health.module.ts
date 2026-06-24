import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppHealthService } from '@app/observability';
import { Module } from '@nestjs/common';
import { ObservabilityModule } from '@app/observability';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly healthService: AppHealthService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Health check — all indicators' })
  check() {
    return this.healthService.check();
  }

  @Get('ping')
  @ApiOperation({ summary: 'Simple liveness probe' })
  ping() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}

@Module({
  imports: [ObservabilityModule],
  controllers: [HealthController],
})
export class HealthModule {}
