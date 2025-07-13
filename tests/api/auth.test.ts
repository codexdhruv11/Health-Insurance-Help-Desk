import { hash } from 'bcryptjs'
import { authenticator } from 'otplib'
import { prisma } from '@/lib/prisma'
import { GET as handler } from '@/app/api/auth/[...nextauth]/route'
import { UserRole } from '@prisma/client'
import { rateLimit } from '@/lib/rate-limit'
import { compare } from 'bcryptjs'

// Mock Prisma client
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}))

describe('Authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Credentials Provider', () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      passwordHash: '',
      role: UserRole.CUSTOMER,
      mfaEnabled: false,
      mfaSecret: null,
    }

    beforeEach(async () => {
      // Hash a known password
      mockUser.passwordHash = await hash('Password123!', 12)
    })

    it('should authenticate user with valid credentials', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)

      const result = await handler.authorize!({
        credentials: {
          email: 'test@example.com',
          password: 'Password123!',
        },
        req: {} as any,
      })

      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      })

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      })
    })

    it('should reject invalid password', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)

      await expect(
        handler.authorize!({
          credentials: {
            email: 'test@example.com',
            password: 'WrongPassword123!',
          },
          req: {} as any,
        })
      ).rejects.toThrow('Invalid email or password')
    })

    it('should reject non-existent user', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(
        handler.authorize!({
          credentials: {
            email: 'nonexistent@example.com',
            password: 'Password123!',
          },
          req: {} as any,
        })
      ).rejects.toThrow('Invalid email or password')
    })

    it('should handle missing credentials', async () => {
      await expect(
        handler.authorize!({
          credentials: {},
          req: {} as any,
        })
      ).rejects.toThrow('Please enter your email and password')
    })

    describe('MFA Authentication', () => {
      const mockUserWithMFA = {
        ...mockUser,
        mfaEnabled: true,
        mfaSecret: 'TESTSECRET123',
      }

      beforeEach(() => {
        ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserWithMFA)
      })

      it('should require MFA code when MFA is enabled', async () => {
        await expect(
          handler.authorize!({
            credentials: {
              email: 'test@example.com',
              password: 'Password123!',
            },
            req: {} as any,
          })
        ).rejects.toThrow('MFA_REQUIRED')
      })

      it('should validate correct MFA code', async () => {
        const validCode = authenticator.generate(mockUserWithMFA.mfaSecret)

        const result = await handler.authorize!({
          credentials: {
            email: 'test@example.com',
            password: 'Password123!',
            mfaCode: validCode,
          },
          req: {} as any,
        })

        expect(result).toEqual({
          id: mockUserWithMFA.id,
          email: mockUserWithMFA.email,
          role: mockUserWithMFA.role,
        })
      })

      it('should reject invalid MFA code', async () => {
        await expect(
          handler.authorize!({
            credentials: {
              email: 'test@example.com',
              password: 'Password123!',
              mfaCode: '123456',
            },
            req: {} as any,
          })
        ).rejects.toThrow('Invalid MFA code')
      })
    })
  })

  describe('Rate Limiting', () => {
    it('should block too many login attempts', async () => {
      const mockRateLimit = {
        success: false,
        reset: new Date(Date.now() + 15 * 60 * 1000),
      };
      (rateLimit as jest.Mock).mockResolvedValue(mockRateLimit);

      await expect(
        handler.authorize!({
          credentials: {
            email: 'test@example.com',
            password: 'Password123!',
          },
          req: {} as any,
        })
      ).rejects.toThrow('Too many login attempts. Please try again later.');
    });

    it('should allow login after rate limit expires', async () => {
      const mockRateLimit = {
        success: true,
        reset: new Date(),
      };
      (rateLimit as jest.Mock).mockResolvedValue(mockRateLimit);

      const result = await handler.authorize!({
        credentials: {
          email: 'test@example.com',
          password: 'Password123!',
        },
        req: {} as any,
      });

      expect(result).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(
        handler.authorize!({
          credentials: {
            email: 'test@example.com',
            password: 'Password123!',
          },
          req: {} as any,
        })
      ).rejects.toThrow('An error occurred during authentication');
    });

    it('should handle password hashing errors', async () => {
      (compare as jest.Mock).mockRejectedValue(new Error('Hashing error'));

      await expect(
        handler.authorize!({
          credentials: {
            email: 'test@example.com',
            password: 'Password123!',
          },
          req: {} as any,
        })
      ).rejects.toThrow('An error occurred during authentication');
    });
  });

  describe('Session Handling', () => {
    it('should include user role and ID in JWT token', async () => {
      const token = {}
      const user = {
        id: 'user-1',
        role: UserRole.CUSTOMER,
      }

      const result = await handler.jwt!({ token, user, trigger: 'signIn' })

      expect(result).toEqual({
        role: user.role,
        id: user.id,
      })
    })

    it('should include user role and ID in session', async () => {
      const session = { user: {} }
      const token = {
        role: UserRole.CUSTOMER,
        id: 'user-1',
      }

      const result = await handler.session!({ session, token, trigger: 'update' })

      expect(result.user).toEqual({
        role: token.role,
        id: token.id,
      })
    })
  })
})

