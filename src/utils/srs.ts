import type { SRSCard } from '../types';

export function calculateSM2(
  card: SRSCard,
  quality: number // 0: Blackout, 1: Incorrect, 2: Hard, 3: Good, 4: Easy, 5: Perfect
): {
  repetition: number;
  interval: number;
  easeFactor: number;
  nextReviewDate: string;
  status: 'new' | 'learning' | 'review' | 'mastered';
} {
  let { repetition, interval, easeFactor } = card;

  // Calculate new Ease Factor
  // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (easeFactor < 1.3) {
    easeFactor = 1.3;
  }

  if (quality >= 3) {
    // Correct response
    if (repetition === 0) {
      interval = 1;
    } else if (repetition === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetition += 1;
  } else {
    // Incorrect response, reset repetitions
    repetition = 0;
    interval = 1;
  }

  // Calculate next review date
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + interval);
  const nextReviewDate = nextDate.toISOString().split('T')[0];

  // Determine status
  let status: 'new' | 'learning' | 'review' | 'mastered' = 'learning';
  if (repetition >= 5 && easeFactor >= 2.2) {
    status = 'mastered';
  } else if (repetition >= 1) {
    status = 'review';
  } else {
    status = 'learning';
  }

  return {
    repetition,
    interval,
    easeFactor: Number(easeFactor.toFixed(2)),
    nextReviewDate,
    status,
  };
}
