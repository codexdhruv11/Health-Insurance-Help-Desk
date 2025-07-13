'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CoinBalance } from '@/components/ui/coin-balance';

interface Question {
  id: number;
  text: string;
  options: string[];
}

const questions: Question[] = [
  {
    id: 1,
    text: 'How would you rate your overall health?',
    options: ['Excellent', 'Good', 'Fair', 'Poor'],
  },
  {
    id: 2,
    text: 'How often do you exercise?',
    options: ['Daily', '3-4 times a week', '1-2 times a week', 'Rarely'],
  },
  {
    id: 3,
    text: 'How would you describe your diet?',
    options: [
      'Very healthy and balanced',
      'Mostly healthy',
      'Sometimes healthy',
      'Needs improvement',
    ],
  },
  {
    id: 4,
    text: 'Do you have any chronic medical conditions?',
    options: ['None', '1 condition', '2 conditions', '3 or more conditions'],
  },
  {
    id: 5,
    text: 'How often do you get a health check-up?',
    options: [
      'Every 6 months',
      'Yearly',
      'Every 2-3 years',
      'Only when needed',
    ],
  },
];

export default function HealthQuizPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const handleAnswer = (answer: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questions[currentQuestion].id]: answer,
    }));

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
    }
  };

  const handleSubmit = async () => {
    if (!session?.user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to earn coins for completing the quiz.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'HEALTH_QUIZ',
          metadata: {
            answers,
            completedAt: new Date().toISOString(),
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit quiz');
      }

      const result = await response.json();
      setIsComplete(true);
      toast({
        title: 'Quiz Completed!',
        description: `You earned ${result.data.transaction.amount} coins!`,
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to submit quiz',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const progress = (currentQuestion / questions.length) * 100;

  if (isComplete) {
    return (
      <div className="container py-8">
        <Card>
          <CardHeader>
            <CardTitle>Quiz Completed!</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p>
                Thank you for completing the health assessment quiz. Your responses
                will help us provide better health insurance recommendations.
              </p>
              <div className="flex items-center gap-2">
                <span>Your current balance:</span>
                <CoinBalance variant="compact" />
              </div>
              <div className="flex gap-2">
                <Button onClick={() => window.location.reload()}>
                  Take Quiz Again
                </Button>
                <Button variant="outline" onClick={() => window.location.href = '/rewards'}>
                  Visit Rewards Store
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Health Assessment Quiz</CardTitle>
            <Badge variant="secondary">
              Question {currentQuestion + 1} of {questions.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">
                {questions[currentQuestion].text}
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {questions[currentQuestion].options.map((option) => (
                  <Button
                    key={option}
                    variant={
                      answers[questions[currentQuestion].id] === option
                        ? 'default'
                        : 'outline'
                    }
                    onClick={() => handleAnswer(option)}
                  >
                    {option}
                  </Button>
                ))}
              </div>
            </div>

            {currentQuestion === questions.length - 1 && (
              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={
                  !answers[questions[currentQuestion].id] || isSubmitting
                }
              >
                {isSubmitting ? 'Submitting...' : 'Complete Quiz'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 