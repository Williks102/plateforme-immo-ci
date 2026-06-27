import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { fileTypeFromBuffer } from 'file-type';
import { getSession } from '@/lib/auth';
import { isCloudinaryConfigured, uploadToCloudinary } from '@/lib/cloudinary';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

const WATERMARK_SVG = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="36">' +
  '<text x="5" y="26" font-family="sans-serif" font-size="20" font-weight="bold" ' +
  'fill="white" fill-opacity="0.55">ImmoCI.ci</text></svg>'
);

async function processImage(buffer: Buffer): Promise<Buffer> {
  const sharp = (await import('sharp')).default;
  return sharp(buffer)
    .resize(1280, 960, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .composite([{ input: WATERMARK_SVG, gravity: 'southeast' }])
    .toBuffer();
}

async function computePHash(buffer: Buffer): Promise<string | null> {
  try {
    const sharp = (await import('sharp')).default;
    const { data } = await sharp(buffer)
      .resize(8, 8, { fit: 'fill' })
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i];
    const mean = sum / data.length;

    let bits = '';
    for (let i = 0; i < data.length; i++) bits += data[i] > mean ? '1' : '0';

    return BigInt('0b' + (bits || '0')).toString(16).padStart(16, '0');
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const hasCloudinary = isCloudinaryConfigured();
    const hasSpaces = !!(process.env.DO_SPACES_KEY && process.env.DO_SPACES_SECRET && process.env.DO_SPACES_ENDPOINT);

    if (!hasCloudinary && !hasSpaces) {
      return NextResponse.json(
        { error: 'Stockage non configuré. Ajoutez CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET dans les env vars Render.' },
        { status: 503 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 });

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: 'Fichier trop volumineux (max 5 Mo)' }, { status: 413 });
    }

    const rawBuffer = Buffer.from(await file.arrayBuffer());
    const detected  = await fileTypeFromBuffer(rawBuffer);

    if (!detected || !ALLOWED_MIME.includes(detected.mime)) {
      return NextResponse.json({ error: 'Type de fichier non autorisé (jpg, png, webp uniquement)' }, { status: 415 });
    }

    // Compute pHash from raw input (before resize) for duplicate detection
    const phashHex = await computePHash(rawBuffer);

    // Process: resize + watermark + WebP
    let buffer = rawBuffer;
    let mimeType = detected.mime;
    try {
      buffer   = await processImage(rawBuffer);
      mimeType = 'image/webp';
    } catch (e) {
      console.warn('[upload] sharp processing failed, using original:', e);
    }

    let url: string;

    if (hasCloudinary) {
      url = await uploadToCloudinary(buffer, mimeType);
    } else {
      const { uploadToS3 } = await import('@/lib/s3');
      url = await uploadToS3({
        key: `listings/${randomUUID()}.webp`,
        body: buffer,
        contentType: mimeType,
        isPublic: true,
      });
    }

    return NextResponse.json({ url, phash: phashHex });
  } catch (err) {
    console.error('[upload]', err);
    return NextResponse.json({ error: 'Erreur lors de l\'upload' }, { status: 500 });
  }
}
