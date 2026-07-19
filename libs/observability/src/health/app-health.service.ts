import { Injectable } from '@nestjs/common';
import {
    HealthCheckService,
    MemoryHealthIndicator,
    DiskHealthIndicator,
    HealthCheckResult,
} from '@nestjs/terminus';

@Injectable()
export class AppHealthService {
    constructor(
        private readonly health: HealthCheckService,
        private readonly memory: MemoryHealthIndicator,
        private readonly disk: DiskHealthIndicator,
    ) {}

    async check(): Promise<HealthCheckResult> {
        return this.health.check([
            // memory — alert if heap exceeds 512MB
            () => this.memory.checkHeap('memory_heap', 512 * 1024 * 1024),

            // disk — alert if less than 10% free
            () =>
                this.disk.checkStorage('disk', {
                    path: '/',
                    thresholdPercent: 0.9,
                }),
            // TODO: add more health checks
        ]);
    }
}
