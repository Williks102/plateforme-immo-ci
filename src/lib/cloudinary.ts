// Upload vers Cloudinary via leur API REST — pas de SDK requis
export async function uploadToCloudinary(buffer: Buffer, contentType: string): Promise<string> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey    = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET manquants');
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();

  // Cloudinary : SHA1(params_triés_par_ordre_alpha + api_secret) — PAS un HMAC
  const { createHash } = await import('crypto');
  const sigPayload = `folder=listings&timestamp=${timestamp}${apiSecret}`;
  const signature  = createHash('sha1').update(sigPayload).digest('hex');

  const form = new FormData();
  // Uint8Array évite l'incompatibilité Buffer<ArrayBufferLike> vs BlobPart sur Node 24
  const blob = new Blob([new Uint8Array(buffer)], { type: contentType });
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
