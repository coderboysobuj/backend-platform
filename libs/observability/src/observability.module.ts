import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

import { AppHealthService } from './health/app-health.service';
@Module({
    imports: [TerminusModule],
    providers: [AppHealthService],
    exports: [AppHealthService],
})
export class ObservabilityModule {}
