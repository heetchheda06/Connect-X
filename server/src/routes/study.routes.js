import express from 'express';
import { studyService } from '../services/ai/studyService.js';
import { StudyDeck } from '../models/study.model.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();
router.use(protect);

router.post('/decks/generate', async (req, res, next) => {
  try {
    const { sourceText, title, conversationId } = req.body;
    const deck = await studyService.generateFlashcards({
      sourceText,
      title,
      conversationId,
      userId: req.user._id,
    });
    return res.status(201).json({ success: true, message: 'Flashcards generated', data: { deck } });
  } catch (err) {
    next(err);
  }
});

router.get('/decks', async (req, res, next) => {
  try {
    const { conversationId } = req.query;
    const query = { owner: req.user._id };
    if (conversationId) query.conversation = conversationId;

    const decks = await StudyDeck.find(query).sort({ createdAt: -1 }).lean();
    return res.status(200).json({ success: true, message: 'Decks retrieved', data: { decks } });
  } catch (err) {
    next(err);
  }
});

router.post('/review/:cardId', async (req, res, next) => {
  try {
    const { deckId, rating } = req.body;
    const updatedCard = await studyService.submitReview({
      deckId,
      cardId: req.params.cardId,
      rating,
    });
    return res.status(200).json({ success: true, message: 'Review submitted', data: { card: updatedCard } });
  } catch (err) {
    next(err);
  }
});

router.post('/quizzes/generate', async (req, res, next) => {
  try {
    const { sourceText, title, conversationId, questionCount, difficulty } = req.body;
    const quiz = await studyService.generateQuiz({
      sourceText,
      title,
      conversationId,
      userId: req.user._id,
      questionCount,
      difficulty,
    });
    return res.status(201).json({ success: true, message: 'Quiz generated', data: { quiz } });
  } catch (err) {
    next(err);
  }
});

router.post('/explain', async (req, res, next) => {
  try {
    const { text, targetLang } = req.body;
    const result = await studyService.explainConcept({
      text,
      targetLang,
    });
    return res.status(200).json({ success: true, message: 'Explanation generated', data: result });
  } catch (err) {
    next(err);
  }
});

export default router;
