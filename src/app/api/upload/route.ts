import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { fileTypeFromBuffer } from 'file-type';
import { getSession } from '@/lib/auth';
import { uploadToS3 } from '@/lib/s3';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 });

    // Vérifier la taille côté serveur
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: 'Fichier trop volumineux (max 5MB)' }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Valider le MIME type RÉEL (magic bytes) — un attaquant peut renommer un exe en .jpg
    const detected = await fileTypeFromBuffer(buffer);
    if (!detected || !ALLOWED_MIME.includes(detected.mime)) {
      return NextResponse.json({ error: 'Type de fichier non autorisé' }, { status: 415 });
    }

    // Nom de fichier généré aléatoirement — jamais le nom d'origine
    const extension = detected.mime.split('/')[1].replace('jpeg', 'jpg');
    const safeFilename = `${randomUUID()}.${extension}`;

    const url = await uploadToS3({
      key: `listings/${safeFilename}`,
      body: buffer,
      contentType: detected.mime,
      isPublic: true,
    });

    return NextResponse.json({ url });
  } catch (err) {
    console.error('[upload]', err);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
