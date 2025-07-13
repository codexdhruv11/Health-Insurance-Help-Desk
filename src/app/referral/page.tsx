'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { CoinBalance } from '@/components/ui/coin-balance';

interface ReferralStats {
  totalReferrals: number;
  pendingReferrals: number;
  coinsEarned: number;
  referralCode: string;
}

export default function ReferralPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [stats, setStats] = useState<ReferralStats>({
    totalReferrals: 0,
    pendingReferrals: 0,
    coinsEarned: 0,
    referralCode: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (!session?.user) return;

    // In a real app, fetch actual referral stats
    setStats({
      totalReferrals: 0,
      pendingReferrals: 0,
      coinsEarned: 0,
      referralCode: `REF${Math.random().toString(36).substring(7).toUpperCase()}`,
    });
    setIsLoading(false);
  }, [session]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(stats.referralCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleShare = async (platform: string) => {
    const referralUrl = `${window.location.origin}/?ref=${stats.referralCode}`;
    const message = `Join me on Health Insurance Help Desk and get exclusive rewards! Use my referral code: ${stats.referralCode}`;

    switch (platform) {
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(message + ' ' + referralUrl)}`);
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(referralUrl)}`);
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralUrl)}`);
        break;
      case 'email':
        window.location.href = `mailto:?subject=Join Health Insurance Help Desk&body=${encodeURIComponent(message + '\n\n' + referralUrl)}`;
        break;
    }

    // Simulate referral in development
    if (process.env.NODE_ENV === 'development') {
      try {
        const response = await fetch('/api/simulate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'REFERRAL',
            metadata: {
              platform,
              referralCode: stats.referralCode,
              sharedAt: new Date().toISOString(),
            },
          }),
        });

        if (!response.ok) throw new Error('Failed to simulate referral');

        const result = await response.json();
        toast({
          title: 'Referral Shared!',
          description: `You'll earn ${result.data.transaction.amount} coins when your friend signs up!`,
        });
      } catch (err) {
        toast({
          title: 'Error',
          description: err instanceof Error ? err.message : 'Failed to process referral',
          variant: 'destructive',
        });
      }
    }
  };

  if (!session?.user) {
    return (
      <div className="container py-8">
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Sign in to Refer Friends</h2>
              <p className="text-muted-foreground mb-6">
                Sign in to get your unique referral code and start earning rewards!
              </p>
              <Button onClick={() => window.location.href = '/auth/signin'}>
                Sign In
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex flex-col gap-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold">Refer & Earn</h1>
            <p className="mt-2 text-muted-foreground">
              Invite friends and earn coins when they join
            </p>
          </div>
          <CoinBalance variant="compact" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Your Referral Code</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      value={stats.referralCode}
                      readOnly
                      className="font-mono"
                    />
                    <Button
                      variant="outline"
                      onClick={handleCopyCode}
                    >
                      {isCopied ? 'Copied!' : 'Copy'}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Share this code with your friends to earn rewards
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Share via</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    onClick={() => handleShare('whatsapp')}
                  >
                    WhatsApp
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleShare('twitter')}
                  >
                    Twitter
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleShare('facebook')}
                  >
                    Facebook
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleShare('email')}
                  >
                    Email
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Your Referral Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-2xl font-bold">{stats.totalReferrals}</p>
                    <p className="text-sm text-muted-foreground">
                      Total Referrals
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-bold">{stats.pendingReferrals}</p>
                    <p className="text-sm text-muted-foreground">
                      Pending Referrals
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-bold">{stats.coinsEarned}</p>
                    <p className="text-sm text-muted-foreground">
                      Coins Earned
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>How it Works</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-4 list-decimal list-inside text-sm">
                  <li>Share your unique referral code with friends</li>
                  <li>Friends sign up using your code</li>
                  <li>You earn coins when they complete registration</li>
                  <li>Your friends get a welcome bonus too!</li>
                </ol>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
} 