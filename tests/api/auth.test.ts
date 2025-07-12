import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createMockUser } from '../setup';
import bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';
import { prisma } from '@/lib/prisma';

vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
  },
}));

vi.mock('otplib', () => ({
  authenticator: {
    verify: vi.fn(),
    options: {},
  },
}));

describe('Authentication', () => {
  const mockCredentials = {
    email: 'test@example.com',
    password: 'testpassword123',
    mfaCode: '123456',
  };

  const mockPasswordHash = 'hashedpassword123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authorize', () => {
    it('should return null for non-existent user', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(null);

      const result = await authOptions.providers[0].authorize!(mockCredentials);
      expect(result).toBeNull();
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: mockCredentials.email },
        include: { customer: true, supportAgent: true },
      });
    });

    it('should return null for invalid password', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        ...createMockUser(),
        passwordHash: mockPasswordHash,
      });
      (bcrypt.compare as any).mockResolvedValueOnce(false);

      const result = await authOptions.providers[0].authorize!(mockCredentials);
      expect(result).toBeNull();
      expect(bcrypt.compare).toHaveBeenCalledWith(
        mockCredentials.password,
        mockPasswordHash
      );
    });

    it('should authenticate user without MFA', async () => {
      const mockUser = {
        ...createMockUser(),
        passwordHash: mockPasswordHash,
        mfaEnabled: false,
      };
      prisma.user.findUnique.mockResolvedValueOnce(mockUser);
      (bcrypt.compare as any).mockResolvedValueOnce(true);

      const result = await authOptions.providers[0].authorize!(mockCredentials);
      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        name: undefined,
      });
    });

    it('should require MFA code when MFA is enabled', async () => {
      const mockUser = {
        ...createMockUser(),
        passwordHash: mockPasswordHash,
        mfaEnabled: true,
        mfaSecret: 'secret123',
      };
      prisma.user.findUnique.mockResolvedValueOnce(mockUser);
      (bcrypt.compare as any).mockResolvedValueOnce(true);

      const credentialsWithoutMFA = {
        email: mockCredentials.email,
        password: mockCredentials.password,
      };

      const result = await authOptions.providers[0].authorize!(credentialsWithoutMFA);
      expect(result).toBeNull();
    });

    it('should authenticate user with valid MFA code', async () => {
      const mockUser = {
        ...createMockUser(),
        passwordHash: mockPasswordHash,
        mfaEnabled: true,
        mfaSecret: 'secret123',
      };
      prisma.user.findUnique.mockResolvedValueOnce(mockUser);
      (bcrypt.compare as any).mockResolvedValueOnce(true);
      (authenticator.verify as any).mockReturnValueOnce(true);

      const result = await authOptions.providers[0].authorize!(mockCredentials);
      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        name: undefined,
      });
      expect(authenticator.verify).toHaveBeenCalledWith({
        token: mockCredentials.mfaCode,
        secret: mockUser.mfaSecret,
      });
    });

    it('should reject invalid MFA code', async () => {
      const mockUser = {
        ...createMockUser(),
        passwordHash: mockPasswordHash,
        mfaEnabled: true,
        mfaSecret: 'secret123',
      };
      prisma.user.findUnique.mockResolvedValueOnce(mockUser);
      (bcrypt.compare as any).mockResolvedValueOnce(true);
      (authenticator.verify as any).mockReturnValueOnce(false);

      const result = await authOptions.providers[0].authorize!(mockCredentials);
      expect(result).toBeNull();
    });
  });

  describe('callbacks', () => {
    it('should properly transform JWT token', async () => {
      const mockUser = createMockUser({ name: 'Test User' });
      const mockToken = { sub: mockUser.id };

      const result = await authOptions.callbacks!.jwt!({
        token: mockToken,
        user: mockUser,
      } as any);

      expect(result).toEqual({
        ...mockToken,
        role: mockUser.role,
        name: mockUser.name,
      });
    });

    it('should properly transform session', async () => {
      const mockToken = {
        sub: 'test-user-id',
        role: 'CUSTOMER',
        name: 'Test User',
      };
      const mockSession = {
        user: {
          email: 'test@example.com',
        },
      };

      const result = await authOptions.callbacks!.session!({
        session: mockSession,
        token: mockToken,
      } as any);

      expect(result).toEqual({
        ...mockSession,
        user: {
          id: mockToken.sub,
          email: mockSession.user.email,
          role: mockToken.role,
          name: mockToken.name,
        },
      });
    });
  });
});

