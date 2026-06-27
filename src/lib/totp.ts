import * as OTPAuth from 'otpauth';

export function generateTOTPSecret(): string {
  return new OTPAuth.Secret({ size: 20 }).base32;
}

export function getTOTP(base32Secret: string) {
  return new OTPAuth.TOTP({
    secret: OTPAuth.Secret.fromBase32(base32Secret),
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
  });
}

export function verifyTOTP(base32Secret: string, token: string): boolean {
  const totp = getTOTP(base32Secret);
  return totp.validate({ token, window: 1 }) !== null;
}

export function getTOTPUri(secret: string, email: string): string {
  const totp = getTOTP(secret);
  return totp.toString().replace('OTPAuth.TOTP', `otpauth://totp/${encodeURIComponent(email)}?issuer=ImmoCI`);
}

export function buildTOTPUri(secret: string, email: string): string {
  return `otpauth://totp/ImmoCI:${encodeURIComponent(email)}?secret=${secret}&issuer=ImmoCI&algorithm=SHA1&digits=6&period=30`;
}
