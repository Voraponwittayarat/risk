import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

function resolveJwtSecret(): string {
  if (process.env.NODE_ENV === 'test') return process.env.JWT_SECRET || 'riskhrms-test-only-secret-not-for-production';

  const secret = String(process.env.JWT_SECRET || '').trim();
  const knownWeakValues = new Set([
    'RISKHRMS_SECRET_KEY',
    'your_super_secret_jwt_key_here',
    'your-super-secret-jwt-key',
  ]);
  if (secret.length >= 32 && !knownWeakValues.has(secret)) return secret;

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be configured with a unique value of at least 32 characters');
  }

  // Keep local development safe and usable without placing a generated secret in
  // .env or command output. The ignored file makes tokens stable across restarts.
  const developmentSecretPath = resolve(
    process.env.JWT_DEVELOPMENT_SECRET_FILE || process.cwd(),
    '.riskhrms-dev-jwt-secret',
  );
  if (existsSync(developmentSecretPath)) {
    const persistedSecret = readFileSync(developmentSecretPath, 'utf8').trim();
    if (persistedSecret.length >= 32) return persistedSecret;
  }
  const generatedSecret = randomBytes(48).toString('hex');
  writeFileSync(developmentSecretPath, generatedSecret, { encoding: 'utf8', mode: 0o600 });
  console.warn(`[security] Generated a local-development JWT secret at ${developmentSecretPath}`);
  return generatedSecret;
}

export const jwtConstants = { secret: resolveJwtSecret() };

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConstants.secret,
    });
  }


  async validate(payload: any) {
    // The payload returned here will be injected into the request object as req.user
    return { 
      userId: payload.sub, 
      id: payload.sub,
      cid: payload.cid,
      departmentId: payload.departmentId,
      departmentId2: payload.departmentId2,
      departmentGroup: payload.departmentGroup,
      teamId: payload.teamId,
      teamName: payload.teamName,
      rmScope: payload.rmScope,
      name: payload.name,
      username: payload.username,
      role: payload.role,
    };
  }
}
