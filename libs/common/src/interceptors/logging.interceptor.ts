import {
    CallHandler,
    ExecutionContext,
    Injectable,
    Logger,
    NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

/**
 * LoggingInterceptor - logs each HTTP request with:
 *  - A unique request ID (attached to request and response headers)
 *  - Method, URL, status code, and duration
 *
 *  Request ID is available for downstream use (e.g. in exception filters).
 */

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    private readonly logger = new Logger('HTTP');

    intercept(
        context: ExecutionContext,
        next: CallHandler,
    ): Observable<unknown> {
        const httpContext = context.switchToHttp();
        const request = httpContext.getRequest<Request & { id: string }>();
        const response = httpContext.getResponse<Response>();

        const requestId = uuidv4();
        request.id = requestId;
        response.setHeader('X-Request-Id', requestId);

        const { method, url } = request;
        const startTime = Date.now();

        return next.handle().pipe(
            tap({
                next: () => {
                    const duration = Date.now() - startTime;
                    const { statusCode } = response;
                    this.logger.log(
                        `${method} ${url} ${statusCode} +${duration}ms [${requestId}]`,
                    );
                },
                error: () => {
                    const duration = Date.now() - startTime;
                    this.logger.error(
                        `${method} ${url} ERROR +${duration}ms [${requestId}]`,
                    );
                },
            }),
        );
    }
}
