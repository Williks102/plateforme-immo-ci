import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { fileTypeFromBuffer } from 'file-type';
import { getSession } from '@/lib/auth';
import { isCloudinaryConfigured, uploadToCloudinary } from '@/lib/cloudinary';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    // Vérifier qu'un provider de stockage est configuré
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

    const buffer  = Buffer.from(await file.arrayBuffer());
    const detected = await fileTypeFromBuffer(buffer);

    if (!detected || !ALLOWED_MIME.includes(detected.mime)) {
      return NextResponse.json({ error: 'Type de fichier non autorisé (jpg, png, webp uniquement)' }, { status: 415 });
    }

    let url: string;

    if (hasCloudinary) {
      url = await uploadToCloudinary(buffer, detected.mime);
    } else {
      // DO Spaces fallback
      const { uploadToS3 } = await import('@/lib/s3');
      const ext = detected.mime.split('/')[1].replace('jpeg', 'jpg');
      url = await uploadToS3({
        key: `listings/${randomUUID()}.${ext}`,
        body: buffer,
        contentType: detected.mime,
        isPublic: true,
      });
    }

    return NextResponse.json({ url });
  } catch (err) {
    console.error('[upload]', err);
    return NextResponse.json({ error: 'Erreur lors de l\'upload' }, { status: 500 });
  }
}
