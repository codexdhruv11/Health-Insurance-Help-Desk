import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';
import { CoinService } from '@/lib/coins';

const handler = NextAuth({
  ...authOptions,
  events: {
    ...authOptions.events,
    signIn: async ({ user }) => {
      // Skip coin rewards in development mode
      if (process.env.NODE_ENV === 'development') {
        return;
      }

      if (!user.id) return;

      try {
        const coinService = CoinService.getInstance();

        // Check if this is a new user (sign-up)
        const wallet = await coinService.getOrCreateWallet(user.id);
        if (!wallet.lastUpdated) {
          // First-time sign-up reward
          await coinService.earnCoins(user.id, 'SIGN_UP', 0, {
            event: 'sign_up',
            timestamp: new Date().toISOString(),
          });
        } else {
          // Daily login reward
          const lastLogin = wallet.lastUpdated;
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          if (lastLogin < today) {
            await coinService.earnCoins(user.id, 'DAILY_LOGIN', 0, {
              event: 'daily_login',
              timestamp: new Date().toISOString(),
              lastLogin: lastLogin.toISOString(),
            });
          }
        }
      } catch (error) {
        console.error('Error processing coin rewards:', error);
        // Don't block sign-in if coin rewards fail
      }
    },
  },
});

export { handler as GET, handler as POST };