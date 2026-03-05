export function getEnvironmentVariable(name: string, defaultValue: string): string {
  const value = process.env[name];
  if (!value) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function hashBssid(bssid: string): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(bssid || '').digest('hex').substring(0, 16);
}

export function generateToken(): string {
  return crypto.randomUUID();
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.headers.get('x-real-ip') || 'unknown';
}
