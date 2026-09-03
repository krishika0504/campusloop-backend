import crypto from 'crypto';

export function generateQrVerificationCode(transactionId: string, buyerId: string, sellerId: string): string {
  const secret = process.env.JWT_SECRET || 'campusloop_qr_secret';
  const data = `${transactionId}:${buyerId}:${sellerId}:${Date.now()}`;
  const hmac = crypto.createHmac('sha256', secret).update(data).digest('hex').substring(0, 16).toUpperCase();
  return `CL-${transactionId.substring(0, 6)}-${hmac}`;
}

export function verifyQrCode(receivedCode: string, expectedCode?: string | null): boolean {
  if (!expectedCode || !receivedCode) return false;
  return receivedCode.trim().toUpperCase() === expectedCode.trim().toUpperCase();
}
