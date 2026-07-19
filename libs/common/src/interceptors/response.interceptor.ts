import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiSuccessResponse<T> {
    success: boolean;
    statusCode: number;
    data: T;
    timestamp: string;
    requestId?: string;
}

/**
 * ResponseInterceptor — wraps all successful API responses in a
 * consistent envelope structure.
 *
 * Responses that are already in the envelope format are passed through.
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
    T,
    ApiSuccessResponse<T>
> {
    intercept(
        context: ExecutionContext,
        next: CallHandler,
    ): Observable<ApiSuccessResponse<T>> {
        const request = context.switchToHttp().getRequest<{ id?: string }>();
        const response = context
            .switchToHttp()
            .getResponse<{ statusCode: number }>();

        return next.handle().pipe(
            map((data) => ({
                success: true as const,
                statusCode: response.statusCode,
                data,
                timestamp: new Date().toISOString(),
                requestId: request.id,
            })),
        );
    }
}
