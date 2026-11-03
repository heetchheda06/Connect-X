import express from 'express';
import { meetingService } from '../services/ai/meetingService.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();
router.use(protect);

router.post('/', async (req, res, next) => {
  try {
    const { conversationId, title, agenda, mode } = req.body;
    const io = req.app.get('io');
    const meeting = await meetingService.startMeeting({
      conversationId,
      hostId: req.user._id,
      title,
      agenda,
      mode,
      socketIo: io,
    });
    return res.status(201).json({ success: true, message: 'Meeting started', data: { meeting } });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/join', async (req, res, next) => {
  try {
    const io = req.app.get('io');
    const meeting = await meetingService.joinMeeting({
      meetingId: req.params.id,
      userId: req.user._id,
      socketIo: io,
    });
    return res.status(200).json({ success: true, message: 'Joined meeting', data: { meeting } });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/end', async (req, res, next) => {
  try {
    const io = req.app.get('io');
    const meeting = await meetingService.endMeeting({
      meetingId: req.params.id,
      userId: req.user._id,
      socketIo: io,
    });
    return res.status(200).json({ success: true, message: 'Meeting ended and minutes generated', data: { meeting } });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/export', async (req, res, next) => {
  try {
    const md = await meetingService.exportMarkdown(req.params.id);
    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', 'attachment; filename="meeting-minutes.md"');
    return res.send(md);
  } catch (err) {
    next(err);
  }
});

export default router;
