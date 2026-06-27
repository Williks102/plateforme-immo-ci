export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return '****';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '****';
  return `${digits.slice(0, 2)}****${digits.slice(-2)}`;
}
