import express from 'express';
import { analyticsService } from '../services/ai/analyticsService.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();
router.use(protect);

router.get('/conversations/:id', async (req, res, next) => {
  try {
    const { range = '30d' } = req.query;
    const days = parseInt(range, 10) || 30;
    const stats = await analyticsService.getConversationAnalytics({
      conversationId: req.params.id,
      rangeDays: days,
    });
    return res.status(200).json({ success: true, message: 'Analytics retrieved', data: stats });
  } catch (err) {
    next(err);
  }
});

router.get('/conversations/:id/insight', async (req, res, next) => {
  try {
    const insight = await analyticsService.generateWeeklyInsight({
      conversationId: req.params.id,
    });
    return res.status(200).json({ success: true, message: 'Insight generated', data: insight });
  } catch (err) {
    next(err);
  }
});

router.get('/conversations/:id/export.csv', async (req, res, next) => {
  try {
    const csv = await analyticsService.exportCsv({
      conversationId: req.params.id,
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="conversation-analytics.csv"');
    return res.send(csv);
  } catch (err) {
    next(err);
  }
});

export default router;
