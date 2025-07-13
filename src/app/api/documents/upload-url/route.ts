import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import { rateLimit } from '@/lib/rate-limit';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// Define allowed file types and their corresponding MIME types
const ALLOWED_FILE_TYPES = {
  // Images
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  
  // Documents
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  
  // Text
  'text/plain': ['.txt'],
  'text/csv': ['.csv'],
} as const;

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Rate limit configuration for uploads
const UPLOAD_RATE_LIMIT = {
  maxRequests: 10,
  windowMs: 60 * 1000, // 1 minute
  prefix: 'upload:',
};

// Validate file extension matches MIME type
function isValidFileType(fileName: string, mimeType: string): boolean {
  const extension = fileName.toLowerCase().split('.').pop();
  if (!extension) return false;

  const allowedExtensions = ALLOWED_FILE_TYPES[mimeType as keyof typeof ALLOWED_FILE_TYPES];
  if (!allowedExtensions) return false;

  return allowedExtensions.some((ext: string) => ext === `.${extension}`);
}

// Validate file name for security
function isValidFileName(fileName: string): boolean {
  // Check for directory traversal attempts
  if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
    return false;
  }

  // Check for hidden files
  if (fileName.startsWith('.')) {
    return false;
  }

  // Only allow alphanumeric characters, hyphens, underscores, and dots
  return /^[a-zA-Z0-9-_. ]+$/.test(fileName);
}

// Generate secure file name
function generateSecureFileName(originalName: string): string {
  const extension = originalName.toLowerCase().split('.').pop();
  const randomString = crypto.randomBytes(16).toString('hex');
  const timestamp = Date.now();
  return `${timestamp}-${randomString}.${extension}`;
}

// Verify webhook signature
function verifyWebhookSignature(request: Request, signature: string): boolean {
  const webhookSecret = process.env.VIRUS_SCAN_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('Missing VIRUS_SCAN_WEBHOOK_SECRET');
    return false;
  }

  try {
    const hmac = crypto.createHmac('sha256', webhookSecret);
    const calculatedSignature = hmac
      .update(JSON.stringify(request.body))
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(calculatedSignature)
    );
  } catch (error) {
    console.error('Webhook signature verification error:', error);
    return false;
  }
}

const uploadRequestSchema = z.object({
  fileName: z.string()
    .min(1, 'File name is required')
    .max(255, 'File name is too long')
    .refine(isValidFileName, 'Invalid file name'),
  fileSize: z.number()
    .min(1, 'File size must be greater than 0')
    .max(MAX_FILE_SIZE, `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`),
  mimeType: z.enum(Object.keys(ALLOWED_FILE_TYPES) as [string, ...string[]], {
    errorMap: () => ({ message: 'Unsupported file type' }),
  }),
  entityType: z.enum(['CLAIM', 'POLICY', 'TICKET']),
  entityId: z.string().uuid(),
  hash: z.string().optional(), // File hash for deduplication
});

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Apply rate limiting
    const rateLimitInfo = await rateLimit(session.user.id, UPLOAD_RATE_LIMIT);
    if (!rateLimitInfo.success) {
      return new NextResponse('Too many upload requests', { status: 429 });
    }

    // Validate request body
    const json = await request.json();
    const body = uploadRequestSchema.parse(json);

    // Validate file type matches extension
    if (!isValidFileType(body.fileName, body.mimeType)) {
      return new NextResponse('File type does not match extension', { status: 400 });
    }

    // Check for duplicate file if hash provided
    if (body.hash) {
      const existingDocument = await prisma.document.findFirst({
        where: {
          hash: body.hash,
          entityType: body.entityType,
          entityId: body.entityId,
        },
      });

      if (existingDocument) {
        return NextResponse.json({
          documentId: existingDocument.id,
          isDuplicate: true,
        });
      }
    }

    // Generate secure file name and key
    const secureFileName = generateSecureFileName(body.fileName);
    const key = `${body.entityType.toLowerCase()}/${body.entityId}/${secureFileName}`;

    // Create document record
    const document = await prisma.document.create({
      data: {
        entityType: body.entityType,
        entityId: body.entityId,
        fileName: body.fileName,
        fileSize: body.fileSize,
        mimeType: body.mimeType,
        s3Key: key,
        uploadedById: session.user.id,
        hash: body.hash,
        status: 'PENDING', // Document needs virus scan
      },
    });

    // Generate presigned URL with strict conditions
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: key,
      ContentType: body.mimeType,
      ContentLength: body.fileSize,
      Metadata: {
        'original-name': body.fileName,
        'entity-type': body.entityType,
        'entity-id': body.entityId,
        'uploader-id': session.user.id,
        'upload-timestamp': new Date().toISOString(),
      },
      // Server-side encryption
      ServerSideEncryption: 'AES256',
      // Content validation
      ContentMD5: body.hash ? Buffer.from(body.hash, 'hex').toString('base64') : undefined,
      // Object tagging
      Tagging: `status=pending&type=${body.entityType.toLowerCase()}`,
      // Security headers
      CacheControl: 'private, no-cache, no-store, must-revalidate',
      ContentDisposition: `attachment; filename="${encodeURIComponent(body.fileName)}"`,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600, // 1 hour
    });

    // Send file to virus scanning service
    await fetch(process.env.VIRUS_SCAN_API_URL!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.VIRUS_SCAN_API_KEY}`,
      },
      body: JSON.stringify({
        documentId: document.id,
        fileUrl: uploadUrl,
        callbackUrl: `${process.env.API_URL}/api/documents/scan-webhook`,
      }),
    });

    return NextResponse.json({
      uploadUrl,
      documentId: document.id,
      expiresIn: 3600,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.errors), { status: 400 });
    }

    console.error('Upload URL generation error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// Virus scan webhook handler
export async function PUT(request: Request) {
  try {
    // Verify webhook signature
    const signature = request.headers.get('x-webhook-signature');
    if (!signature || !verifyWebhookSignature(request, signature)) {
      return new NextResponse('Invalid signature', { status: 401 });
    }

    const { documentId, scanResult } = await request.json();

    // Update document status based on scan result
    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: scanResult.clean ? 'READY' : 'INFECTED',
        scanResult: scanResult,
      },
    });

    // If infected, delete from S3 and notify admin
    if (!scanResult.clean) {
      const document = await prisma.document.findUnique({
        where: { id: documentId },
        include: {
          uploadedBy: true,
        },
      });

      if (document) {
        // Delete infected file
        await s3Client.send(new DeleteObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET!,
          Key: document.s3Key,
        }));

        // Notify admin
        await fetch(process.env.ADMIN_WEBHOOK_URL!, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.ADMIN_WEBHOOK_KEY}`,
          },
          body: JSON.stringify({
            type: 'INFECTED_FILE_DETECTED',
            data: {
              documentId: document.id,
              fileName: document.fileName,
              uploadedBy: document.uploadedBy.email,
              uploadedAt: document.createdAt,
              scanResult: scanResult,
            },
          }),
        });
      }
    }

    return new NextResponse('OK');
  } catch (error) {
    console.error('Virus scan webhook error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 