import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

@Module({
    imports: [
        WinstonModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => {
                const logLevel = configService.get<string>(
                    'app.logLevel',
                    'info',
                );
                const isProduction =
                    configService.get<string>('app.env') === 'production';

                const formats = [
                    winston.format.timestamp({
                        format: 'YYYY-MM-DD HH:mm:ss.SSS',
                    }),
                    winston.format.errors({ stack: true }),
                    winston.format.metadata({
                        fillExcept: ['message', 'level', 'timestamp', 'label'],
                    }),
                ];

                const productionFormat = winston.format.combine(
                    ...formats,
                    winston.format.json(),
                );

                const developmentFormat = winston.format.combine(
                    ...formats,
                    winston.format.colorize(),
                    winston.format.printf(
                        ({ timestamp, level, message, metadata }) => {
                            const meta =
                                metadata && Object.keys(metadata).length
                                    ? JSON.stringify(metadata)
                                    : '';
                            return `${timestamp} [${level}]: ${message} ${meta}`;
                        },
                    ),
                );

                return {
                    transports: [
                        new winston.transports.Console({
                            level: logLevel,
                            format: isProduction
                                ? productionFormat
                                : developmentFormat,
                        }),
                        // TODO: in production add file transports or remote logging (Loki, etc.)
                        ...(isProduction
                            ? [
                                  new winston.transports.File({
                                      filename: 'logs/error.log',
                                      level: 'error',
                                      format: productionFormat,
                                  }),
                              ]
                            : []),
                    ],
                };
            },
        }),
    ],
    exports: [WinstonModule],
})
export class AppLoggerModule {}
