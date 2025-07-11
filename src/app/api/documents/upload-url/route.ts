import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import crypto from 'crypto'

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

const uploadRequestSchema = z.object({
  fileName: z.string().min(1),
  fileSize: z.number().min(1),
  mimeType: z.string().min(1),
  entityType: z.enum(['CLAIM', 'POLICY', 'TICKET']),
  entityId: z.string().uuid(),
})

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const json = await request.json()
    const body = uploadRequestSchema.parse(json)

    // Generate unique file key
    const fileExtension = body.fileName.split('.').pop()
    const randomString = crypto.randomBytes(16).toString('hex')
    const key = `${body.entityType.toLowerCase()}/${body.entityId}/${randomString}.${fileExtension}`

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
      },
    })

    // Generate presigned URL
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: key,
      ContentType: body.mimeType,
      Metadata: {
        'original-name': body.fileName,
      },
    })

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })

    return NextResponse.json({
      uploadUrl,
      documentId: document.id,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.errors), { status: 400 })
    }

    console.error('Upload URL generation error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 