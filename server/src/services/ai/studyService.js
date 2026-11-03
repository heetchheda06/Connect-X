import { z } from 'zod';
import { StudyDeck, StudyQuiz } from '../../models/study.model.js';
import { llmService } from './llmService.js';
import { wrapChatData, PROMPT_INJECTION_DEFENSE } from './prompts.js';
import { env } from '../../config/env.js';

const flashcardsOutputSchema = z.object({
  cards: z
    .array(
      z.object({
        front: z.string(),
        back: z.string(),
      })
    )
    .min(1),
});

const quizOutputSchema = z.object({
  questions: z
    .array(
      z.object({
        prompt: z.string(),
        options: z.array(z.string()).min(2),
        correctIndex: z.number().int(),
        explanation: z.string().default(''),
      })
    )
    .min(1),
});

export class StudyService {
  /**
   * Generate Flashcards from chat or document text
   */
  async generateFlashcards({ sourceText, title, conversationId, userId }) {
    const wrappedSource = wrapChatData(sourceText, 'study_source');
    const prompt = `Generate 4 to 8 high-yield flashcards (Question on front, clear answer on back) based strictly on <chat_data>.`;

    const result = await llmService.generateStructured({
      systemInstruction: `You are the ConnectX Study Flashcard Generator. Create crisp, accurate question-answer study cards. ${PROMPT_INJECTION_DEFENSE}`,
      prompt: `${wrappedSource}\n\n${prompt}`,
      schema: flashcardsOutputSchema,
      modelTier: env.aiModelFast || env.aiModel,
    });

    const deck = await StudyDeck.create({
      owner: userId,
      conversation: conversationId || null,
      title: title || 'Study Deck',
      cards: result.cards.map((c) => ({
        front: c.front,
        back: c.back,
        ease: 2.5,
        intervalDays: 0,
        repetitions: 0,
        dueAt: new Date(),
      })),
    });

    return deck;
  }

  /**
   * Generate an interactive Multiple-Choice Practice Quiz
   */
  async generateQuiz({ sourceText, title, conversationId, userId, questionCount = 5, difficulty = 'medium' }) {
    const wrappedSource = wrapChatData(sourceText, 'study_source');
    const prompt = `Generate ${questionCount} multiple-choice quiz questions (${difficulty} difficulty) with 4 options, the zero-based index of the correct answer, and an explanation.`;

    const result = await llmService.generateStructured({
      systemInstruction: `You are the ConnectX Quiz Generator. Create engaging, accurate multiple-choice questions. ${PROMPT_INJECTION_DEFENSE}`,
      prompt: `${wrappedSource}\n\n${prompt}`,
      schema: quizOutputSchema,
      modelTier: env.aiModelFast || env.aiModel,
    });

    const quiz = await StudyQuiz.create({
      owner: userId,
      conversation: conversationId || null,
      title: title || 'Study Quiz',
      difficulty,
      questions: result.questions,
    });

    return quiz;
  }

  /**
   * "Explain It Simply": Explains a concept in plain language
   */
  async explainConcept({ text, targetLang = 'en' }) {
    const prompt = `Explain the following message, term, or concept in clear, simple terms suitable for beginners.
Target language: ${targetLang}.
Text to explain: "${text}"`;

    const schema = z.object({
      simpleExplanation: z.string(),
      analogy: z.string().default(''),
      keyTerms: z.array(z.string()).default([]),
    });

    const result = await llmService.generateStructured({
      systemInstruction: `You are the ConnectX "Explain It Simply" tutor. Explain concepts clearly and warmly. ${PROMPT_INJECTION_DEFENSE}`,
      prompt,
      schema,
      modelTier: env.aiModelFast || env.aiModel,
    });

    return result;
  }

  /**
   * Spaced repetition review update using SM-2 algorithm
   */
  async submitReview({ deckId, cardId, rating }) {
    const deck = await StudyDeck.findById(deckId);
    if (!deck) throw new Error('Deck not found');

    const card = deck.cards.id(cardId);
    if (!card) throw new Error('Card not found in deck');

    // Quality mapping (0 to 5)
    const ratingScores = { again: 1, hard: 3, good: 4, easy: 5 };
    const q = ratingScores[rating] || 4;

    // SM-2 calculation
    if (q < 3) {
      card.repetitions = 0;
      card.intervalDays = 1;
    } else {
      if (card.repetitions === 0) card.intervalDays = 1;
      else if (card.repetitions === 1) card.intervalDays = 6;
      else card.intervalDays = Math.round(card.intervalDays * card.ease);
      card.repetitions += 1;
    }

    card.ease = Math.max(1.3, card.ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
    card.dueAt = new Date(Date.now() + card.intervalDays * 24 * 60 * 60 * 1000);

    await deck.save();
    return card;
  }
}

export const studyService = new StudyService();
export default studyService;
