import { NextResponse } from 'next/server';
import { z } from 'zod';
import { CoinService } from '@/lib/coins';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const simulationSchema = z.object({
  type: z.enum([
    'REFERRAL',
    'POLICY_PURCHASE',
    'HEALTH_QUIZ',
    'DOCUMENT_UPLOAD',
  ]),
  metadata: z.record(z.any()).optional(),
});

export async function POST(req: Request) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return new NextResponse('Not available in production', { status: 403 });
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const validatedData = simulationSchema.parse(body);

    // Simulate metadata based on action type
    const simulatedMetadata = {
      ...validatedData.metadata,
      simulated: true,
      timestamp: new Date().toISOString(),
      ...getSimulatedMetadata(validatedData.type),
    };

    const coinService = CoinService.getInstance();
    const { transaction, wallet } = await coinService.earnCoins(
      session.user.id,
      validatedData.type,
      0, // Amount determined by earn rule
      simulatedMetadata
    );

    return NextResponse.json({
      success: true,
      data: {
        transaction,
        wallet: {
          balance: wallet.balance,
          totalEarned: wallet.totalEarned,
        },
        simulatedMetadata,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    console.error('Simulation error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function getSimulatedMetadata(type: string): Record<string, any> {
  switch (type) {
    case 'REFERRAL':
      return {
        referredUserId: 'sim_' + Math.random().toString(36).substring(7),
        referralCode: 'SIM' + Math.random().toString(36).toUpperCase().substring(7),
      };

    case 'POLICY_PURCHASE':
      return {
        policyId: 'sim_' + Math.random().toString(36).substring(7),
        planName: 'Simulated Health Plan',
        premium: Math.floor(Math.random() * 10000) + 5000,
      };

    case 'HEALTH_QUIZ':
      return {
        quizId: 'sim_' + Math.random().toString(36).substring(7),
        score: Math.floor(Math.random() * 100),
        completionTime: Math.floor(Math.random() * 600) + 300,
      };

    case 'DOCUMENT_UPLOAD':
      return {
        documentId: 'sim_' + Math.random().toString(36).substring(7),
        documentType: ['ID_PROOF', 'ADDRESS_PROOF', 'MEDICAL_REPORT'][
          Math.floor(Math.random() * 3)
        ],
        fileSize: Math.floor(Math.random() * 5000000) + 1000000,
      };

    default:
      return {};
  }
} 