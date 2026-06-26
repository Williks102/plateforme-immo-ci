import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const s3Client = new S3Client({
  endpoint: process.env.DO_SPACES_ENDPOINT,
  region: 'fra1',
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY!,
    secretAccessKey: process.env.DO_SPACES_SECRET!,
  },
  forcePathStyle: false,
});

export const BUCKET = process.env.DO_SPACES_BUCKET!;

export async function getSignedDownloadUrl(key: string, ttlSeconds = 900): Promise<string> {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3Client, command, { expiresIn: ttlSeconds });
}

export async function uploadToS3(params: {
  key: string;
  body: Buffer;
  contentType: string;
  isPublic?: boolean;
}): Promise<string> {
  await s3Client.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: params.key,
    Body: params.body,
    ContentType: params.contentType,
    ACL: params.isPublic ? 'public-read' : 'private',
  }));

  const endpoint = process.env.DO_SPACES_ENDPOINT!.replace('https://', '');
  return `https://${BUCKET}.${endpoint}/${params.key}`;
}
