import { db, DEFAULT_USER, DEFAULT_API_SETTINGS, DEFAULT_AI_MEMORY } from './index';
import { SEED_VOCABULARIES } from '../data/seedVocabularies';
import { SEED_GRAMMAR } from '../data/seedGrammar';
import { SEED_LESSONS } from '../data/seedLessons';
import { SEED_STORIES } from '../data/seedStories';
import { SEED_LISTENING } from '../data/seedListening';
import type { SRSCard } from '../types';

export async function initializeDatabase(): Promise<void> {
  // 1. Initialize user
  const userCount = await db.users.count();
  if (userCount === 0) {
    await db.users.add(DEFAULT_USER);
  }

  // 2. Initialize API settings
  const apiSettingsCount = await db.apiSettings.count();
  if (apiSettingsCount === 0) {
    await db.apiSettings.add(DEFAULT_API_SETTINGS);
  }

  // 3. Initialize AI learner memory
  const aiMemoryCount = await db.aiMemory.count();
  if (aiMemoryCount === 0) {
    await db.aiMemory.add(DEFAULT_AI_MEMORY);
  }

  // 4. Initialize vocabularies & SRS
  const vocabCount = await db.vocabularies.count();
  if (vocabCount === 0) {
    const today = new Date().toISOString().split('T')[0];
    for (const vocab of SEED_VOCABULARIES) {
      const vocabId = await db.vocabularies.add({
        ...vocab,
        createdAt: Date.now(),
      });

      // Create initial SRS card
      const srsCard: SRSCard = {
        vocabId: Number(vocabId),
        repetition: 0,
        interval: 1,
        easeFactor: 2.5,
        nextReviewDate: today,
        status: 'new',
        correctCount: 0,
        incorrectCount: 0,
      };
      await db.srsCards.add(srsCard);
    }
  }

  // 5. Initialize grammar
  const grammarCount = await db.grammarRules.count();
  if (grammarCount === 0) {
    await db.grammarRules.bulkAdd(SEED_GRAMMAR);
  }

  // 6. Initialize lessons
  const lessonCount = await db.lessons.count();
  if (lessonCount === 0) {
    await db.lessons.bulkAdd(SEED_LESSONS);
  }

  // 7. Initialize stories
  const storyCount = await db.stories.count();
  if (storyCount === 0) {
    await db.stories.bulkAdd(SEED_STORIES);
  }

  // 8. Initialize listening
  const listeningCount = await db.listening.count();
  if (listeningCount === 0) {
    await db.listening.bulkAdd(SEED_LISTENING);
  }

  // 9. Initialize today's stats if not present
  const today = new Date().toISOString().split('T')[0];
  const existingStat = await db.dailyStats.get(today);
  if (!existingStat) {
    await db.dailyStats.add({
      date: today,
      studyTimeMinutes: 5,
      lessonsCompleted: 0,
      wordsReviewed: 0,
      speakingMinutes: 0,
      listeningMinutes: 0,
      aiSessionsCount: 0,
    });
  }
}
