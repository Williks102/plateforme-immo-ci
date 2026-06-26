// Upload vers Cloudinary via leur API REST — pas de SDK requis
export async function uploadToCloudinary(buffer: Buffer, contentType: string): Promise<string> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey    = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET manquants');
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();

  // Signature HMAC-SHA1 requise par Cloudinary
  const { createHmac } = await import('crypto');
  const sigPayload = `folder=listings&timestamp=${timestamp}${apiSecret}`;
  const signature  = createHmac('sha1', apiSecret).update(sigPayload).digest('hex');

  const form = new FormData();
  const blob = new Blob([buffer], { type: contentType });
  form.append('file', blob, 'upload');
  form.append('api_key', apiKey);
  form.append('timestamp', timestamp);
  form.append('signature', signature);
  form.append('folder', 'listings');

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Cloudinary error: ${err}`);
  }

  const data = await res.json() as { secure_url: string };
  return data.secure_url;
}

export function isCloudinaryConfigured(): boolean {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}
