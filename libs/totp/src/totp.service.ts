import {
    BadRequestException,
    Inject,
    Injectable,
    Logger,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { generateSecret, generateURI, verify } from 'otplib';
import * as qrcode from 'qrcode';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { eq } from 'drizzle-orm';

import { DRIZZLE_CLIENT, type DrizzleDB, users } from '@app/drizzle';
import { CacheService } from '@app/cache';

// AES-256-GCM encryption for TOTP secrets at rest
function encrypt(text: string, key: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
        'aes-256-gcm',
        Buffer.from(key, 'hex'),
        iv,
    );
    const encrypted = Buffer.concat([
        cipher.update(text, 'utf8'),
        cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return [
        iv.toString('hex'),
        tag.toString('hex'),
        encrypted.toString('hex'),
    ].join(':');
}

function decrypt(data: string, key: string): string {
    const [ivHex, tagHex, encryptedHex] = data.split(':');
    const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        Buffer.from(key, 'hex'),
        Buffer.from(ivHex, 'hex'),
    );
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    return Buffer.concat([
        decipher.update(Buffer.from(encryptedHex, 'hex')),
        decipher.final(),
    ]).toString('utf8');
}

@Injectable()
export class TotpService {
    private readonly logger = new Logger(TotpService.name);
    private readonly encKey: string;
    private readonly appName: string;

    constructor(
        @Inject(DRIZZLE_CLIENT) private readonly db: DrizzleDB,
        private readonly config: ConfigService,
        private readonly cache: CacheService,
    ) {
        this.encKey = config
            .get<string>('app.encryptionKey', '')
            .padEnd(64, '0')
            .slice(0, 64);
        this.appName = config.get<string>('app.name', 'Platform');

        const totpOptions = {
            window: 1,
        };
    }

    async generateSetup(userId: string, email: string) {
        const secret = generateSecret({ length: 32 });
        const otpAuthUrl = generateURI({
            issuer: this.appName,
            label: email,
            secret,
        });
        const qrCodeDataUrl = await qrcode.toDataURL(otpAuthUrl);

        // Store pending secret in cache (not committed until user verifies)
        await this.cache.set(`totp:pending:${userId}`, secret, 600); // 10 min

        return {
            secret, // shown once for manual entry
            qrCode: qrCodeDataUrl,
            otpAuthUrl,
        };
    }

    async enable(
        userId: string,
        code: string,
    ): Promise<{ backupCodes: string[] }> {
        const pendingSecret = await this.cache.get<string>(
            `totp:pending:${userId}`,
        );
        if (!pendingSecret)
            throw new BadRequestException(
                'No pending 2FA setup. Please start setup again.',
            );

        const result = await verify({
            token: code,
            secret: pendingSecret,
        });
        if (!result.valid) throw new UnauthorizedException('Invalid TOTP code');

        const backupCodes = this.generateBackupCodes();
        const hashedCodes = await Promise.all(
            backupCodes.map((c) => argon2.hash(c)),
        );
        const encryptedSecret = encrypt(pendingSecret, this.encKey);

        await this.db
            .update(users)
            .set({
                totpEnabled: true,
                totpSecret: encryptedSecret,
                backupCodes: JSON.stringify(hashedCodes),
                updatedAt: new Date(),
            })
            .where(eq(users.id, userId));

        await this.cache.del(`totp:pending:${userId}`);
        this.logger.log(`2FA enabled for user ${userId}`);

        return { backupCodes }; // shown once — user must save these
    }

    async disable(
        userId: string,
        password: string,
        code: string,
    ): Promise<void> {
        const [user] = await this.db
            .select()
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);
        if (!user) throw new UnauthorizedException('User not found');

        const passwordValid = await argon2.verify(user.passwordHash, password);
        if (!passwordValid) throw new UnauthorizedException('Invalid password');

        if (!user.totpSecret)
            throw new BadRequestException('2FA is not enabled');
        const secret = decrypt(user.totpSecret, this.encKey);
        const isValid = verify({ token: code, secret });
        if (!isValid) throw new UnauthorizedException('Invalid TOTP code');

        await this.db
            .update(users)
            .set({
                totpEnabled: false,
                totpSecret: null,
                backupCodes: null,
                updatedAt: new Date(),
            })
            .where(eq(users.id, userId));

        this.logger.log(`2FA disabled for user ${userId}`);
    }

    async verify(userId: string, code: string): Promise<boolean> {
        const [user] = await this.db
            .select({
                totpSecret: users.totpSecret,
                backupCodes: users.backupCodes,
            })
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);

        if (!user?.totpSecret) return false;

        // Try TOTP
        const secret = decrypt(user.totpSecret, this.encKey);
        const result = await verify({
            token: code,
            secret,
        });

        if (result.valid) {
            return true;
        }

        // Try backup code
        if (user.backupCodes && code.length === 10) {
            return this.verifyBackupCode(
                userId,
                code,
                JSON.parse(user.backupCodes) as string[],
            );
        }

        return false;
    }

    async regenerateBackupCodes(
        userId: string,
    ): Promise<{ backupCodes: string[] }> {
        const backupCodes = this.generateBackupCodes();
        const hashedCodes = await Promise.all(
            backupCodes.map((c) => argon2.hash(c)),
        );

        await this.db
            .update(users)
            .set({
                backupCodes: JSON.stringify(hashedCodes),
                updatedAt: new Date(),
            })
            .where(eq(users.id, userId));

        return { backupCodes };
    }

    private async verifyBackupCode(
        userId: string,
        code: string,
        hashes: string[],
    ): Promise<boolean> {
        for (let i = 0; i < hashes.length; i++) {
            if (await argon2.verify(hashes[i], code)) {
                // Remove used backup code
                hashes.splice(i, 1);
                await this.db
                    .update(users)
                    .set({
                        backupCodes: JSON.stringify(hashes),
                        updatedAt: new Date(),
                    })
                    .where(eq(users.id, userId));
                return true;
            }
        }
        return false;
    }

    private generateBackupCodes(): string[] {
        return Array.from({ length: 10 }, () =>
            crypto.randomBytes(5).toString('hex').toUpperCase(),
        );
    }
}
